// generatePDF.ts
import puppeteer from 'puppeteer';

export interface PDFGenerationInput {
  summary: string;
  charts: Buffer[];
}

export async function generatePDF(input: PDFGenerationInput): Promise<Buffer> {
  console.log('📄 Generating PDF report...');

  // Split summary into paragraphs for pairing with charts
  const rawParagraphs = input.summary
    .split(/\n\s*\n/) // blank-line separated
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const paragraphs = rawParagraphs.map((p) => escapeHtml(p));
  const chartCount = input.charts.length;

  const pairedCount = Math.min(paragraphs.length, chartCount);
  const unpairedText = paragraphs.slice(pairedCount);
  const unpairedCharts = input.charts.slice(pairedCount);

  const pairedBlocks = Array.from({ length: pairedCount }, (_, i) => {
    const para = paragraphs[i];
    const chart = input.charts[i];
    return `
      <div class="row">
        <div class="row-text">
          <h3 class="row-subtitle">INSIGHT ${i + 1}</h3>
          <p>${para}</p>
        </div>
        <div class="row-chart">
          <div class="chart-card">
            <div class="chart-title">CHART ${i + 1}</div>
            <img src="data:image/png;base64,${chart.toString(
              'base64',
            )}" alt="Chart ${i + 1}" />
          </div>
        </div>
      </div>
    `;
  }).join('');

  const remainingTextHtml = unpairedText
    .map(
      (p) => `
    <p class="extra-paragraph">
      ${p}
    </p>
  `,
    )
    .join('');

  const remainingChartsHtml = unpairedCharts
    .map(
      (chart, idx) => `
      <div class="chart-card chart-card-small">
        <div class="chart-title">EXTRA CHART ${pairedCount + idx + 1}</div>
        <img src="data:image/png;base64,${chart.toString(
          'base64',
        )}" alt="Chart ${pairedCount + idx + 1}" />
      </div>
    `,
    )
    .join('');

  // Create HTML content
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Data Analysis Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: "IBM Plex Mono", "Courier New", monospace;
      background: #f2f2f2;
      padding: 40px;
      color: #000000;
    }

    .container {
      max-width: 840px;
      margin: 0 auto;
      background: #ffffff;
      border: 5px solid #000000;
      box-shadow: 12px 12px 0 #000000;
    }

    .header {
      background: #ffeb3b;
      border-bottom: 5px solid #000000;
      padding: 28px 32px 20px;
    }

    .header-inner {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
    }

    h1 {
      font-size: 32px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    h1 .icon {
      font-size: 30px;
    }

    .subtitle {
      font-size: 12px;
      margin-top: 10px;
      max-width: 380px;
      line-height: 1.4;
    }

    .header-tags {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
      font-size: 11px;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #000000;
      color: #ffffff;
      padding: 4px 12px;
      border-radius: 999px;
      border: 2px solid #000000;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-weight: 700;
    }

    .pill .dot {
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: #e2ff2e;
      box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.9);
    }

    .pill-secondary {
      background: #ffffff;
      color: #000000;
    }

    .generated-date {
      font-size: 11px;
      margin-top: 2px;
    }

    .content {
      padding: 32px 32px 24px;
    }

    .section {
      margin-bottom: 32px;
    }

    .section-title {
      font-size: 16px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      margin-bottom: 14px;
      border-bottom: 3px solid #000000;
      padding-bottom: 4px;
      display: inline-block;
    }

    .summary-card {
      background: #e8f5e9;
      border: 3px solid #000000;
      padding: 18px 18px 16px;
      box-shadow: 6px 6px 0 #000000;
      font-size: 13px;
      line-height: 1.6;
      white-space: pre-wrap;
    }

    .summary-card p + p {
      margin-top: 8px;
    }

    .summary-card strong {
      font-weight: 700;
    }

    .paired-section {
      margin-top: 4px;
    }

    .row {
      display: flex;
      gap: 18px;
      margin-bottom: 22px;
      align-items: stretch;
    }

    .row-text,
    .row-chart {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .row-text {
      background: #ffffff;
      border-radius: 0;
      border: 3px solid #000000;
      padding: 14px 14px 12px;
      font-size: 13px;
      line-height: 1.6;
      box-shadow: 5px 5px 0 #000000;
    }

    .row-subtitle {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      margin-bottom: 6px;
      border-bottom: 2px solid #000000;
      display: inline-block;
      padding-bottom: 2px;
    }

    .row-text p {
      margin-top: 4px;
    }

    .chart-card {
      background: #ffffff;
      border-radius: 0;
      border: 3px solid #000000;
      padding: 10px 10px 8px;
      box-shadow: 5px 5px 0 #000000;
      display: flex;
      flex-direction: column;
    }

    .chart-card-small {
      max-width: 360px;
    }

    .chart-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      text-align: center;
      margin-bottom: 6px;
      border-bottom: 2px solid #000000;
      padding-bottom: 2px;
    }

    .chart-card img {
      width: 100%;
      height: auto;
      display: block;
    }

    .extra-text-section {
      margin-top: 12px;
    }

    .extra-paragraph {
      font-size: 13px;
      line-height: 1.6;
      margin-bottom: 12px;
      border-left: 3px solid #000000;
      padding-left: 10px;
    }

    .extra-paragraph:last-child {
      margin-bottom: 0;
    }

    .extra-charts-section {
      margin-top: 8px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .footer {
      background: #000000;
      color: #ffffff;
      padding: 16px 24px;
      font-size: 11px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      border-top: 4px solid #000000;
    }

    .footer span {
      opacity: 0.95;
    }

    .footer-tags {
      display: flex;
      align-items: center;
      gap: 8px;
      text-transform: uppercase;
      letter-spacing: 0.14em;
    }

    .footer-pill {
      padding: 3px 9px;
      border-radius: 999px;
      border: 2px solid #ffffff;
      background: #ffeb3b;
      color: #000000;
      font-weight: 800;
      font-size: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-inner">
        <div>
          <h1><span class="icon">📊</span>DATA REPORT</h1>
          <div class="subtitle">
            Automatically generated insights & visualizations based on your uploaded CSV.
          </div>
        </div>
        <div class="header-tags">
          <div class="pill">
            <span class="dot"></span>
            <span>AI-POWERED ANALYST</span>
          </div>
          <div class="pill pill-secondary">
            E2B · OpenAI · Exa
          </div>
          <div class="generated-date">
            Generated: ${escapeHtml(new Date().toLocaleString())}
          </div>
        </div>
      </div>
    </div>

    <div class="content">
      <!-- Executive Summary -->
      <div class="section">
        <div class="section-title">Executive Summary</div>
        <div class="summary-card">
          ${
            paragraphs.length > 0
              ? `<p>${paragraphs[0]}</p>`
              : `<p>${escapeHtml(input.summary)}</p>`
          }
        </div>
      </div>

      <!-- Paired Insights & Charts -->
      ${
        pairedCount > 0
          ? `
      <div class="section paired-section">
        <div class="section-title">Key Insights & Visualizations</div>
        ${pairedBlocks}
      </div>
      `
          : ''
      }

      <!-- Remaining narrative -->
      ${
        unpairedText.length > 0
          ? `
      <div class="section extra-text-section">
        <div class="section-title">Additional Details</div>
        ${remainingTextHtml}
      </div>
      `
          : ''
      }

      <!-- Remaining charts -->
      ${
        remainingChartsHtml
          ? `
      <div class="section">
        <div class="section-title">Additional Charts</div>
        <div class="extra-charts-section">
          ${remainingChartsHtml}
        </div>
      </div>
      `
          : ''
      }
    </div>

    <div class="footer">
      <span>🤖 Generated by WhatsApp Data Analyst Agent</span>
      <div class="footer-tags">
        <div class="footer-pill">E2B</div>
        <div class="footer-pill">OpenAI</div>
        <div class="footer-pill">Exa</div>
      </div>
    </div>
  </div>
</body>
</html>
`;

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '0',
      right: '0',
      bottom: '0',
      left: '0',
    },
  });

  await browser.close();

  console.log('   ✅ PDF generated');

  return Buffer.from(pdfBuffer);
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
