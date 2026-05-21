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

-- Step 2: If old camelCase columns exist, migrate data to snake_case
UPDATE public.messages SET sender_id = "senderId" WHERE sender_id IS NULL AND "senderId" IS NOT NULL;
UPDATE public.messages SET receiver_id = "receiverId" WHERE receiver_id IS NULL AND "receiverId" IS NOT NULL;
UPDATE public.messages SET is_read = "isRead" WHERE is_read IS NULL AND "isRead" IS NOT NULL;
UPDATE public.messages SET created_at = "createdAt" WHERE created_at IS NULL AND "createdAt" IS NOT NULL;

-- Step 3: Create indexes for fast message lookup
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_receiver_id_idx ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON public.messages(created_at);

-- Step 4: Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop old RLS policies to prevent conflicts
DROP POLICY IF EXISTS "Allow users to read their own messages" ON public.messages;
DROP POLICY IF EXISTS "Allow users to send messages" ON public.messages;
DROP POLICY IF EXISTS "Allow receivers to update messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view their messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;

-- Step 6: Create correct RLS policies (works with both camelCase and snake_case)
CREATE POLICY "Users can view their messages"
  ON public.messages FOR SELECT
  USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id OR
    auth.uid() = "senderId" OR auth.uid() = "receiverId"
  );

CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id OR auth.uid() = "senderId"
  );

CREATE POLICY "Receivers can mark as read"
  ON public.messages FOR UPDATE
  USING (
    auth.uid() = receiver_id OR auth.uid() = "receiverId"
  );

-- Step 7: Enable Realtime for live messaging across devices
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

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
