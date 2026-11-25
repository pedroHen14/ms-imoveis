import { requireAdminUser } from "@/lib/admin-auth";
import {
  LeadsManager,
  type LeadPropertyRef,
  type LeadWithProperty,
} from "@/components/admin/LeadsManager";

export const dynamic = "force-dynamic";

export default async function AdminLeadsPage() {
  const { supabase } = await requireAdminUser();

  const [{ data: leadsData }, { data: propertiesData }] = await Promise.all([
    supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("properties")
      .select("id, code, title, condominium")
      .order("code", { ascending: false }),
  ]);

  const properties: LeadPropertyRef[] = propertiesData ?? [];
  const propertyById = new Map<string, LeadPropertyRef>(
    properties.map((prop) => [prop.id, prop]),
  );

  const leads: LeadWithProperty[] = (leadsData ?? []).map((lead) => ({
    ...lead,
    property: lead.property_id
      ? (propertyById.get(lead.property_id) ?? null)
      : null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground sm:text-3xl">
          Leads (Mini-CRM)
        </h1>
        <p className="mt-1 text-sm text-muted">
          Acompanhe interessados do site, WhatsApp, indicações e Newcore com
          alerta automático de follow-up (&gt;3 dias).
        </p>
      </div>

      <LeadsManager leads={leads} properties={properties} />
    </div>
  );
}
