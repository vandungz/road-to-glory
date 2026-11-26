-- Atomic self-deletion. No user-id argument and no service key in the application.
begin;
create or replace function public.guard_game_account_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Lock the parent identity so a concurrent deletion cannot leave new orphans.
  perform 1 from auth.users where id::text = new."userId" for key share;
  if not found then raise exception 'account_not_found' using errcode = '23503'; end if;
  return new;
end;
$$;
revoke all on function public.guard_game_account_owner() from public, anon, authenticated;
drop trigger if exists game_account_owner on public.game_sessions;
create trigger game_account_owner before insert or update of "userId" on public.game_sessions
for each row execute function public.guard_game_account_owner();

create or replace function public.delete_own_account()
returns void language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  claims jsonb := auth.jwt();
begin
  if caller is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  perform 1 from auth.users where id = caller for update;
  if not found then raise exception 'authentication_required' using errcode = '42501'; end if;
  if not exists (select 1 from auth.sessions where user_id = caller and id::text = claims->>'session_id') then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from jsonb_array_elements(coalesce(claims->'amr', '[]'::jsonb)) as factor
    where factor->>'method' in ('password', 'oauth', 'otp', 'totp')
      and (factor->>'timestamp')::numeric between extract(epoch from now()) - 300 and extract(epoch from now()) + 30
  ) then raise exception 'reauth_required' using errcode = '42501'; end if;
  -- Future user uploads need Storage API cleanup before identity deletion.
  if exists (select 1 from storage.objects where owner_id = caller::text) then
    raise exception 'storage_cleanup_required';
  end if;
  delete from public.game_sessions where "userId" = caller::text;
  delete from auth.users where id = caller;
end;
$$;
revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
commit;
