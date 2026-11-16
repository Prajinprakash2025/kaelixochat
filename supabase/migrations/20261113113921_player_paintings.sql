begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('player-paintings', 'player-paintings', false, 8388608, array['image/png'])
on conflict (id) do update set public = false, file_size_limit = 8388608, allowed_mime_types = array['image/png'];

create table public.player_paintings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  design_name text not null check (char_length(btrim(design_name)) between 1 and 80),
  storage_path text not null,
  thumbnail_path text,
  texture_version integer not null default 1 check (texture_version > 0),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (storage_path ~ ('^' || user_id::text || '/' || id::text || '(-[0-9a-f-]{36})?\.png$')),
  check (thumbnail_path is null or thumbnail_path = regexp_replace(storage_path, '\.png$', '-thumb.png'))
);

create index player_paintings_owner_updated on public.player_paintings (user_id, updated_at desc);
create unique index player_paintings_one_active on public.player_paintings (user_id) where is_active;
alter table public.player_paintings enable row level security;
revoke all on public.player_paintings from public, anon, authenticated;
grant select, insert, update, delete on public.player_paintings to authenticated;

create policy "Read own paintings" on public.player_paintings for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Insert own paintings" on public.player_paintings for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Update own paintings" on public.player_paintings for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Delete own paintings" on public.player_paintings for delete to authenticated
  using (user_id = (select auth.uid()));

-- Also constrain existing permissive storage policies for this bucket.
create policy "Private painting namespace" on storage.objects as restrictive for all to public
  using (bucket_id <> 'player-paintings' or
    (select auth.uid())::text = (storage.foldername(name))[1])
  with check (bucket_id <> 'player-paintings' or
    ((select auth.uid())::text = (storage.foldername(name))[1] and
    name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}(-[0-9a-f-]{36})?(-thumb)?\.png$'));
create policy "Manage own painting objects" on storage.objects for all to authenticated
  using (bucket_id = 'player-paintings' and (select auth.uid())::text = (storage.foldername(name))[1])
  with check (bucket_id = 'player-paintings' and (select auth.uid())::text = (storage.foldername(name))[1]);

create function public.activate_player_painting(design_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare owner_id uuid := auth.uid();
begin
  if owner_id is null then raise exception 'Sign in to activate a painting'; end if;
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text, 0));
  perform 1 from public.player_paintings where id = design_id and user_id = owner_id for update;
  if not found then raise exception 'Painting not found'; end if;
  update public.player_paintings set is_active = false where user_id = owner_id and is_active and id <> design_id;
  update public.player_paintings set is_active = true where user_id = owner_id and id = design_id;
end;
$$;
revoke all on function public.activate_player_painting(uuid) from public, anon;
grant execute on function public.activate_player_painting(uuid) to authenticated;
commit;
