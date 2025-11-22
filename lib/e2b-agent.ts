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
      cmd: 'sudo apt-get update',
      onStdout: (data) => console.log('apt-get:', data),
      onStderr: (data) => console.log('apt-get error:', data)
    });
    await aptUpdate.wait();
    
    const aptInstall = await sandbox.process.start({
      cmd: 'sudo apt-get install -y docker.io curl',
      onStdout: (data) => console.log('install:', data),
      onStderr: (data) => console.log('install error:', data)
    });
    await aptInstall.wait();
    
    // Install Node.js from NodeSource
    console.log('📦 Installing Node.js...');
    const nodeSetup = await sandbox.process.start({
      cmd: 'curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -',
      onStdout: (data) => console.log('node setup:', data),
      onStderr: (data) => console.log('node setup error:', data)
    });
    await nodeSetup.wait();
    
    const nodeInstall = await sandbox.process.start({
      cmd: 'sudo apt-get install -y nodejs',
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
    const dockerPull = await sandbox.process.start({
      cmd: 'docker pull mcp/exa',
      onStdout: (data) => console.log('docker:', data),
      onStderr: (data) => console.log('docker error:', data)
    });
    const dockerResult = await dockerPull.wait();
    if (dockerResult.exitCode !== 0) {
      throw new Error(`Docker pull failed with exit code ${dockerResult.exitCode}`);
    }
    console.log('   ✅ Docker image pulled');

    // Install Node.js dependencies
    console.log('📦 Installing Node.js packages...');
    console.log('   This may take 2-3 minutes...');
    const npmInstall = await sandbox.process.start({
      cmd: 'cd /home/user && npm install --legacy-peer-deps',
      onStdout: (data) => console.log('npm:', data),
      onStderr: (data) => console.log('npm stderr:', data)
    });
    const npmResult = await npmInstall.wait();
    console.log(`   npm install exit code: ${npmResult.exitCode}`);
    
    if (npmResult.exitCode !== 0) {
      throw new Error(`npm install failed with exit code ${npmResult.exitCode}`);
    }
    console.log('   ✅ npm install completed successfully');

    // Verify tsx is installed
    console.log('🔍 Checking tsx installation...');
    const tsxCheck = await sandbox.process.start({
      cmd: 'ls -la /home/user/node_modules/.bin/ && ls -la /home/user/node_modules/tsx/ || echo "tsx not found"',
      onStdout: (data) => console.log('tsx check:', data),
      onStderr: (data) => console.log('tsx check error:', data)
    });
    await tsxCheck.wait();

    // Run the agent with node and tsx
    console.log('🤖 Running multi-step agent...');
    console.log('   Using: node --import tsx agent.ts');
    const agentProcess = await sandbox.process.start({
      cmd: 'cd /home/user && node --import ./node_modules/tsx/dist/esm/index.mjs agent.ts',
      envVars: {
        EXA_API_KEY: process.env.EXA_API_KEY || '',
        GROQ_API_KEY: process.env.GROQ_API_KEY || '',
        USER_MESSAGE: input.userMessage,
        CONVERSATION_HISTORY: JSON.stringify(input.conversationHistory)
      },
      onStdout: (data) => console.log('Agent stdout:', data),
      onStderr: (data) => console.error('Agent stderr:', data)
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

