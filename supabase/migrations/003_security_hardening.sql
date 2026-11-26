-- ============================================================================
-- Migration 003: Hardening de Segurança (RBAC Admin, RLS, Storage e RPCs)
-- Plataforma Marcelo Santos Negócios Imobiliários (CRECI 295730)
-- ============================================================================
-- IMPORTANTE APÓS APLICAR ESTA MIGRATION:
-- 1) Desative o cadastro público no Supabase Dashboard:
--    Authentication -> Providers -> Email -> desmarcar "Allow new users to sign up".
-- 2) Promova a conta do corretor a administrador (substitua o e-mail real):
--    insert into public.admin_users (user_id, email)
--    select id, email from auth.users where lower(email) = lower('seu-email-admin@dominio.com')
--    on conflict (user_id) do nothing;
--
--    update auth.users
--    set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
--    where lower(email) = lower('seu-email-admin@dominio.com');
-- ============================================================================

-- ============================================================================
-- 1. CONTROLE DE PAPEL ADMINISTRATIVO (SEC-01)
-- ============================================================================

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

comment on table public.admin_users is
  'Lista fechada de usuários autorizados a operar o painel /admin e tabelas privadas.';

alter table public.admin_users enable row level security;

-- Bloqueio total para anon e authenticated; gerenciamento somente via service_role / SQL Editor
revoke all on public.admin_users from public, anon, authenticated;
grant all on public.admin_users to service_role;

-- Função helper segura para verificar se o usuário autenticado é administrador.
-- Aceita claim imutável `app_metadata.role = 'admin'` OU presença em `public.admin_users`.
-- NUNCA utiliza `user_metadata` (editável pelo próprio usuário).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (select auth.uid()) is not null
    and (
      coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin', false)
      or exists (
        select 1
        from public.admin_users au
        where au.user_id = (select auth.uid())
      )
    );
$$;

comment on function public.is_admin() is
  'Retorna true apenas quando o usuário autenticado possui app_metadata.role = admin ou consta em public.admin_users.';

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

-- ============================================================================
-- 2. ATUALIZAÇÃO DAS POLÍTICAS DE RLS PARA EXIGIR `public.is_admin()` (SEC-01)
-- ============================================================================

-- 2.1. OWNERS
drop policy if exists "owners_select_authenticated" on public.owners;
create policy "owners_select_authenticated"
  on public.owners
  for select
  to authenticated
  using ((select public.is_admin()));

drop policy if exists "owners_insert_authenticated" on public.owners;
create policy "owners_insert_authenticated"
  on public.owners
  for insert
  to authenticated
  with check ((select public.is_admin()));

drop policy if exists "owners_update_authenticated" on public.owners;
create policy "owners_update_authenticated"
  on public.owners
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "owners_delete_authenticated" on public.owners;
create policy "owners_delete_authenticated"
  on public.owners
  for delete
  to authenticated
  using ((select public.is_admin()));

-- 2.2. PROPERTIES
drop policy if exists "properties_select_authenticated" on public.properties;
create policy "properties_select_authenticated"
  on public.properties
  for select
  to authenticated
  using ((select public.is_admin()));

drop policy if exists "properties_insert_authenticated" on public.properties;
create policy "properties_insert_authenticated"
  on public.properties
  for insert
  to authenticated
  with check ((select public.is_admin()));

drop policy if exists "properties_update_authenticated" on public.properties;
create policy "properties_update_authenticated"
  on public.properties
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "properties_delete_authenticated" on public.properties;
create policy "properties_delete_authenticated"
  on public.properties
  for delete
  to authenticated
  using ((select public.is_admin()));

-- 2.3. PROPERTY_IMAGES (SEC-01 + SEC-03: anon só lê imagens de imóveis disponíveis)
drop policy if exists "property_images_select_public" on public.property_images;
drop policy if exists "property_images_select_public_available" on public.property_images;
create policy "property_images_select_public_available"
  on public.property_images
  for select
  to anon
  using (
    exists (
      select 1
      from public.properties p
      where p.id = property_images.property_id
        and p.status = 'disponivel'
    )
  );

drop policy if exists "property_images_select_admin" on public.property_images;
create policy "property_images_select_admin"
  on public.property_images
  for select
  to authenticated
  using ((select public.is_admin()));

drop policy if exists "property_images_insert_authenticated" on public.property_images;
create policy "property_images_insert_authenticated"
  on public.property_images
  for insert
  to authenticated
  with check ((select public.is_admin()));

drop policy if exists "property_images_update_authenticated" on public.property_images;
create policy "property_images_update_authenticated"
  on public.property_images
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "property_images_delete_authenticated" on public.property_images;
create policy "property_images_delete_authenticated"
  on public.property_images
  for delete
  to authenticated
  using ((select public.is_admin()));

-- 2.4. LEADS (SEC-01 + SEC-02: revoga INSERT direto de anon; gravação via Server Action com service_role)
revoke all on public.leads from anon;
drop policy if exists "leads_insert_public" on public.leads;

drop policy if exists "leads_select_authenticated" on public.leads;
create policy "leads_select_authenticated"
  on public.leads
  for select
  to authenticated
  using ((select public.is_admin()));

drop policy if exists "leads_insert_authenticated" on public.leads;
create policy "leads_insert_authenticated"
  on public.leads
  for insert
  to authenticated
  with check ((select public.is_admin()));

drop policy if exists "leads_update_authenticated" on public.leads;
create policy "leads_update_authenticated"
  on public.leads
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "leads_delete_authenticated" on public.leads;
create policy "leads_delete_authenticated"
  on public.leads
  for delete
  to authenticated
  using ((select public.is_admin()));

-- Restrições de tamanho em `public.leads` (NOT VALID evita quebra em dados legados, valida todos os novos registros)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'leads_name_length_chk'
  ) then
    alter table public.leads
      add constraint leads_name_length_chk
      check (length(trim(name)) between 1 and 120) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'leads_phone_length_chk'
  ) then
    alter table public.leads
      add constraint leads_phone_length_chk
      check (length(trim(phone)) between 8 and 30) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'leads_email_length_chk'
  ) then
    alter table public.leads
      add constraint leads_email_length_chk
      check (email is null or length(email) <= 160) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'leads_notes_length_chk'
  ) then
    alter table public.leads
      add constraint leads_notes_length_chk
      check (notes is null or length(notes) <= 10000) not valid;
  end if;
end $$;

-- Índice funcional para acelerar deduplicação por telefone em `upsert_whatsapp_lead`
create index if not exists idx_leads_phone_digits
  on public.leads ((regexp_replace(phone, '\D', '', 'g')));

-- 2.5. WHATSAPP_SESSIONS (SEC-01)
drop policy if exists "whatsapp_sessions_select_authenticated" on public.whatsapp_sessions;
create policy "whatsapp_sessions_select_authenticated"
  on public.whatsapp_sessions
  for select
  to authenticated
  using ((select public.is_admin()));

drop policy if exists "whatsapp_sessions_update_authenticated" on public.whatsapp_sessions;
create policy "whatsapp_sessions_update_authenticated"
  on public.whatsapp_sessions
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ============================================================================
-- 3. STORAGE: REMOVER LISTAGEM ANÔNIMA E EXIGIR ADMIN NA ESCRITA (SEC-01 + SEC-03)
-- ============================================================================
-- Observação: o bucket `property-images` possui `public = true`, portanto as URLs
-- diretas (/storage/v1/object/public/property-images/...) continuam públicas para o
-- navegador sem expor a listagem de objetos (storage.objects SELECT) a usuários anônimos.

drop policy if exists "property_images_storage_select_public" on storage.objects;
drop policy if exists "property_images_storage_select_admin" on storage.objects;
create policy "property_images_storage_select_admin"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'property-images' and (select public.is_admin()));

drop policy if exists "property_images_storage_insert_authenticated" on storage.objects;
create policy "property_images_storage_insert_authenticated"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'property-images' and (select public.is_admin()));

drop policy if exists "property_images_storage_update_authenticated" on storage.objects;
create policy "property_images_storage_update_authenticated"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'property-images' and (select public.is_admin()))
  with check (bucket_id = 'property-images' and (select public.is_admin()));

drop policy if exists "property_images_storage_delete_authenticated" on storage.objects;
create policy "property_images_storage_delete_authenticated"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'property-images' and (select public.is_admin()));

-- ============================================================================
-- 4. HARDENING DE FUNÇÕES SQL E RPCs (SEC-11)
-- ============================================================================

-- 4.1. Fixar search_path na função de trigger `set_updated_at`
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 4.2. `search_properties_for_ai`: escapar wildcards LIKE (\, %, _) em p_location
create or replace function public.search_properties_for_ai(
  p_purpose text default null,
  p_type text default null,
  p_location text default null,
  p_max_price numeric default null,
  p_min_bedrooms integer default null
)
returns table (
  id uuid,
  code integer,
  slug text,
  title text,
  type text,
  purpose text,
  price numeric,
  condo_fee numeric,
  iptu numeric,
  area_total numeric,
  area_built numeric,
  bedrooms integer,
  suites integer,
  bathrooms integer,
  parking integer,
  condominium text,
  neighborhood text,
  city text,
  description_summary text,
  ai_notes text,
  is_featured boolean
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with sanitized as (
    select
      nullif(trim(p_purpose), '') as purpose_clean,
      nullif(trim(p_type), '') as type_clean,
      nullif(
        regexp_replace(
          left(trim(coalesce(p_location, '')), 100),
          '([%_\\])',
          '\\\1',
          'g'
        ),
        ''
      ) as location_pattern
  )
  select
    p.id,
    p.code,
    p.slug,
    p.title,
    p.type,
    p.purpose,
    p.price,
    p.condo_fee,
    p.iptu,
    p.area_total,
    p.area_built,
    p.bedrooms,
    p.suites,
    p.bathrooms,
    p.parking,
    p.condominium,
    p.neighborhood,
    p.city,
    case
      when p.description is null then null
      when length(p.description) <= 400 then p.description
      else rtrim(left(p.description, 397)) || '...'
    end as description_summary,
    p.ai_notes,
    p.is_featured
  from public.properties p
  cross join sanitized s
  where p.status = 'disponivel'
    and (
      s.purpose_clean is null
      or lower(unaccent(p.purpose)) = lower(unaccent(s.purpose_clean))
    )
    and (
      s.type_clean is null
      or lower(unaccent(p.type)) = lower(unaccent(s.type_clean))
    )
    and (
      s.location_pattern is null
      or unaccent(coalesce(p.condominium, '')) ilike '%' || unaccent(s.location_pattern) || '%' escape '\'
      or unaccent(coalesce(p.neighborhood, '')) ilike '%' || unaccent(s.location_pattern) || '%' escape '\'
      or unaccent(coalesce(p.title, '')) ilike '%' || unaccent(s.location_pattern) || '%' escape '\'
      or unaccent(coalesce(p.city, '')) ilike '%' || unaccent(s.location_pattern) || '%' escape '\'
    )
    and (
      p_max_price is null
      or p_max_price <= 0
      or (p.price is not null and p.price <= (p_max_price * 1.15))
    )
    and (
      p_min_bedrooms is null
      or p_min_bedrooms <= 0
      or p.bedrooms >= p_min_bedrooms
    )
  order by p.is_featured desc, p.price asc nulls last, p.created_at desc
  limit 3;
$$;

revoke all on function public.search_properties_for_ai(text, text, text, numeric, integer) from public, anon, authenticated;
grant execute on function public.search_properties_for_ai(text, text, text, numeric, integer) to service_role;

-- 4.3. `get_property_by_code_or_slug`: previne integer overflow e oculta address/ai_notes de imóveis não disponíveis
create or replace function public.get_property_by_code_or_slug(
  p_query text
)
returns table (
  id uuid,
  code integer,
  slug text,
  title text,
  type text,
  purpose text,
  price numeric,
  condo_fee numeric,
  iptu numeric,
  area_total numeric,
  area_built numeric,
  bedrooms integer,
  suites integer,
  bathrooms integer,
  parking integer,
  condominium text,
  neighborhood text,
  city text,
  address text,
  description text,
  ai_notes text,
  status text,
  is_featured boolean,
  cover_image_url text
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
#variable_conflict use_column
declare
  v_clean text;
  v_slug_candidate text;
  v_url_match text[];
  v_code_match text[];
  v_code integer;
begin
  v_clean := left(trim(coalesce(p_query, '')), 300);
  if v_clean = '' then
    return;
  end if;

  v_slug_candidate := regexp_replace(v_clean, '[?#].*$', '');
  v_slug_candidate := regexp_replace(v_slug_candidate, '/+$', '');

  v_url_match := regexp_match(v_slug_candidate, '/imoveis/([^/]+)$', 'i');
  if v_url_match is not null then
    v_slug_candidate := v_url_match[1];
  end if;

  -- Proteção contra integer out-of-range (ex.: telefones/CEPs enviados no WhatsApp)
  v_code_match := regexp_match(unaccent(v_clean), '^(?:cod\.?\s*|#)?(\d{1,9})$', 'i');
  if v_code_match is not null then
    v_code := v_code_match[1]::integer;
  end if;

  return query
  select
    p.id,
    p.code,
    p.slug,
    p.title,
    p.type,
    p.purpose,
    p.price,
    p.condo_fee,
    p.iptu,
    p.area_total,
    p.area_built,
    p.bedrooms,
    p.suites,
    p.bathrooms,
    p.parking,
    p.condominium,
    p.neighborhood,
    p.city,
    case when p.status = 'disponivel' then p.address else null end as address,
    p.description,
    case when p.status = 'disponivel' then p.ai_notes else null end as ai_notes,
    p.status,
    p.is_featured,
    (
      select pi.url
      from public.property_images pi
      where pi.property_id = p.id
      order by pi.position asc, pi.created_at asc
      limit 1
    ) as cover_image_url
  from public.properties p
  where p.status <> 'rascunho'
    and (
      (v_code is not null and p.code = v_code)
      or lower(p.slug) = lower(v_slug_candidate)
    )
  order by (p.status = 'disponivel') desc, p.updated_at desc
  limit 1;
end;
$$;

revoke all on function public.get_property_by_code_or_slug(text) from public, anon, authenticated;
grant execute on function public.get_property_by_code_or_slug(text) to service_role;

-- 4.4. `upsert_whatsapp_lead`: limita tamanho de entrada/histórico de `notes` e telefone
create or replace function public.upsert_whatsapp_lead(
  p_phone text,
  p_name text default null,
  p_notes text default null,
  p_property_id uuid default null
)
returns table (
  lead_id uuid,
  phone text,
  is_new boolean,
  status text
)
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
#variable_conflict use_column
declare
  v_digits text;
  v_phone_e164 text;
  v_local_digits text;
  v_clean_name text;
  v_clean_notes text;
  v_timestamp_label text;
  v_formatted_note text;
  v_next_notes text;
  v_valid_property_id uuid;
  v_lead_id uuid;
  v_existing_name text;
  v_existing_notes text;
  v_existing_property_id uuid;
  v_existing_status text;
  v_is_new boolean := false;
begin
  v_digits := left(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 15);
  if length(v_digits) < 8 then
    raise exception 'Telefone válido obrigatório para registrar lead do WhatsApp.';
  end if;

  if length(v_digits) in (10, 11) then
    v_phone_e164 := '55' || v_digits;
  else
    v_phone_e164 := v_digits;
  end if;

  if v_phone_e164 like '55%' and length(v_phone_e164) >= 12 then
    v_local_digits := substring(v_phone_e164 from 3);
  else
    v_local_digits := v_phone_e164;
  end if;

  v_clean_name := nullif(left(trim(coalesce(p_name, '')), 120), '');
  v_clean_notes := nullif(left(trim(coalesce(p_notes, '')), 1000), '');

  if p_property_id is not null then
    select p.id
    into v_valid_property_id
    from public.properties p
    where p.id = p_property_id
    limit 1;
  end if;

  select l.id, l.name, l.notes, l.property_id, l.status
  into v_lead_id, v_existing_name, v_existing_notes, v_existing_property_id, v_existing_status
  from public.leads l
  where regexp_replace(l.phone, '\D', '', 'g') in (v_phone_e164, v_local_digits)
  order by l.created_at desc
  limit 1;

  v_timestamp_label := to_char(now() at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI');
  if v_clean_notes is not null then
    v_formatted_note := '[WhatsApp ' || v_timestamp_label || '] ' || v_clean_notes;
  end if;

  if v_lead_id is null then
    insert into public.leads (
      name,
      phone,
      source,
      property_id,
      status,
      notes,
      last_contact_at
    )
    values (
      coalesce(v_clean_name, 'Cliente WhatsApp'),
      v_phone_e164,
      'whatsapp',
      v_valid_property_id,
      'novo',
      v_formatted_note,
      now()
    )
    returning id, leads.status
    into v_lead_id, v_existing_status;

    v_is_new := true;
  else
    if v_formatted_note is null then
      v_next_notes := v_existing_notes;
    elsif nullif(trim(coalesce(v_existing_notes, '')), '') is null then
      v_next_notes := v_formatted_note;
    else
      v_next_notes := v_existing_notes || E'\n\n' || v_formatted_note;
      if length(v_next_notes) > 8000 then
        v_next_notes := '...(histórico antigo truncado)' || E'\n\n' || right(v_next_notes, 7950);
      end if;
    end if;

    update public.leads
    set
      name = case
        when v_clean_name is not null
          and (v_existing_name is null or lower(trim(v_existing_name)) = 'cliente whatsapp')
        then v_clean_name
        else name
      end,
      property_id = coalesce(v_valid_property_id, v_existing_property_id),
      notes = v_next_notes,
      last_contact_at = now()
    where id = v_lead_id;
  end if;

  insert into public.whatsapp_sessions (
    phone,
    lead_id,
    last_interaction_at
  )
  values (
    v_phone_e164,
    v_lead_id,
    now()
  )
  on conflict on constraint whatsapp_sessions_pkey do update
  set
    lead_id = excluded.lead_id,
    last_interaction_at = now();

  return query
  select
    v_lead_id as lead_id,
    v_phone_e164 as phone,
    v_is_new as is_new,
    v_existing_status as status;
end;
$$;

revoke all on function public.upsert_whatsapp_lead(text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.upsert_whatsapp_lead(text, text, text, uuid) to service_role;

-- 4.5. `get_stale_leads_for_followup`: adiciona teto de retorno (LIMIT 200)
create or replace function public.get_stale_leads_for_followup(
  p_days integer default 3
)
returns table (
  id uuid,
  name text,
  phone text,
  email text,
  source text,
  status text,
  notes text,
  last_contact_at timestamptz,
  days_without_contact integer,
  property_id uuid,
  property_code integer,
  property_title text,
  property_slug text
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    l.id,
    l.name,
    l.phone,
    l.email,
    l.source,
    l.status,
    l.notes,
    l.last_contact_at,
    floor(extract(epoch from (now() - l.last_contact_at)) / 86400)::integer as days_without_contact,
    l.property_id,
    p.code as property_code,
    p.title as property_title,
    p.slug as property_slug
  from public.leads l
  left join public.properties p on p.id = l.property_id
  where l.status in ('novo', 'em_contato', 'visita', 'proposta')
    and l.last_contact_at < now() - make_interval(days => greatest(coalesce(p_days, 3), 0))
  order by l.last_contact_at asc
  limit 200;
$$;

revoke all on function public.get_stale_leads_for_followup(integer) from public, anon, authenticated;
grant execute on function public.get_stale_leads_for_followup(integer) to service_role;
