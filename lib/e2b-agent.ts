import { CodeInterpreter } from '@e2b/code-interpreter';
import { readFileSync } from 'fs';
import { join } from 'path';
import { E2BAgentInput, E2BAgentOutput } from './types.js';

export async function runE2BAgent(input: E2BAgentInput): Promise<E2BAgentOutput> {
  console.log('🚀 Initializing E2B sandbox...');
  
  const sandbox = await CodeInterpreter.create({
    apiKey: process.env.E2B_API_KEY,
    timeout: 600000 // 10 minutes to be safe
  });

  try {
    // Upload CSV file to sandbox
    console.log('📤 Uploading CSV to sandbox...');
    await sandbox.filesystem.write('/home/user/data.csv', input.csvBuffer.toString('utf-8'));

    // Create tools directory
    console.log('📁 Creating directories...');
    await sandbox.filesystem.makeDir('/home/user/tools');

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
        await sandbox.filesystem.write(sandboxPath, content);
        console.log(`   ✅ Uploaded ${file}`);
      } catch (error) {
        console.warn(`Could not upload ${file}:`, error);
      }
    }

    // Install system dependencies (non-interactive)
    console.log('\n🔧 Installing system dependencies (Docker, Node.js)...');
    console.log('   This takes 60-90 seconds...\n');
    
    await sandbox.process.startAndWait({
      cmd: 'DEBIAN_FRONTEND=noninteractive sudo -E apt-get update -qq',
      onStdout: (data) => { process.stdout.write('.'); },
      onStderr: () => {}
    });
    
    await sandbox.process.startAndWait({
      cmd: 'DEBIAN_FRONTEND=noninteractive sudo -E apt-get install -qq -y docker.io curl ca-certificates gnupg chromium fonts-liberation libnss3 libatk-bridge2.0-0 libgbm1',
      onStdout: (data) => { process.stdout.write('.'); },
      onStderr: () => {}
    });
    
    console.log('\n   ✅ Docker and Chromium installed');
    
    // Start Docker daemon
    console.log('🐳 Starting Docker daemon...');
    await sandbox.process.start({
      cmd: 'sudo dockerd',
      onStdout: () => {},
      onStderr: () => {}
    });
    
    // Wait for Docker to be ready
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('   ✅ Docker daemon started');
    
    // Install Node.js from NodeSource
    console.log('📦 Installing Node.js 20...');
    await sandbox.process.startAndWait({
      cmd: 'curl -fsSL https://deb.nodesource.com/setup_20.x | DEBIAN_FRONTEND=noninteractive sudo -E bash -',
      onStdout: (data) => { process.stdout.write('.'); },
      onStderr: () => {}
    });
    
    await sandbox.process.startAndWait({
      cmd: 'DEBIAN_FRONTEND=noninteractive sudo -E apt-get install -qq -y nodejs',
      onStdout: (data) => { process.stdout.write('.'); },
      onStderr: () => {}
    });
    
    console.log('\n   ✅ Node.js installed');

    // Verify installations
    const nodeCheck = await sandbox.process.startAndWait({ cmd: 'node --version' });
    const npmCheck = await sandbox.process.startAndWait({ cmd: 'npm --version' });
    console.log(`   Node: ${nodeCheck.stdout?.trim()}`);
    console.log(`   npm: ${npmCheck.stdout?.trim()}`);

    // Install Node.js dependencies
    console.log('\n📦 Installing npm packages...');
    console.log('   This takes 2-3 minutes (installing puppeteer, better-sqlite3, etc.)...\n');
    
    await sandbox.process.startAndWait({
      cmd: 'cd /home/user && DEBIAN_FRONTEND=noninteractive npm install --legacy-peer-deps --no-audit --no-fund',
      onStdout: (data) => { process.stdout.write('.'); },
      onStderr: () => {}
    });
    
    console.log('\n   ✅ npm packages installed');

    // Run the agent
    console.log('\n🤖 Running multi-step agent...\n');
    const agentProcess = await sandbox.process.start({
      cmd: 'npx tsx /home/user/agent.ts',
      cwd: '/home/user',
      envVars: {
        EXA_API_KEY: process.env.EXA_API_KEY || '',
        GROQ_API_KEY: process.env.GROQ_API_KEY || '',
        USER_MESSAGE: input.userMessage,
        CONVERSATION_HISTORY: JSON.stringify(input.conversationHistory),
        PUPPETEER_EXECUTABLE_PATH: '/usr/bin/chromium'
      },
      onStdout: (data) => console.log('Agent:', data),
      onStderr: (data) => console.error('Agent Error:', data)
    });

    const agentOutput = await agentProcess.wait();
    if (agentOutput.exitCode !== 0) {
      throw new Error(`Agent execution failed with exit code ${agentOutput.exitCode}`);
    }
    console.log('\n   ✅ Agent execution completed');

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

    console.log('✅ E2B agent completed successfully\n');

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

