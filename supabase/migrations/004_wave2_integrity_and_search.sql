-- ============================================================================
-- Migration 004: Integridade Transacional, Busca sem Acento e Paginação Admin
-- Plataforma Marcelo Santos Negócios Imobiliários (CRECI 295730)
-- ============================================================================

-- ============================================================================
-- 1. EXTENSÕES E ÍNDICES DE BUSCA E PAGINAÇÃO
-- ============================================================================

create extension if not exists "unaccent";
create extension if not exists "pg_trgm";

-- Wrapper IMMUTABLE de `unaccent` + índice GIN trigram parcial para busca
-- pública sem diferenciação de acentos e maiúsculas/minúsculas.
-- Detecta dinamicamente o schema onde `unaccent` e `pg_trgm` estão instalados
-- (funciona tanto em `extensions` no Supabase Cloud quanto em `public` local).
do $$
declare
  v_unaccent_schema text;
  v_trgm_schema text;
begin
  select n.nspname
  into v_unaccent_schema
  from pg_extension e
  join pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'unaccent';

  if v_unaccent_schema is null then
    raise exception 'Extensão unaccent não encontrada.';
  end if;

  execute format(
    $fn$
    create or replace function public.immutable_unaccent(p_text text)
    returns text
    language sql
    immutable
    parallel safe
    strict
    set search_path = ''
    as $body$
      select %1$I.unaccent(%2$L::regdictionary, $1);
    $body$;
    $fn$,
    v_unaccent_schema,
    v_unaccent_schema || '.unaccent'
  );

  select n.nspname
  into v_trgm_schema
  from pg_extension e
  join pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'pg_trgm';

  if v_trgm_schema is not null then
    execute format(
      'create index if not exists idx_properties_search_trgm on public.properties using gin (public.immutable_unaccent(lower(coalesce(condominium, '''') || '' '' || coalesce(neighborhood, '''') || '' '' || coalesce(city, '''') || '' '' || coalesce(title, ''''))) %I.gin_trgm_ops) where status = ''disponivel''',
      v_trgm_schema
    );
  end if;
end $$;

comment on function public.immutable_unaccent(text) is
  'Wrapper IMMUTABLE para unaccent(), permitindo índices funcionais GIN trigram.';

grant execute on function public.immutable_unaccent(text) to anon, authenticated, service_role;

-- Índices para ordenação/paginação server-side no painel /admin
create index if not exists idx_properties_created_at_desc
  on public.properties (created_at desc);

create index if not exists idx_leads_created_at_desc
  on public.leads (created_at desc);

create index if not exists idx_owners_name_asc
  on public.owners (name asc);

-- ============================================================================
-- 2. RPC PÚBLICA: `search_public_properties` (SECURITY INVOKER)
-- ============================================================================
-- Respeita RLS do chamador e filtra explicitamente `status = 'disponivel'`.
-- Nunca retorna `owner_id` nem `ai_notes`.

create or replace function public.search_public_properties(
  p_purpose text default null,
  p_type text default null,
  p_location text default null,
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_sort text default 'recentes',
  p_page integer default 1,
  p_page_size integer default 12
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
  status text,
  is_featured boolean,
  created_at timestamptz,
  updated_at timestamptz,
  property_images jsonb,
  total_count bigint
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with params as (
    select
      nullif(trim(coalesce(p_purpose, '')), '') as purpose_clean,
      nullif(trim(coalesce(p_type, '')), '') as type_clean,
      nullif(
        public.immutable_unaccent(
          lower(
            regexp_replace(
              left(trim(coalesce(p_location, '')), 80),
              '([%_\\])',
              '\\\1',
              'g'
            )
          )
        ),
        ''
      ) as location_pattern,
      case
        when p_sort in ('menor-preco', 'maior-preco', 'recentes') then p_sort
        else 'recentes'
      end as sort_clean,
      least(500, greatest(1, coalesce(p_page, 1))) as page_num,
      least(48, greatest(1, coalesce(p_page_size, 12))) as page_lim
  ),
  filtered as (
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
      p.status,
      p.is_featured,
      p.created_at,
      p.updated_at,
      count(*) over() as total_count,
      s.sort_clean,
      s.page_num,
      s.page_lim
    from public.properties p
    cross join params s
    where p.status = 'disponivel'
      and (s.purpose_clean is null or p.purpose = s.purpose_clean)
      and (s.type_clean is null or p.type = s.type_clean)
      and (
        s.location_pattern is null
        or public.immutable_unaccent(
          lower(
            coalesce(p.condominium, '') || ' ' ||
            coalesce(p.neighborhood, '') || ' ' ||
            coalesce(p.city, '') || ' ' ||
            coalesce(p.title, '')
          )
        ) like '%' || s.location_pattern || '%' escape '\'
      )
      and (p_min_price is null or (p.price is not null and p.price >= p_min_price))
      and (p_max_price is null or (p.price is not null and p.price <= p_max_price))
  )
  select
    f.id,
    f.code,
    f.slug,
    f.title,
    f.type,
    f.purpose,
    f.price,
    f.condo_fee,
    f.iptu,
    f.area_total,
    f.area_built,
    f.bedrooms,
    f.suites,
    f.bathrooms,
    f.parking,
    f.condominium,
    f.neighborhood,
    f.city,
    f.address,
    f.description,
    f.status,
    f.is_featured,
    f.created_at,
    f.updated_at,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', pi.id,
            'property_id', pi.property_id,
            'url', pi.url,
            'position', pi.position,
            'created_at', pi.created_at
          )
          order by pi.position asc, pi.created_at asc
        )
        from public.property_images pi
        where pi.property_id = f.id
      ),
      '[]'::jsonb
    ) as property_images,
    f.total_count
  from filtered f
  order by
    case when f.sort_clean = 'menor-preco' then f.price end asc nulls last,
    case when f.sort_clean = 'maior-preco' then f.price end desc nulls last,
    case when f.sort_clean = 'recentes' then f.is_featured end desc,
    f.created_at desc
  limit (select page_lim from params)
  offset ((select page_num from params) - 1) * (select page_lim from params);
$$;

comment on function public.search_public_properties(text, text, text, numeric, numeric, text, integer, integer) is
  'Busca pública paginada de imóveis disponíveis com filtro tolerante a acentos (unaccent + trigram).';

revoke all on function public.search_public_properties(text, text, text, numeric, numeric, text, integer, integer) from public;
grant execute on function public.search_public_properties(text, text, text, numeric, numeric, text, integer, integer) to anon, authenticated, service_role;

-- ============================================================================
-- 3. RPC TRANSACIONAL ADMIN: `save_property_with_images` (SECURITY INVOKER)
-- ============================================================================
-- Salva imóvel + sincroniza galeria de imagens em uma única transação Postgres.
-- Na edição, preserva o `slug` atual para manter links compartilhados e SEO.

create or replace function public.save_property_with_images(
  p_id uuid default null,
  p_slug_base text default null,
  p_title text default null,
  p_type text default null,
  p_purpose text default null,
  p_status text default 'disponivel',
  p_is_featured boolean default false,
  p_owner_id uuid default null,
  p_price numeric default null,
  p_condo_fee numeric default null,
  p_iptu numeric default null,
  p_area_total numeric default null,
  p_area_built numeric default null,
  p_bedrooms integer default 0,
  p_suites integer default 0,
  p_bathrooms integer default 0,
  p_parking integer default 0,
  p_condominium text default null,
  p_neighborhood text default null,
  p_city text default 'Cotia',
  p_address text default null,
  p_description text default null,
  p_ai_notes text default null,
  p_image_urls text[] default '{}'
)
returns table (
  property_id uuid,
  property_code integer,
  property_slug text,
  removed_image_urls text[]
)
language plpgsql
volatile
security invoker
set search_path = public
as $$
declare
  v_property_id uuid;
  v_code integer;
  v_slug text;
  v_clean_slug_base text;
  v_old_urls text[] := '{}'::text[];
  v_new_urls text[] := coalesce(p_image_urls, '{}'::text[]);
  v_removed_urls text[] := '{}'::text[];
begin
  if not public.is_admin() then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  if coalesce(array_length(v_new_urls, 1), 0) > 40 then
    raise exception 'Limite máximo de 40 imagens por imóvel excedido.' using errcode = '22023';
  end if;

  if p_id is not null then
    select p.id, p.code, p.slug
    into v_property_id, v_code, v_slug
    from public.properties p
    where p.id = p_id
    for update;

    if not found then
      raise exception 'Imóvel não encontrado.' using errcode = 'P0002';
    end if;

    update public.properties
    set
      title = p_title,
      type = p_type,
      purpose = p_purpose,
      status = p_status,
      is_featured = coalesce(p_is_featured, false),
      owner_id = p_owner_id,
      price = p_price,
      condo_fee = p_condo_fee,
      iptu = p_iptu,
      area_total = p_area_total,
      area_built = p_area_built,
      bedrooms = coalesce(p_bedrooms, 0),
      suites = coalesce(p_suites, 0),
      bathrooms = coalesce(p_bathrooms, 0),
      parking = coalesce(p_parking, 0),
      condominium = p_condominium,
      neighborhood = p_neighborhood,
      city = coalesce(nullif(trim(p_city), ''), 'Cotia'),
      address = p_address,
      description = p_description,
      ai_notes = p_ai_notes
    where id = v_property_id;

    select coalesce(array_agg(pi.url), '{}'::text[])
    into v_old_urls
    from public.property_images pi
    where pi.property_id = v_property_id;

    delete from public.property_images
    where property_id = v_property_id;

    if coalesce(array_length(v_new_urls, 1), 0) > 0 then
      insert into public.property_images (property_id, url, position)
      select
        v_property_id,
        img.url,
        (img.ord - 1)::integer
      from unnest(v_new_urls) with ordinality as img(url, ord);
    end if;

    select coalesce(array_agg(distinct old_url), '{}'::text[])
    into v_removed_urls
    from unnest(v_old_urls) as old_url
    where not (old_url = any(v_new_urls));
  else
    insert into public.properties (
      slug,
      title,
      type,
      purpose,
      status,
      is_featured,
      owner_id,
      price,
      condo_fee,
      iptu,
      area_total,
      area_built,
      bedrooms,
      suites,
      bathrooms,
      parking,
      condominium,
      neighborhood,
      city,
      address,
      description,
      ai_notes
    )
    values (
      'tmp-' || gen_random_uuid()::text,
      p_title,
      p_type,
      p_purpose,
      p_status,
      coalesce(p_is_featured, false),
      p_owner_id,
      p_price,
      p_condo_fee,
      p_iptu,
      p_area_total,
      p_area_built,
      coalesce(p_bedrooms, 0),
      coalesce(p_suites, 0),
      coalesce(p_bathrooms, 0),
      coalesce(p_parking, 0),
      p_condominium,
      p_neighborhood,
      coalesce(nullif(trim(p_city), ''), 'Cotia'),
      p_address,
      p_description,
      p_ai_notes
    )
    returning id, code
    into v_property_id, v_code;

    v_clean_slug_base := regexp_replace(
      coalesce(nullif(trim(p_slug_base), ''), 'imovel'),
      '-+$',
      ''
    );
    v_slug := v_clean_slug_base || '-' || v_code::text;

    update public.properties
    set slug = v_slug
    where id = v_property_id;

    if coalesce(array_length(v_new_urls, 1), 0) > 0 then
      insert into public.property_images (property_id, url, position)
      select
        v_property_id,
        img.url,
        (img.ord - 1)::integer
      from unnest(v_new_urls) with ordinality as img(url, ord);
    end if;
  end if;

  return query
  select
    v_property_id as property_id,
    v_code as property_code,
    v_slug as property_slug,
    v_removed_urls as removed_image_urls;
end;
$$;

comment on function public.save_property_with_images(
  uuid, text, text, text, text, text, boolean, uuid, numeric, numeric, numeric,
  numeric, numeric, integer, integer, integer, integer, text, text, text, text,
  text, text, text[]
) is
  'Cria ou atualiza um imóvel e sincroniza property_images atomicamente na mesma transação.';

revoke all on function public.save_property_with_images(
  uuid, text, text, text, text, text, boolean, uuid, numeric, numeric, numeric,
  numeric, numeric, integer, integer, integer, integer, text, text, text, text,
  text, text, text[]
) from public, anon;

grant execute on function public.save_property_with_images(
  uuid, text, text, text, text, text, boolean, uuid, numeric, numeric, numeric,
  numeric, numeric, integer, integer, integer, integer, text, text, text, text,
  text, text, text[]
) to authenticated, service_role;

-- ============================================================================
-- 4. RPCs LEVES DE AGREGAÇÃO PARA PAGINAÇÃO DO `/admin` (SECURITY INVOKER)
-- ============================================================================

create or replace function public.get_property_image_summaries(
  p_property_ids uuid[]
)
returns table (
  property_id uuid,
  cover_url text,
  image_count integer
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    pi.property_id,
    (array_agg(pi.url order by pi.position asc, pi.created_at asc))[1] as cover_url,
    count(*)::integer as image_count
  from public.property_images pi
  where pi.property_id = any(coalesce(p_property_ids, '{}'::uuid[]))
  group by pi.property_id;
$$;

comment on function public.get_property_image_summaries(uuid[]) is
  'Retorna capa (position mais baixa) e total de fotos apenas para os imóveis da página atual do /admin.';

revoke all on function public.get_property_image_summaries(uuid[]) from public, anon;
grant execute on function public.get_property_image_summaries(uuid[]) to authenticated, service_role;

create or replace function public.get_owner_property_counts(
  p_owner_ids uuid[]
)
returns table (
  owner_id uuid,
  property_count integer
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    p.owner_id,
    count(*)::integer as property_count
  from public.properties p
  where p.owner_id = any(coalesce(p_owner_ids, '{}'::uuid[]))
  group by p.owner_id;
$$;

comment on function public.get_owner_property_counts(uuid[]) is
  'Retorna contagem de imóveis vinculados apenas para os proprietários da página atual do /admin.';

revoke all on function public.get_owner_property_counts(uuid[]) from public, anon;
grant execute on function public.get_owner_property_counts(uuid[]) to authenticated, service_role;
