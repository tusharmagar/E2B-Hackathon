import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';
import { sendWhatsAppMessage, downloadMedia, extractPhoneNumber } from '../lib/twilio.js';
import { getSession, createSession, updateSession } from '../lib/session-store.js';
import { runE2BAgent } from '../lib/e2b-agent.js';
import { TwilioWebhookPayload } from '../lib/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body as TwilioWebhookPayload;
    const from = extractPhoneNumber(payload.From);
    const messageBody = payload.Body || '';
    const numMedia = parseInt(payload.NumMedia || '0');

    console.log(`📱 Received message from ${from}: ${messageBody}`);

    // Get or create user session
    let session = getSession(from);
    if (!session) {
      session = createSession(from);
    }

    // Check if message contains a CSV file
    const hasCSV = numMedia > 0 && payload.MediaContentType0?.includes('csv');

    let csvBuffer: Buffer | undefined;
    let userMessage = messageBody;

    if (hasCSV && payload.MediaUrl0) {
      // Download CSV file
      console.log('📥 Downloading CSV file...');
      try {
        csvBuffer = await downloadMedia(payload.MediaUrl0, process.env.TWILIO_AUTH_TOKEN!);
        
        // Update session with CSV
        updateSession(from, {
          csvBuffer,
          conversationHistory: [
            ...session.conversationHistory,
            { role: 'user', content: 'Uploaded CSV file' }
          ]
        });

        userMessage = messageBody || 'Analyze this data and provide comprehensive insights';
        
        // Send acknowledgment and return immediately
        await sendWhatsAppMessage(
          from,
          '🤖 Received your CSV! Analyzing data...\n\nThis will take 3-5 minutes. I\'m:\n• Setting up secure analysis environment\n• Converting to database\n• Running SQL queries\n• Detecting trends\n• Searching the web for context\n• Generating your report\n\nI\'ll send you the PDF when ready! ⏳'
        );
        
        // Return 200 immediately so Twilio doesn't retry
        res.status(200).json({ success: true, message: 'Processing started' });
        
        // Continue processing asynchronously
        processCSVAsync(from, csvBuffer, userMessage, session.conversationHistory).catch(error => {
          console.error('Background processing error:', error);
        });
        
        return;
        
      } catch (error) {
        console.error('Error downloading CSV:', error);
        await sendWhatsAppMessage(from, '❌ Sorry, I couldn\'t download the CSV file. Please try again.');
        return res.status(200).json({ success: false });
      }
    } else if (!session.csvBuffer) {
      // No CSV in session and no new CSV
      await sendWhatsAppMessage(
        from,
        '👋 Welcome to the Data Analyst Agent!\n\nPlease send me a CSV file to analyze. I can:\n\n📊 Analyze trends and patterns\n📈 Perform statistical analysis\n🌐 Research external context\n📄 Generate beautiful PDF reports\n\nJust send your CSV to get started!'
      );
      return res.status(200).json({ success: true });
    } else {
      // User sent a follow-up message
      csvBuffer = session.csvBuffer;
      
      updateSession(from, {
        conversationHistory: [
          ...session.conversationHistory,
          { role: 'user', content: messageBody }
        ]
      });

      await sendWhatsAppMessage(
        from,
        '🤖 Analyzing your request...\n\nProcessing with context from your previous CSV. This will take a few minutes...'
      );
      
      // Return 200 immediately
      res.status(200).json({ success: true, message: 'Processing started' });
      
      // Continue processing asynchronously
      processCSVAsync(from, csvBuffer!, userMessage, session.conversationHistory).catch(error => {
        console.error('Background processing error:', error);
      });
      
      return;
    }

  } catch (error) {
    console.error('❌ Webhook error:', error);
    
    // Try to notify user of error
    try {
      const payload = req.body as TwilioWebhookPayload;
      const from = extractPhoneNumber(payload.From);
      await sendWhatsAppMessage(
        from,
        '❌ Sorry, something went wrong while analyzing your data. Please try again later.'
      );
    } catch (notifyError) {
      console.error('Failed to notify user of error:', notifyError);
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Async processing function that continues after HTTP response
async function processCSVAsync(
  from: string, 
  csvBuffer: Buffer, 
  userMessage: string, 
  conversationHistory: any[]
) {
  try {
    console.log('🚀 Starting E2B agent (background)...');
    const result = await runE2BAgent({
      csvBuffer,
      userMessage,
      conversationHistory
    });

    // Upload PDF to Vercel Blob
    console.log('☁️ Uploading PDF to cloud storage...');
    const blob = await put(`reports/${from}-${Date.now()}.pdf`, result.pdfBuffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    // Update session with results
    updateSession(from, {
      analysisResults: result.insights,
      conversationHistory: [
        ...conversationHistory,
        { role: 'assistant', content: result.summary }
      ]
    });

    // Send PDF link to user
    const responseMessage = `✅ *Analysis Complete!*\n\n${result.summary}\n\n📊 Your detailed PDF report is ready 👇`;
    
    await sendWhatsAppMessage(from, responseMessage, blob.url);

    console.log('✨ Successfully sent report to user');
  } catch (error) {
    console.error('❌ Background processing error:', error);
    
    try {
      await sendWhatsAppMessage(
        from,
        '❌ Sorry, something went wrong while analyzing your data. The analysis environment setup took too long. Please try again or contact support.'
      );
    } catch (notifyError) {
      console.error('Failed to notify user of background error:', notifyError);
    }
  }
}

