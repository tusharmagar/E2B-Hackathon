import { tool } from 'ai';
import { z } from 'zod';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

let mcpClient: Client | null = null;

async function initializeMCPClient() {
  if (mcpClient) return mcpClient;

  console.log('🔌 Initializing Exa MCP client via Docker...');
  
  const transport = new StdioClientTransport({
    command: 'docker',
    args: ['run', '-i', '--rm', '-e', 'EXA_API_KEY', 'mcp/exa'],
    env: { EXA_API_KEY: process.env.EXA_API_KEY || '' }
  });

  mcpClient = new Client(
    {
      name: 'data-analyst-agent',
      version: '1.0.0'
    },
    {
      capabilities: {}
    }
  );

  await mcpClient.connect(transport);
  console.log('✅ Exa MCP client connected');

  return mcpClient;
}

export function createExaTool() {
  return tool({
    description: `Search the web using Exa AI to find external context, news, events, or analyze URLs.
    
Use this tool ONLY when you need external information that cannot be found in the CSV data:
- Explaining WHY certain trends occurred (e.g., "why did sales drop in September 2024?")
- Researching industry events or market conditions
- Analyzing competitor information
- Investigating URLs provided by the user
- Finding explanations for anomalies in the data

DO NOT use this for information that can be derived from the CSV data itself.`,
    parameters: z.object({
      query: z.string().describe('Search query or URL to research'),
      numResults: z.number().optional().default(5).describe('Number of results to return (default: 5)')
    }),
    execute: async ({ query, numResults = 5 }) => {
      try {
        console.log(`\n🌐 Web Search: ${query}`);
        
        const client = await initializeMCPClient();
        
        const result = await client.request({
          method: 'tools/call',
          params: {
            name: 'search',
            arguments: {
              query,
              numResults
            }
          }
        });

        // Extract content from MCP response
        const content = Array.isArray(result.content) ? result.content : [result.content];
        const textContent = content
          .filter((item: any) => item.type === 'text')
          .map((item: any) => item.text)
          .join('\n');

        console.log(`   ✅ Found ${numResults} results`);

        return {
          success: true,
          results: textContent,
          query
        };
      } catch (error: any) {
        console.error(`   ❌ Exa Search Error: ${error.message}`);
        return {
          success: false,
          error: error.message,
          query
        };
      }
    }
  });
}

