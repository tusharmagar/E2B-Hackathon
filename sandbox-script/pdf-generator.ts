import puppeteer from 'puppeteer';
import { readFileSync, existsSync } from 'fs';

export async function generatePDF(insights: any): Promise<Buffer> {
  console.log('🎨 Generating neobrutalism-styled PDF...');

  // Load HTML template
  let html = readFileSync('/home/user/pdf-template.html', 'utf-8');

  // Format SQL queries
  const trendsHtml = insights.sqlQueries
    .slice(0, 5) // Show top 5 queries
    .map((q: any, i: number) => `
      <div class="insight-item">
        <strong>Query ${i + 1}: ${q.reasoning}</strong>
        <pre class="sql-code">${q.query}</pre>
        <p>Results: ${q.result.success ? `${q.result.rowCount} rows` : q.result.error}</p>
      </div>
    `)
    .join('');

  // Format web research
  const webResearchHtml = insights.webSearches.length > 0 
    ? insights.webSearches.map((s: any, i: number) => `
        <div class="insight-item">
          <strong>Research ${i + 1}: ${s.query}</strong>
          <p>${s.result.results ? String(s.result.results).substring(0, 500) : 'No results'}...</p>
        </div>
      `).join('')
    : '<p>No external research was needed - all insights derived from data analysis.</p>';

  // Format statistics
  const statsHtml = insights.statistics.length > 0
    ? insights.statistics.map((s: any) => `
        <div class="stat-box">
          <h3>${s.type} - ${s.column}</h3>
          <pre>${JSON.stringify(s.result.result, null, 2)}</pre>
        </div>
      `).join('')
    : '';

  // Embed charts
  const chartsHtml = insights.charts.map((filename: string) => {
    if (existsSync(filename)) {
      const chartData = readFileSync(filename);
      const base64 = chartData.toString('base64');
      return `
        <div class="chart-container">
          <img src="data:image/png;base64,${base64}" alt="Chart" />
        </div>
      `;
    }
    return '';
  }).join('');

  // Inject data into template
  html = html
    .replace('{{SUMMARY}}', insights.summary || 'Analysis complete')
    .replace('{{TRENDS}}', trendsHtml || '<p>No trend data available</p>')
    .replace('{{INSIGHTS}}', webResearchHtml)
    .replace('{{STATISTICS}}', statsHtml || '<p>No statistical analysis performed</p>')
    .replace('{{CHARTS}}', chartsHtml || '<p>No charts generated</p>');

  // Launch Puppeteer
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  // Generate PDF
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20px',
      right: '20px',
      bottom: '20px',
      left: '20px'
    }
  });

  await browser.close();

  console.log('   ✅ PDF generated successfully');

  return Buffer.from(pdfBuffer);
}

