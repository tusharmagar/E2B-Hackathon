# 🎥 Demo Video Script

**Time Limit:** Under 2 minutes  
**Goal:** Showcase the WhatsApp Data Analyst Agent with E2B Sandbox and Exa MCP

---

## 📋 Pre-Recording Checklist

- [ ] Test the full flow end-to-end
- [ ] Prepare screen recording software (Loom, OBS, QuickTime)
- [ ] Have WhatsApp open on phone (or emulator)
- [ ] Have Vercel/E2B dashboards open in browser
- [ ] Prepare `sample-data.csv` file
- [ ] Have generated PDF ready to show
- [ ] Test audio/microphone
- [ ] Close unnecessary tabs/apps

---

## 🎬 Script Timeline (120 seconds)

### INTRO (0:00 - 0:15) - 15 seconds

**Visual:** Title card or WhatsApp interface

**Script:**
> "Meet the WhatsApp Data Analyst Agent - an AI-powered analyst that performs deep CSV analysis using E2B Sandbox, Exa MCP, and Groq AI. Just send a CSV via WhatsApp, and get comprehensive insights in minutes."

**Show:**
- Project name/logo
- Tech stack badges (E2B, Exa MCP, Groq, Vercel)

---

### DEMO PART 1: Sending CSV (0:15 - 0:30) - 15 seconds

**Visual:** Phone screen recording (WhatsApp)

**Script:**
> "I'll send this sales data CSV to the WhatsApp bot. It contains 36 rows of product sales across different months and regions."

**Actions:**
1. Open WhatsApp
2. Navigate to bot conversation
3. Attach `sample-data.csv`
4. Hit send
5. Show bot acknowledgment: "Analyzing data..."

---

### DEMO PART 2: Backend Processing (0:30 - 0:55) - 25 seconds

**Visual:** Split screen - E2B Dashboard + Vercel Logs

**Script:**
> "Behind the scenes, the agent spins up an E2B sandbox, converts the CSV to SQLite, and runs a multi-step AI analysis. Watch as it executes SQL queries, performs statistical analysis, and even searches the web for external context using Exa MCP via Docker."

**Show:**
1. **E2B Dashboard:**
   - Sandbox being created
   - Active sandbox status
   
2. **Vercel Logs (scrolling):**
   ```
   🚀 Starting E2B agent...
   📦 Uploading agent scripts...
   🐳 Installing Docker...
   📥 Pulling Exa MCP image...
   🤖 Running multi-step agent...
   📊 Step 1: Query database structure
   📊 Step 3: Calculate statistics
   🌐 Step 7: Web search for context
   📄 Generating PDF report...
   ```

3. **Terminal/Console (optional):**
   - Show agent reasoning steps
   - Tool calls being made

---

### DEMO PART 3: Receiving Results (0:55 - 1:15) - 20 seconds

**Visual:** WhatsApp receiving message + PDF preview

**Script:**
> "Within 2-3 minutes, I receive a WhatsApp reply with a direct link to a beautifully designed PDF report using neobrutalism styling."

**Actions:**
1. Show WhatsApp notification
2. Open message with PDF link
3. Click link to open PDF
4. Scroll through PDF showing:
   - Executive Summary
   - SQL Analysis results
   - Statistical insights
   - Charts/visualizations
   - External research (if performed)

**Highlight:**
- Bold borders
- Bright colors (#FFC700, #FF6B9D, #00D9FF)
- Professional layout

---

### DEMO PART 4: Follow-up Question (1:15 - 1:35) - 20 seconds

**Visual:** WhatsApp conversation + New response

**Script:**
> "The agent maintains context for follow-up questions. I'll ask it to explain the September drop in sales, and it intelligently searches the web for external factors."

**Actions:**
1. Send message: "Why did sales drop in September?"
2. Show bot thinking
3. Show Exa MCP search in logs:
   ```
   🌐 Web Search: sales decline September 2024
   ```
4. Receive detailed explanation with web research

---

### CLOSING: Technical Highlights (1:35 - 2:00) - 25 seconds

**Visual:** Architecture diagram or slides

**Script:**
> "This project demonstrates: One, all heavy computation runs securely in E2B sandboxes. Two, Exa MCP via Docker provides intelligent web research. Three, a multi-step AI agent with Groq performs 15+ reasoning steps for deep analysis. And four, it's fully conversational with session management."

**Show (bullet points on screen):**
- ✅ **E2B Sandbox** - Isolated execution environment
- ✅ **Exa MCP (Docker)** - From Docker MCP Hub
- ✅ **Multi-Step Agent** - 15 iterative reasoning steps
- ✅ **Conversational** - Context-aware follow-ups
- ✅ **Production Ready** - Deployed on Vercel

**End screen:**
- GitHub repo link
- "Built for E2B Hackathon 2024"
- Tech logos: E2B, Groq, Exa, Vercel

---

## 🎨 Visual Tips

### Screen Layout

**Option 1: Picture-in-Picture**
```
┌────────────────────────────┐
│                            │
│   Primary View (Desktop)   │
│                            │
│         ┌──────────┐       │
│         │ Phone    │       │
│         │ Screen   │       │
│         └──────────┘       │
└────────────────────────────┘
```

**Option 2: Split Screen**
```
┌─────────────┬──────────────┐
│             │              │
│  WhatsApp   │  Dashboard   │
│             │              │
└─────────────┴──────────────┘
```

### Recording Tips

1. **Use 1080p or higher resolution**
2. **Record at 30fps**
3. **Clear audio (use good mic)**
4. **Add subtle background music** (low volume)
5. **Use cursor highlighting**
6. **Add text overlays for key points**

---

## 🎤 Voiceover Tips

1. **Speak clearly and confidently**
2. **Maintain steady pace** (not too fast)
3. **Emphasize key technologies:**
   - "E2B Sandbox"
   - "Exa MCP via Docker"
   - "Multi-step AI agent"
4. **Show enthusiasm** (this is cool tech!)
5. **Practice 2-3 times before final recording**

---

## 📝 Alternative Script (Technical Focus)

For a more technical audience:

### Modified Timeline

**0:00-0:20:** Architecture overview
- Show diagram of flow
- Explain each component

**0:20-0:40:** Code walkthrough
- Show agent.ts with multi-step logic
- Highlight Exa MCP Docker integration
- Show tool definitions

**0:40-1:00:** Live demo (condensed)
- Quick WhatsApp → PDF flow

**1:00-1:30:** Technical highlights
- E2B sandbox setup code
- MCP client connection
- Vercel AI SDK usage

**1:30-2:00:** Results and metrics
- Show performance stats
- Discuss scalability

---

## 📊 What to Emphasize

### Must Show (Hackathon Requirements)

1. ✅ **E2B Sandbox in action**
   - Dashboard showing active sandbox
   - Logs showing Docker installation

2. ✅ **Exa MCP from Docker Hub**
   - Show docker pull command in logs
   - Show MCP client connection
   - Show actual web search happening

3. ✅ **Multi-step reasoning**
   - Display 10-15 agent steps
   - Show different tools being called

4. ✅ **Functioning demo**
   - Complete end-to-end flow
   - Real CSV → Real PDF

### Nice to Have

- Code snippets
- Performance metrics
- Error handling
- Follow-up conversations
- Multiple CSV examples

---

## 🎬 Production Checklist

Before final recording:

- [ ] Script memorized/practiced
- [ ] All apps updated to latest versions
- [ ] Clean desktop (no clutter)
- [ ] Notifications disabled
- [ ] Dark mode or light mode (consistent)
- [ ] Browser bookmarks hidden
- [ ] Test audio levels
- [ ] Test recording quality
- [ ] Have backup recordings

---

## 📤 Export Settings

**Video Format:**
- MP4 (H.264)
- 1920x1080 (1080p) or 3840x2160 (4K)
- 30fps
- Bitrate: 8-10 Mbps

**Audio:**
- AAC
- 48kHz
- 320 kbps (stereo)

**Duration:**
- **Maximum:** 2 minutes (120 seconds)
- **Ideal:** 1:45 - 1:55 (leaves buffer)

---

## 🎯 Final Tips

1. **Quality over quantity** - Better to show one complete flow than rush multiple features
2. **Show, don't just tell** - Actual logs and dashboards are more convincing
3. **Highlight uniqueness** - Multi-step agent + MCP + E2B is the differentiator
4. **Be authentic** - Show genuine enthusiasm for the project
5. **End strong** - Make the call-to-action clear (GitHub link, try it yourself)

---

## 🔗 Upload Instructions

**Where to upload:**
1. YouTube (unlisted or public)
2. Loom
3. Google Drive (with public link)

**Submission:**
- Include video link in hackathon submission form
- Add to GitHub README
- Share on social media with hashtags:
  - #E2BHackathon
  - #MCP
  - #AIAgents

---

**Ready to record? Go crush it! 🚀**

