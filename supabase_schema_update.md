# Supabase `public.profiles` Table Schema Update

To add the **`username`**, **`password`**, and **`gmail`** columns to your **`profiles`** table in Supabase, you can use either the **SQL Editor** (fastest & recommended) or the **Table Editor UI** (visual walkthrough). 

Below are the exact steps and scripts for both methods.

---

## Method 1: Using the SQL Editor (Recommended - 1 Click) ⚡

The SQL Editor is the terminal icon (`>_`) located **4th from the top** on the left-side vertical navigation bar in your Supabase Dashboard.

### Step 1: Open the SQL Editor
1. Click the **SQL Editor** icon (`>_`) in the left navigation sidebar.
2. Click **"+ New Query"** or **"Quick start"** to open a blank query window.

### Step 2: Paste and Run this SQL Code
Copy and paste the following SQL script into the editor:

```sql
-- Step 1: Alter 'public.profiles' table to add 'username', 'password', and 'gmail' columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username text UNIQUE,
ADD COLUMN IF NOT EXISTS password text,
ADD COLUMN IF NOT EXISTS gmail text UNIQUE;

-- Step 2: (Optional but recommended) Add comments to the columns for documentation in the editor
COMMENT ON COLUMN public.profiles.id IS 'Primary key linked to auth.users';
COMMENT ON COLUMN public.profiles.username IS 'Unique handle for the social media user';
COMMENT ON COLUMN public.profiles.password IS 'Encrypted or credential reference if manually tracked';
COMMENT ON COLUMN public.profiles.gmail IS 'Email address linked to the user account';
```

### Step 3: Run the Query
- Click the green **Run** button at the bottom-right of the query editor (or press `Ctrl + Enter` / `Cmd + Enter`).
- You will see a success message: `Success. No rows returned.`

---

## Method 2: Using the Table Editor UI (Visual - Step-by-Step) 🛠️

If you prefer to click and edit in the visual table editor shown in your screenshot:

### 1. Adding `username` Column:
1. Click the **`+`** icon on the far right of the column headers (located to the right of `created_at` in your table header).
2. A panel titled **"Add a new column to profiles"** will open on the right.
3. Fill in the fields:
   - **Name**: `username`
   - **Type**: `text`
   - **Default Value**: *Leave empty*
   - **Is Unique**: 🟢 *Check / Enable*
4. Click **"Save"** at the bottom of the panel.

### 2. Adding `password` Column:
1. Click the **`+`** icon on the far right of the column headers again.
2. Fill in the fields:
   - **Name**: `password`
   - **Type**: `text`
   - **Default Value**: *Leave empty*
   - **Is Unique**: 🔴 *Leave unchecked*
3. Click **"Save"**.

### 3. Adding `gmail` Column:
1. Click the **`+`** icon on the far right of the column headers one more time.
2. Fill in the fields:
   - **Name**: `gmail`
   - **Type**: `text`
   - **Default Value**: *Leave empty*
   - **Is Unique**: 🟢 *Check / Enable*
3. Click **"Save"**.

---

### Verification
Once completed, refresh your **Table Editor** tab, and you will see the columns added to your `public.profiles` editor alongside `id`, `full_name`, `avatar_url`, and `bio`!

---

## Part 2: Creating the `public.notifications` Table 🔔

To enable like, comment, and reel notifications in real-time, paste and run this script in the Supabase SQL Editor:

```sql
-- Step 1: Create the notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    receiver_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    type text NOT NULL, -- 'like_post', 'like_reel', 'comment_post', 'follow_request'
    related_id text,
    content text,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- Step 2: Enable RLS (Row Level Security)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policies
CREATE POLICY "Allow users to view their own notifications" 
    ON public.notifications FOR SELECT 
    USING (auth.uid() = receiver_id);

CREATE POLICY "Allow anyone to insert notifications" 
    ON public.notifications FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Allow users to update their own notifications" 
    ON public.notifications FOR UPDATE 
    USING (auth.uid() = receiver_id);

CREATE POLICY "Allow users to delete their own notifications" 
    ON public.notifications FOR DELETE 
    USING (auth.uid() = receiver_id);

-- Step 4: Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
```

---

## Part 3: Creating and Configuring the `public.follow_requests` Table 🤝

If you are experiencing issues sending or receiving follow requests, your `follow_requests` table may be missing proper **Row Level Security (RLS) policies**.

Please open the **Supabase SQL Editor** and run the following script to create/repair the table and establish bulletproof, secure RLS policies:

```sql
-- Step 1: Create the follow_requests table if it does not exist
CREATE TABLE IF NOT EXISTS public.follow_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "senderId" uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    "receiverId" uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    status text DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    "createdAt" timestamp with time zone DEFAULT now()
);

-- Step 2: Enable RLS (Row Level Security) on the table
ALTER TABLE public.follow_requests ENABLE ROW LEVEL SECURITY;

-- Step 3: Recreate Policies (Drop old ones first if they exist to prevent duplicates)
DROP POLICY IF EXISTS "Allow anyone to insert follow requests" ON public.follow_requests;
DROP POLICY IF EXISTS "Allow users to view their own follow requests" ON public.follow_requests;
DROP POLICY IF EXISTS "Allow users to update follow requests" ON public.follow_requests;
DROP POLICY IF EXISTS "Allow users to delete follow requests" ON public.follow_requests;

-- 3a. Allow inserting follow requests (anyone can send a request, protected by auth.uid verification)
CREATE POLICY "Allow anyone to insert follow requests" 
    ON public.follow_requests FOR INSERT 
    WITH CHECK (true);

-- 3b. Allow viewing sent or received requests (sender or receiver can select)
CREATE POLICY "Allow users to view their own follow requests" 
    ON public.follow_requests FOR SELECT 
    USING (auth.uid() = "senderId" OR auth.uid() = "receiverId");

-- 3c. Allow updating status (receiver accepts/rejects, sender can cancel)
CREATE POLICY "Allow users to update follow requests" 
    ON public.follow_requests FOR UPDATE 
    USING (auth.uid() = "receiverId" OR auth.uid() = "senderId");

-- 3d. Allow deleting/unfollowing
CREATE POLICY "Allow users to delete follow requests" 
    ON public.follow_requests FOR DELETE 
    USING (auth.uid() = "senderId" OR auth.uid() = "receiverId");

-- Step 4: Enable Realtime sync for instant follow updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.follow_requests;
```

---

## Part 4: Creating the `media` Storage Bucket 📂

If you see an error saying **`Upload failed: Bucket not found`**, this means your Supabase project does not have the **`media`** storage bucket created or configured.

You can solve this instantly by running a script in the **SQL Editor** or by manually creating it in the **Storage Dashboard**.

### Method A: Using SQL Editor (Fastest) ⚡
Paste and run the following script in the Supabase **SQL Editor** to automatically create the bucket and configure public security rules:

```sql
-- 1. Create the 'media' storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow uploads to media bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow deletions from media bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow updates to media bucket" ON storage.objects;

-- 3. Create policy to allow public reads from the media bucket (both guest/anon and signed in users)
CREATE POLICY "Public Access"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'media');

-- 4. Create policy to allow uploads (inserts) to the media bucket for guest/anon and signed in users
CREATE POLICY "Allow uploads to media bucket"
    ON storage.objects FOR INSERT
    TO public
    WITH CHECK (bucket_id = 'media');

-- 5. Create policy to allow file updates/overwrites
CREATE POLICY "Allow updates to media bucket"
    ON storage.objects FOR UPDATE
    TO public
    USING (bucket_id = 'media');

-- 6. Create policy to allow file deletions
CREATE POLICY "Allow deletions from media bucket"
    ON storage.objects FOR DELETE
    TO public
    USING (bucket_id = 'media');
```,StartLine:183,TargetContent:

---

### Method B: Using the Supabase Storage UI 🛠️
If you prefer using the dashboard interface:
1. Click on the **Storage** icon (the file cabinet cabinet icon) on the left sidebar in your Supabase Dashboard.
2. Click **"New Bucket"** at the top.
3. Name the bucket exactly: **`media`**
4. Set the toggle for **"Public bucket"** to 🟢 **Enabled** (so that image URLs are accessible publically).
5. Click **"Save"**.
6. Select the newly created **`media`** bucket, click on the **Policies** tab, and make sure **Insert** (Upload) and **Select** (Read) policies are set to allow access.


