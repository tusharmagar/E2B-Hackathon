import { tool } from 'ai';
import { z } from 'zod';
import type Database from 'better-sqlite3';

export function createStatsTool(db: Database.Database) {
  return tool({
    description: `Perform statistical analysis on numeric columns in the database.
    
Use this tool to:
- Calculate descriptive statistics (mean, median, std deviation)
- Detect trends using linear regression
- Find anomalies and outliers
- Calculate growth rates and percentage changes
- Compute correlations between columns
- Identify seasonality patterns`,
    parameters: z.object({
      analysis_type: z.enum(['describe', 'trend', 'anomalies', 'correlation', 'growth']).describe('Type of statistical analysis'),
      column: z.string().describe('Column name to analyze'),
      secondary_column: z.string().optional().describe('Second column for correlation or comparison'),
      time_column: z.string().optional().describe('Date/time column for time-series analysis')
    }),
    execute: async ({ analysis_type, column, secondary_column, time_column }) => {
      try {
        console.log(`\n📈 Statistical Analysis: ${analysis_type} on ${column}`);
        
        let result: any = {};

        switch (analysis_type) {
          case 'describe': {
            // Descriptive statistics
            const stats = db.prepare(`
              SELECT 
                COUNT(*) as count,
                AVG(CAST("${column}" AS REAL)) as mean,
                MIN(CAST("${column}" AS REAL)) as min,
                MAX(CAST("${column}" AS REAL)) as max,
                SUM(CAST("${column}" AS REAL)) as sum
              FROM data
              WHERE "${column}" IS NOT NULL
            `).get() as any;

            // Calculate median
            const medianQuery = db.prepare(`
              SELECT CAST("${column}" AS REAL) as value 
              FROM data 
              WHERE "${column}" IS NOT NULL 
              ORDER BY value 
              LIMIT 1 
              OFFSET (SELECT COUNT(*) FROM data WHERE "${column}" IS NOT NULL) / 2
            `).get() as any;

            result = {
              ...stats,
              median: medianQuery?.value || null
            };
            break;
          }

          case 'trend': {
            // Simple trend analysis with linear regression
            if (!time_column) {
              return { success: false, error: 'time_column required for trend analysis' };
            }

            const data = db.prepare(`
              SELECT 
                "${time_column}" as x,
                CAST("${column}" AS REAL) as y
              FROM data
              WHERE "${column}" IS NOT NULL AND "${time_column}" IS NOT NULL
              ORDER BY "${time_column}"
            `).all() as any[];

            // Simple linear regression
            const n = data.length;
            const sumX = data.reduce((sum, d, i) => sum + i, 0);
            const sumY = data.reduce((sum, d) => sum + d.y, 0);
            const sumXY = data.reduce((sum, d, i) => sum + i * d.y, 0);
            const sumX2 = data.reduce((sum, d, i) => sum + i * i, 0);

            const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
            const intercept = (sumY - slope * sumX) / n;

            result = {
              slope,
              intercept,
              trend: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'flat',
              dataPoints: data.length
            };
            break;
          }

          case 'anomalies': {
            // Detect outliers using IQR method
            const values = db.prepare(`
              SELECT CAST("${column}" AS REAL) as value
              FROM data
              WHERE "${column}" IS NOT NULL
              ORDER BY value
            `).all() as any[];

            const n = values.length;
            const q1Index = Math.floor(n * 0.25);
            const q3Index = Math.floor(n * 0.75);
            
            const q1 = values[q1Index]?.value || 0;
            const q3 = values[q3Index]?.value || 0;
            const iqr = q3 - q1;
            const lowerBound = q1 - 1.5 * iqr;
            const upperBound = q3 + 1.5 * iqr;

            const outliers = values.filter(v => v.value < lowerBound || v.value > upperBound);

            result = {
              q1,
              q3,
              iqr,
              lowerBound,
              upperBound,
              outliersCount: outliers.length,
              outliers: outliers.slice(0, 10) // Show first 10 outliers
            };
            break;
          }

          case 'correlation': {
            // Pearson correlation between two columns
            if (!secondary_column) {
              return { success: false, error: 'secondary_column required for correlation' };
            }

            const data = db.prepare(`
              SELECT 
                CAST("${column}" AS REAL) as x,
                CAST("${secondary_column}" AS REAL) as y
              FROM data
              WHERE "${column}" IS NOT NULL AND "${secondary_column}" IS NOT NULL
            `).all() as any[];

            const n = data.length;
            const sumX = data.reduce((sum, d) => sum + d.x, 0);
            const sumY = data.reduce((sum, d) => sum + d.y, 0);
            const sumXY = data.reduce((sum, d) => sum + d.x * d.y, 0);
            const sumX2 = data.reduce((sum, d) => sum + d.x * d.x, 0);
            const sumY2 = data.reduce((sum, d) => sum + d.y * d.y, 0);

            const numerator = n * sumXY - sumX * sumY;
            const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
            const correlation = denominator === 0 ? 0 : numerator / denominator;

            result = {
              correlation,
              strength: Math.abs(correlation) > 0.7 ? 'strong' : 
                        Math.abs(correlation) > 0.4 ? 'moderate' : 'weak',
              direction: correlation > 0 ? 'positive' : correlation < 0 ? 'negative' : 'none',
              dataPoints: n
            };
            break;
          }

          case 'growth': {
            // Calculate growth rates over time
            if (!time_column) {
              return { success: false, error: 'time_column required for growth analysis' };
            }

            const data = db.prepare(`
              SELECT 
                "${time_column}" as period,
                CAST("${column}" AS REAL) as value
              FROM data
              WHERE "${column}" IS NOT NULL AND "${time_column}" IS NOT NULL
              ORDER BY "${time_column}"
            `).all() as any[];

            const first = data[0]?.value || 0;
            const last = data[data.length - 1]?.value || 0;
            const totalGrowth = first !== 0 ? ((last - first) / first) * 100 : 0;
            const avgGrowth = totalGrowth / (data.length - 1);

            result = {
              startValue: first,
              endValue: last,
              totalGrowth: totalGrowth.toFixed(2) + '%',
              averageGrowth: avgGrowth.toFixed(2) + '%',
              periods: data.length
            };
            break;
          }
        }

        console.log(`   ✅ Analysis complete`);

        return {
          success: true,
          analysis_type,
          column,
          result
        };

      } catch (error: any) {
        console.error(`   ❌ Stats Error: ${error.message}`);
        return {
          success: false,
          error: error.message,
          analysis_type,
          column
        };
      }
    }
  });
}

