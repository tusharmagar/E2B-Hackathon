import { Sandbox } from '@e2b/code-interpreter';
import { generateText } from 'ai';
import { groq } from '@ai-sdk/groq';
import { tool } from 'ai';
import { z } from 'zod';
import { E2BAgentInput, E2BAgentOutput } from './types.js';

export async function runE2BAgent(input: E2BAgentInput): Promise<E2BAgentOutput> {
  console.log('🚀 Initializing E2B sandbox...');
  
  // Check API key
  if (!process.env.E2B_API_KEY) {
    throw new Error('E2B_API_KEY is not set in environment variables');
  }
  
  console.log(`   Using E2B API key: ${process.env.E2B_API_KEY.substring(0, 10)}...`);
  const templateId = process.env.E2B_TEMPLATE_ID?.trim();
  if (templateId) {
    console.log(`   Using E2B template: ${templateId}`);
  }
  
  // Create sandbox with timeout and error handling
  let sandbox: Sandbox | undefined;
  try {
    console.log('   Creating E2B Sandbox...');
    const createStarted = Date.now();
    const creationWarn = setTimeout(() => {
      console.log('   ⏳ Still creating sandbox (cold start can take ~30-60s)...');
    }, 20000);
    const createOpts = {
      apiKey: process.env.E2B_API_KEY,
      timeoutMs: 300000, // 5 minutes sandbox lifetime
      requestTimeoutMs: 120000, // allow extra time for cold starts
    };

    sandbox = templateId
      ? await Sandbox.create(templateId, createOpts)
      : await Sandbox.create(createOpts);
    clearTimeout(creationWarn);

    const createSeconds = Math.round((Date.now() - createStarted) / 1000);
    console.log(`   ✅ Sandbox created in ${createSeconds}s`);
  } catch (error: any) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('   ❌ Failed to create E2B sandbox:', message);
    console.error('   ℹ️ Check E2B API key, credits, or template ID if configured.');
    throw new Error(`E2B initialization failed: ${message}`);
  }

  try {
    // Upload CSV to sandbox
    console.log('📤 Uploading CSV to sandbox...');
    const csvPath = '/home/user/data.csv';
    const csvCopy = Uint8Array.from(input.csvBuffer);
    await sandbox.files.write(csvPath, csvCopy.buffer);
    console.log(`   ✅ CSV uploaded to ${csvPath}`);

    // Store all charts generated during analysis
    const allCharts: Buffer[] = [];

    // Define tools that generate Python code
    const tools = {
      run_python_analysis: tool({
        description: `Execute Python code for data analysis. 
        
The CSV file is already loaded at '${csvPath}'.
You have access to: pandas, numpy, matplotlib, sqlite3, and all standard Python libraries.

Use this tool to:
- Load and explore the CSV data with pandas
- Perform SQL queries (create SQLite in-memory database)
- Calculate statistics, trends, correlations
- Generate charts with matplotlib (use plt.show() to display)
- Analyze patterns and anomalies

Charts will be automatically captured when you use plt.show().`,
        parameters: z.object({
          code: z.string().describe('Python code to execute for analysis'),
          reasoning: z.string().describe('Brief explanation of what this code does')
        }),
        execute: async ({ code, reasoning }) => {
          console.log(`\n🐍 Python: ${reasoning}`);
          
          const execution = await sandbox.runCode(code);
          
          if (execution.error) {
            console.error(`   ❌ Error: ${execution.error.value}`);
            return {
              success: false,
              error: execution.error.value,
              traceback: execution.error.traceback
            };
          }
          
          // Collect charts from this execution
          for (const result of execution.results) {
            if (result.png) {
              allCharts.push(Buffer.from(result.png, 'base64'));
              console.log(`   📊 Chart captured`);
            }
          }
          
          console.log(`   ✅ Success`);
          
          // Return execution results
          const textResults = execution.results
            .filter((r: any) => r.text)
            .map((r: any) => r.text)
            .join('\n');
          
          return {
            success: true,
            output: execution.logs.stdout.join('\n') || textResults || 'Code executed successfully',
            charts_generated: execution.results.filter((r: any) => r.png).length
          };
        }
      }),
      
      search_web_with_exa: tool({
        description: `Search the web using Exa AI to find external context.
        
Use ONLY when you need information NOT in the CSV:
- Explaining WHY specific trends occurred (e.g., "why did sales drop in September?")
- Industry events, news, or market conditions
- External factors affecting the data
- Context for anomalies

DO NOT use for information derivable from the data itself.`,
        parameters: z.object({
          query: z.string().describe('Search query for external context'),
          numResults: z.number().default(3).describe('Number of results (default: 3)')
        }),
        execute: async ({ query, numResults }) => {
          console.log(`\n🌐 Exa search: ${query}`);
          
          // For now, use a simple web search placeholder
          // TODO: Integrate Exa properly via MCP when available
          const searchCode = `
# Web search: ${query.replace(/'/g, "\\'")}
print("Web search functionality coming soon!")
print("Query: ${query.replace(/'/g, "\\'")}")
print("Note: Focus on insights from the CSV data for now.")
`;
          
          const execution = await sandbox.runCode(searchCode);
          
          if (execution.error) {
            console.error(`   ❌ Search failed: ${execution.error.value}`);
            return {
              success: false,
              error: execution.error.value
            };
          }
          
          const output = execution.logs.stdout.join('\n');
          console.log(`   ✅ Search completed`);
          
          return {
            success: true,
            results: output || 'Search completed'
          };
        }
      })
    };

    // System prompt for the AI agent
    const systemPrompt = `You are an expert data analyst AI. You have a CSV file at ${csvPath} in an E2B Python sandbox.

**ANALYSIS WORKFLOW:**

1. **Load & Explore** - Use pandas to load CSV and understand structure:
   \`\`\`python
   import pandas as pd
   df = pd.read_csv('${csvPath}')
   print(df.head())
   print(df.info())
   print(df.describe())
   \`\`\`

2. **SQL Analysis** - Convert to SQLite for complex queries:
   \`\`\`python
   import sqlite3
   conn = sqlite3.connect(':memory:')
   df.to_sql('data', conn, index=False)
   result = pd.read_sql("SELECT * FROM data WHERE value > 100", conn)
   print(result)
   \`\`\`

3. **Statistics** - Calculate trends, correlations, detect anomalies

4. **Visualizations** - Create charts with matplotlib:
   \`\`\`python
   import matplotlib.pyplot as plt
   plt.figure(figsize=(10, 6))
   plt.plot(df['date'], df['sales'])
   plt.title('Sales Over Time')
   plt.show()  # This captures the chart!
   \`\`\`

5. **Web Research** - ONLY when external context is needed (use sparingly!)

**IMPORTANT:**
- Execute 8-12 analysis steps for comprehensive insights
- Always use plt.show() to display charts (they're auto-captured)
- Quote actual numbers and percentages
- Explain the "why" behind patterns
- Use web search only for external events/context

**USER REQUEST:** ${input.userMessage}

Perform a thorough analysis!`;

    // Run multi-step agent
    console.log('\n🤖 Starting multi-step AI analysis...\n');
    
    const result = await generateText({
      model: groq('gpt-oss-120b') as any,
      tools,
      maxSteps: 15,
      system: systemPrompt,
      prompt: input.userMessage,
      onStepFinish: (step: any) => {
        const stepNum = step.stepIndex !== undefined ? step.stepIndex + 1 : 'N';
        console.log(`\n📍 Step ${stepNum}`);
        if (step.text) {
          const preview = step.text.substring(0, 120);
          console.log(`   💭 ${preview}${step.text.length > 120 ? '...' : ''}`);
        }
        if (step.toolCalls && step.toolCalls.length > 0) {
          console.log(`   🔧 Tools: ${step.toolCalls.map((t: any) => t.toolName).join(', ')}`);
        }
      }
    });

    console.log('\n✅ Analysis complete!\n');
    console.log(`📊 Generated ${allCharts.length} chart(s)`);

    return {
      summary: result.text,
      charts: allCharts,
      insights: {
        steps: result.steps?.length || 0,
        analysis: result.text
      }
    };

  } catch (error) {
    console.error('❌ E2B agent error:', error);
    throw error;
  } finally {
    if (sandbox) {
      console.log('🧹 Cleaning up sandbox...');
      await sandbox.kill();
    }
  }
}
