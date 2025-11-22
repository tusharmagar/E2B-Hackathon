# E2B Custom Template Setup

This project uses a **custom E2B sandbox template** with Node.js and all dependencies pre-installed. This reduces execution time from **3-5 minutes to ~30-60 seconds**!

## Why Custom Template?

- ✅ Node.js 20.x pre-installed
- ✅ All npm packages pre-installed (better-sqlite3, puppeteer, groq, etc.)
- ✅ Chromium browser pre-installed
- ✅ All system dependencies ready
- ✅ **Instant startup** - no installation time!

## Build the Template

### 1. Install E2B CLI

```bash
npm install -g @e2b/cli
```

### 2. Login to E2B

```bash
npx e2b auth login
```

### 3. Build the Custom Template

```bash
npx e2b template build --name whatsapp-data-analyst
```

This will:
- Build the Docker image from `e2b.Dockerfile`
- Upload it to E2B
- Give you a **template ID** (something like `abc123def456`)

### 4. Add Template ID to Environment

Copy the template ID and add it to your `.env.local`:

```bash
E2B_TEMPLATE_ID=abc123def456  # Replace with your actual template ID
```

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                      E2B Custom Template                         │
│                                                                   │
│  📦 Base Image: e2bdev/code-interpreter                         │
│  ├─ Python 3.x (pre-installed)                                   │
│  ├─ Node.js 20.x (we add this)                                   │
│  ├─ Chromium browser (we add this)                               │
│  └─ All npm packages (we add this)                               │
│                                                                   │
│  When sandbox starts:                                             │
│  1. ⚡ Everything is already installed                          │
│  2. 📤 Upload CSV file                                           │
│  3. 🤖 Run agent.ts with tsx                                     │
│  4. 📄 Generate PDF                                              │
│  5. 📥 Download results                                          │
│                                                                   │
│  Total time: ~30-60 seconds!                                     │
└─────────────────────────────────────────────────────────────────┘
```

## Without Custom Template

If you don't set `E2B_TEMPLATE_ID`, the system will:
1. Start default E2B sandbox
2. Install Node.js (~60-90 seconds)
3. Run npm install (~2-3 minutes)
4. Run agent (~30-60 seconds)
5. **Total: 3-5 minutes**

## Template Configuration Files

- **`e2b.Dockerfile`** - Defines the custom sandbox image
- **`e2b.toml`** - E2B template configuration
- **`sandbox-script/`** - Code that runs inside the sandbox

## Updating the Template

If you change any sandbox scripts or dependencies:

```bash
# Rebuild the template
npx e2b template build --name whatsapp-data-analyst

# The template ID stays the same, so no need to update .env
```

## Troubleshooting

### Template build fails

```bash
# Check Docker is running
docker --version

# Try building locally first
docker build -f e2b.Dockerfile -t test-build .
```

### Can't find template

```bash
# List your templates
npx e2b template list

# Make sure E2B_TEMPLATE_ID is set in .env.local
```

### Sandbox times out

```bash
# Check E2B logs
# Template build might have failed or dependencies missing
npx e2b template build --name whatsapp-data-analyst --verbose
```

## Cost Optimization

- **Default sandbox:** Charged for full 3-5 minutes
- **Custom template:** Charged for only ~30-60 seconds
- **Savings:** ~80-90% reduction in compute time!

Perfect for hackathons where every second (and dollar) counts! 🚀

