import 'dotenv/config';
import { Sandbox } from '@e2b/code-interpreter';

async function testConnection() {
  console.log('🧪 Testing E2B connection directly...');

  if (!process.env.E2B_API_KEY) {
    console.error('❌ E2B_API_KEY not found in .env');
    process.exit(1);
  }

  const start = Date.now();
  try {
    console.log('   Requesting sandbox...');
    // We use a very short timeout to fail fast if it hangs
    const sandbox = await Sandbox.create('base', { 
      timeoutMs: 10_000, // Keep alive for 10s
      requestTimeoutMs: 15_000 // Fail request after 15s
    });
    
    const duration = (Date.now() - start) / 1000;
    console.log(`✅ SUCCESS! Sandbox created in ${duration}s`);
    console.log(`   ID: ${sandbox.sandboxId}`);
    
    await sandbox.kill();
    console.log('   Sandbox killed. Network is fine.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ CONNECTION FAILED');
    console.error('   This is likely a network/firewall issue, not a code issue.');
    console.error('   Error details:', error);
    process.exit(1);
  }
}

testConnection();
