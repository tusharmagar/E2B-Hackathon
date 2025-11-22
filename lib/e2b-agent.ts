import { Sandbox } from '@e2b/code-interpreter';
import { generateText, tool } from 'ai';
import { groq } from '@ai-sdk/groq';
import { z } from 'zod';
import { E2BAgentInput, E2BAgentOutput } from './types';

// --- Types ---
interface ExaSearchResult {
  title: string;
  url: string;
  snippet: string;
}

// --- Helper Functions ---

async function uploadCsvToSandbox(sandbox: Sandbox, csvBuffer: Buffer, csvPath: string) {
  const copy = Uint8Array.from(csvBuffer); 
  await sandbox.files.write(csvPath, copy.buffer);
}

async function callExa(query: string, numResults: number): Promise<ExaSearchResult[]> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    console.warn('⚠️ EXA_API_KEY not found. Web search will return empty.');
    return [];
  }
  
  try {
    const resp = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({ query, numResults, useAutoprompt: true })
    });

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`Exa search failed: ${resp.status} ${body}`);
    }

    const data = (await resp.json()) as { results?: any[] };
    return (data.results || []).map((r: any) => ({
      title: r.title || 'Untitled',
      url: r.url || '',
      snippet: r.text || r.snippet || ''
    }));
  } catch (error) {
    console.error('Exa API Error:', error);
    return [];
  }
}

// --- Main Agent Function ---

export async function runE2BAgent(input: E2BAgentInput): Promise<E2BAgentOutput> {
  console.log('🚀 Initializing E2B Agent...');

  // 1. Validate Critical Env Vars
  if (!process.env.E2B_API_KEY) throw new Error('E2B_API_KEY is missing from environment variables');
  if (!process.env.GROQ_API_KEY) console.warn('⚠️ GROQ_API_KEY is missing; Groq calls will fail.');

  let sandbox: Sandbox | undefined;

  try {
    // 2. Sandbox Creation with Strict Timeout (Fixes "Stuck" issue)
    const templateId = process.env.E2B_TEMPLATE_ID?.trim() || 'base';
    console.log(`   🏗️ Creating sandbox (Template: ${templateId})...`);

    const startedAt = Date.now();
    
    // Race condition: If E2B takes longer than 45s, throw an error rather than hanging forever
    const sandboxPromise = Sandbox.create(templateId, {
      apiKey: process.env.E2B_API_KEY,
      timeoutMs: 45_000, // E2B SDK timeout
      requestTimeoutMs: 45_000
    });

    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Sandbox creation timed out locally (45s)')), 45000)
    );

    sandbox = await Promise.race([sandboxPromise, timeoutPromise]);

    if (!sandbox) throw new Error('Sandbox creation returned undefined');
    
    const setupTime = Math.round((Date.now() - startedAt) / 1000);
    console.log(`   ✅ Sandbox ready in ${setupTime}s (ID: ${sandbox.sandboxId})`);

    // 3. Upload Data
    const csvPath = '/home/user/data.csv';
    console.log('   📤 Uploading CSV...');
    await uploadCsvToSandbox(sandbox, input.csvBuffer, csvPath);

    // 4. Define Tools
    const allCharts: Buffer[] = [];
    
    const tools = {
      run_python: tool({
        description: 'Run Python code. Use pandas for data analysis and matplotlib for charts (plt.show).',
        parameters: z.object({
          code: z.string().describe('The python code to execute'),
          reasoning: z.string().describe('Why this code is being run')
        }),
        execute: async ({ code, reasoning }) => {
          console.log(`   🐍 Python: ${reasoning}`);
          
          // Execute code in sandbox
          const exec = await sandbox!.runCode(code);

          // Capture Charts (base64 -> Buffer)
          if (exec.results) {
            for (const res of exec.results) {
              if (res.png) {
                allCharts.push(Buffer.from(res.png, 'base64'));
                console.log('      📊 Chart captured');
              }
            }
          }

          // Handle Runtime Errors
          if (exec.error) {
            console.error(`      ❌ Error: ${exec.error.name}: ${exec.error.value}`);
            return { success: false, error: `${exec.error.name}: ${exec.error.value}` };
          }

          // Return Output
          const stdout = exec.logs.stdout.join('\n');
          const textResults = exec.results.map(r => r.text).filter(Boolean).join('\n');
          return {
            success: true,
            output: stdout + '\n' + textResults
          };
        }
      }),
      
      web_search: tool({
        description: 'Search the web for external context (news, industry trends) using Exa.',
        parameters: z.object({
          query: z.string(),
        }),
        execute: async ({ query }) => {
          console.log(`   🌐 Searching: ${query}`);
          const results = await callExa(query, 3);
          return { success: true, results };
        }
      })
    };

    // 5. Run LLM with Groq
    const systemPrompt = `You are an expert data analyst. 
    The CSV is located at: ${csvPath}.
    1. Always load the CSV using pandas first.
    2. Create visualizations using matplotlib (plt.show()) when relevant.
    3. Use 'web_search' only if you need external context not in the CSV.
    4. Be concise.`;

    console.log('   🤖 Querying Groq (openai/gpt-oss-120b)...');
    
    const result = await generateText({
      // Cast to 'any' fixes the TS error caused by mismatched 'ai' SDK versions
      model: groq('openai/gpt-oss-120b') as any,
      system: systemPrompt,
      prompt: input.userMessage,
      tools: tools,
      maxSteps: 10, // Allow multi-step tool use
    });

    console.log('   ✅ Analysis Complete');

    return {
      summary: result.text,
      charts: allCharts,
      insights: {
        steps: result.steps?.length || 0,
        analysis: result.text
      }
    };

  } catch (err) {
    console.error('   ❌ Critical Agent Error:', err);
    throw err;
  } finally {
    if (sandbox) {
      console.log('   🧹 Killing sandbox...');
      await sandbox.kill(); 
    }
  }
}