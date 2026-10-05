-- Additive test storage. Older Aurora data remains untouched.
begin;
create table if not exists public.aurora_test_state_v13 (
 user_id uuid primary key references auth.users(id) on delete cascade,
 state jsonb not null check(jsonb_typeof(state)='object'),
 revision bigint not null default 1,
 updated_at timestamptz not null default now()
);
alter table public.aurora_test_state_v13 enable row level security;
revoke all on public.aurora_test_state_v13 from anon, authenticated;
grant select on public.aurora_test_state_v13 to authenticated;
do $$ begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='aurora_test_state_v13' and policyname='Aurora v13 own test data') then
  create policy "Aurora v13 own test data" on public.aurora_test_state_v13 for select to authenticated using ((select auth.uid())=user_id);
 end if;
end $$;
create or replace function public.aurora_test_commit_v13(expected_revision bigint,next_state jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare who uuid:=auth.uid(); saved public.aurora_test_state_v13%rowtype;
begin
 if who is null then raise exception 'Sign in first'; end if;
 if expected_revision is null or expected_revision<0 then raise exception 'Invalid revision'; end if;
 if next_state is null or jsonb_typeof(next_state) is distinct from 'object'
  or next_state->>'v' is distinct from '7'
  or jsonb_typeof(next_state->'settings') is distinct from 'object'
  or jsonb_typeof(next_state->'cards') is distinct from 'array'
  or jsonb_typeof(next_state->'items') is distinct from 'array'
  or jsonb_typeof(next_state->'moments') is distinct from 'array'
  or pg_column_size(next_state)>5000000 then raise exception 'Invalid application state'; end if;
 perform pg_advisory_xact_lock(hashtextextended('aurora-v13:'||who::text,0));
 select * into saved from public.aurora_test_state_v13 where user_id=who;
 if coalesce(saved.revision,0)<>expected_revision then
  return jsonb_build_object('ok',false,'revision',coalesce(saved.revision,0),'state',saved.state);
 end if;
 insert into public.aurora_test_state_v13(user_id,state,revision) values(who,next_state,1)
 on conflict(user_id) do update set state=excluded.state,revision=public.aurora_test_state_v13.revision+1,updated_at=now()
 returning * into saved;
 return jsonb_build_object('ok',true,'revision',saved.revision,'state',saved.state);
end $$;
revoke all on function public.aurora_test_commit_v13(bigint,jsonb) from public,anon;
grant execute on function public.aurora_test_commit_v13(bigint,jsonb) to authenticated;
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='aurora_test_state_v13') then
  alter publication supabase_realtime add table public.aurora_test_state_v13;
 end if;
end $$;
commit;
select c.relrowsecurity as rls_enabled, has_table_privilege('anon','public.aurora_test_state_v13','select') as anon_can_read, has_table_privilege('authenticated','public.aurora_test_state_v13','select') as signed_in_can_read, has_function_privilege('authenticated','public.aurora_test_commit_v13(bigint,jsonb)','execute') as signed_in_can_sync from pg_class c where c.oid='public.aurora_test_state_v13'::regclass;
