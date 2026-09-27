-- AURORA: run once in your project's SQL Editor.
-- Additive setup. Existing application data is not deleted.
begin;
create table if not exists public.aurora_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.aurora_state enable row level security;
revoke all on public.aurora_state from anon;
grant select on public.aurora_state to authenticated;
do $$ begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='aurora_state' and policyname='Aurora own data') then
  create policy "Aurora own data" on public.aurora_state for select to authenticated using ((select auth.uid())=user_id);
 end if;
end $$;

-- Compare-and-swap under a per-account transaction lock prevents lost updates.
create or replace function public.aurora_commit(expected_revision bigint, next_state jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare who uuid := auth.uid(); saved public.aurora_state%rowtype;
begin
 if who is null then raise exception 'Sign in first'; end if;
 if expected_revision is null or expected_revision<0 then raise exception 'Invalid revision'; end if;
 if next_state is null or jsonb_typeof(next_state) <> 'object' or not (next_state ? 'settings')
    or pg_column_size(next_state)>5000000 then raise exception 'Invalid application state'; end if;
 perform pg_advisory_xact_lock(hashtextextended(who::text,0));
 select * into saved from public.aurora_state where user_id=who;
 if coalesce(saved.revision,0)<>expected_revision then
  return jsonb_build_object('ok',false,'revision',coalesce(saved.revision,0),'state',saved.state);
 end if;
 insert into public.aurora_state(user_id,state,revision) values(who,next_state,1)
 on conflict(user_id) do update set state=excluded.state,revision=public.aurora_state.revision+1,updated_at=now()
 returning * into saved;
 return jsonb_build_object('ok',true,'revision',saved.revision,'state',saved.state);
end $$;
revoke all on function public.aurora_commit(bigint,jsonb) from public,anon;
grant execute on function public.aurora_commit(bigint,jsonb) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('aurora-media','aurora-media',false,52428800,array['image/*','video/*','audio/*'])
on conflict(id) do nothing;
do $$ begin
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Aurora private media read') then
  create policy "Aurora private media read" on storage.objects for select to authenticated using (bucket_id='aurora-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
  create policy "Aurora private media insert" on storage.objects for insert to authenticated with check (bucket_id='aurora-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
  create policy "Aurora private media update" on storage.objects for update to authenticated using (bucket_id='aurora-media' and (storage.foldername(name))[1]=(select auth.uid())::text) with check (bucket_id='aurora-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
 end if;
end $$;
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='aurora_state') then
  alter publication supabase_realtime add table public.aurora_state;
 end if;
end $$;
commit;

