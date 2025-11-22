# 🚀 Deployment Guide

Complete step-by-step guide to deploy the WhatsApp Data Analyst Agent.

## Prerequisites

Before deploying, ensure you have:
- ✅ Node.js 18+ installed
- ✅ Git installed
- ✅ Vercel account
- ✅ All required API keys (see below)

## Step 1: Get API Keys

### 1.1 E2B API Key

1. Visit [e2b.dev](https://e2b.dev)
2. Sign up for a free account
3. You get $100 in free credits automatically
4. Go to Dashboard → API Keys
5. Copy your API key
6. Save it as: `E2B_API_KEY`

### 1.2 Groq API Key

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up for an account
3. Use promo code: **MCP_AGENTS_2025** for $10 credits
4. Navigate to API Keys section
5. Create a new API key
6. Copy the key (starts with `gsk_`)
7. Save it as: `GROQ_API_KEY`

### 1.3 Exa API Key

1. Visit [exa.ai](https://exa.ai)
2. Sign up for API access
3. Go to Dashboard → API Keys
4. Generate a new API key
5. Copy the key
6. Save it as: `EXA_API_KEY`

### 1.4 Twilio WhatsApp Setup

1. Go to [twilio.com/console](https://www.twilio.com/console)
2. Sign up (get free trial credits)
3. Navigate to: Messaging → Try it out → Send a WhatsApp message
4. Follow the WhatsApp Sandbox setup:
   - Send a code to the Twilio number
   - Complete verification
5. Get your credentials:
   - **Account SID**: Save as `TWILIO_ACCOUNT_SID`
   - **Auth Token**: Save as `TWILIO_AUTH_TOKEN`
   - **WhatsApp Number**: Usually `+14155238886`, save as `TWILIO_WHATSAPP_NUMBER`

### 1.5 Vercel Blob Storage

1. Log in to [vercel.com](https://vercel.com)
2. Go to Storage tab
3. Click "Create Database" → Select "Blob"
4. Create a new Blob store
5. Go to Settings → Tokens
6. Copy the `BLOB_READ_WRITE_TOKEN`
7. Save it as: `BLOB_READ_WRITE_TOKEN`

## Step 2: Clone and Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd E2B-Hackathon

# Install dependencies
npm install
```

## Step 3: Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=+14155238886

# E2B
E2B_API_KEY=your_e2b_api_key_here

# Groq
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Exa
EXA_API_KEY=your_exa_api_key_here

# Vercel Blob
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token_here
```

## Step 4: Deploy to Vercel

### Option A: Deploy via CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: whatsapp-data-analyst
# - Directory: ./
# - Override settings? No

# Deploy to production
vercel --prod
```

### Option B: Deploy via GitHub

1. Push code to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo>
git push -u origin main
```

2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your GitHub repository
4. Configure:
   - Framework Preset: Other
   - Build Command: `npm run build`
   - Output Directory: (leave empty)
5. Add environment variables in Vercel dashboard
6. Click "Deploy"

## Step 5: Add Environment Variables to Vercel

In Vercel Dashboard:

1. Go to your project
2. Click "Settings" → "Environment Variables"
3. Add each variable:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_WHATSAPP_NUMBER`
   - `E2B_API_KEY`
   - `GROQ_API_KEY`
   - `EXA_API_KEY`
   - `BLOB_READ_WRITE_TOKEN`
4. Make sure to select: **Production**, **Preview**, and **Development**
5. Click "Save"

## Step 6: Configure Twilio Webhook

1. Go to [Twilio Console](https://www.twilio.com/console)
2. Navigate to: Messaging → Settings → WhatsApp Sandbox Settings
3. Under "When a message comes in":
   - Set to: `https://your-vercel-app.vercel.app/api/webhook`
   - Method: `HTTP POST`
4. Click "Save"

**Note**: Replace `your-vercel-app` with your actual Vercel deployment URL.

## Step 7: Test the Deployment

### 7.1 Check Deployment

1. Visit your Vercel deployment URL
2. You should see a basic page or 404 (normal - we only have API routes)
3. Check: `https://your-app.vercel.app/api/webhook`
   - Should return: "Method not allowed" (GET request)
   - This means the endpoint is working!

### 7.2 Test WhatsApp

1. Open WhatsApp on your phone
2. Send a message to your Twilio WhatsApp Sandbox number
3. You should receive: "Welcome to the Data Analyst Agent!"
4. Send the `sample-data.csv` file
5. Wait 2-5 minutes
6. Receive PDF report!

## Step 8: Monitor and Debug

### View Logs in Vercel

1. Go to Vercel Dashboard → Your Project
2. Click "Logs" tab
3. You'll see real-time logs of:
   - WhatsApp messages received
   - E2B sandbox activity
   - PDF generation
   - Errors (if any)

### View E2B Activity

1. Go to [e2b.dev/dashboard](https://e2b.dev/dashboard)
2. View sandbox usage
3. Check credits remaining
4. See sandbox execution logs

### Common Issues

See `TROUBLESHOOTING.md` for detailed solutions.

## Production Checklist

Before going live:

- [ ] All environment variables set in Vercel
- [ ] Twilio webhook configured correctly
- [ ] Test with sample CSV
- [ ] Verify PDF generation works
- [ ] Check Exa MCP connection
- [ ] Monitor initial requests
- [ ] Set up error alerting
- [ ] Document any custom configurations

## Cost Estimates

**Free Tier Usage:**
- E2B: $100 free credits (20-50 analyses)
- Groq: $10 credits (thousands of requests)
- Vercel: Free for hobby projects
- Twilio: Free trial credits
- Exa: Free tier available

**After Free Credits:**
- E2B: ~$2-5 per analysis (varies by complexity)
- Groq: Very cheap ($0.10 per 1M tokens)
- Vercel: $20/month (Pro plan for production)
- Twilio: $0.005 per WhatsApp message
- Exa: Pay-as-you-go

## Scaling Considerations

For production use:

1. **Session Storage**: Switch from in-memory to Vercel KV
2. **Rate Limiting**: Add rate limits to prevent abuse
3. **Queue System**: Use Vercel Queue for long-running tasks
4. **Error Handling**: Implement comprehensive error recovery
5. **Monitoring**: Set up Sentry or similar
6. **Authentication**: Add user verification

## Support

If you encounter issues:

1. Check `TROUBLESHOOTING.md`
2. Review Vercel logs
3. Check E2B dashboard
4. Verify all API keys are correct
5. Test Twilio webhook with Postman

## Next Steps

- ✅ Deployment complete
- 📱 Test thoroughly with various CSV files
- 📊 Monitor performance and costs
- 🎥 Record demo video
- 🏆 Submit to hackathon!

---

**Deployed successfully?** Great! Now test it and prepare your demo video.

