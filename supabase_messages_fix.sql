-- ============================================================
-- LOOP PLATFORM - Messages Table Fix for Multi-User Support
-- Run this in Supabase SQL Editor
-- ============================================================

-- Step 1: Add missing columns to messages table (snake_case - Supabase default)
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS receiver_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

-- Step 2: (No migration needed - table already uses snake_case column names)

-- Step 3: Create indexes for fast message lookup
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_receiver_id_idx ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON public.messages(created_at);

-- Step 4: Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop any existing conflicting policies
DROP POLICY IF EXISTS "Allow users to read their own messages" ON public.messages;
DROP POLICY IF EXISTS "Allow users to send messages" ON public.messages;
DROP POLICY IF EXISTS "Allow receivers to update messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view their messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Receivers can mark as read" ON public.messages;

-- Step 6: Create RLS policies
-- Note: Using "TO public" allows demo users (who bypass Supabase auth) to also send/read messages.
-- For a production-only app you would restrict to authenticated users only.
DROP POLICY IF EXISTS "Allow anyone to view messages" ON public.messages;
DROP POLICY IF EXISTS "Allow anyone to send messages" ON public.messages;
DROP POLICY IF EXISTS "Allow anyone to update messages" ON public.messages;

CREATE POLICY "Allow anyone to view messages"
  ON public.messages FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow anyone to send messages"
  ON public.messages FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow anyone to update messages"
  ON public.messages FOR UPDATE
  TO public
  USING (true);

-- Step 7: Enable Realtime (safe - skips if already a member)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'messages already in supabase_realtime, skipping.';
END $$;

-- ============================================================
-- Demo user profiles (ensure these exist for instant login)
-- ============================================================
INSERT INTO public.profiles (id, full_name, username, avatar_url, bio, gmail)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'Luna Dream', 'luna_dream', '/images/avatar_elena_1779191722727.png', 'Cyberpunk visual artist', 'luna@loop.ai'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567802', 'Elena Rostova', 'elena_rostova', '/images/avatar_elena_1779191722727.png', 'AI Developer & Writer', 'elena@loop.ai'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567803', 'Marcus Vance', 'marcus_v', '/images/avatar_marcus_1779191788520.png', 'Gadget reviewer & developer', 'marcus@loop.ai'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567804', 'Alex Rivera', 'alex_design', '/images/avatar_sarah_1779191804823.png', 'Lead UX Designer & Photographer', 'alex@loop.ai'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567805', 'Sophia Chen', 'sophia_code', '/images/avatar_elena_1779191722727.png', 'Full Stack Engineer & Dog Lover', 'sophia@loop.ai'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567806', 'Lucas Martinez', 'lucas_sound', '/images/avatar_marcus_1779191788520.png', 'Music Producer & Sound Designer', 'lucas@loop.ai'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567807', 'Emma Watson', 'emma_travels', '/images/avatar_sarah_1779191804823.png', 'Digital Nomad & Travel Blogger', 'emma@loop.ai'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567808', 'David Miller', 'david_fit', '/images/avatar_marcus_1779191788520.png', 'Personal Trainer & Nutritionist', 'david@loop.ai')
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  username = EXCLUDED.username,
  avatar_url = EXCLUDED.avatar_url,
  bio = EXCLUDED.bio,
  gmail = EXCLUDED.gmail;

-- ============================================================
-- Step 8: Configure public RLS policies for follow_requests
-- ============================================================
ALTER TABLE public.follow_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anyone to insert follow requests" ON public.follow_requests;
DROP POLICY IF EXISTS "Allow users to view their own follow requests" ON public.follow_requests;
DROP POLICY IF EXISTS "Allow users to update follow requests" ON public.follow_requests;
DROP POLICY IF EXISTS "Allow users to delete follow requests" ON public.follow_requests;
DROP POLICY IF EXISTS "Allow public SELECT on follow_requests" ON public.follow_requests;
DROP POLICY IF EXISTS "Allow public INSERT on follow_requests" ON public.follow_requests;
DROP POLICY IF EXISTS "Allow public UPDATE on follow_requests" ON public.follow_requests;
DROP POLICY IF EXISTS "Allow public DELETE on follow_requests" ON public.follow_requests;

CREATE POLICY "Allow public SELECT on follow_requests" ON public.follow_requests FOR SELECT TO public USING (true);
CREATE POLICY "Allow public INSERT on follow_requests" ON public.follow_requests FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public UPDATE on follow_requests" ON public.follow_requests FOR UPDATE TO public USING (true);
CREATE POLICY "Allow public DELETE on follow_requests" ON public.follow_requests FOR DELETE TO public USING (true);
