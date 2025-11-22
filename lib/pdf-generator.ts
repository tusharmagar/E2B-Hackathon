// generatePDF.ts
import puppeteer from 'puppeteer';
import { ReportData } from './types';

export interface PDFGenerationInput {
  summary: string;
  charts: Buffer[];
  externalContext?: string;
  structuredReport?: ReportData;
}

export async function generatePDF(input: PDFGenerationInput): Promise<Buffer> {
  console.log('📄 Generating PDF report...');

  const chartCount = input.charts.length;

  // --------- Helper parsers to keep card content reliable ---------
  const normalize = (txt: string) =>
    txt.replace(/\s+/g, ' ').trim();

  const extractExecSummary = (summary: string): string => {
    const blocks = summary
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (!blocks.length) return summary.trim();
    // Prefer the very first paragraph before any heading
    return blocks[0];
  };

  const extractKpis = (summary: string): string[] => {
    const lines = summary.split('\n');
    const kpiStart = lines.findIndex((l) =>
      /key\s*kpis?/i.test(l),
    );
    const kpis: string[] = [];
    for (let i = kpiStart + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      if (/^chart\s+\d+/i.test(line) || /external context/i.test(line) || /next steps/i.test(line)) break;
      if (line.startsWith('-') || line.startsWith('•')) {
        kpis.push(normalize(line.replace(/^[-•]\s*/, '')));
      }
      if (kpis.length >= 6) break;
    }
    return kpis;
  };

  const extractChartSummaries = (summary: string, count: number): string[] => {
    const chartSummaries = new Array(count).fill('');
    const regex = /chart\s+(\d+)[^\n]*\n([\s\S]*?)(?=\nchart\s+\d+|\nexternal context|\nnext steps|\nkey kpis|$)/gi;
    let match;
    while ((match = regex.exec(summary)) !== null) {
      const idx = parseInt(match[1], 10) - 1;
      if (idx >= 0 && idx < count) {
        const content = match[2]
          .split('\n')
          .map((l) => l.replace(/^[-•]\s*/, '').trim())
          .filter(Boolean)
          .join(' ');
        if (content) chartSummaries[idx] = normalize(content);
      }
    }

    // Fallback: pull remaining paragraphs for any empty slots
    const paragraphs = summary
      .split(/\n\s*\n/)
      .map((p) => normalize(p))
      .filter((p) => p.length > 0);
    let pIdx = 0;
    for (let i = 0; i < chartSummaries.length; i++) {
      if (!chartSummaries[i]) {
        while (pIdx < paragraphs.length && (paragraphs[pIdx].toLowerCase().includes('key kpi') || paragraphs[pIdx].toLowerCase().startsWith('chart '))) {
          pIdx++;
        }
        chartSummaries[i] =
          paragraphs[pIdx] ||
          `Chart ${i + 1}: summary unavailable.`;
        pIdx++;
      }
    }
    return chartSummaries;
  };

  const extractAdditional = (summary: string): string[] => {
    const blocks = summary
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .filter(
        (p) =>
          !/^chart\s+\d+/i.test(p) &&
          !/key\s*kpis?/i.test(p) &&
          !/external context/i.test(p) &&
          !/next steps/i.test(p),
      );
    return blocks.slice(0, 6);
  };

  const sr = input.structuredReport;

  const execSummary = sr
    ? escapeHtml(sr.summary || input.summary)
    : escapeHtml(extractExecSummary(input.summary));

  const rawChartSummaries = sr
    ? sr.charts.map((c, idx) =>
        normalize(
          `${c.title || `Chart ${idx + 1}`}: ${(c.bullets || []).join(' ')}`,
        ),
      )
    : extractChartSummaries(input.summary, chartCount);

  // Align chart summaries to actual chart count
  const chartSummaries = Array.from({ length: chartCount }, (_, i) => {
    if (rawChartSummaries[i]) return rawChartSummaries[i];
    return `Chart ${i + 1}: summary unavailable.`;
  });

  const additionalText = (sr?.additionalDetails || extractAdditional(input.summary)).map(
    (p) => escapeHtml(p),
  );

  const kpiLines = (sr?.kpis || extractKpis(input.summary)).map(escapeHtml);

  const externalContextText =
    (sr?.externalContext && sr.externalContext.join('\n\n')) ||
    input.externalContext ||
    '';

  const pairedCount = chartCount;
  const unpairedCharts: Buffer[] = [];

  const pairedBlocks = Array.from({ length: pairedCount }, (_, i) => {
    const para = escapeHtml(chartSummaries[i] || `Chart ${i + 1} summary`);
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

  const MAX_EXTRA_PARAGRAPHS = 6;
  const remainingTextHtml = additionalText.slice(0, MAX_EXTRA_PARAGRAPHS)
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

  const kpiCardsHtml = kpiLines
    .map(
      (line, idx) => `
        <div class="kpi-card">
          <div class="kpi-title">KPI ${idx + 1}</div>
          <div class="kpi-value">${line}</div>
        </div>
      `,
    )
    .join('');

  const externalContextHtml = externalContextText
    ? externalContextText
        .split(/\n\s*\n/)
        .map(
          (p) =>
            `<p>${escapeHtml(p.trim()).replace(/\n/g, '<br />')}</p>`,
        )
        .join('\n')
    : '';

  // Create HTML content
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Data Analysis Report</title>
  <style>
    :root {
      --ink: #0b0b0b;
      --bg: #f6f6f2;
      --card: #ffffff;
      --accent: #ffe066;
      --mint: #d2f5d0;
      --blue: #d7e9ff;
      --peach: #ffd7a3;
      --shadow: 10px 10px 0 var(--ink);
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { margin: 14mm; }

    body {
      font-family: "IBM Plex Mono", "JetBrains Mono", "Courier New", monospace;
      background: var(--bg);
      padding: 18px;
      color: var(--ink);
    }

    .container {
      max-width: 880px;
      margin: 0 auto;
      background: var(--card);
      border: 5px solid var(--ink);
      box-shadow: var(--shadow);
    }

    .header {
      background: var(--accent);
      border-bottom: 5px solid var(--ink);
      padding: 26px 32px 18px;
    }

    .header-inner {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
    }

    h1 {
      font-size: 30px;
      font-weight: 900;
      letter-spacing: 0.06em;
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--ink);
      text-transform: uppercase;
    }

    h1 .icon { font-size: 28px; }

    .subtitle {
      font-size: 12px;
      margin-top: 8px;
      max-width: 440px;
      line-height: 1.5;
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
      background: var(--ink);
      color: #ffffff;
      padding: 6px 12px;
      border-radius: 999px;
      border: 3px solid var(--ink);
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-weight: 800;
      box-shadow: 4px 4px 0 var(--ink);
    }

    .pill .dot {
      width: 8px; height: 8px; border-radius: 999px;
      background: var(--accent);
      box-shadow: 0 0 0 2px #ffffff;
    }

    .pill-secondary {
      background: var(--card);
      color: var(--ink);
    }

    .generated-date { font-size: 11px; margin-top: 2px; }

    .content { padding: 26px 26px 22px; }

    .section {
      margin-bottom: 26px;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .section-title {
      font-size: 15px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      margin-bottom: 12px;
      border-bottom: 3px solid var(--ink);
      padding-bottom: 5px;
      display: inline-block;
    }

    .summary-card {
      background: linear-gradient(135deg, var(--mint), var(--blue));
      border: 4px solid var(--ink);
      padding: 18px 18px 16px;
      box-shadow: var(--shadow);
      font-size: 13px;
      line-height: 1.6;
      white-space: pre-wrap;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .summary-card p + p { margin-top: 8px; }
    .summary-card strong { font-weight: 800; }

    .paired-section { margin-top: 4px; }

    .paired-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 14px;
    }

    .row {
      display: grid;
      grid-template-columns: minmax(240px, 1fr) minmax(340px, 1fr);
      gap: 10px;
      align-items: stretch;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .row-text,
    .row-chart { display: flex; flex-direction: column; }

    .row-text {
      background: #fffef6;
      border: 3px solid var(--ink);
      padding: 14px 14px 12px;
      font-size: 13px;
      line-height: 1.6;
      box-shadow: 6px 6px 0 var(--ink);
      min-height: 240px;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .row-subtitle {
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      margin-bottom: 6px;
      border-bottom: 3px solid var(--ink);
      display: inline-block;
      padding-bottom: 2px;
    }

    .row-text p { margin-top: 4px; }

    .chart-card {
      background: var(--card);
      border: 3px solid var(--ink);
      padding: 8px 8px 6px;
      box-shadow: 6px 6px 0 var(--ink);
      display: flex;
      flex-direction: column;
      min-height: 220px;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .chart-card-small { max-width: 360px; }

    .chart-title {
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      text-align: center;
      margin-bottom: 4px;
      border-bottom: 2px solid var(--ink);
      padding-bottom: 3px;
    }

    .chart-card img {
      width: 100%;
      height: 150px;
      display: block;
      object-fit: contain;
    }

    .extra-text-section { margin-top: 10px; column-count: 2; column-gap: 18px; }

    .extra-paragraph {
      font-size: 12.5px;
      line-height: 1.5;
      margin-bottom: 10px;
      border-left: 4px solid var(--ink);
      padding-left: 10px;
      break-inside: avoid;
    }

    .extra-paragraph:last-child { margin-bottom: 0; }

    .extra-charts-section {
      margin-top: 8px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .external-context {
      background: var(--peach);
      border: 3px solid var(--ink);
      padding: 14px 14px 12px;
      box-shadow: var(--shadow);
      font-size: 13px;
      line-height: 1.6;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .external-context p + p { margin-top: 8px; }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      margin-top: 8px;
      margin-bottom: 10px;
    }

    .kpi-card {
      background: #fffef6;
      border: 3px solid var(--ink);
      padding: 12px 12px 10px;
      box-shadow: 6px 6px 0 var(--ink);
      font-size: 13px;
      line-height: 1.4;
      min-height: 78px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .kpi-title {
      font-weight: 900;
      letter-spacing: 0.12em;
      font-size: 11px;
      text-transform: uppercase;
      border-bottom: 2px solid var(--ink);
      padding-bottom: 4px;
    }

    .kpi-value {
      font-weight: 600;
    }

    .footer {
      background: var(--ink);
      color: #ffffff;
      padding: 16px 24px;
      font-size: 11px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      border-top: 5px solid var(--ink);
    }

    .footer span { opacity: 0.95; }

    .footer-tags {
      display: flex;
      align-items: center;
      gap: 8px;
      text-transform: uppercase;
      letter-spacing: 0.14em;
    }

    .footer-pill {
      padding: 5px 10px;
      border-radius: 6px;
      border: 3px solid #ffffff;
      background: var(--accent);
      color: var(--ink);
      font-weight: 900;
      font-size: 10px;
      box-shadow: 4px 4px 0 #000000;
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
            execSummary
              ? `<p>${execSummary}</p>`
              : `<p>${escapeHtml(input.summary)}</p>`
          }
        </div>
      </div>

      ${
        kpiCardsHtml
          ? `
      <div class="section">
        <div class="section-title">Key Numbers</div>
        <div class="kpi-grid">
          ${kpiCardsHtml}
        </div>
      </div>
      `
          : ''
      }

      ${
        externalContextHtml
          ? `
      <div class="section">
        <div class="section-title">External Context (Links)</div>
        <div class="external-context">
          ${externalContextHtml}
        </div>
      </div>
      `
          : ''
      }

      <!-- Paired Insights & Charts -->
      ${
        pairedCount > 0
          ? `
      <div class="section paired-section">
        <div class="section-title">Key Insights & Visualizations</div>
        <div class="paired-grid">
          ${pairedBlocks}
        </div>
      </div>
      `
          : ''
      }

      <!-- Remaining narrative -->
      ${
        additionalText.length > 0
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
