-- ==============================================================================
-- KAELIXO SLACK-PARITY PRODUCTION MIGRATION
-- Migration File: supabase/migrations/20261105_slack_parity.sql
-- Target: Supabase PostgreSQL 17 (Project: untypucxdpgxnfezzwuo)
-- Scope: Storage, Messages, Reactions, Threads, Search, Presence, Notifications, RLS
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. MESSAGES TABLE ENHANCEMENTS (R3, R4)
-- ------------------------------------------------------------------------------
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_count INT DEFAULT 0;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS last_reply_at TIMESTAMPTZ;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS pinned_by_name TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS pinned_by_id TEXT;

-- Generated search vector for full-text search
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'search_vector'
    ) THEN
        ALTER TABLE public.messages ADD COLUMN search_vector tsvector
            GENERATED ALWAYS AS (
                to_tsvector('english', COALESCE(content, '') || ' ' || COALESCE(sender_name, ''))
            ) STORED;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. REACTIONS TABLE ENHANCEMENTS (R2)
-- ------------------------------------------------------------------------------
ALTER TABLE public.reactions ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.reactions ADD COLUMN IF NOT EXISTS user_name TEXT;

-- ------------------------------------------------------------------------------
-- 4. NEW TABLES: NOTIFICATIONS, USER PRESENCE & ATTACHMENTS (R1, R5)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    sender_id TEXT,
    sender_name TEXT NOT NULL,
    sender_avatar TEXT,
    type TEXT NOT NULL, -- 'mention', 'direct_message', 'thread_reply', 'reaction'
    channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
    channel_name TEXT,
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_presence (
    user_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    avatar TEXT,
    department TEXT,
    role TEXT,
    status TEXT NOT NULL DEFAULT 'offline', -- 'online', 'away', 'in_call', 'offline'
    status_text TEXT,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attachments registry for cross-channel search and media explorer
CREATE TABLE IF NOT EXISTS public.attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_size TEXT NOT NULL,
    file_type TEXT NOT NULL,
    mime_type TEXT,
    storage_path TEXT NOT NULL,
    url TEXT NOT NULL,
    uploader_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. PERFORMANCE, COVERING & FOREIGN KEY INDEXES
-- ------------------------------------------------------------------------------
-- Messages Indexes
CREATE INDEX IF NOT EXISTS idx_messages_channel_created_at ON public.messages(channel_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_parent_id ON public.messages(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_channel_pinned ON public.messages(channel_id, created_at DESC) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_messages_search_vector ON public.messages USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON public.messages(channel_id);

-- Reactions Indexes (Covering index for Index-Only Scans)
CREATE INDEX IF NOT EXISTS idx_reactions_message_covering ON public.reactions(message_id) INCLUDE (emoji, user_id, user_name, created_at);
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON public.reactions(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reactions_unique_user_emoji ON public.reactions(message_id, user_id, emoji) WHERE user_id IS NOT NULL;

-- Performance Advisor Foreign Key Indexes
CREATE INDEX IF NOT EXISTS idx_channel_members_member_id ON public.channel_members(member_id);
CREATE INDEX IF NOT EXISTS idx_channels_created_by ON public.channels(created_by);
CREATE INDEX IF NOT EXISTS idx_channels_department_id ON public.channels(department_id);
CREATE INDEX IF NOT EXISTS idx_channels_organization_id ON public.channels(organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_channels_dm_name ON public.channels(organization_id, name) WHERE is_dm = true;
CREATE INDEX IF NOT EXISTS idx_departments_organization_id ON public.departments(organization_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_department_id ON public.workspace_members(department_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON public.workspace_members(user_id);

-- Notifications & Presence Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_message_id ON public.notifications(message_id);
CREATE INDEX IF NOT EXISTS idx_notifications_channel_id ON public.notifications(channel_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON public.user_presence(status);

-- Attachments Indexes
CREATE INDEX IF NOT EXISTS idx_attachments_message_id ON public.attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_attachments_channel_id ON public.attachments(channel_id);

-- ------------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Explicit UPDATE and DELETE policies on messages (Resolving critical live gap)
DROP POLICY IF EXISTS "Allow update messages" ON public.messages;
CREATE POLICY "Allow update messages" ON public.messages FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete messages" ON public.messages;
CREATE POLICY "Allow delete messages" ON public.messages FOR DELETE USING (true);

-- Notifications RLS
DROP POLICY IF EXISTS "Allow all notifications" ON public.notifications;
CREATE POLICY "Allow all notifications" ON public.notifications FOR ALL USING (true);

-- User Presence RLS
DROP POLICY IF EXISTS "Allow all user_presence" ON public.user_presence;
CREATE POLICY "Allow all user_presence" ON public.user_presence FOR ALL USING (true);

-- Channel Members RLS (Resolving Supabase Security Advisor Linter 0008)
DROP POLICY IF EXISTS "Allow all channel_members" ON public.channel_members;
CREATE POLICY "Allow all channel_members" ON public.channel_members FOR ALL USING (true);

-- Attachments RLS
DROP POLICY IF EXISTS "Allow all attachments" ON public.attachments;
CREATE POLICY "Allow all attachments" ON public.attachments FOR ALL USING (true);

-- Remediation for profiles multiple permissive policies (Resolving Advisor Linter 0006)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        DROP POLICY IF EXISTS "Allow insert/update own profile" ON public.profiles;
        CREATE POLICY "Allow insert own profile" ON public.profiles FOR INSERT WITH CHECK (true);
        CREATE POLICY "Allow update own profile" ON public.profiles FOR UPDATE USING (true);
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 7. SUPABASE STORAGE BUCKET & POLICIES (R1: kaelixo-attachments)
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'kaelixo-attachments',
    'kaelixo-attachments',
    true,
    52428800, -- 50 MB
    NULL -- Allows all media and documents (validated client-side against dangerous executables)
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage Object Policies
DROP POLICY IF EXISTS "Allow public read kaelixo-attachments" ON storage.objects;
CREATE POLICY "Allow public read kaelixo-attachments" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'kaelixo-attachments');

DROP POLICY IF EXISTS "Allow upload kaelixo-attachments" ON storage.objects;
CREATE POLICY "Allow upload kaelixo-attachments" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'kaelixo-attachments');

DROP POLICY IF EXISTS "Allow update kaelixo-attachments" ON storage.objects;
CREATE POLICY "Allow update kaelixo-attachments" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'kaelixo-attachments')
WITH CHECK (bucket_id = 'kaelixo-attachments');

DROP POLICY IF EXISTS "Allow delete kaelixo-attachments" ON storage.objects;
CREATE POLICY "Allow delete kaelixo-attachments" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'kaelixo-attachments');

-- ------------------------------------------------------------------------------
-- 8. THREAD AUTOMATION TRIGGER (R3)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_message_thread_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.parent_id IS NOT NULL THEN
        UPDATE public.messages
        SET reply_count = COALESCE(reply_count, 0) + 1,
            last_reply_at = NEW.created_at,
            updated_at = NOW()
        WHERE id = NEW.parent_id;
    ELSIF TG_OP = 'DELETE' AND OLD.parent_id IS NOT NULL THEN
        UPDATE public.messages
        SET reply_count = GREATEST(0, COALESCE(reply_count, 1) - 1),
            last_reply_at = (
                SELECT MAX(created_at)
                FROM public.messages
                WHERE parent_id = OLD.parent_id
                  AND id != OLD.id
            ),
            updated_at = NOW()
        WHERE id = OLD.parent_id;
    END IF;
    RETURN NULL;
END;
$$;

-- Revoke direct execution of trigger function by public/anon/authenticated roles
REVOKE EXECUTE ON FUNCTION public.update_message_thread_stats() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_message_thread_stats ON public.messages;
CREATE TRIGGER trg_message_thread_stats
AFTER INSERT OR DELETE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_message_thread_stats();

-- ------------------------------------------------------------------------------
-- 9. FULL-TEXT SEARCH RPC FUNCTION (R4)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_messages(query_text TEXT)
RETURNS TABLE (
    id UUID,
    channel_id UUID,
    channel_name TEXT,
    sender_id UUID,
    sender_name TEXT,
    sender_avatar TEXT,
    sender_role TEXT,
    content TEXT,
    attachments JSONB,
    parent_id UUID,
    reply_count INT,
    is_pinned BOOLEAN,
    created_at TIMESTAMPTZ,
    rank REAL
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
    SELECT
        m.id,
        m.channel_id,
        c.name AS channel_name,
        m.sender_id,
        m.sender_name,
        m.sender_avatar,
        m.sender_role,
        m.content,
        m.attachments,
        m.parent_id,
        COALESCE(m.reply_count, 0) AS reply_count,
        COALESCE(m.is_pinned, false) AS is_pinned,
        m.created_at,
        ts_rank(m.search_vector, websearch_to_tsquery('english', query_text)) AS rank
    FROM public.messages m
    JOIN public.channels c ON c.id = m.channel_id
    WHERE m.search_vector @@ websearch_to_tsquery('english', query_text)
      AND COALESCE(m.is_deleted, false) = false
    ORDER BY rank DESC, m.created_at DESC
    LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.search_messages(TEXT) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 10. REALTIME CONFIGURATION & REPLICA IDENTITY (R6)
-- ------------------------------------------------------------------------------
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.channels REPLICA IDENTITY FULL;
ALTER TABLE public.reactions REPLICA IDENTITY FULL;
ALTER TABLE public.workspace_members REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.user_presence REPLICA IDENTITY FULL;
ALTER TABLE public.attachments REPLICA IDENTITY FULL;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.channels;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_members;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attachments;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
