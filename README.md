# Repurpose Engine

Turn any video into every platform format. Upload a video or paste a YouTube URL — we find the viral moments, cut the clips, add captions, and export for every platform.

## Tech Stack

- **Next.js 14** — React framework
- **FFmpeg.wasm** — Client-side video processing (no server uploads)
- **MongoDB** — User accounts and data
- **Claude API** — AI viral moment detection
- **OpenAI Whisper** — Caption generation
- **PayPal** — Subscriptions

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:
- `MONGODB_URI` — Get free database at mongodb.com/atlas
- `JWT_SECRET` — Any random 32+ character string
- `ANTHROPIC_API_KEY` — Get at console.anthropic.com
- `OPENAI_API_KEY` — Get at platform.openai.com  
- `NEXT_PUBLIC_PAYPAL_CLIENT_ID` — Get at developer.paypal.com
- `PAYPAL_CLIENT_SECRET` — From PayPal developer dashboard

### 3. Run locally
```bash
npm run dev
```

Open http://localhost:3000

### 4. Deploy to Vercel

Push to GitHub and Vercel auto-deploys. Add environment variables in Vercel dashboard under Settings → Environment Variables.

## Environment Variables for Vercel

Add these in your Vercel project settings:

| Variable | Where to get it |
|---|---|
| `MONGODB_URI` | mongodb.com/atlas → Create free cluster |
| `JWT_SECRET` | Any random string (32+ chars) |
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `OPENAI_API_KEY` | platform.openai.com |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | developer.paypal.com |
| `PAYPAL_CLIENT_SECRET` | developer.paypal.com |
| `NEXT_PUBLIC_APP_URL` | Your Vercel URL |

## Features

### Free Plan (3 videos/day)
- Upload video files up to 500MB
- All 7 platform formats (YouTube Short, Reel, TikTok, Square, Twitter, Facebook, LinkedIn)
- Smart reframe (crop to vertical/square)
- Download clips

### Pro Plan ($19/month)
- Unlimited videos
- Files up to 4GB
- AI viral moment detection (Claude)
- Auto-captions (Whisper)
- YouTube URL support
- Priority support

### Agency Plan ($79/month)
- Everything in Pro
- 10 team seats
- Bulk upload
- API access
- White-label exports
