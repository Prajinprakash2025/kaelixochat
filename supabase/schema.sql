-- ==============================================================================
-- KAELIXO DATABASE SCHEMA & REALTIME ENGINE SETUP
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Organizations / Workspaces (Multi-Tenant Core)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    plan TEXT DEFAULT 'free',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Departments (Dev, Teaching, Telecalling, Management)
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL, -- e.g., 'dev', 'teaching', 'telecalling', 'management'
    description TEXT,
    icon TEXT DEFAULT 'Users',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. User Profiles (Extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Workspace Members (Users linked to Organization & Department)
CREATE TABLE IF NOT EXISTS public.workspace_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'manager', 'member'
    status_text TEXT,
    is_online BOOLEAN DEFAULT false,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- 6. Channels (Public, Private, Department-specific)
CREATE TABLE IF NOT EXISTS public.channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    topic TEXT,
    is_private BOOLEAN DEFAULT false,
    created_by UUID REFERENCES public.workspace_members(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Channel Members
CREATE TABLE IF NOT EXISTS public.channel_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.workspace_members(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(channel_id, member_id)
);

-- 8. Messages (With Realtime & Thread Support)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.workspace_members(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
    attachments JSONB DEFAULT '[]'::JSONB,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Message Reactions (Emojis)
CREATE TABLE IF NOT EXISTS public.reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.workspace_members(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, member_id, emoji)
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

-- Allow public read of organizations for onboarding check
CREATE POLICY "Public profiles can read orgs" ON public.organizations FOR SELECT USING (true);
CREATE POLICY "Users can view their own profile" ON public.profiles FOR ALL USING (auth.uid() = id);

-- Allow authenticated users to see data from their active workspaces
CREATE POLICY "Members view workspaces" ON public.organizations FOR SELECT 
    USING (EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_members.organization_id = organizations.id AND workspace_members.user_id = auth.uid()));

CREATE POLICY "Members view departments" ON public.departments FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_members.organization_id = departments.organization_id AND workspace_members.user_id = auth.uid()));

CREATE POLICY "Members view workspace members" ON public.workspace_members FOR ALL 
    USING (organization_id IN (SELECT organization_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Members view channels" ON public.channels FOR ALL 
    USING (organization_id IN (SELECT organization_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Members view and post messages" ON public.messages FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM public.channels c
        JOIN public.workspace_members wm ON wm.organization_id = c.organization_id
        WHERE c.id = messages.channel_id AND wm.user_id = auth.uid()
    ));

CREATE POLICY "Members manage reactions" ON public.reactions FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM public.messages m
        JOIN public.channels c ON c.id = m.channel_id
        JOIN public.workspace_members wm ON wm.organization_id = c.organization_id
        WHERE m.id = reactions.message_id AND wm.user_id = auth.uid()
    ));

-- ==============================================================================
-- AUTOMATIC PROFILE TRIGGER ON SIGNUP
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==============================================================================
-- ENABLE SUPABASE REALTIME REPLICATION
-- ==============================================================================

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.channels;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_members;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
