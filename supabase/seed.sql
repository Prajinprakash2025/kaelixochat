-- ==============================================================================
-- KAELIXO SEED DATA (INITIAL SETUP)
-- ==============================================================================

-- 1. Insert Default Organization
INSERT INTO public.organizations (id, name, slug, plan)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Kaelixo HQ', 'kaelixo-hq', 'pro')
ON CONFLICT (slug) DO NOTHING;

-- 2. Insert Departments for Kaelixo
INSERT INTO public.departments (id, organization_id, name, code, description, icon)
VALUES
    ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'Development', 'dev', 'Code, PR reviews, and deployments', 'Code2'),
    ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Teaching & Training', 'teaching', 'Batches, study materials & doubt clearance', 'GraduationCap'),
    ('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', 'Telecalling & Sales', 'telecalling', 'Call notes, lead conversions & daily targets', 'PhoneCall'),
    ('22222222-2222-2222-2222-222222222224', '11111111-1111-1111-1111-111111111111', 'Management', 'management', 'Executive updates, metrics & company policies', 'Briefcase')
ON CONFLICT DO NOTHING;

-- 3. Insert Default Channels
INSERT INTO public.channels (id, organization_id, department_id, name, topic, is_private)
VALUES
    ('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', NULL, 'announcements', '📢 Company-wide important announcements', false),
    ('33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111111', NULL, 'general', '💬 Casual conversations and team banter', false),
    ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222221', 'dev-sprint', '⚡ Tech discussions, bug reports, and PR reviews', false),
    ('33333333-3333-3333-3333-333333333334', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'teaching-hub', '📚 Class materials, student schedules, and feedback', false),
    ('33333333-3333-3333-3333-333333333335', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222223', 'telecalling-leads', '🎯 Daily call reports, follow-ups, and lead conversion targets', false),
    ('33333333-3333-3333-3333-333333333336', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222224', 'management-sync', '🔒 Leadership updates and operational reports', true)
ON CONFLICT DO NOTHING;
