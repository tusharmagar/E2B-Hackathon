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
    await sandbox.filesystem.write('/home/user/data.csv', input.csvBuffer.toString('utf-8'));

    // Create directories in sandbox
    console.log('📁 Creating directories...');
    await sandbox.process.startAndWait('mkdir -p /home/user/tools');

    // Read and upload all sandbox scripts
    console.log('📦 Uploading agent scripts...');
    const sandboxFiles = [
      { local: 'sandbox-script/agent.ts', remote: '/home/user/agent.ts' },
      { local: 'sandbox-script/package.json', remote: '/home/user/package.json' },
      { local: 'sandbox-script/pdf-generator.ts', remote: '/home/user/pdf-generator.ts' },
      { local: 'sandbox-script/pdf-template.html', remote: '/home/user/pdf-template.html' },
      { local: 'sandbox-script/tools/sql-tool.ts', remote: '/home/user/tools/sql-tool.ts' },
      { local: 'sandbox-script/tools/exa-tool.ts', remote: '/home/user/tools/exa-tool.ts' },
      { local: 'sandbox-script/tools/stats-tool.ts', remote: '/home/user/tools/stats-tool.ts' },
      { local: 'sandbox-script/tools/chart-tool.ts', remote: '/home/user/tools/chart-tool.ts' }
    ];

    for (const file of sandboxFiles) {
      try {
        const content = readFileSync(join(process.cwd(), file.local), 'utf-8');
        await sandbox.filesystem.write(file.remote, content);
        console.log(`   ✅ Uploaded ${file.local}`);
      } catch (error) {
        console.warn(`Could not upload ${file.local}:`, error);
      }
    }

    // Install system dependencies
    console.log('🐳 Installing Docker and dependencies...');
    const aptUpdate = await sandbox.process.start({
      cmd: 'apt-get update',
      onStdout: (data) => console.log('apt-get:', data),
      onStderr: (data) => console.log('apt-get error:', data)
    });
    await aptUpdate.wait();
    
    const aptInstall = await sandbox.process.start({
      cmd: 'apt-get install -y docker.io curl',
      onStdout: (data) => console.log('install:', data),
      onStderr: (data) => console.log('install error:', data)
    });
    await aptInstall.wait();
    
    // Install Node.js from NodeSource
    console.log('📦 Installing Node.js...');
    const nodeSetup = await sandbox.process.start({
      cmd: 'curl -fsSL https://deb.nodesource.com/setup_20.x | bash -',
      onStdout: (data) => console.log('node setup:', data),
      onStderr: (data) => console.log('node setup error:', data)
    });
    await nodeSetup.wait();
    
    const nodeInstall = await sandbox.process.start({
      cmd: 'apt-get install -y nodejs',
      onStdout: (data) => console.log('node install:', data),
      onStderr: (data) => console.log('node install error:', data)
    });
    await nodeInstall.wait();
    
    // Verify Node.js installation
    console.log('🔍 Verifying Node.js installation...');
    const nodeCheck = await sandbox.process.start({
      cmd: 'which node && node --version && which npm && npm --version',
      onStdout: (data) => console.log('node check:', data),
      onStderr: (data) => console.log('node check error:', data)
    });
    await nodeCheck.wait();
    
    // Pull Exa MCP Docker image
    console.log('📥 Pulling Exa MCP Docker image...');
    await sandbox.process.startAndWait('docker pull mcp/exa');

    // Install Node.js dependencies
    console.log('📦 Installing Node.js packages...');
    const npmInstall = await sandbox.process.start({
      cmd: 'cd /home/user && npm install --legacy-peer-deps',
      onStdout: (data) => console.log('npm:', data),
      onStderr: (data) => console.log('npm error:', data)
    });
    await npmInstall.wait();
    console.log('   ✅ npm install completed');

    // Verify tsx is installed
    console.log('🔍 Checking tsx installation...');
    await sandbox.process.startAndWait('ls -la /home/user/node_modules/.bin/tsx || echo "tsx not found"');

    // Run the agent with node and tsx
    console.log('🤖 Running multi-step agent...');
    const agentProcess = await sandbox.process.start({
      cmd: 'cd /home/user && node --import ./node_modules/tsx/dist/esm/index.mjs agent.ts',
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
    const pdfBuffer = await sandbox.filesystem.read('/home/user/report.pdf');

    // Download insights JSON
    console.log('📊 Retrieving insights...');
    let insights: any = {};
    try {
      const insightsJson = await sandbox.filesystem.read('/home/user/insights.json');
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

