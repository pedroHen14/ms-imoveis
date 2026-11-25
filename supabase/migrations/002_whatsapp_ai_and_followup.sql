-- ============================================================================
-- Migration 002: Agente WhatsApp (IA), Sessões e Follow-up Automático (Fase 2)
-- Plataforma Marcelo Santos Negócios Imobiliários (CRECI 295730)
-- ============================================================================

-- ============================================================================
-- 1. EXTENSÃO `unaccent` (busca sem diferenciação de acentos)
-- ============================================================================

create extension if not exists "unaccent";

-- ============================================================================
-- 2. NOVO CAMPO EM `properties`: `ai_notes` (uso interno / Assistente de IA)
-- ============================================================================

alter table public.properties
  add column if not exists ai_notes text;

comment on column public.properties.ai_notes is
  'Notas internas para o Assistente de WhatsApp (financiamento, permuta, documentação, sol). Não exposta a usuários anônimos.';

-- Observação de segurança:
-- Na Migration 001, `anon` recebeu SELECT apenas em colunas explícitas de `properties`.
-- Portanto, `ai_notes` permanece inacessível para `anon` e acessível para `authenticated` e `service_role`.

-- ============================================================================
-- 3. NOVA TABELA `whatsapp_sessions` + ÍNDICES + RLS
-- ============================================================================

create table if not exists public.whatsapp_sessions (
  phone text primary key check (length(trim(phone)) > 0),
  lead_id uuid references public.leads(id) on delete set null,
  bot_paused_until timestamptz,
  last_interaction_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.whatsapp_sessions is
  'Sessões ativas de atendimento via WhatsApp (telefone E.164 sem +). Controla vínculo com leads e pausa do bot.';

create index if not exists idx_whatsapp_sessions_lead_id
  on public.whatsapp_sessions (lead_id);

create index if not exists idx_whatsapp_sessions_bot_paused_until
  on public.whatsapp_sessions (bot_paused_until)
  where bot_paused_until is not null;

create index if not exists idx_whatsapp_sessions_last_interaction
  on public.whatsapp_sessions (last_interaction_at desc);

-- RLS obrigatório:
-- * `anon`: bloqueio total
-- * `authenticated`: SELECT e UPDATE (para o /admin visualizar status e pausar/reativar IA)
-- * `service_role`: acesso completo (INSERT/UPDATE/DELETE/SELECT via n8n e automações)
alter table public.whatsapp_sessions enable row level security;

revoke all on public.whatsapp_sessions from public, anon, authenticated;
grant select, update on public.whatsapp_sessions to authenticated;
grant all on public.whatsapp_sessions to service_role;

drop policy if exists "whatsapp_sessions_select_authenticated" on public.whatsapp_sessions;
create policy "whatsapp_sessions_select_authenticated"
  on public.whatsapp_sessions
  for select
  to authenticated
  using (true);

drop policy if exists "whatsapp_sessions_update_authenticated" on public.whatsapp_sessions;
create policy "whatsapp_sessions_update_authenticated"
  on public.whatsapp_sessions
  for update
  to authenticated
  using (true)
  with check (true);

-- ============================================================================
-- 4. FUNÇÕES RPC SEGURAS (`SECURITY DEFINER`) — CONSUMIDAS PELO n8n / CRON
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 4.1. `search_properties_for_ai`
-- Busca até 3 imóveis disponíveis com filtro tolerante a acentos e margem +15%
-- sobre o orçamento máximo informado pelo cliente.
-- ----------------------------------------------------------------------------
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
  where p.status = 'disponivel'
    and (
      nullif(trim(p_purpose), '') is null
      or lower(unaccent(p.purpose)) = lower(unaccent(trim(p_purpose)))
    )
    and (
      nullif(trim(p_type), '') is null
      or lower(unaccent(p.type)) = lower(unaccent(trim(p_type)))
    )
    and (
      nullif(trim(p_location), '') is null
      or unaccent(coalesce(p.condominium, '')) ilike '%' || unaccent(trim(p_location)) || '%'
      or unaccent(coalesce(p.neighborhood, '')) ilike '%' || unaccent(trim(p_location)) || '%'
      or unaccent(coalesce(p.title, '')) ilike '%' || unaccent(trim(p_location)) || '%'
      or unaccent(coalesce(p.city, '')) ilike '%' || unaccent(trim(p_location)) || '%'
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

comment on function public.search_properties_for_ai(text, text, text, numeric, integer) is
  'Busca até 3 imóveis disponíveis para o Agente de WhatsApp com unaccent e margem de +15% no orçamento máximo.';

revoke all on function public.search_properties_for_ai(text, text, text, numeric, integer) from public, anon, authenticated;
grant execute on function public.search_properties_for_ai(text, text, text, numeric, integer) to service_role;

-- ----------------------------------------------------------------------------
-- 4.2. `get_property_by_code_or_slug`
-- Localiza um imóvel específico por código (ex: "104", "Cód. 104"), slug ou URL
-- completa do site, retornando ficha completa + ai_notes (sem owner_id).
-- ----------------------------------------------------------------------------
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
  v_clean := trim(coalesce(p_query, ''));
  if v_clean = '' then
    return;
  end if;

  -- Remove querystring, hash e barras finais caso venha uma URL completa
  v_slug_candidate := regexp_replace(v_clean, '[?#].*$', '');
  v_slug_candidate := regexp_replace(v_slug_candidate, '/+$', '');

  v_url_match := regexp_match(v_slug_candidate, '/imoveis/([^/]+)$', 'i');
  if v_url_match is not null then
    v_slug_candidate := v_url_match[1];
  end if;

  -- Extrai código numérico se a entrada for "104", "#104", "Cód. 104" ou "cod 104"
  v_code_match := regexp_match(unaccent(v_clean), '^(?:cod\.?\s*|#)?(\d+)$', 'i');
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
    p.address,
    p.description,
    p.ai_notes,
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

comment on function public.get_property_by_code_or_slug(text) is
  'Retorna ficha completa + ai_notes de um imóvel por código numérico, slug ou URL do site (exclui rascunhos e owner_id).';

revoke all on function public.get_property_by_code_or_slug(text) from public, anon, authenticated;
grant execute on function public.get_property_by_code_or_slug(text) to service_role;

-- ----------------------------------------------------------------------------
-- 4.3. `upsert_whatsapp_lead`
-- Cria ou atualiza um lead originado no WhatsApp (preservando histórico de notes)
-- e faz upsert automático na tabela `whatsapp_sessions` vinculando `lead_id`.
-- ----------------------------------------------------------------------------
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
  v_valid_property_id uuid;
  v_lead_id uuid;
  v_existing_name text;
  v_existing_notes text;
  v_existing_property_id uuid;
  v_existing_status text;
  v_is_new boolean := false;
begin
  v_digits := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  if v_digits = '' then
    raise exception 'Telefone obrigatório para registrar lead do WhatsApp.';
  end if;

  -- Normaliza para E.164 sem '+' (ex: 5511999999999)
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

  v_clean_name := nullif(trim(coalesce(p_name, '')), '');
  v_clean_notes := nullif(trim(coalesce(p_notes, '')), '');

  -- Garante integridade referencial caso o ID de imóvel informado não exista
  if p_property_id is not null then
    select p.id
    into v_valid_property_id
    from public.properties p
    where p.id = p_property_id
    limit 1;
  end if;

  -- Busca lead existente comparando apenas dígitos (com ou sem DDI 55)
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
    update public.leads
    set
      name = case
        when v_clean_name is not null
          and (v_existing_name is null or lower(trim(v_existing_name)) = 'cliente whatsapp')
        then v_clean_name
        else name
      end,
      property_id = coalesce(v_valid_property_id, v_existing_property_id),
      notes = case
        when v_formatted_note is null then v_existing_notes
        when nullif(trim(coalesce(v_existing_notes, '')), '') is null then v_formatted_note
        else v_existing_notes || E'\n\n' || v_formatted_note
      end,
      last_contact_at = now()
    where id = v_lead_id;
  end if;

  -- Upsert na sessão de WhatsApp preservando eventual `bot_paused_until` existente
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

comment on function public.upsert_whatsapp_lead(text, text, text, uuid) is
  'Cria ou atualiza lead via WhatsApp preservando histórico de observações e sincroniza whatsapp_sessions.';

revoke all on function public.upsert_whatsapp_lead(text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.upsert_whatsapp_lead(text, text, text, uuid) to service_role;

-- ----------------------------------------------------------------------------
-- 4.4. `get_stale_leads_for_followup`
-- Retorna leads ativos sem retorno há mais de `p_days` dias (padrão: 3),
-- acompanhados dos dados do imóvel vinculado (se houver).
-- ----------------------------------------------------------------------------
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
  order by l.last_contact_at asc;
$$;

comment on function public.get_stale_leads_for_followup(integer) is
  'Lista leads ativos sem contato há mais de N dias (padrão 3) com o imóvel vinculado para alertas de follow-up.';

revoke all on function public.get_stale_leads_for_followup(integer) from public, anon, authenticated;
grant execute on function public.get_stale_leads_for_followup(integer) to service_role;
