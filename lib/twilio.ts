import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

if (!accountSid || !authToken || !whatsappNumber) {
  console.warn('Twilio credentials not configured');
}

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export async function sendWhatsAppMessage(
  to: string,
  message: string,
  mediaUrl?: string
): Promise<void> {
  if (!client || !whatsappNumber) {
    throw new Error('Twilio not configured');
  }

  await client.messages.create({
    from: `whatsapp:${whatsappNumber}`,
    to: `whatsapp:${to}`,
    body: message,
    ...(mediaUrl && { mediaUrl: [mediaUrl] })
  });
}

export async function downloadMedia(
  mediaUrl: string,
  authToken: string
): Promise<Buffer> {
  const credentials = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${authToken}`).toString('base64');
  
  const response = await fetch(mediaUrl, {
    headers: {
      'Authorization': `Basic ${credentials}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to download media: ${response.statusText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

export function extractPhoneNumber(whatsappId: string): string {
  // Remove 'whatsapp:' prefix if present
  return whatsappId.replace('whatsapp:', '');
}

