create table public.wonderland_personal_saves (
    user_id uuid primary key references auth.users (id) on delete cascade,
    progress jsonb not null,
    revision bigint not null default 1 check (revision > 0),
    updated_at timestamptz not null default statement_timestamp(),
    constraint wonderland_personal_save_format check (
        jsonb_typeof(progress) = 'object'
        and coalesce(progress -> 'schemaVersion' = '5'::jsonb, false)
        and coalesce(progress -> 'adminTest' = 'false'::jsonb, true)
        and coalesce(progress -> 'activeRun' = '{}'::jsonb, true)
        and octet_length(progress::text) <= 2097152
    )
);

alter table public.wonderland_personal_saves enable row level security;
revoke all on public.wonderland_personal_saves from public, anon, authenticated;
grant select on public.wonderland_personal_saves to authenticated;
grant insert (user_id, progress), update (progress)
    on public.wonderland_personal_saves to authenticated;

create policy wonderland_personal_save_select on public.wonderland_personal_saves
    for select to authenticated
    using ((select auth.uid()) = user_id);

create policy wonderland_personal_save_insert on public.wonderland_personal_saves
    for insert to authenticated
    with check ((select auth.uid()) = user_id);

create policy wonderland_personal_save_update on public.wonderland_personal_saves
    for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create function public.wonderland_bump_save_revision()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
    new.revision := old.revision + 1;
    new.updated_at := pg_catalog.statement_timestamp();
    return new;
end;
$$;

revoke execute on function public.wonderland_bump_save_revision() from public, anon, authenticated;

create trigger wonderland_personal_save_revision
    before update on public.wonderland_personal_saves
    for each row execute function public.wonderland_bump_save_revision();
