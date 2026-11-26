-- ============================================================================
-- Migration 005: Mover extensões `unaccent` e `pg_trgm` para o schema `extensions`
-- Resolve o alerta `extension_in_public` do Supabase Security Advisor.
-- ============================================================================

create schema if not exists extensions;
grant usage on schema extensions to anon, authenticated, service_role;

do $$
begin
  if exists (
    select 1
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'unaccent'
      and n.nspname = 'public'
  ) then
    alter extension unaccent set schema extensions;
  end if;

  if exists (
    select 1
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'pg_trgm'
      and n.nspname = 'public'
  ) then
    alter extension pg_trgm set schema extensions;
  end if;
end $$;

create or replace function public.immutable_unaccent(p_text text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, $1);
$$;

grant execute on function public.immutable_unaccent(text) to anon, authenticated, service_role;
