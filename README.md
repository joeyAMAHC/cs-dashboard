# CS Dashboard — Next.js + Supabase + Vercel

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Add environment variables
```bash
cp .env.local.example .env.local
```
Fill in your values — Supabase keys are in **Supabase → Project Settings → API**.

### 3. Run locally
```bash
npm run dev
```
Open http://localhost:3000 — you'll be redirected to the login page.

---

## Deploy to Vercel

1. Push this folder to a GitHub repo
2. Go to vercel.com → New Project → import your repo
3. Add all 6 environment variables from `.env.local.example` in Vercel's dashboard
4. Deploy — Vercel gives you a public URL

### Add your Vercel URL to Supabase
After deploying, go to **Supabase → Authentication → URL Configuration** and add:
- Site URL: `https://your-app.vercel.app`
- Redirect URL: `https://your-app.vercel.app/**`

### Add your Vercel URL to Google OAuth
Go to **Google Cloud Console → APIs & Services → Credentials → your OAuth app** and add:
- Authorised redirect URI: `https://xxxx.supabase.co/auth/v1/callback` (already done)
- Authorised JavaScript origins: `https://your-app.vercel.app`

---

## Roadmap / Next Features

### 📋 Supplier Evidence Reports (next priority)
Export a formatted PDF/Word report for a selected date range that includes:
- Order number + order details (product, customer, date)
- Photos attached to the ticket (photo evidence of the defect/issue)
- Ticket description and resolution notes
- Grouped by supplier so the report can be handed directly to the supplier as a formal evidence package
- Goal: give suppliers clear, documented proof of recurring product issues to hold them accountable

---

## Controlling who can log in

In **Supabase → Authentication → Settings** you can:
- Restrict signups to specific email domains (e.g. `@yourcompany.com`)
- Or disable new signups entirely and manually invite users via **Authentication → Users → Invite**
