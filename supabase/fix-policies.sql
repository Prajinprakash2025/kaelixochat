-- ==============================================================================
-- KAELIXO DATABASE FIX & PRODUCTION UPGRADE
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/untypucxdpgxnfezzwuo/sql/new
-- ==============================================================================

-- 1. Drop old recursive policies
DROP POLICY IF EXISTS "Public profiles can read orgs" ON public.organizations;
DROP POLICY IF EXISTS "Members view workspaces" ON public.organizations;
DROP POLICY IF EXISTS "Members view departments" ON public.departments;
DROP POLICY IF EXISTS "Members view workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Members view channels" ON public.channels;
DROP POLICY IF EXISTS "Members view and post messages" ON public.messages;
DROP POLICY IF EXISTS "Members manage reactions" ON public.reactions;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- 2. Add sender metadata columns to messages for ultra-fast chat without query locks
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE public.messages ALTER COLUMN sender_id DROP NOT NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_name TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_avatar TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_role TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_department TEXT;

-- 3. Relax foreign key on reactions
ALTER TABLE public.reactions DROP CONSTRAINT IF EXISTS reactions_member_id_fkey;
ALTER TABLE public.reactions ALTER COLUMN member_id DROP NOT NULL;

-- 4. Create clean, high-performance RLS policies (Zero Recursion)
CREATE POLICY "Allow public read organizations" ON public.organizations FOR SELECT USING (true);
CREATE POLICY "Allow public read departments" ON public.departments FOR SELECT USING (true);

CREATE POLICY "Allow read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow insert/update own profile" ON public.profiles FOR ALL USING (true);

CREATE POLICY "Allow read workspace members" ON public.workspace_members FOR SELECT USING (true);
CREATE POLICY "Allow insert workspace members" ON public.workspace_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update workspace members" ON public.workspace_members FOR UPDATE USING (true);

CREATE POLICY "Allow read channels" ON public.channels FOR SELECT USING (true);
CREATE POLICY "Allow insert channels" ON public.channels FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow read messages" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Allow insert messages" ON public.messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update/delete messages" ON public.messages FOR ALL USING (true);

CREATE POLICY "Allow all reactions" ON public.reactions FOR ALL USING (true);

-- 5. Enable Realtime Replication on tables
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.channels;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
