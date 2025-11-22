# ⚡ Quick Start Guide

Get the WhatsApp Data Analyst Agent running in 15 minutes!

## TL;DR

```bash
# 1. Clone and install
git clone <repo>
cd E2B-Hackathon
npm install

# 2. Get API keys (see below)

# 3. Create .env.local with your keys

# 4. Deploy
vercel --prod

# 5. Configure Twilio webhook

# 6. Test!
```

---

## Step-by-Step (15 minutes)

### ⏱️ Minute 1-3: Get E2B Key

1. Go to [e2b.dev](https://e2b.dev)
2. Sign up (takes 30 seconds)
3. Copy API key from dashboard
4. You get $100 free! ✅

### ⏱️ Minute 4-6: Get Groq Key

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up
3. Use promo: `MCP_AGENTS_2025` for $10 ✅
4. Create API key

### ⏱️ Minute 7-9: Get Exa Key

1. Go to [exa.ai](https://exa.ai)
2. Sign up for API access
3. Copy API key ✅

### ⏱️ Minute 10-12: Twilio Setup

1. Go to [twilio.com](https://twilio.com/try-twilio)
2. Sign up (get free credits)
3. Navigate to: **Messaging** → **Try it out** → **Send a WhatsApp message**
4. Follow WhatsApp Sandbox setup:
   - Send join code to Twilio number
   - Verify connection
5. Save these:
   - Account SID ✅
   - Auth Token ✅
   - WhatsApp Number (usually +14155238886) ✅

### ⏱️ Minute 13: Setup Project

```bash
git clone <your-repo-url>
cd E2B-Hackathon
npm install
```

Create `.env.local`:
```env
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_WHATSAPP_NUMBER=+14155238886
E2B_API_KEY=xxxxx
GROQ_API_KEY=gsk_xxxxx
EXA_API_KEY=xxxxx
BLOB_READ_WRITE_TOKEN=xxxxx
```

### ⏱️ Minute 14: Deploy to Vercel

**Option 1: CLI**
```bash
npm i -g vercel
vercel login
vercel --prod
```

**Option 2: GitHub**
- Push to GitHub
- Connect to Vercel
- Auto-deploy

Add environment variables in Vercel Dashboard:
- Settings → Environment Variables
- Paste all 7 variables

### ⏱️ Minute 15: Configure Twilio

1. Twilio Console → WhatsApp Sandbox Settings
2. Set webhook: `https://your-app.vercel.app/api/webhook`
3. Method: POST
4. Save

---

## 🧪 Test It!

1. **Open WhatsApp on your phone**

2. **Send a message to Twilio number**
   ```
   You should receive: "Welcome to the Data Analyst Agent!"
   ```

3. **Send the sample CSV**
   - Attach `sample-data.csv` from the repo
   - Or use your own CSV

4. **Wait 2-4 minutes**
   - You'll receive progress updates
   - Agent is analyzing in E2B sandbox

5. **Get your PDF!**
   - Click the link
   - View your beautiful neobrutalism-styled report 🎨

---

## 🐛 Quick Troubleshooting

### Not receiving messages?
```bash
# Check Vercel logs
vercel logs --prod

# Verify webhook URL in Twilio
```

### Webhook errors?
```bash
# Test directly
curl -X POST https://your-app.vercel.app/api/webhook \
  -d "From=whatsapp:+1234567890" \
  -d "Body=test"
```

### E2B timeout?
- Check credits at e2b.dev/dashboard
- Try smaller CSV first
- Check Vercel logs for errors

---

## 📊 What You Should See

**Vercel Logs:**
```
📱 Received message from +1234567890
📥 Downloading CSV file...
🤖 Received your CSV! Analyzing data...
🚀 Initializing E2B sandbox...
📤 Uploading CSV to sandbox...
📦 Uploading agent scripts...
🐳 Installing Docker...
📥 Pulling Exa MCP Docker image...
🤖 Running multi-step agent...
📊 Step 1: Query database structure
📊 Step 3: Calculate statistics
🌐 Step 7: Web search
📄 Generating PDF report...
☁️ Uploading PDF to cloud storage...
✅ Successfully sent report to user
```

**WhatsApp Messages:**
```
1. "🤖 Received your CSV! Analyzing data..."
2. "✅ Analysis Complete! Your detailed PDF report is ready 👇"
   [PDF Link]
```

---

## 🎯 Next Steps

1. **Test with different CSVs**
   - Sales data
   - User analytics
   - Financial reports

2. **Try follow-up questions**
   ```
   "Why did sales drop in September?"
   "Compare Q1 vs Q2 performance"
   "Check this article: [URL]"
   ```

3. **Monitor costs**
   - E2B Dashboard
   - Groq Console
   - Vercel Usage

4. **Prepare demo video**
   - See `DEMO-SCRIPT.md`
   - Record screen + phone
   - < 2 minutes

5. **Submit to hackathon! 🏆**

---

## 💡 Tips

- **Start small:** Test with `sample-data.csv` first
- **Check logs:** Vercel logs show everything
- **Be patient:** First run takes 3-5 minutes (Docker setup)
- **Subsequent runs:** 2-3 minutes (Docker cached)
- **Rejoin sandbox:** Twilio sandbox expires every 72 hours

---

## 📚 More Info

- **Full docs:** See `README.md`
- **Deployment:** See `DEPLOYMENT.md`
- **Troubleshooting:** See `TROUBLESHOOTING.md`
- **Architecture:** See `ARCHITECTURE.md`
- **Demo:** See `DEMO-SCRIPT.md`

---

## 🚀 You're Ready!

If everything works, you should have:
- ✅ Deployed Vercel app
- ✅ Configured Twilio webhook
- ✅ Received test message
- ✅ Analyzed sample CSV
- ✅ Downloaded PDF report

**Congratulations!** 🎉 You're running an AI data analyst agent!

Now go build something amazing and win that hackathon! 🏆

