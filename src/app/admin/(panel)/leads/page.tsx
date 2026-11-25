import { requireAdminUser } from "@/lib/admin-auth";
import { buildPhoneCandidates } from "@/lib/format";
import {
  LeadsManager,
  type LeadPropertyRef,
  type LeadWhatsappSession,
  type LeadWithProperty,
} from "@/components/admin/LeadsManager";

export const dynamic = "force-dynamic";

export default async function AdminLeadsPage() {
  const { supabase } = await requireAdminUser();

  const [
    { data: leadsData },
    { data: propertiesData },
    { data: sessionsData, error: sessionsError },
  ] = await Promise.all([
    supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("properties")
      .select("id, code, title, condominium")
      .order("code", { ascending: false }),
    supabase
      .from("whatsapp_sessions")
      .select("phone, lead_id, bot_paused_until, last_interaction_at")
      .order("last_interaction_at", { ascending: false }),
  ]);

  if (sessionsError) {
    console.warn(
      "[/admin/leads] Não foi possível carregar whatsapp_sessions:",
      sessionsError.message,
    );
  }

  const properties: LeadPropertyRef[] = propertiesData ?? [];
  const propertyById = new Map<string, LeadPropertyRef>(
    properties.map((prop) => [prop.id, prop]),
  );

  const sessionByLeadId = new Map<string, LeadWhatsappSession>();
  const sessionByPhone = new Map<string, LeadWhatsappSession>();

  for (const session of sessionsData ?? []) {
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

  const leads: LeadWithProperty[] = (leadsData ?? []).map((lead) => {
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
      ...lead,
      property: lead.property_id
        ? (propertyById.get(lead.property_id) ?? null)
        : null,
      whatsappSession,
    };
  });

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

      <LeadsManager leads={leads} properties={properties} />
    </div>
  );
}
