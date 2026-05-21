-- ============================================================
-- LOOP PLATFORM - Complete RLS Policies Fix for All Tables
-- Run this in Supabase SQL Editor (https://supabase.com)
-- ============================================================

-- ==========================================
-- 1. PROFILES TABLE POLICIES
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public insert on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public update on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public delete on profiles" ON public.profiles;

CREATE POLICY "Allow public read on profiles" ON public.profiles FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on profiles" ON public.profiles FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update on profiles" ON public.profiles FOR UPDATE TO public USING (true);
CREATE POLICY "Allow public delete on profiles" ON public.profiles FOR DELETE TO public USING (true);

-- ==========================================
-- 2. POSTS TABLE POLICIES
-- ==========================================
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on posts" ON public.posts;
DROP POLICY IF EXISTS "Allow public insert on posts" ON public.posts;
DROP POLICY IF EXISTS "Allow public update on posts" ON public.posts;
DROP POLICY IF EXISTS "Allow public delete on posts" ON public.posts;

CREATE POLICY "Allow public read on posts" ON public.posts FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on posts" ON public.posts FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update on posts" ON public.posts FOR UPDATE TO public USING (true);
CREATE POLICY "Allow public delete on posts" ON public.posts FOR DELETE TO public USING (true);

-- ==========================================
-- 3. STORIES TABLE POLICIES
-- ==========================================
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on stories" ON public.stories;
DROP POLICY IF EXISTS "Allow public insert on stories" ON public.stories;
DROP POLICY IF EXISTS "Allow public update on stories" ON public.stories;
DROP POLICY IF EXISTS "Allow public delete on stories" ON public.stories;

CREATE POLICY "Allow public read on stories" ON public.stories FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on stories" ON public.stories FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update on stories" ON public.stories FOR UPDATE TO public USING (true);
CREATE POLICY "Allow public delete on stories" ON public.stories FOR DELETE TO public USING (true);

-- ==========================================
-- 4. REELS TABLE POLICIES
-- ==========================================
ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on reels" ON public.reels;
DROP POLICY IF EXISTS "Allow public insert on reels" ON public.reels;
DROP POLICY IF EXISTS "Allow public update on reels" ON public.reels;
DROP POLICY IF EXISTS "Allow public delete on reels" ON public.reels;

CREATE POLICY "Allow public read on reels" ON public.reels FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on reels" ON public.reels FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update on reels" ON public.reels FOR UPDATE TO public USING (true);
CREATE POLICY "Allow public delete on reels" ON public.reels FOR DELETE TO public USING (true);
