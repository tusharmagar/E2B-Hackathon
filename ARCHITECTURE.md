# 🏗️ Architecture Documentation

Detailed technical architecture of the WhatsApp Data Analyst Agent.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         User's WhatsApp                          │
│                    (Sends CSV + Messages)                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Twilio WhatsApp API                       │
│              (Receives media, forwards to webhook)               │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP POST
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Vercel Serverless                           │
│                  ┌─────────────────────────┐                     │
│                  │   api/webhook.ts        │                     │
│                  │  - Parse Twilio payload │                     │
│                  │  - Download CSV         │                     │
│                  │  - Manage sessions      │                     │
│                  └───────────┬─────────────┘                     │
└────────────────────────────┼─────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       E2B Sandbox (Isolated)                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  1. CSV Upload                                            │  │
│  │     └─> /home/user/data.csv                              │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  2. Docker Installation                                   │  │
│  │     └─> apt-get install docker.io                        │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  3. Exa MCP Container                                     │  │
│  │     └─> docker pull mcp/exa                              │  │
│  │     └─> docker run -i --rm -e EXA_API_KEY mcp/exa        │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  4. Multi-Step AI Agent                                   │  │
│  │     ┌─────────────────────────────────────────────────┐  │  │
│  │     │  agent.ts (Main Orchestrator)                   │  │  │
│  │     │                                                  │  │  │
│  │     │  ┌────────────────────────────────────────────┐ │  │  │
│  │     │  │ Step 1: CSV → SQLite                       │ │  │  │
│  │     │  │  - Parse CSV with csv-parser               │ │  │  │
│  │     │  │  - Infer schema (INT, REAL, TEXT, DATE)    │ │  │  │
│  │     │  │  - Create in-memory SQLite DB              │ │  │  │
│  │     │  └────────────────────────────────────────────┘ │  │  │
│  │     │                                                  │  │  │
│  │     │  ┌────────────────────────────────────────────┐ │  │  │
│  │     │  │ Step 2: Initialize AI Agent (Groq)         │ │  │  │
│  │     │  │  - Model: llama-3.3-70b-versatile          │ │  │  │
│  │     │  │  - Framework: Vercel AI SDK                │ │  │  │
│  │     │  │  - Max Steps: 15                           │ │  │  │
│  │     │  └────────────────────────────────────────────┘ │  │  │
│  │     │                                                  │  │  │
│  │     │  ┌────────────────────────────────────────────┐ │  │  │
│  │     │  │ Step 3: Tool Registration                  │ │  │  │
│  │     │  │                                            │ │  │  │
│  │     │  │  🔧 query_database                         │ │  │  │
│  │     │  │     └─> SQL queries on SQLite              │ │  │  │
│  │     │  │                                            │ │  │  │
│  │     │  │  🔧 search_web                             │ │  │  │
│  │     │  │     └─> Exa MCP (Docker container)         │ │  │  │
│  │     │  │                                            │ │  │  │
│  │     │  │  🔧 calculate_statistics                   │ │  │  │
│  │     │  │     └─> Trends, anomalies, correlations    │ │  │  │
│  │     │  │                                            │ │  │  │
│  │     │  │  🔧 generate_chart                         │ │  │  │
│  │     │  │     └─> Chart.js + Canvas → PNG            │ │  │  │
│  │     │  └────────────────────────────────────────────┘ │  │  │
│  │     │                                                  │  │  │
│  │     │  ┌────────────────────────────────────────────┐ │  │  │
│  │     │  │ Step 4: Agent Loop (15 iterations)         │ │  │  │
│  │     │  │                                            │ │  │  │
│  │     │  │  Loop:                                     │ │  │  │
│  │     │  │    1. Agent reasons about data            │ │  │  │
│  │     │  │    2. Selects tool to use                 │ │  │  │
│  │     │  │    3. Executes tool                       │ │  │  │
│  │     │  │    4. Receives result                     │ │  │  │
│  │     │  │    5. Updates context                     │ │  │  │
│  │     │  │    6. Decides next action                 │ │  │  │
│  │     │  │    7. Repeat until analysis complete      │ │  │  │
│  │     │  └────────────────────────────────────────────┘ │  │  │
│  │     │                                                  │  │  │
│  │     │  ┌────────────────────────────────────────────┐ │  │  │
│  │     │  │ Step 5: PDF Generation                     │ │  │  │
│  │     │  │  - Load neobrutalism template              │ │  │  │
│  │     │  │  - Inject insights & charts                │ │  │  │
│  │     │  │  - Puppeteer HTML → PDF                    │ │  │  │
│  │     │  └────────────────────────────────────────────┘ │  │  │
│  │     │                                                  │  │  │
│  │     │  ┌────────────────────────────────────────────┐ │  │  │
│  │     │  │ Step 6: Export Results                     │ │  │  │
│  │     │  │  - report.pdf                              │ │  │  │
│  │     │  │  - insights.json                           │ │  │  │
│  │     │  └────────────────────────────────────────────┘ │  │  │
│  │     └─────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Download PDF + Insights
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Vercel (Upload PDF)                         │
│                  ┌─────────────────────────┐                     │
│                  │   Vercel Blob Storage   │                     │
│                  │   - Store PDF           │                     │
│                  │   - Generate public URL │                     │
│                  └───────────┬─────────────┘                     │
└────────────────────────────┼─────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Twilio (Send Reply)                           │
│              - Message with summary                              │
│              - PDF link attached                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      User Receives Report                        │
│                  (Downloads and views PDF)                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Details

### 1. Vercel Serverless Function

**File:** `api/webhook.ts`

**Purpose:** Entry point for Twilio webhooks

**Responsibilities:**
- Receive and parse Twilio webhook payloads
- Authenticate Twilio requests (optional)
- Download CSV files from Twilio media URLs
- Manage user sessions (conversation history)
- Orchestrate E2B sandbox execution
- Upload PDF to Vercel Blob
- Send WhatsApp replies

**Key Functions:**
```typescript
handler(req: VercelRequest, res: VercelResponse)
  ├─> extractPhoneNumber(from)
  ├─> getSession(userId)
  ├─> downloadMedia(mediaUrl)
  ├─> runE2BAgent({ csvBuffer, userMessage, history })
  ├─> put(pdfBuffer) // Upload to Blob
  └─> sendWhatsAppMessage(to, message, pdfUrl)
```

**Timeout:** 300 seconds (5 minutes) - Maximum for Vercel Pro

---

### 2. Session Management

**File:** `lib/session-store.ts`

**Purpose:** Track conversation context across messages

**Data Structure:**
```typescript
{
  userId: string,              // Phone number
  csvBuffer: Buffer,           // Last uploaded CSV
  conversationHistory: [       // Chat history
    { role: 'user', content: '...' },
    { role: 'assistant', content: '...' }
  ],
  analysisResults: {...},      // Cached insights
  lastActivity: Date           // For cleanup
}
```

**Operations:**
- `getSession(userId)` - Retrieve session
- `createSession(userId)` - Initialize new session
- `updateSession(userId, data)` - Update session
- `deleteSession(userId)` - Cleanup

**Auto-cleanup:** Sessions expire after 1 hour of inactivity

---

### 3. E2B Sandbox Orchestrator

**File:** `lib/e2b-agent.ts`

**Purpose:** Manage E2B sandbox lifecycle

**Process:**
1. **Initialize Sandbox**
   ```typescript
   const sandbox = await CodeInterpreter.create()
   ```

2. **Upload Files**
   - data.csv
   - agent.ts
   - All tool files
   - package.json
   - pdf-template.html

3. **Install Dependencies**
   ```bash
   apt-get update
   apt-get install -y docker.io
   docker pull mcp/exa
   npm install
   ```

4. **Execute Agent**
   ```bash
   npx tsx agent.ts
   ```

5. **Download Results**
   - report.pdf
   - insights.json

6. **Cleanup**
   ```typescript
   await sandbox.close()
   ```

**Error Handling:**
- Timeout after 5 minutes
- Retry on transient failures
- Graceful degradation (skip charts if generation fails)

---

### 4. Multi-Step AI Agent

**File:** `sandbox-script/agent.ts`

**Purpose:** Main intelligence - performs deep analysis

**Architecture:**

```
Groq API (llama-3.3-70b-versatile)
    │
    ▼
Vercel AI SDK (generateText)
    │
    ├─> System Prompt (guides behavior)
    ├─> User Prompt (analysis request)
    ├─> Tools (4 tools available)
    └─> Max Steps: 15
        │
        ▼
    Agent Loop:
    
    Step N:
      1. Agent analyzes current state
      2. Decides which tool to use (or finish)
      3. Generates tool arguments
      4. Tool executes
      5. Result added to context
      6. Agent sees result
      7. Continues to Step N+1
    
    Until: Agent decides analysis is complete
```

**Decision Making:**

The agent intelligently chooses tools based on:
- **query_database**: Default for exploring data
- **calculate_statistics**: For quantitative analysis
- **generate_chart**: When visualization helps
- **search_web**: ONLY when external context needed

**Example Flow:**
```
Step 1: query_database → "SELECT * FROM data LIMIT 5"
Step 2: query_database → "SELECT date, SUM(sales) FROM data GROUP BY date"
Step 3: calculate_statistics → Trend analysis on sales
Step 4: generate_chart → Line chart of sales over time
Step 5: query_database → "SELECT * FROM data WHERE date = '2024-09'"
Step 6: search_web → "sales decline September 2024" (external context)
Step 7: generate_chart → Bar chart comparing regions
Step 8-15: More analysis...
```

---

### 5. Tool Implementations

#### Tool 1: SQL Query Tool

**File:** `sandbox-script/tools/sql-tool.ts`

**Capabilities:**
- Execute arbitrary SQL on SQLite DB
- Support for: SELECT, GROUP BY, JOIN, aggregations
- Returns up to 100 rows (for context window)
- Error handling with descriptive messages

**Example Usage by Agent:**
```typescript
{
  query: "SELECT region, AVG(sales) as avg_sales FROM data GROUP BY region",
  reasoning: "Compare average sales by region to identify best performers"
}
```

#### Tool 2: Exa Web Search Tool

**File:** `sandbox-script/tools/exa-tool.ts`

**Capabilities:**
- Search web via Exa AI
- Scrape specific URLs
- Returns relevant content snippets
- Source URLs provided

**MCP Integration:**
```typescript
// Connect to Exa MCP Docker container
const transport = new StdioClientTransport({
  command: 'docker',
  args: ['run', '-i', '--rm', '-e', 'EXA_API_KEY', 'mcp/exa']
})

const client = new Client(...)
await client.connect(transport)

// Make search request
const result = await client.request({
  method: 'tools/call',
  params: {
    name: 'search',
    arguments: { query, numResults: 5 }
  }
})
```

**Example Usage:**
```typescript
{
  query: "retail sales decline September 2024 supply chain",
  numResults: 5
}
```

#### Tool 3: Statistics Tool

**File:** `sandbox-script/tools/stats-tool.ts`

**Capabilities:**

1. **Descriptive Statistics**
   - Mean, median, min, max, sum, count

2. **Trend Analysis**
   - Linear regression (slope, intercept)
   - Trend direction (increasing/decreasing/flat)

3. **Anomaly Detection**
   - IQR method
   - Identify outliers
   - Upper/lower bounds

4. **Correlation Analysis**
   - Pearson correlation
   - Strength assessment (strong/moderate/weak)

5. **Growth Analysis**
   - Total growth percentage
   - Average growth rate
   - Period-over-period comparison

**Example Usage:**
```typescript
{
  analysis_type: 'trend',
  column: 'sales',
  time_column: 'date'
}
```

#### Tool 4: Chart Generation Tool

**File:** `sandbox-script/tools/chart-tool.ts`

**Capabilities:**
- Line charts (time-series)
- Bar charts (comparisons)
- Pie charts (distributions)

**Technology:**
- Chart.js for rendering
- node-canvas for server-side generation
- Outputs PNG files

**Styling:**
- Neobrutalism colors
- Bold borders (3px)
- High contrast

**Example Usage:**
```typescript
{
  chart_type: 'line',
  title: 'Sales Trend Over Time',
  x_column: 'date',
  y_column: 'sales',
  limit: 20
}
```

---

### 6. PDF Generation

**File:** `sandbox-script/pdf-generator.ts`

**Process:**

1. **Load Template**
   - Read pdf-template.html

2. **Inject Data**
   - Replace {{SUMMARY}} with agent's final text
   - Replace {{TRENDS}} with formatted SQL results
   - Replace {{INSIGHTS}} with web research
   - Replace {{STATISTICS}} with statistical analysis
   - Replace {{CHARTS}} with embedded PNG images (base64)

3. **Generate PDF**
   - Launch Puppeteer (headless Chromium)
   - Render HTML
   - Convert to PDF with `page.pdf()`
   - Format: A4, with margins

4. **Return Buffer**
   - Save to /home/user/report.pdf

**Template:** `sandbox-script/pdf-template.html`

**Neobrutalism Design Elements:**
- Font: Space Mono (monospace)
- Colors:
  - Yellow: #FFC700
  - Pink: #FF6B9D
  - Cyan: #00D9FF
  - Purple: #7C3AED
- Borders: 4-6px solid black
- Shadows: 8-12px offset, solid black
- High contrast text

---

### 7. Storage and Delivery

**Vercel Blob Storage:**
- Free tier: 100MB
- Public access URLs
- No authentication required for reads

**Upload Process:**
```typescript
import { put } from '@vercel/blob'

const blob = await put(
  `reports/${userId}-${timestamp}.pdf`,
  pdfBuffer,
  {
    access: 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN
  }
)

// blob.url → Public HTTPS URL
```

**Twilio Delivery:**
```typescript
await client.messages.create({
  from: 'whatsapp:+14155238886',
  to: 'whatsapp:+1234567890',
  body: '✅ Your analysis is ready!',
  mediaUrl: [blob.url]  // PDF link
})
```

---

## Data Flow Example

### Scenario: User sends sales CSV

**Input CSV:**
```csv
date,product,sales,region
2024-09-01,Widget A,15000,East
2024-09-01,Widget B,8000,West
...
```

**User Message:** "Analyze this sales data"

**Agent Execution:**

```
Step 1: query_database
  Query: SELECT * FROM data LIMIT 5
  Result: Shows sample rows
  
Step 2: query_database
  Query: SELECT COUNT(*), MIN(date), MAX(date) FROM data
  Result: 36 rows, dates from Jan-Dec 2024
  
Step 3: query_database
  Query: SELECT date, SUM(sales) as total FROM data GROUP BY date ORDER BY date
  Result: Monthly totals
  
Step 4: calculate_statistics
  Type: trend
  Column: sales
  Time: date
  Result: Slope: +150, Trend: increasing
  
Step 5: query_database
  Query: SELECT date, SUM(sales) FROM data GROUP BY date HAVING SUM(sales) < 10000
  Result: September shows drop
  
Step 6: search_web  // EXTERNAL CONTEXT NEEDED
  Query: "retail sales decline September 2024"
  Result: "Supply chain disruptions from port strikes..."
  
Step 7: calculate_statistics
  Type: correlation
  Columns: marketing_spend, sales
  Result: Correlation: 0.85 (strong positive)
  
Step 8: generate_chart
  Type: line
  Title: Sales Trend 2024
  X: date, Y: sales
  Result: chart_12345_line.png
  
... Steps 9-15: More analysis
  
Final: Generate PDF with all insights
```

**Output PDF Contains:**
- Executive summary
- Key trends (sales increasing overall)
- Anomaly (September drop)
- External explanation (port strikes)
- Correlation insights
- 3-4 charts
- Statistical tables

---

## Performance Characteristics

### Typical Execution Time

| Phase | Duration |
|-------|----------|
| Webhook receipt | < 1s |
| E2B sandbox creation | 10-20s |
| Docker installation | 30-60s |
| Agent analysis | 60-120s |
| PDF generation | 10-20s |
| Upload to Blob | 2-5s |
| Send WhatsApp | 1-2s |
| **Total** | **2-4 minutes** |

### Resource Usage

**E2B Sandbox:**
- CPU: 2 vCPUs
- RAM: 4GB
- Storage: 10GB
- Duration: 3-5 minutes per analysis

**Cost per Analysis:**
- E2B: ~$0.10-0.30
- Groq: ~$0.001-0.01
- Exa: ~$0.01
- Vercel: Free (hobby tier)
- Twilio: $0.005
- **Total: ~$0.12-0.35 per analysis**

---

## Security Considerations

1. **Sandbox Isolation**
   - E2B sandboxes are fully isolated
   - No access to host system
   - Automatic cleanup after execution

2. **API Key Security**
   - All keys stored in Vercel env vars
   - Never exposed in logs or responses
   - Keys passed securely to sandbox

3. **Data Privacy**
   - CSVs processed in isolated sandbox
   - Not stored persistently
   - Automatic deletion after analysis

4. **WhatsApp Authentication**
   - Twilio verifies sender
   - No public endpoints exposed
   - Session-based access control

---

## Scalability

### Current Limitations
- In-memory session storage (resets on deploy)
- Single-threaded webhook processing
- 5-minute Vercel timeout

### Production Improvements
1. **Session Storage:** Use Vercel KV or Redis
2. **Queue System:** Use Vercel Queue for async processing
3. **Rate Limiting:** Implement per-user limits
4. **Caching:** Cache analysis results
5. **CDN:** Use CDN for PDF delivery

---

## Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | WhatsApp | User interface |
| **Gateway** | Twilio API | WhatsApp integration |
| **Backend** | Vercel Serverless | API hosting |
| **Compute** | E2B Sandbox | Isolated execution |
| **AI Model** | Groq (Llama 3.3) | Reasoning & analysis |
| **AI Framework** | Vercel AI SDK | Tool calling & agents |
| **Search** | Exa MCP (Docker) | Web research |
| **Database** | SQLite (in-memory) | CSV data querying |
| **Charts** | Chart.js + Canvas | Visualizations |
| **PDF** | Puppeteer | Report generation |
| **Storage** | Vercel Blob | PDF hosting |
| **Language** | TypeScript | Type safety |

---

## References

- [E2B Documentation](https://e2b.dev/docs)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Exa MCP Docker](https://hub.docker.com/mcp/server/exa/overview)
- [Groq API](https://console.groq.com/docs)
- [Twilio WhatsApp API](https://www.twilio.com/docs/whatsapp/api)

