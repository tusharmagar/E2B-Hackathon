import { generateText } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import Database from 'better-sqlite3';
import csv from 'csv-parser';
import { createReadStream } from 'fs';
import { writeFileSync } from 'fs';
import { createSqlTool } from './tools/sql-tool.js';
import { createExaTool } from './tools/exa-tool.js';
import { createStatsTool } from './tools/stats-tool.js';
import { createChartTool } from './tools/chart-tool.js';
import { generatePDF } from './pdf-generator.js';

// Get environment variables
const EXA_API_KEY = process.env.EXA_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const USER_MESSAGE = process.env.USER_MESSAGE || 'Analyze this data';
const CONVERSATION_HISTORY = JSON.parse(process.env.CONVERSATION_HISTORY || '[]');

console.log('🚀 Starting Data Analyst Agent...');
console.log(`📝 User Message: ${USER_MESSAGE}`);

// Convert CSV to SQLite
async function csvToSqlite(csvPath: string): Promise<Database.Database> {
  console.log('📊 Converting CSV to SQLite database...');
  
  const db = new Database(':memory:');
  const rows: any[] = [];

  // Parse CSV
  await new Promise<void>((resolve, reject) => {
    createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve())
      .on('error', reject);
  });

  if (rows.length === 0) {
    throw new Error('CSV file is empty');
  }

  console.log(`   ✅ Parsed ${rows.length} rows`);

  // Infer schema from first few rows
  const headers = Object.keys(rows[0]);
  console.log(`   📋 Columns: ${headers.join(', ')}`);

  // Infer data types
  function inferType(values: any[]): string {
    for (const val of values) {
      if (val === null || val === undefined || val === '') continue;
      
      // Try to parse as number
      const num = Number(val);
      if (!isNaN(num)) {
        return Number.isInteger(num) ? 'INTEGER' : 'REAL';
      }
      
      // Try to parse as date
      const date = new Date(val);
      if (!isNaN(date.getTime())) {
        return 'TEXT'; // Store dates as text for flexibility
      }
      
      return 'TEXT';
    }
    return 'TEXT';
  }

  const schema = headers.map(header => {
    const sample = rows.slice(0, 10).map(r => r[header]);
    const type = inferType(sample);
    return `"${header}" ${type}`;
  }).join(', ');

  // Create table
  db.exec(`CREATE TABLE data (${schema})`);
  console.log('   ✅ Created table schema');

  // Insert data
  const placeholders = headers.map(() => '?').join(',');
  const insert = db.prepare(`INSERT INTO data VALUES (${placeholders})`);

  const insertMany = db.transaction((rows: any[]) => {
    for (const row of rows) {
      insert.run(headers.map(h => row[h]));
    }
  });

  insertMany(rows);
  console.log('   ✅ Inserted all data');

  return db;
}

// Main agent function
async function runAgent() {
  try {
    // Step 1: Convert CSV to database
    const db = await csvToSqlite('/home/user/data.csv');

    // Step 2: Initialize Groq
    const groq = createGroq({ apiKey: GROQ_API_KEY });

    // Step 3: Create tools
    const tools = {
      query_database: createSqlTool(db),
      search_web: createExaTool(),
      calculate_statistics: createStatsTool(db),
      generate_chart: createChartTool(db)
    };

    // Step 4: Build system prompt
    const systemPrompt = `You are an expert data analyst AI agent with deep analytical capabilities. Your mission is to thoroughly analyze CSV data and provide comprehensive, actionable insights.

**YOUR ANALYSIS APPROACH:**

1. **START WITH DATA EXPLORATION** (Always do this first):
   - Query the database structure: SELECT * FROM data LIMIT 5
   - Understand what columns exist and their data types
   - Get a sense of the data scale: SELECT COUNT(*) FROM data

2. **PERFORM DEEP SQL ANALYSIS** (This is your primary tool):
   - Calculate aggregations (SUM, AVG, COUNT, MIN, MAX)
   - Group by time periods to find trends
   - Segment by categories to compare performance
   - Identify top/bottom performers
   - Find patterns and anomalies
   - Run multiple queries from different angles

3. **APPLY STATISTICAL METHODS**:
   - Use calculate_statistics to quantify insights
   - Detect trends (increasing/decreasing)
   - Find outliers and anomalies
   - Calculate correlations between variables
   - Measure growth rates

4. **CREATE VISUALIZATIONS**:
   - Generate charts for key findings
   - Show trends over time (line charts)
   - Compare categories (bar charts)
   - Make data visual and easy to understand

5. **WEB RESEARCH (Use Sparingly)**:
   - ONLY use search_web when you find something that NEEDS external explanation
   - Examples: "Why did sales drop 40% in March?" → Search for events in that month
   - User explicitly asks to research a URL or topic
   - You need industry context to explain an anomaly
   - DO NOT search for things that are obvious from the data

**IMPORTANT GUIDELINES:**
- Be thorough: Use 10-15 steps to build comprehensive insights
- Go deep: Don't stop at surface-level observations
- Be specific: Quote actual numbers and percentages
- Find the "why": Don't just state what happened, explain WHY
- Connect the dots: Look for relationships between different metrics
- Think critically: Challenge assumptions and dig deeper

**CURRENT CONTEXT:**
User message: ${USER_MESSAGE}
Previous conversation: ${CONVERSATION_HISTORY.length > 0 ? JSON.stringify(CONVERSATION_HISTORY) : 'None'}`;

    // Step 5: Run multi-step agent
    console.log('\n🤖 Starting multi-step analysis...\n');

    const result = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      tools,
      maxSteps: 15, // Allow deep iterative reasoning
      system: systemPrompt,
      prompt: `Analyze the data in the database. ${USER_MESSAGE}`,
      onStepFinish: (step) => {
        console.log(`\n📍 Step ${step.stepNumber}:`);
        console.log(`   💭 ${step.text?.substring(0, 200)}${step.text && step.text.length > 200 ? '...' : ''}`);
        if (step.toolCalls && step.toolCalls.length > 0) {
          console.log(`   🔧 Tools: ${step.toolCalls.map(t => t.toolName).join(', ')}`);
        }
      }
    });

    console.log('\n✅ Analysis complete!\n');
    console.log('📄 Final Insights:');
    console.log(result.text);

    // Step 6: Extract tool results for PDF
    const sqlQueries: any[] = [];
    const webSearches: any[] = [];
    const charts: string[] = [];
    const statistics: any[] = [];

    for (const step of result.steps) {
      if (step.toolCalls) {
        for (const call of step.toolCalls) {
          const toolResult = step.toolResults?.find((r: any) => r.toolCallId === call.toolCallId);
          
          if (call.toolName === 'query_database' && toolResult) {
            sqlQueries.push({
              query: call.args.query,
              reasoning: call.args.reasoning,
              result: toolResult.result
            });
          } else if (call.toolName === 'search_web' && toolResult) {
            webSearches.push({
              query: call.args.query,
              result: toolResult.result
            });
          } else if (call.toolName === 'generate_chart' && toolResult) {
            if (toolResult.result.success) {
              charts.push(toolResult.result.filename);
            }
          } else if (call.toolName === 'calculate_statistics' && toolResult) {
            statistics.push({
              type: call.args.analysis_type,
              column: call.args.column,
              result: toolResult.result
            });
          }
        }
      }
    }

    // Step 7: Generate PDF report
    console.log('\n📄 Generating PDF report...');
    
    const insights = {
      summary: result.text,
      sqlQueries,
      webSearches,
      statistics,
      charts
    };

    const pdfBuffer = await generatePDF(insights);
    writeFileSync('/home/user/report.pdf', pdfBuffer);
    
    console.log('   ✅ PDF saved: /home/user/report.pdf');

    // Step 8: Save insights as JSON
    writeFileSync('/home/user/insights.json', JSON.stringify({
      summary: result.text,
      toolsUsed: {
        sql: sqlQueries.length,
        web: webSearches.length,
        stats: statistics.length,
        charts: charts.length
      },
      steps: result.steps.length
    }, null, 2));

    console.log('\n🎉 Agent completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Agent error:', error);
    throw error;
  }
}

// Run the agent
runAgent().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

