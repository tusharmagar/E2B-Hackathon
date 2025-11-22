import { tool } from 'ai';
import { z } from 'zod';
import type Database from 'better-sqlite3';

export function createSqlTool(db: Database.Database) {
  return tool({
    description: `Execute SQL queries against the CSV database to explore data, find trends, aggregate metrics, and discover patterns.
    
The database has a table called 'data' with columns from the CSV file.
Use this tool to:
- Explore the database structure (SELECT * FROM data LIMIT 5)
- Find trends over time (GROUP BY date columns)
- Calculate aggregations (SUM, AVG, COUNT, etc.)
- Identify anomalies or outliers
- Compare different segments of data`,
    parameters: z.object({
      query: z.string().describe('SQL query to execute (queries the "data" table)'),
      reasoning: z.string().describe('Brief explanation of what you are trying to find with this query')
    }),
    execute: async ({ query, reasoning }) => {
      try {
        console.log(`\n📊 SQL Query: ${reasoning}`);
        console.log(`   ${query}`);
        
        const results = db.prepare(query).all();
        
        console.log(`   ✅ Returned ${results.length} rows`);
        
        return {
          success: true,
          rowCount: results.length,
          data: results.slice(0, 100), // Limit to 100 rows for context window
          fullData: results, // Keep full data for further processing
          reasoning
        };
      } catch (error: any) {
        console.error(`   ❌ SQL Error: ${error.message}`);
        return {
          success: false,
          error: error.message,
          reasoning
        };
      }
    }
  });
}

