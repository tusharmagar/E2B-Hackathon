import { CodeInterpreter } from '@e2b/code-interpreter';
import { E2BAgentInput, E2BAgentOutput } from './types.js';

// Template ID will be set after building the custom template
// Run: npx e2b template build --name whatsapp-data-analyst
// Then set E2B_TEMPLATE_ID in your .env file
const TEMPLATE_ID = process.env.E2B_TEMPLATE_ID || undefined;

export async function runE2BAgent(input: E2BAgentInput): Promise<E2BAgentOutput> {
  console.log('🚀 Initializing E2B sandbox...');
  
  const sandboxConfig: any = {
    apiKey: process.env.E2B_API_KEY,
    timeoutMs: 300000 // 5 minutes
  };
  
  // Use custom template if provided
  if (TEMPLATE_ID) {
    console.log(`   📦 Using custom template: ${TEMPLATE_ID}`);
    sandboxConfig.template = TEMPLATE_ID;
  } else {
    console.log('   ⚠️ No custom template found, using default (will take 3-5 min to install dependencies)');
  }
  
  const sandbox = await CodeInterpreter.create(sandboxConfig);

  try {
    // Upload CSV file to sandbox
    console.log('📤 Uploading CSV to sandbox...');
    await sandbox.filesystem.write('/home/user/data.csv', input.csvBuffer.toString('utf-8'));
    console.log('   ✅ CSV uploaded');

    // Run the agent (all dependencies are pre-installed if using custom template!)
    console.log('🤖 Running multi-step agent...');
    if (TEMPLATE_ID) {
      console.log('   ⚡ Using pre-installed environment (Node.js, npm packages, Chrome ready!)');
    } else {
      console.log('   ⏳ Installing dependencies in sandbox (this will take 3-5 minutes)...');
    }
    
    const agentProcess = await sandbox.process.start({
      cmd: 'npx tsx /home/user/agent.ts',
      envVars: {
        EXA_API_KEY: process.env.EXA_API_KEY || '',
        GROQ_API_KEY: process.env.GROQ_API_KEY || '',
        USER_MESSAGE: input.userMessage,
        CONVERSATION_HISTORY: JSON.stringify(input.conversationHistory)
      },
      onStdout: (data) => console.log('   📊', data),
      onStderr: (data) => console.error('   ⚠️', data)
    });

    const agentResult = await agentProcess.wait();
    console.log(`   Agent exit code: ${agentResult.exitCode}`);
    
    if (agentResult.exitCode !== 0) {
      throw new Error(`Agent failed with exit code ${agentResult.exitCode}`);
    }
    console.log('   ✅ Agent completed successfully');

    // Download generated PDF
    console.log('📥 Downloading generated PDF...');
    const pdfBuffer = await sandbox.filesystem.read('/home/user/report.pdf');
    console.log('   ✅ PDF downloaded');

    // Download insights JSON
    console.log('📊 Retrieving insights...');
    let insights: any = {};
    try {
      const insightsJson = await sandbox.filesystem.read('/home/user/insights.json');
      insights = JSON.parse(insightsJson.toString());
      console.log('   ✅ Insights retrieved');
    } catch (error) {
      console.warn('   ⚠️ Could not read insights.json');
    }

    console.log('✅ E2B agent completed successfully');

    return {
      pdfBuffer: Buffer.from(pdfBuffer),
      insights,
      summary: insights.summary || 'Analysis complete'
    };

  } catch (error) {
    console.error('❌ E2B agent error:', error);
    throw error;
  } finally {
    // Cleanup sandbox
    console.log('🧹 Cleaning up sandbox...');
    await sandbox.close();
  }
}

