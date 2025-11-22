# 📊 WhatsApp Data Analyst Agent

> **E2B Hackathon Project**: AI-powered data analyst that performs deep CSV analysis via WhatsApp, using E2B Sandbox, Exa MCP (Docker), and Groq AI.

## 🎯 Overview

This project is a **WhatsApp-based Data Analyst Agent** that receives CSV files, performs comprehensive analysis using SQL queries, statistical methods, and intelligent web research, then returns a beautiful PDF report with insights.

### Key Features

- 📱 **WhatsApp Interface**: Send CSV files directly to WhatsApp
- 🔒 **Secure E2B Sandbox**: All analysis runs in isolated E2B containers
- 🤖 **Multi-Step AI Agent**: Uses Vercel AI SDK with Groq for iterative reasoning
- 🌐 **Intelligent Web Research**: Exa MCP via Docker for external context
- 📊 **Comprehensive Analysis**: SQL queries, statistical analysis, visualizations
- 🎨 **Neobrutalism Design**: Beautiful PDF reports with bold styling
- 💬 **Conversational**: Follow-up questions maintain context

## 🏗️ Architecture

```
WhatsApp (Twilio) 
    ↓
Vercel API Route 
    ↓
E2B Sandbox
    ├── CSV → SQLite Conversion
    ├── Multi-Step AI Agent (Groq)
    │   ├── SQL Tool (better-sqlite3)
    │   ├── Exa MCP Tool (Docker)
    │   ├── Statistics Tool
    │   └── Chart Tool (Chart.js)
    ├── PDF Generation (Puppeteer)
    └── Return Results
    ↓
Vercel Blob Storage (PDF)
    ↓
WhatsApp Reply with PDF Link
```

## 🚀 Hackathon Requirements

✅ **E2B Sandbox**: All heavy computation runs inside E2B  
✅ **Exa MCP (Docker)**: Web search via Docker MCP Hub  
✅ **Multi-Step Agent**: Deep iterative reasoning (15 steps)  
✅ **Functioning Demo**: Full end-to-end working system  

## 📦 Installation

### Prerequisites

- Node.js 18+
- Vercel account
- API keys (see below)

### Setup

1. **Clone the repository**
```bash
git clone <your-repo>
cd E2B-Hackathon
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Copy `env.example` to `.env.local` and fill in your API keys:

```env
# Twilio (WhatsApp)
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_WHATSAPP_NUMBER=+14155238886

# E2B
E2B_API_KEY=xxxxx

# Groq
GROQ_API_KEY=gsk_xxxxx

# Exa
EXA_API_KEY=xxxxx

# Vercel Blob
BLOB_READ_WRITE_TOKEN=xxxxx
```

4. **Deploy to Vercel**
```bash
npm run deploy
```

5. **Configure Twilio Webhook**
- Go to Twilio Console → WhatsApp Sandbox
- Set webhook URL to: `https://your-vercel-app.vercel.app/api/webhook`

## 🔑 Getting API Keys

### E2B
1. Go to [e2b.dev](https://e2b.dev)
2. Sign up and get $100 free credits
3. Copy your API key

### Groq
1. Visit [groq.com](https://groq.com)
2. Sign up and get API access
3. Use promo code: `MCP_AGENTS_2025` for $10 credits

### Exa
1. Go to [exa.ai](https://exa.ai)
2. Sign up for API access
3. Get your API key

### Twilio
1. Create account at [twilio.com](https://twilio.com)
2. Set up WhatsApp Sandbox
3. Get Account SID, Auth Token, and WhatsApp number

### Vercel Blob
1. In Vercel dashboard, go to Storage
2. Create Blob storage
3. Copy the read-write token

## 💡 Usage

### Basic Usage

1. **Send CSV file to WhatsApp**
   - Attach a CSV file
   - Optionally add instructions: "Focus on sales trends"

2. **Wait for analysis** (2-5 minutes)
   - Agent converts CSV to SQLite
   - Performs multi-step analysis
   - Generates PDF report

3. **Receive PDF report**
   - Get direct link to PDF
   - Download and view insights

### Advanced Usage

**Follow-up questions:**
```
"Check this article: https://example.com/market-report"
"Why did Q3 perform better than Q2?"
"Compare East vs West region performance"
```

The agent maintains conversation context and can reference previous analysis.

## 🛠️ Development

### Local Development

```bash
npm run dev
```

Use [ngrok](https://ngrok.com) to expose local webhook:
```bash
ngrok http 3000
```

Update Twilio webhook URL to ngrok URL.

### Project Structure

```
/
├── api/
│   └── webhook.ts              # Twilio webhook handler
├── lib/
│   ├── e2b-agent.ts            # E2B sandbox orchestration
│   ├── twilio.ts               # WhatsApp messaging
│   ├── session-store.ts        # User session management
│   └── types.ts                # TypeScript interfaces
├── sandbox-script/
│   ├── agent.ts                # Main AI agent
│   ├── tools/
│   │   ├── sql-tool.ts         # SQL queries
│   │   ├── exa-tool.ts         # Web search (Exa MCP)
│   │   ├── stats-tool.ts       # Statistics
│   │   └── chart-tool.ts       # Visualizations
│   ├── pdf-generator.ts        # PDF creation
│   ├── pdf-template.html       # Neobrutalism template
│   └── package.json            # Sandbox dependencies
├── package.json
├── tsconfig.json
└── vercel.json
```

## 🧠 How It Works

### Multi-Step Agent Flow

1. **Data Exploration**
   - Query database structure
   - Understand columns and data types

2. **SQL Analysis**
   - Run multiple queries from different angles
   - Find trends, patterns, anomalies
   - Calculate aggregations

3. **Statistical Analysis**
   - Trend detection (linear regression)
   - Anomaly detection (IQR method)
   - Correlation analysis
   - Growth rate calculations

4. **Visualization**
   - Generate charts using Chart.js
   - Line charts for trends
   - Bar charts for comparisons

5. **Web Research (Conditional)**
   - Only when external context is needed
   - Exa MCP searches for events, news
   - Explains "why" behind data patterns

6. **PDF Generation**
   - Compile all insights
   - Apply neobrutalism styling
   - Generate with Puppeteer

### Intelligent Web Search

The agent decides when to use Exa MCP:

**Uses web search:**
- "Sales dropped 40% in March" → Searches for events in March
- User provides URL to analyze
- Industry context needed

**Doesn't use web search:**
- Trends visible in data
- Statistical patterns
- Comparative analysis

## 🎨 PDF Styling

Reports use **Neobrutalism** design:
- Bold borders (5-6px solid black)
- Bright colors (#FFC700, #FF6B9D, #00D9FF)
- Harsh shadows (10px 10px 0 #000)
- Monospace fonts (Space Mono)
- High contrast and clarity

Reference: [neobrutalism.dev](https://www.neobrutalism.dev/docs)

## 🧪 Testing

### Sample CSV Files

Create test CSVs with:
- Date columns (for time-series)
- Numeric columns (for analysis)
- Category columns (for segmentation)

Example structure:
```csv
date,product,sales,region
2024-01-01,Widget A,1000,East
2024-01-01,Widget B,1500,West
...
```

### Test Queries

1. **Basic analysis**: Just send CSV
2. **Specific focus**: "Analyze seasonal trends"
3. **Follow-up**: "Why did sales drop in September?"
4. **URL research**: "Check this: https://competitor.com/report"

## 🏆 Hackathon Demo

### Demo Video Script (< 2 minutes)

1. **Introduction** (0:00-0:15)
   - Show WhatsApp interface
   - Send CSV file

2. **Agent Processing** (0:15-0:45)
   - Show E2B sandbox logs
   - Display multi-step reasoning
   - Highlight Docker MCP usage

3. **PDF Report** (0:45-1:15)
   - Receive WhatsApp reply
   - Show neobrutalism-styled PDF
   - Walk through insights

4. **Follow-up** (1:15-1:45)
   - Send follow-up question
   - Show contextual response

5. **Technical Highlights** (1:45-2:00)
   - E2B Sandbox ✅
   - Exa MCP (Docker) ✅
   - Multi-step reasoning ✅

## 📝 Technical Stack

- **Runtime**: E2B Code Interpreter
- **AI Model**: Groq (llama-3.3-70b-versatile)
- **AI Framework**: Vercel AI SDK
- **Web Search**: Exa MCP (Docker Hub)
- **Database**: SQLite (better-sqlite3)
- **Charts**: Chart.js + node-canvas
- **PDF**: Puppeteer
- **Messaging**: Twilio WhatsApp API
- **Storage**: Vercel Blob
- **Deployment**: Vercel Serverless

## 🤝 Contributing

This is a hackathon project, but improvements are welcome!

## 📄 License

MIT

## 👥 Team

Built for the E2B MCP Agents Hackathon

## 🔗 Links

- [E2B Documentation](https://e2b.dev/docs)
- [Exa MCP (Docker Hub)](https://hub.docker.com/mcp/server/exa/overview)
- [Vercel AI SDK](https://sdk.vercel.ai)
- [Groq](https://groq.com)
- [Hackathon Page](https://luma.com/0vm36r4q?tk=QxjbLk)

---

**Built with ❤️ for the E2B Hackathon**

