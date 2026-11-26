import { requireAdminUser } from "@/lib/admin-auth";
import {
  getSearchParam,
  parsePageParam,
  sanitizePostgrestSearch,
  type RawSearchParams,
} from "@/lib/admin-pagination";
import { buildPhoneCandidates } from "@/lib/format";
import {
  LeadsManager,
  type LeadFilterStatus,
  type LeadPropertyRef,
  type LeadWhatsappSession,
  type LeadWithProperty,
} from "@/components/admin/LeadsManager";
import type { LeadSource, LeadStatus } from "@/types/database";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

const VALID_LEAD_STATUSES = new Set<LeadStatus>([
  "novo",
  "em_contato",
  "visita",
  "proposta",
  "fechado",
  "perdido",
]);

const VALID_LEAD_SOURCES = new Set<LeadSource>([
  "site",
  "whatsapp",
  "indicacao",
  "newcore",
  "olx",
  "marketplace",
]);

interface AdminLeadsPageProps {
  searchParams: Promise<RawSearchParams>;
}

function extractPropertyRelation(
  relation: LeadPropertyRef | LeadPropertyRef[] | null | undefined,
): LeadPropertyRef | null {
  if (!relation) return null;
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }
  return relation;
}

export default async function AdminLeadsPage({
  searchParams,
}: AdminLeadsPageProps) {
  const { supabase } = await requireAdminUser();
  const rawParams = await searchParams;

  const queryText = getSearchParam(rawParams.q).slice(0, 80);
  const cleanedQuery = sanitizePostgrestSearch(queryText);

  const rawStatus = getSearchParam(rawParams.status);
  const statusFilter: LeadFilterStatus =
    rawStatus === "alertas" || rawStatus === "ativos"
      ? rawStatus
      : VALID_LEAD_STATUSES.has(rawStatus as LeadStatus)
        ? (rawStatus as LeadStatus)
        : "todos";

  const rawSource = getSearchParam(rawParams.source);
  const sourceFilter: "todas" | LeadSource = VALID_LEAD_SOURCES.has(
    rawSource as LeadSource,
  )
    ? (rawSource as LeadSource)
    : "todas";

  const page = parsePageParam(rawParams.page);

  const referenceNowMs = Date.now();
  const threeDaysAgoIso = new Date(referenceNowMs - THREE_DAYS_MS).toISOString();

  // Contadores globais leves (HEAD + COUNT) + imóveis para o modal + busca auxiliar de imóveis
  const [
    totalAllRes,
    activeAllRes,
    overdueAllRes,
    propertiesRes,
    matchedPropertiesRes,
  ] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .not("status", "in", "(fechado,perdido)"),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .not("status", "in", "(fechado,perdido)")
      .lt("last_contact_at", threeDaysAgoIso),
    supabase
      .from("properties")
      .select("id, code, title, condominium")
      .order("code", { ascending: false })
      .limit(500),
    cleanedQuery
      ? (() => {
          const propOrParts = [
            `title.ilike.%${cleanedQuery}%`,
            `condominium.ilike.%${cleanedQuery}%`,
          ];
          const codeMatch = cleanedQuery.replace(/^#/, "").trim();
          if (/^\d{1,9}$/.test(codeMatch)) {
            propOrParts.push(`code.eq.${Number.parseInt(codeMatch, 10)}`);
          }
          return supabase
            .from("properties")
            .select("id")
            .or(propOrParts.join(","))
            .limit(50);
        })()
      : Promise.resolve({ data: [] as { id: string }[] }),
  ]);

  let leadsQuery = supabase
    .from("leads")
    .select(
      "id, name, phone, email, source, property_id, status, notes, last_contact_at, created_at, properties ( id, code, title, condominium )",
      { count: "exact" },
    );

  if (statusFilter === "alertas") {
    leadsQuery = leadsQuery
      .not("status", "in", "(fechado,perdido)")
      .lt("last_contact_at", threeDaysAgoIso);
  } else if (statusFilter === "ativos") {
    leadsQuery = leadsQuery.not("status", "in", "(fechado,perdido)");
  } else if (statusFilter !== "todos") {
    leadsQuery = leadsQuery.eq("status", statusFilter);
  }

  if (sourceFilter !== "todas") {
    leadsQuery = leadsQuery.eq("source", sourceFilter);
  }

  if (cleanedQuery) {
    const orParts = [
      `name.ilike.%${cleanedQuery}%`,
      `phone.ilike.%${cleanedQuery}%`,
      `email.ilike.%${cleanedQuery}%`,
      `notes.ilike.%${cleanedQuery}%`,
    ];

    const digitsOnly = cleanedQuery.replace(/\D/g, "");
    if (digitsOnly.length >= 3 && digitsOnly !== cleanedQuery) {
      orParts.push(`phone.ilike.%${digitsOnly}%`);
    }

    const matchedPropertyIds = (matchedPropertiesRes.data ?? []).map(
      (item) => item.id,
    );
    if (matchedPropertyIds.length > 0) {
      orParts.push(`property_id.in.(${matchedPropertyIds.join(",")})`);
    }

    leadsQuery = leadsQuery.or(orParts.join(","));
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: leadsData, count: filteredCount } = await leadsQuery
    .order("created_at", { ascending: false })
    .range(from, to);

  const pageLeads = leadsData ?? [];
  const totalFiltered = filteredCount ?? pageLeads.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));

  // Busca whatsapp_sessions apenas para os leads visíveis nesta página (máx. 20)
  const pageLeadIds = pageLeads.map((lead) => lead.id);
  const pagePhoneCandidates = Array.from(
    new Set(pageLeads.flatMap((lead) => buildPhoneCandidates(lead.phone))),
  );

  const sessionByLeadId = new Map<string, LeadWhatsappSession>();
  const sessionByPhone = new Map<string, LeadWhatsappSession>();

  if (pageLeadIds.length > 0) {
    const [sessionsByLeadRes, sessionsByPhoneRes] = await Promise.all([
      supabase
        .from("whatsapp_sessions")
        .select("phone, lead_id, bot_paused_until, last_interaction_at")
        .in("lead_id", pageLeadIds)
        .order("last_interaction_at", { ascending: false }),
      pagePhoneCandidates.length > 0
        ? supabase
            .from("whatsapp_sessions")
            .select("phone, lead_id, bot_paused_until, last_interaction_at")
            .in("phone", pagePhoneCandidates)
            .order("last_interaction_at", { ascending: false })
        : Promise.resolve({
            data: [] as {
              phone: string;
              lead_id: string | null;
              bot_paused_until: string | null;
              last_interaction_at: string;
            }[],
            error: null,
          }),
    ]);

    if (sessionsByLeadRes.error) {
      console.warn(
        "[/admin/leads] Não foi possível carregar whatsapp_sessions por lead:",
        sessionsByLeadRes.error.message,
      );
    }
    if (sessionsByPhoneRes.error) {
      console.warn(
        "[/admin/leads] Não foi possível carregar whatsapp_sessions por telefone:",
        sessionsByPhoneRes.error.message,
      );
    }

    const combinedSessions = [
      ...(sessionsByLeadRes.data ?? []),
      ...(sessionsByPhoneRes.data ?? []),
    ];

    for (const session of combinedSessions) {
      const summary: LeadWhatsappSession = {
        phone: session.phone,
        bot_paused_until: session.bot_paused_until,
        last_interaction_at: session.last_interaction_at,
      };

      if (session.lead_id && !sessionByLeadId.has(session.lead_id)) {
        sessionByLeadId.set(session.lead_id, summary);
      }

      for (const candidate of buildPhoneCandidates(session.phone)) {
        if (!sessionByPhone.has(candidate)) {
          sessionByPhone.set(candidate, summary);
        }
      }
    }
  }

  const propertiesMap = new Map<string, LeadPropertyRef>();
  for (const prop of propertiesRes.data ?? []) {
    propertiesMap.set(prop.id, prop);
  }

  const leads: LeadWithProperty[] = pageLeads.map((lead) => {
    const linkedProperty = extractPropertyRelation(
      lead.properties as LeadPropertyRef | LeadPropertyRef[] | null,
    );
    if (linkedProperty && !propertiesMap.has(linkedProperty.id)) {
      propertiesMap.set(linkedProperty.id, linkedProperty);
    }

    let whatsappSession: LeadWhatsappSession | null =
      sessionByLeadId.get(lead.id) ?? null;

    if (!whatsappSession) {
      for (const candidate of buildPhoneCandidates(lead.phone)) {
        const match = sessionByPhone.get(candidate);
        if (match) {
          whatsappSession = match;
          break;
        }
      }
    }

    return {
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      source: lead.source,
      property_id: lead.property_id,
      status: lead.status,
      notes: lead.notes,
      last_contact_at: lead.last_contact_at,
      created_at: lead.created_at,
      property: linkedProperty,
      whatsappSession,
    };
  });

  const properties = Array.from(propertiesMap.values());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground sm:text-3xl">
          Leads (Mini-CRM)
        </h1>
        <p className="mt-1 text-sm text-muted">
          Acompanhe interessados do site, WhatsApp, indicações e Newcore,
          controle o Assistente de IA e receba alertas de follow-up (&gt;3 dias).
        </p>
      </div>

      <LeadsManager
        leads={leads}
        properties={properties}
        counts={{
          total: totalAllRes.count ?? 0,
          active: activeAllRes.count ?? 0,
          overdue: overdueAllRes.count ?? 0,
        }}
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          totalItems: totalFiltered,
          totalPages,
        }}
        initialFilters={{
          q: queryText,
          status: statusFilter,
          source: sourceFilter,
        }}
        referenceNowMs={referenceNowMs}
      />
    </div>
  );
}
