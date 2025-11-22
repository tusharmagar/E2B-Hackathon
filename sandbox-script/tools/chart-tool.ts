import { tool } from 'ai';
import { z } from 'zod';
import type Database from 'better-sqlite3';
import { createCanvas } from 'canvas';
import { Chart, registerables } from 'chart.js';
import { writeFileSync } from 'fs';

// Register Chart.js components
Chart.register(...registerables);

export function createChartTool(db: Database.Database) {
  return tool({
    description: `Generate visual charts from the data for inclusion in the PDF report.
    
Create charts to visualize:
- Time-series trends (line charts)
- Comparisons between categories (bar charts)
- Distributions (pie charts)
- Correlations (scatter plots)

Charts are saved as PNG files and included in the final report.`,
    parameters: z.object({
      chart_type: z.enum(['line', 'bar', 'pie']).describe('Type of chart to generate'),
      title: z.string().describe('Chart title'),
      x_column: z.string().describe('Column for X-axis (or labels for pie chart)'),
      y_column: z.string().describe('Column for Y-axis (or values for pie chart)'),
      limit: z.number().optional().default(20).describe('Maximum number of data points')
    }),
    execute: async ({ chart_type, title, x_column, y_column, limit = 20 }) => {
      try {
        console.log(`\n📊 Generating ${chart_type} chart: ${title}`);

        // Fetch data
        const data = db.prepare(`
          SELECT 
            "${x_column}" as x,
            ${chart_type === 'pie' ? `CAST("${y_column}" AS REAL)` : `CAST("${y_column}" AS REAL)`} as y
          FROM data
          WHERE "${x_column}" IS NOT NULL AND "${y_column}" IS NOT NULL
          LIMIT ?
        `).all(limit) as any[];

        if (data.length === 0) {
          return { success: false, error: 'No data to visualize' };
        }

        // Create canvas
        const width = 800;
        const height = 600;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d') as any;

        // Prepare chart data
        const labels = data.map(d => String(d.x));
        const values = data.map(d => d.y);

        // Color palette (neobrutalism style)
        const colors = ['#FFC700', '#FF6B9D', '#00D9FF', '#7C3AED', '#10B981'];

        let chartConfig: any = {
          type: chart_type,
          data: {
            labels,
            datasets: [{
              label: y_column,
              data: values,
              backgroundColor: chart_type === 'pie' 
                ? colors.slice(0, data.length)
                : 'rgba(255, 199, 0, 0.8)',
              borderColor: '#000',
              borderWidth: 3
            }]
          },
          options: {
            responsive: false,
            plugins: {
              title: {
                display: true,
                text: title,
                font: { size: 24, weight: 'bold' as any },
                color: '#000'
              },
              legend: {
                display: chart_type === 'pie',
                position: 'right' as any
              }
            },
            scales: chart_type !== 'pie' ? {
              y: {
                beginAtZero: true,
                ticks: { color: '#000' },
                grid: { color: '#ddd' }
              },
              x: {
                ticks: { 
                  color: '#000',
                  maxRotation: 45,
                  minRotation: 45
                },
                grid: { color: '#ddd' }
              }
            } : undefined
          }
        };

        // Generate chart
        new Chart(ctx, chartConfig);

        // Save to file
        const filename = `chart_${Date.now()}_${chart_type}.png`;
        const buffer = canvas.toBuffer('image/png');
        writeFileSync(filename, buffer);

        console.log(`   ✅ Chart saved: ${filename}`);

        return {
          success: true,
          chart_type,
          title,
          filename,
          dataPoints: data.length
        };

      } catch (error: any) {
        console.error(`   ❌ Chart Error: ${error.message}`);
        return {
          success: false,
          error: error.message,
          chart_type,
          title
        };
      }
    }
  });
}

