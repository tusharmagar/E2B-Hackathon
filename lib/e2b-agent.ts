import { CodeInterpreter } from '@e2b/code-interpreter';
import { readFileSync } from 'fs';
import { join } from 'path';
import { E2BAgentInput, E2BAgentOutput } from './types.js';

export async function runE2BAgent(input: E2BAgentInput): Promise<E2BAgentOutput> {
  console.log('🚀 Initializing E2B sandbox...');
  
  const sandbox = await CodeInterpreter.create({
    apiKey: process.env.E2B_API_KEY
  });

  try {
    // Upload CSV file to sandbox
    console.log('📤 Uploading CSV to sandbox...');
    await sandbox.files.write('/home/user/data.csv', input.csvBuffer);

    // Read and upload all sandbox scripts
    console.log('📦 Uploading agent scripts...');
    const sandboxFiles = [
      'sandbox-script/agent.ts',
      'sandbox-script/package.json',
      'sandbox-script/pdf-generator.ts',
      'sandbox-script/pdf-template.html',
      'sandbox-script/tools/sql-tool.ts',
      'sandbox-script/tools/exa-tool.ts',
      'sandbox-script/tools/stats-tool.ts',
      'sandbox-script/tools/chart-tool.ts'
    ];

    for (const file of sandboxFiles) {
      try {
        const content = readFileSync(join(process.cwd(), file), 'utf-8');
        const sandboxPath = `/home/user/${file.replace('sandbox-script/', '')}`;
        await sandbox.files.write(sandboxPath, content);
      } catch (error) {
        console.warn(`Could not upload ${file}:`, error);
      }
    }

    // Install system dependencies
    console.log('🐳 Installing Docker and dependencies...');
    await sandbox.process.startAndWait('apt-get update');
    await sandbox.process.startAndWait('apt-get install -y docker.io');
    
    // Pull Exa MCP Docker image
    console.log('📥 Pulling Exa MCP Docker image...');
    await sandbox.process.startAndWait('docker pull mcp/exa');

    // Install Node.js dependencies
    console.log('📦 Installing Node.js packages...');
    await sandbox.process.startAndWait('cd /home/user && npm install');

    // Run the agent
    console.log('🤖 Running multi-step agent...');
    const agentProcess = await sandbox.process.start({
      cmd: 'cd /home/user && npx tsx agent.ts',
      envVars: {
        EXA_API_KEY: process.env.EXA_API_KEY || '',
        GROQ_API_KEY: process.env.GROQ_API_KEY || '',
        USER_MESSAGE: input.userMessage,
        CONVERSATION_HISTORY: JSON.stringify(input.conversationHistory)
      },
      onStdout: (data) => console.log('Agent:', data),
      onStderr: (data) => console.error('Agent Error:', data)
    });

    await agentProcess.wait();

    // Download generated PDF
    console.log('📥 Downloading generated PDF...');
    const pdfBuffer = await sandbox.files.read('/home/user/report.pdf');

    // Download insights JSON
    console.log('📊 Retrieving insights...');
    let insights: any = {};
    try {
      const insightsJson = await sandbox.files.read('/home/user/insights.json');
      insights = JSON.parse(insightsJson.toString());
    } catch (error) {
      console.warn('Could not read insights.json');
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

