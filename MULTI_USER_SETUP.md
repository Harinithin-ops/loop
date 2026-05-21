# Multi-User Deployment Setup Guide

This guide ensures the Loop app works for **4+ simultaneous users** on different phones/laptops after deployment.

---

## Root Causes Fixed (Code Changes Already Applied)

| Issue | Impact | Fix Applied |
|---|---|---|
| `connection_limit=1` in `DATABASE_URL` | Only 1 DB connection — crashes with 2+ users | Raised to `connection_limit=10` |
| `sendMessage()` wrote to localStorage first | Messages only visible on sender's device | Supabase-first write order |
| `getTotalUnreadCount()` mixed local/db counts | Wrong badge count for different users | Supabase-primary with local fallback |
| Server bound to `localhost` only | External users couldn't connect | Now binds to `0.0.0.0` |
| CORS blocked | Cross-origin requests from other devices failed | CORS now open for all origins |
| Invalid mock session not cleared | Ghost sessions blocking login | Now validated and cleared |

---

## CRITICAL: Supabase SQL Steps (Run These!)

### Step 1 — Fix `messages` Table (Add `receiverId` column)

The app queries a `receiverId` column on the `messages` table for direct messaging to work between users. Run this in the **Supabase SQL Editor**:

```sql
-- Add receiverId to messages table for direct user-to-user messaging
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS "receiverId" uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Index for fast lookup (who am I in a conversation with?)
CREATE INDEX IF NOT EXISTS messages_receiver_idx ON public.messages("receiverId");
CREATE INDEX IF NOT EXISTS messages_sender_idx ON public.messages("senderId");

-- Allow any authenticated user to read messages they sent or received
DROP POLICY IF EXISTS "Allow users to read their own messages" ON public.messages;
CREATE POLICY "Allow users to read their own messages"
  ON public.messages FOR SELECT
  USING (auth.uid() = "senderId" OR auth.uid() = "receiverId");

-- Allow any authenticated user to insert messages
DROP POLICY IF EXISTS "Allow users to send messages" ON public.messages;
CREATE POLICY "Allow users to send messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = "senderId");

-- Allow marking messages as read
DROP POLICY IF EXISTS "Allow receivers to update messages" ON public.messages;
CREATE POLICY "Allow receivers to update messages"
  ON public.messages FOR UPDATE
  USING (auth.uid() = "receiverId");

-- Enable realtime for live messaging
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
```

### Step 2 — Verify `follow_requests` Table

Ensure the table exists with proper RLS (should already be set up from `supabase_schema_update.md`):

```sql
-- Verify table exists and has realtime enabled
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'follow_requests';
ALTER PUBLICATION supabase_realtime ADD TABLE public.follow_requests;
```

### Step 3 — Set Service Role Key for Follow Request API

The `/api/follow` Next.js route needs the **Service Role Key** to bypass RLS for cross-user operations:

1. Go to **Supabase Dashboard → Project Settings → API**
2. Copy the `service_role` key (keep it secret!)
3. Add it to your deployment environment variables:

```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...your_service_role_key_here
```

**For Vercel deployment:** Add this in Vercel Dashboard → Project → Settings → Environment Variables.

---

## How Users Can Log In (Multiple Simultaneous Users)

### Option A: Real Supabase Auth (Recommended for Production)
Each user signs up at `/signup` with their own email/password. This uses Supabase Auth and works across all devices simultaneously.

### Option B: Demo Bypass Login
Multiple users can log in simultaneously using different demo profiles from the login page. Each person picks a different demo creator (e.g., one picks `hari__nithin`, another picks `kani_06`). This stores a session-scoped token in `sessionStorage` (tab-isolated), so different tabs/devices using different demo accounts work fine.

> **⚠️ Note:** Two people **cannot** use the **same** demo profile simultaneously — they'd share the same user ID and see each other's data merged. Each person should use a **different** demo profile.

---

## Deployment Checklist

### For the Web App (Next.js on Vercel):

- [ ] `NEXT_PUBLIC_SUPABASE_URL` set in Vercel env vars
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set in Vercel env vars  
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set in Vercel env vars (required for follow API)
- [ ] Supabase `messages` table has `receiverId` column (run SQL above)
- [ ] Supabase `follow_requests` table has RLS policies (run SQL from `supabase_schema_update.md`)
- [ ] Supabase `media` storage bucket is public (run SQL from `supabase_schema_update.md`)

### For the GraphQL Server (if deployed separately):

- [ ] `DATABASE_URL` uses `connection_limit=10` (already fixed in `.env`)
- [ ] `PORT` and `HOST` environment variables set by hosting provider
- [ ] Server auto-binds to `0.0.0.0` (already fixed in `index.ts`)

---

## Testing Multi-User Locally

To test 4 users simultaneously on your local network:

1. Find your local IP: `ipconfig` (Windows) → look for `IPv4 Address` (e.g., `192.168.1.100`)
2. Run the web app: `npm run dev`
3. Other devices on the same WiFi can access: `http://192.168.1.100:3000`
4. Each person logs in with a **different** demo profile or their own Supabase account
5. They should see each other's posts, follow requests, and messages via Supabase
