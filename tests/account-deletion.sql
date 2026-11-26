-- Run with account-deletion.sql in the same transaction; always roll back fixtures.
do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); session_a uuid := gen_random_uuid();
begin
  if has_function_privilege('anon', 'public.delete_own_account()', 'execute') then raise exception 'anon has deletion privilege'; end if;
  insert into auth.users(id, email) values (a, a::text || '@account-test.invalid'), (b, b::text || '@account-test.invalid');
  insert into auth.sessions(id, user_id, created_at, updated_at) values (session_a, a, now(), now());
  insert into public.game_sessions(id,name,formation,"createdAt",status,"userId") values
    (gen_random_uuid(),'Account fixture A','4-3-3',now(),'in_progress',a::text),
    (gen_random_uuid(),'Account fixture B','4-3-3',now(),'in_progress',b::text);
  perform set_config('request.jwt.claims','{}',true);
  begin perform public.delete_own_account(); raise exception 'guest accepted'; exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'session_id',session_a,'amr',jsonb_build_array(jsonb_build_object('method','password','timestamp',extract(epoch from now())-600)))::text,true);
  begin perform public.delete_own_account(); raise exception 'stale authentication accepted'; exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'session_id',gen_random_uuid(),'amr',jsonb_build_array(jsonb_build_object('method','password','timestamp',extract(epoch from now()))))::text,true);
  begin perform public.delete_own_account(); raise exception 'revoked session accepted'; exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'session_id',session_a,'amr',jsonb_build_array(jsonb_build_object('method','password','timestamp',extract(epoch from now()))))::text,true);
  perform public.delete_own_account();
  if exists(select 1 from auth.users where id=a) or exists(select 1 from public.game_sessions where "userId"=a::text) or exists(select 1 from auth.sessions where id=session_a) then raise exception 'account data survived'; end if;
  if not exists(select 1 from auth.users where id=b) or not exists(select 1 from public.game_sessions where "userId"=b::text) then raise exception 'foreign account changed'; end if;
  begin
    insert into public.game_sessions(id,name,formation,"createdAt",status,"userId") values(gen_random_uuid(),'Orphan fixture','4-3-3',now(),'in_progress',a::text);
    raise exception 'deleted owner accepted';
  exception when foreign_key_violation then null; end;
end;
$$;
select 'PASS: guest, stale auth, revoked session, owner isolation, account/session cleanup and orphan prevention' as result;
rollback;
