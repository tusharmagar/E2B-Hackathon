// runE2BAgent.ts
import { Sandbox } from '@e2b/code-interpreter';
import { Sandbox as SandboxMCP } from 'e2b';
import OpenAI from 'openai';
import { E2BAgentInput, E2BAgentOutput, Message } from './types';

// -------------------- Type Extensions for MCP --------------------
// MCP helpers are relatively new; TS types may lag the runtime.
// Keep this loose so we don't fight the type system during development.
type MCPSandboxOptions = {
  mcp?: {
    exa?: {
      apiKey: string;
    };
  };
  timeoutMs?: number;
};

type MCPSandbox = any;

// -------------------- Helpers --------------------

function extractResponseOutputText(resp: any): string {
  if (!resp) return '';

  // Preferred field from Responses API
  if (resp.output_text) {
    return String(resp.output_text).trim();
  }

  const parts: string[] = [];
  const push = (val: any) => {
    if (val) parts.push(String(val));
  };

  const scanContent = (content: any) => {
    if (!content) return;
    if (typeof content === 'string') {
      push(content);
      return;
    }
    if (Array.isArray(content)) {
      content.forEach(scanContent);
      return;
    }
    if (content.type === 'output_text' && content.text) {
      push(content.text);
    }
    if (content.output_text?.text) {
      push(content.output_text.text);
    }
    if (content.text?.value) {
      push(content.text.value);
    }
    if (content.text) {
      push(content.text);
    }
  };

  if (Array.isArray(resp.output)) {
    resp.output.forEach((chunk: any) => {
      if (chunk?.output_text) push(chunk.output_text);
      if (chunk?.output_text?.text) push(chunk.output_text.text);
      scanContent(chunk.content);
    });
  }

  return parts.join('\n').trim();
}

async function uploadCsvToSandbox(
  sandbox: Sandbox,
  csvBuffer: Buffer,
  csvPath: string,
) {
  console.log(`   ⏳ Uploading ${csvBuffer.length} bytes to sandbox...`);

  const arrayBuffer = new ArrayBuffer(csvBuffer.byteLength);
  const view = new Uint8Array(arrayBuffer);
  view.set(csvBuffer);

  await sandbox.files.write(csvPath, arrayBuffer);

  console.log('   ✅ Upload complete');
}

function formatConversationHistory(history: Message[]): string {
  if (!history || history.length === 0) return '';
  return history
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');
}

function extractUrls(text: string): string[] {
  if (!text) return [];
  const regex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(regex);
  return matches ? Array.from(new Set(matches)) : [];
}

/**
 * Use Exa through E2B Docker MCP to pull context for user-provided URLs.
 * This spins up a dedicated MCP sandbox, calls Exa via MCP, and returns a
 * structured text summary to inject into the main agent as system context.
 */
async function fetchExternalContextViaMCP(
  userMessage: string,
  client: OpenAI,
): Promise<string> {
  const urls = extractUrls(userMessage || '');
  if (!urls.length) {
    console.log('   🔎 No URLs detected for Exa MCP.');
    return '';
  }

  if (!process.env.EXA_API_KEY) {
    console.warn(
      '   ⚠️ EXA_API_KEY missing. Skipping Exa MCP context (Docker).',
    );
    return '';
  }

  console.log('   🔎 Detected URLs for Exa MCP:', urls);

  // Spin up an E2B sandbox WITH Exa MCP server configured
  console.log('   🐳 Creating E2B MCP sandbox for Exa...');
  const mcpSandbox = (await SandboxMCP.create({
    mcp: {
      exa: {
        apiKey: process.env.EXA_API_KEY!,
      },
    },
    timeoutMs: 600_000, // 10 minutes
  } as MCPSandboxOptions)) as MCPSandbox;

  console.log('   ✅ MCP sandbox created');

  // Guard for older e2b versions / missing MCP helpers
  const hasGetMcpUrl = typeof mcpSandbox.getMcpUrl === 'function';
  const hasGetMcpToken = typeof mcpSandbox.getMcpToken === 'function';

  if (!hasGetMcpUrl || !hasGetMcpToken) {
    console.warn(
      '   ⚠️ MCP helpers (getMcpUrl/getMcpToken) are not available on this Sandbox instance.\n' +
        '      This usually means your `e2b` SDK version is too old for MCP.\n' +
        '      Exa *is* being configured on the Docker side, but we cannot wire it into OpenAI Responses.\n' +
        '      -> Skipping external Exa context for this run.',
    );
    try {
      await mcpSandbox.kill?.();
    } catch (e) {
      console.error('   ⚠️ MCP cleanup warning:', e);
    }
    return '';
  }

  console.log(`      MCP URL: ${mcpSandbox.getMcpUrl()}`);

  try {
    const mcpToken = await mcpSandbox.getMcpToken();

    const researchPrompt = `
You are a research assistant helping with a data-analysis report.

The user shared these URLs:
${urls.join('\n')}

Using ONLY the Exa MCP tool, do the following:
- Fetch the most relevant information from these URLs.
- Extract key stats, definitions, and contextual points that could help interpret a CSV of bookings/reservations/sales.
- Produce a concise, structured summary that can be embedded as "external context" in a data report.
- Focus on: business model, important metrics, domain definitions, and any benchmarks mentioned.
Return your answer as markdown paragraphs and bullet points, no code.
`.trim();

    console.log('   🌐 Starting MCP-based Exa research via OpenAI Responses...');
    const response = await (client as any).responses.create({
      model: 'gpt-4.1',
      input: [
        {
          role: 'user',
          content: [{ type: 'input_text', text: researchPrompt }],
        },
      ],
      tools: [
        {
          type: 'mcp',
          server_label: 'e2b-mcp-gateway',
          server_url: mcpSandbox.getMcpUrl(),
          headers: {
            Authorization: `Bearer ${mcpToken}`,
          },
        },
      ],
      tool_choice: 'auto',
    });

    const anyResp = response as any;
    const outputText = extractResponseOutputText(anyResp);

    console.log(
      `   📎 Exa MCP external context length: ${outputText.length} chars`,
    );
    if (!outputText) {
      console.warn(
        '   ⚠️ Exa MCP returned no text. Continuing without external context.',
      );
      console.log(
        '   🧪 Exa MCP raw output keys:',
        Object.keys(anyResp || {}),
      );
      if (anyResp?.output) {
        console.log(
          '   🧪 Exa MCP raw output preview:',
          JSON.stringify(anyResp.output).slice(0, 400),
        );
      }
    }

    return outputText;
  } catch (err) {
    console.error('   ❌ Exa MCP research failed:', err);
    return '';
  } finally {
    console.log('   🐳 Cleaning up MCP sandbox...');
    await mcpSandbox
      .kill()
      .catch((e: any) => console.error('   ⚠️ MCP cleanup warning:', e));
  }
}

// -------------------- Main Agent --------------------

export async function runE2BAgent(
  input: E2BAgentInput,
): Promise<E2BAgentOutput> {
  console.log('\n🚀 --- STARTING AGENT RUN (OpenAI GPT-5.1, E2B + Exa MCP) ---');

  if (!process.env.E2B_API_KEY) throw new Error('E2B_API_KEY missing');
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY missing');

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  });

  // 1) OPTIONAL: external context via Exa MCP (Docker)
  const externalContext = await fetchExternalContextViaMCP(
    input.userMessage,
    client,
  );

  let sandbox: Sandbox | undefined;
  const allCharts: Buffer[] = [];

  try {
    const rawTemplate = process.env.E2B_TEMPLATE_ID?.trim();
    const hasTemplate = !!rawTemplate;

    console.log(
      `   🏗️ Requesting Code-Interpreter Sandbox (Template: ${
        hasTemplate ? rawTemplate : 'default'
      })...`,
    );
    const startedAt = Date.now();

    let sandboxPromise: Promise<Sandbox>;
    if (hasTemplate) {
      sandboxPromise = Sandbox.create(rawTemplate!, {
        apiKey: process.env.E2B_API_KEY!,
        timeoutMs: 300_000,
        requestTimeoutMs: 30_000,
      });
    } else {
      sandboxPromise = Sandbox.create({
        apiKey: process.env.E2B_API_KEY!,
        timeoutMs: 300_000,
        requestTimeoutMs: 30_000,
      });
    }

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('Sandbox creation timed out locally (30s)')),
        30_000,
      ),
    );

    sandbox = (await Promise.race([
      sandboxPromise,
      timeoutPromise,
    ])) as Sandbox;

    const setupTime = Math.round((Date.now() - startedAt) / 1000);
    console.log(
      `   ✅ Sandbox Ready in ${setupTime}s (ID: ${sandbox.sandboxId})`,
    );

    const csvPath = '/home/user/data.csv';
    await uploadCsvToSandbox(sandbox, input.csvBuffer, csvPath);

    // -------------------- Tools Schema --------------------
    const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
      {
        type: 'function',
        function: {
          name: 'run_python',
          description: `
Run Python code to analyze the CSV and generate charts.

- The CSV is at '${csvPath}'.
- ALWAYS start by:
  import pandas as pd
  df = pd.read_csv('${csvPath}')
- For complex analysis, you MAY:
  - Create SQLite DB with sqlite3
  - df.to_sql('data', conn, if_exists='replace', index=False)
- Use matplotlib.pyplot as plt and ALWAYS call plt.show() for charts.`,
          parameters: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: 'The Python code to execute in a single cell.',
              },
              reasoning: {
                type: 'string',
                description:
                  'Brief explanation of what this code is trying to do.',
              },
            },
            required: ['code', 'reasoning'],
          },
        },
      },
    ];

    // -------------------- System Prompt --------------------

    const systemPrompt = `
You are an advanced **Data Analyst & Report Builder Agent** working inside an E2B code-interpreter sandbox.

You can:
- Run Python code on the CSV file at '${csvPath}' using the "run_python" tool.
- Optionally build a SQLite database from the CSV for complex SQL-style analysis.

🚨 VERY IMPORTANT:
- Your **first response MUST be a call to the \`run_python\` tool**.
- That first \`run_python\` call **must**:
  - Import pandas as pd
  - Load the CSV from '${csvPath}' into a DataFrame named \`df\`
  - Print df.head(), df.info(), and df.describe(include="all").
- After that:
  - You MUST call \`run_python\` again to compute metrics / aggregations.
  - You MUST call \`run_python\` again to generate at least **3 charts** using matplotlib and call plt.show().

You are NOT allowed to finish with a natural language answer until at least 3 charts have been generated.

STRICT WORKFLOW:

1. EXPLORE (MANDATORY)
   - Load CSV into df.
   - Inspect head, info, describe.

2. METRICS / SQL-LIKE ANALYSIS (MANDATORY, KPI-FOCUSED)
   - Compute relevant aggregates, group-bys, KPIs, etc.
   - Always try to surface concrete **numeric KPIs**, e.g.:
     - Totals (e.g., total bookings, total revenue)
     - Averages (e.g., avg nightly rate, avg party size)
     - Rates / percentages (e.g., occupancy rate, cancellation rate, share of top categories)
     - Rankings (e.g., top 5 dates, top 5 categories/items by volume or value)
   - Prefer numbers over vague descriptions. Every major point in your final report should be backed by at least one number.

3. VISUALIZE (MANDATORY)
   - Create at least 3 meaningful charts with matplotlib (and optionally seaborn).
   - Always call plt.show().
   - Prefer a mix of:
     - Time series or trend chart (if there is a date/time column),
     - Distribution chart (histogram / boxplot),
     - Category-wise comparison (bar chart).

4. CONTEXT (OPTIONAL BUT RECOMMENDED)
   - The system may provide **"External context from user-provided links (via Exa MCP)"** as an additional system message.
   - When present, you MUST:
     - Read it carefully.
     - Incorporate any relevant definitions, benchmarks, or domain context into your analysis and final report.
     - Where useful, compare your computed KPIs against any benchmarks mentioned.

5. FINAL REPORT (MANDATORY)
   - Only after charts exist:
     - Write a detailed report with key findings.
     - Include a dedicated **"Key KPIs"** subsection near the top, listing the most important metrics as bullet points with numbers.
     - For each chart, include a clearly labeled subsection:
       - "Chart 1 – [Title]"
       - "Chart 2 – [Title]"
       - "Chart 3 – [Title]"
     - In each subsection, describe:
       - What the chart shows,
       - The main numeric insights (e.g., levels, trends, outliers),
       - Any connection to the external context/benchmarks when relevant.

If you attempt to answer in natural language before generating charts, the orchestrator will ask you to continue.
`.trim();

    const historyText = formatConversationHistory(input.conversationHistory);
    const combinedPrompt = historyText
      ? `Conversation so far:\n${historyText}\n\nCurrent user request:\n${input.userMessage}`
      : input.userMessage;

    // -------------------- Chat Loop --------------------

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...(externalContext
        ? [
            {
              role: 'system',
              content:
                'External context from user-provided links (via Exa MCP, running inside E2B Docker):\n\n' +
                externalContext,
            } as const,
          ]
        : []),
      { role: 'user', content: combinedPrompt },
    ];

    let stepCount = 0;
    let finalSummary = '';

    const MIN_CHARTS = 3;
    const MAX_ROUNDS = 10;

    for (let round = 0; round < MAX_ROUNDS; round++) {
      console.log(
        `\n   🔁 LLM ROUND ${round + 1} (messages length: ${
          messages.length
        })`,
      );

      const completion = await client.chat.completions.create({
        model: 'gpt-5.1',
        messages,
        tools,
        tool_choice: 'auto',
      });

      const choice = completion.choices[0];
      const message = choice.message;
      stepCount++;

      console.log(
        `   📍 STEP ${stepCount} | finish_reason: ${choice.finish_reason}`,
      );
      console.log(
        '      🧠 Assistant content:',
        message.content ? String(message.content).slice(0, 400) : '<empty>',
      );

      // 1) Handle tool calls (Python in E2B)
      if (message.tool_calls && message.tool_calls.length > 0) {
        console.log(
          `      🛠️ Tool calls (${message.tool_calls.length}):`,
          JSON.stringify(message.tool_calls, null, 2),
        );

        messages.push({
          role: 'assistant',
          content: message.content || null,
          tool_calls: message.tool_calls,
        } as any);

        for (const toolCall of message.tool_calls) {
          const toolName = toolCall.function.name;
          const rawArgs = toolCall.function.arguments || '{}';

          console.log(
            `      🔧 Executing tool "${toolName}" with args: ${rawArgs}`,
          );

          let toolResultContent = '';

          try {
            if (toolName === 'run_python') {
              const parsed = JSON.parse(rawArgs) as {
                code: string;
                reasoning: string;
              };
              console.log(
                `         🐍 Reasoning: ${parsed.reasoning.slice(0, 200)}`,
              );
              const exec = await sandbox!.runCode(parsed.code);

              console.log(
                '         📦 Python exec summary:',
                JSON.stringify(
                  {
                    error: exec.error,
                    resultsCount: exec.results?.length ?? 0,
                    stdoutLines: exec.logs?.stdout?.length ?? 0,
                    stderrLines: exec.logs?.stderr?.length ?? 0,
                  },
                  null,
                  2,
                ),
              );

              let chartsInStep = 0;
              if (exec.results && exec.results.length > 0) {
                for (const res of exec.results) {
                  if (res.png) {
                    allCharts.push(Buffer.from(res.png, 'base64'));
                    chartsInStep++;
                  }
                }
              }

              if (exec.error) {
                toolResultContent = JSON.stringify({
                  status: 'error',
                  name: exec.error.name,
                  value: exec.error.value,
                  traceback: exec.error.traceback,
                  charts_generated: chartsInStep,
                });
              } else {
                const stdout = (exec.logs?.stdout || []).join('\n');
                const textResults = (exec.results || [])
                  .map((r) => r.text)
                  .filter(Boolean)
                  .join('\n');

                toolResultContent = JSON.stringify({
                  status: 'success',
                  stdout,
                  data_preview: textResults.slice(0, 1000),
                  charts_generated: chartsInStep,
                });
              }
            } else {
              toolResultContent = JSON.stringify({
                status: 'error',
                message: `Unknown tool: ${toolName}`,
              });
            }
          } catch (toolErr: any) {
            console.error(`         ❌ Tool "${toolName}" failed:`, toolErr);
            toolResultContent = JSON.stringify({
              status: 'error',
              message: toolErr?.message || String(toolErr),
            });
          }

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: toolName,
            content: toolResultContent,
          } as any);
        }

        // After tools, loop again
        continue;
      }

      // 2) No tool calls: model is trying to answer in natural language
      let contentText = '';
      if (typeof message.content === 'string') {
        contentText = message.content.trim();
      } else if (message.content && typeof message.content === 'object') {
        const contentArray = Array.isArray(message.content)
          ? message.content
          : [message.content];
        contentText = contentArray
          .map((p: any) =>
            typeof p === 'string'
              ? p
              : typeof p?.text === 'string'
              ? p.text
              : '',
          )
          .join(' ')
          .trim();
      }

      console.log(
        '      🧠 Non-tool assistant content length:',
        contentText.length,
      );

      // If we don't have enough charts yet, push follow-up and continue
      if (allCharts.length < MIN_CHARTS && round < MAX_ROUNDS - 1) {
        console.log(
          `      ⚠️ Assistant tried to finish early with ${allCharts.length} charts. Forcing it to continue and create more charts.`,
        );

        messages.push({
          role: 'assistant',
          content: contentText || '(partial summary)',
        });

        messages.push({
          role: 'user',
          content:
            `You have not yet generated the required ${MIN_CHARTS} charts. ` +
            `Please continue the analysis:\n` +
            `- Use run_python to compute more metrics if needed\n` +
            `- Use run_python again to generate at least ${
              MIN_CHARTS - allCharts.length
            } additional visualizations with matplotlib and plt.show()\n` +
            `Remember to weave in the external context from the system messages where relevant.\n` +
            `Do not write a final report until all required charts are created.`,
        });

        continue;
      }

      // Else, accept as final summary
      finalSummary = contentText;
      console.log(
        '   🧠 Final assistant message content length:',
        finalSummary.length,
      );
      break;
    }

    if (!finalSummary || finalSummary.length < 50) {
      console.warn(
        '   ⚠️ Final summary was empty or too short. Using fallback.',
      );
      finalSummary =
        'The analysis completed, but the model returned a very short response. Please review the generated charts and logs for details.';
    }

    console.log(`   📊 Total Charts Captured: ${allCharts.length}`);

    const output: E2BAgentOutput = {
      summary: finalSummary,
      charts: allCharts,
      externalContext,
      insights: {
        steps: 'manual-chat-loop',
        analysis: finalSummary,
        totalCharts: allCharts.length,
        externalContextUsed: !!externalContext,
      },
    };

    return output;
  } catch (err: any) {
    console.error('\n   ❌ CRITICAL AGENT ERROR:', err);
    if (err?.message?.includes('timeout')) {
      throw new Error(
        'Connection to E2B Sandbox timed out. Please try again.',
      );
    }
    throw err;
  } finally {
    if (sandbox) {
      console.log('   🧹 Cleanup: Killing sandbox...');
      sandbox.kill().catch((e) => console.error('Cleanup warning:', e));
    }
  }
}
