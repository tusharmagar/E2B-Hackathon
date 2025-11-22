# 🔧 Troubleshooting Guide

Common issues and solutions for the WhatsApp Data Analyst Agent.

## Table of Contents

1. [WhatsApp Issues](#whatsapp-issues)
2. [E2B Sandbox Issues](#e2b-sandbox-issues)
3. [API and Connection Issues](#api-and-connection-issues)
4. [PDF Generation Issues](#pdf-generation-issues)
5. [Performance Issues](#performance-issues)
6. [Development Issues](#development-issues)

---

## WhatsApp Issues

### Issue: Not receiving messages from WhatsApp

**Symptoms:**
- Send message to Twilio number, no response

**Solutions:**

1. **Verify Twilio Webhook URL**
   ```
   Go to Twilio Console → WhatsApp Sandbox Settings
   Check: "When a message comes in"
   Should be: https://your-app.vercel.app/api/webhook
   Method: POST
   ```

2. **Test webhook directly**
   ```bash
   curl -X POST https://your-app.vercel.app/api/webhook \
     -d "From=whatsapp:+1234567890" \
     -d "Body=test"
   ```

3. **Check Vercel logs**
   - Go to Vercel Dashboard → Logs
   - Look for incoming requests
   - If no logs, webhook URL is wrong

4. **Verify WhatsApp Sandbox**
   - Make sure you joined the sandbox (sent join code)
   - Sandbox expires after 72 hours - rejoin if needed

### Issue: Receiving messages but no reply

**Symptoms:**
- Message delivered, but no response from bot

**Solutions:**

1. **Check Vercel logs for errors**
   ```
   Look for:
   - "Error downloading CSV"
   - "E2B agent error"
   - "Twilio not configured"
   ```

2. **Verify environment variables**
   ```bash
   # In Vercel Dashboard → Settings → Environment Variables
   Check all are set:
   - TWILIO_ACCOUNT_SID
   - TWILIO_AUTH_TOKEN
   - TWILIO_WHATSAPP_NUMBER
   ```

3. **Test Twilio credentials**
   ```bash
   # Send test message via Twilio CLI
   twilio api:core:messages:create \
     --from "whatsapp:+14155238886" \
     --to "whatsapp:+YOUR_NUMBER" \
     --body "Test"
   ```

---

## E2B Sandbox Issues

### Issue: E2B sandbox timeout

**Symptoms:**
- Analysis takes too long (>5 minutes)
- Timeout errors in logs

**Solutions:**

1. **Check E2B credits**
   - Go to [e2b.dev/dashboard](https://e2b.dev/dashboard)
   - Verify you have credits remaining

2. **Reduce CSV size**
   - E2B has resource limits
   - For large files (>10MB), preprocess first
   - Limit rows in test CSVs

3. **Increase Vercel timeout**
   ```json
   // vercel.json
   {
     "functions": {
       "api/webhook.ts": {
         "maxDuration": 300  // Already at max
       }
     }
   }
   ```

4. **Check sandbox logs in code**
   ```typescript
   // In lib/e2b-agent.ts
   // Look for console.log outputs
   ```

### Issue: Docker not found in E2B

**Symptoms:**
- Error: "docker: command not found"

**Solutions:**

1. **Wait for Docker installation**
   - Docker install takes 30-60 seconds
   - Check logs for: "Installing Docker..."

2. **Verify installation command**
   ```typescript
   // In lib/e2b-agent.ts
   await sandbox.process.startAndWait('apt-get update')
   await sandbox.process.startAndWait('apt-get install -y docker.io')
   ```

3. **Check E2B sandbox version**
   - Ensure using latest `@e2b/code-interpreter`
   - Update: `npm install @e2b/code-interpreter@latest`

### Issue: Exa MCP not connecting

**Symptoms:**
- Error: "MCP client connection failed"
- Web search tool not working

**Solutions:**

1. **Verify EXA_API_KEY**
   ```bash
   # Check in Vercel environment variables
   # Should not be empty or "xxxxx"
   ```

2. **Test Exa API directly**
   ```bash
   curl https://api.exa.ai/search \
     -H "x-api-key: YOUR_EXA_KEY" \
     -H "Content-Type: application/json" \
     -d '{"query": "test"}'
   ```

3. **Check Docker MCP image**
   ```bash
   # In E2B sandbox, verify pull succeeded
   docker pull mcp/exa
   docker images | grep exa
   ```

4. **Add debugging**
   ```typescript
   // In sandbox-script/tools/exa-tool.ts
   console.log('EXA_API_KEY:', process.env.EXA_API_KEY?.substring(0, 10) + '...')
   ```

---

## API and Connection Issues

### Issue: "API key not found" errors

**Symptoms:**
- Various API key errors in logs

**Solutions:**

1. **Verify all API keys in Vercel**
   ```
   Settings → Environment Variables → Check:
   - E2B_API_KEY
   - GROQ_API_KEY
   - EXA_API_KEY
   - TWILIO_ACCOUNT_SID
   - TWILIO_AUTH_TOKEN
   - BLOB_READ_WRITE_TOKEN
   ```

2. **Redeploy after adding variables**
   ```bash
   vercel --prod
   ```

3. **Test each API key**
   ```bash
   # E2B
   curl https://api.e2b.dev/sandboxes \
     -H "X-API-Key: YOUR_E2B_KEY"

   # Groq
   curl https://api.groq.com/openai/v1/models \
     -H "Authorization: Bearer YOUR_GROQ_KEY"
   ```

### Issue: Rate limiting errors

**Symptoms:**
- "Rate limit exceeded"
- "Too many requests"

**Solutions:**

1. **Check API quotas**
   - E2B: Dashboard → Usage
   - Groq: Console → Usage
   - Exa: Dashboard → API Usage

2. **Add delays between requests**
   ```typescript
   // Add in webhook handler
   await new Promise(resolve => setTimeout(resolve, 1000))
   ```

3. **Implement queue system**
   - Use Vercel Queue for production
   - Process requests sequentially

---

## PDF Generation Issues

### Issue: PDF not generated

**Symptoms:**
- Analysis completes but no PDF received

**Solutions:**

1. **Check Puppeteer installation in sandbox**
   ```bash
   # Ensure puppeteer is in sandbox-script/package.json
   # Chromium must be installed in E2B
   ```

2. **Add debugging in pdf-generator.ts**
   ```typescript
   console.log('Starting Puppeteer...')
   console.log('HTML length:', html.length)
   console.log('PDF buffer size:', pdfBuffer.length)
   ```

3. **Test HTML template locally**
   ```bash
   # Open pdf-template.html in browser
   # Check for rendering issues
   ```

### Issue: PDF upload fails

**Symptoms:**
- PDF generated but Vercel Blob upload fails

**Solutions:**

1. **Verify BLOB_READ_WRITE_TOKEN**
   ```bash
   # In Vercel dashboard
   # Regenerate token if needed
   ```

2. **Check PDF size**
   ```typescript
   console.log('PDF size:', pdfBuffer.length / 1024, 'KB')
   // Vercel Blob free tier: 100MB limit
   ```

3. **Test Blob directly**
   ```typescript
   import { put } from '@vercel/blob'
   const test = await put('test.txt', 'hello', {
     access: 'public',
     token: process.env.BLOB_READ_WRITE_TOKEN
   })
   console.log(test.url)
   ```

---

## Performance Issues

### Issue: Analysis takes too long

**Symptoms:**
- User waits 5+ minutes for results

**Solutions:**

1. **Optimize SQL queries**
   - Add LIMIT clauses
   - Use indexes
   - Reduce complexity

2. **Reduce maxSteps**
   ```typescript
   // In sandbox-script/agent.ts
   maxSteps: 10  // Instead of 15
   ```

3. **Limit web searches**
   - Agent should use search_web sparingly
   - Check system prompt guidance

4. **Send progress updates**
   ```typescript
   // In api/webhook.ts
   await sendWhatsAppMessage(from, '⏳ Step 3/5: Running SQL queries...')
   ```

### Issue: High costs

**Symptoms:**
- E2B credits depleting quickly

**Solutions:**

1. **Monitor sandbox usage**
   - Check E2B dashboard
   - Look for long-running sandboxes

2. **Implement timeout**
   ```typescript
   // Add timeout to E2B agent
   const timeout = setTimeout(() => {
     sandbox.close()
     throw new Error('Analysis timeout')
   }, 5 * 60 * 1000) // 5 minutes
   ```

3. **Cache results**
   - Store analysis results
   - Reuse for similar queries

---

## Development Issues

### Issue: Local development not working

**Symptoms:**
- Errors when running `npm run dev`

**Solutions:**

1. **Install all dependencies**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Use ngrok for webhook testing**
   ```bash
   npm run dev
   # In another terminal:
   ngrok http 3000
   # Update Twilio webhook to ngrok URL
   ```

3. **Mock E2B for local testing**
   ```typescript
   // Create lib/e2b-agent.mock.ts for local dev
   export async function runE2BAgent(input) {
     // Return mock data
     return {
       pdfBuffer: Buffer.from('mock'),
       insights: {},
       summary: 'Mock analysis'
     }
   }
   ```

### Issue: TypeScript errors

**Symptoms:**
- Build fails with TS errors

**Solutions:**

1. **Update TypeScript**
   ```bash
   npm install typescript@latest
   ```

2. **Check tsconfig.json**
   ```json
   {
     "compilerOptions": {
       "skipLibCheck": true,  // Add this
       "strict": true
     }
   }
   ```

3. **Install type definitions**
   ```bash
   npm install --save-dev @types/node @types/better-sqlite3
   ```

---

## Getting Help

If issues persist:

1. **Check Vercel Logs**
   - Most detailed error information
   - Real-time debugging

2. **Check E2B Dashboard**
   - Sandbox execution logs
   - Resource usage

3. **Test Components Individually**
   - Test Twilio webhook
   - Test E2B sandbox
   - Test PDF generation
   - Test Blob upload

4. **Discord/Community**
   - E2B Discord: [discord.gg/e2b](https://discord.gg/e2b)
   - Vercel Discord
   - Groq Community

5. **Review Documentation**
   - [E2B Docs](https://e2b.dev/docs)
   - [Vercel AI SDK](https://sdk.vercel.ai)
   - [Exa MCP](https://hub.docker.com/mcp/server/exa/overview)

---

## Emergency Checklist

When everything is broken:

- [ ] Are all environment variables set?
- [ ] Did you redeploy after changing env vars?
- [ ] Is Twilio webhook URL correct?
- [ ] Do you have API credits remaining?
- [ ] Are there any Vercel deployment errors?
- [ ] Did you test with the sample CSV?
- [ ] Have you checked ALL the logs?

---

**Still stuck?** Create a detailed issue with:
- Error messages (full text)
- Vercel logs
- Steps to reproduce
- What you've already tried

