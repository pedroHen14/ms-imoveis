import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { formatPhoneBR } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LeadStatus, StaleLeadFollowupRow } from "@/types/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_FOLLOWUP_DAYS = 3;

const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  novo: "Novo",
  em_contato: "Em contato",
  visita: "Visita",
  proposta: "Proposta",
  fechado: "Fechado",
  perdido: "Perdido",
};

interface FollowupLeadItem {
  id: string;
  name: string;
  phone: string;
  phone_formatted: string;
  whatsapp_url: string;
  status: LeadStatus;
  status_label: string;
  source: StaleLeadFollowupRow["source"];
  last_contact_at: string;
  days_without_contact: number;
  property: {
    id: string;
    code: number | null;
    title: string | null;
    slug: string | null;
  } | null;
  property_label: string | null;
}

function isValidBearerToken(authHeader: string | null, expectedSecret: string): boolean {
  if (!authHeader) return false;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;

  const provided = Buffer.from(match[1].trim(), "utf8");
  const expected = Buffer.from(expectedSecret, "utf8");

  if (provided.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(provided, expected);
}

function normalizePhoneE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

function formatDaysLabel(days: number): string {
  if (days <= 1) return "1 dia";
  return `${days} dias`;
}

function buildPropertyLabel(row: StaleLeadFollowupRow): string | null {
  if (!row.property_title) return null;
  if (row.property_code) {
    return `${row.property_title} (Cód. ${row.property_code})`;
  }
  return row.property_title;
}

function buildAdminLeadsUrl(): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") ||
    "http://localhost:3000";
  return `${baseUrl}/admin/leads`;
}

function buildTopLeadsInline(leads: FollowupLeadItem[], limit = 5): string {
  if (leads.length === 0) return "";
  const listed = leads.slice(0, limit).map((lead) => {
    const propertySuffix = lead.property_label ? ` - ${lead.property_label}` : "";
    return `${lead.name} (${formatDaysLabel(lead.days_without_contact)}${propertySuffix})`;
  });

  const remaining = leads.length - listed.length;
  if (remaining > 0) {
    listed.push(`e mais ${remaining}`);
  }

  return listed.join("; ");
}

function buildFormattedSummary(
  leads: FollowupLeadItem[],
  daysThreshold: number,
  adminLeadsUrl: string,
): string {
  if (leads.length === 0) {
    return `Nenhum lead sem retorno há mais de ${daysThreshold} dias no momento.`;
  }

  const header =
    leads.length === 1
      ? `Bom dia, Marcelo! Você tem 1 cliente sem retorno há mais de ${daysThreshold} dias:`
      : `Bom dia, Marcelo! Você tem ${leads.length} clientes sem retorno há mais de ${daysThreshold} dias:`;

  const lines = leads.map((lead, index) => {
    const parts = [
      `${index + 1}. *${lead.name}* (${lead.status_label} • há ${formatDaysLabel(lead.days_without_contact)})`,
    ];

    if (lead.property_label) {
      parts.push(`   Imóvel: ${lead.property_label}`);
    }

    parts.push(`   WhatsApp: ${lead.phone_formatted || lead.phone}`);
    if (lead.whatsapp_url) {
      parts.push(`   Chamar: ${lead.whatsapp_url}`);
    }

    return parts.join("\n");
  });

  return [
    header,
    "",
    ...lines,
    "",
    `Painel Mini-CRM: ${adminLeadsUrl}`,
  ].join("\n");
}

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    console.error("[/api/cron/followup] Variável CRON_SECRET não configurada.");
    return jsonNoStore(
      { error: "Endpoint de follow-up não configurado no servidor." },
      500,
    );
  }

  const authHeader = request.headers.get("authorization");
  if (!isValidBearerToken(authHeader, cronSecret)) {
    return jsonNoStore({ error: "Não autorizado." }, 401);
  }

  const rawDays = request.nextUrl.searchParams.get("days");
  let daysThreshold = DEFAULT_FOLLOWUP_DAYS;

  if (rawDays !== null && rawDays.trim() !== "") {
    const parsedDays = Number(rawDays);
    if (!Number.isInteger(parsedDays) || parsedDays < 1 || parsedDays > 365) {
      return jsonNoStore(
        { error: "Parâmetro 'days' inválido. Informe um inteiro entre 1 e 365." },
        400,
      );
    }
    daysThreshold = parsedDays;
  }

  const supabase = createAdminClient();
  if (!supabase) {
    console.error(
      "[/api/cron/followup] Variáveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes.",
    );
    return jsonNoStore(
      { error: "Configuração administrativa do Supabase ausente no servidor." },
      500,
    );
  }

  const { data, error } = await supabase.rpc("get_stale_leads_for_followup", {
    p_days: daysThreshold,
  });

  if (error) {
    console.error("[/api/cron/followup] Erro ao consultar RPC:", error.message);
    return jsonNoStore(
      { error: "Falha ao consultar leads pendentes de follow-up." },
      500,
    );
  }

  const rows: StaleLeadFollowupRow[] = data ?? [];
  const leads: FollowupLeadItem[] = rows.map((row) => {
    const e164 = normalizePhoneE164(row.phone);
    const propertyLabel = buildPropertyLabel(row);

    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      phone_formatted: formatPhoneBR(row.phone),
      whatsapp_url: e164 ? `https://wa.me/${e164}` : "",
      status: row.status,
      status_label: LEAD_STATUS_LABELS[row.status] ?? row.status,
      source: row.source,
      last_contact_at: row.last_contact_at,
      days_without_contact: row.days_without_contact,
      property: row.property_id
        ? {
            id: row.property_id,
            code: row.property_code,
            title: row.property_title,
            slug: row.property_slug,
          }
        : null,
      property_label: propertyLabel,
    };
  });

  const adminLeadsUrl = buildAdminLeadsUrl();
  const formattedSummary = buildFormattedSummary(
    leads,
    daysThreshold,
    adminLeadsUrl,
  );
  const topLeadsInline = buildTopLeadsInline(leads);

  return jsonNoStore({
    count: leads.length,
    days_threshold: daysThreshold,
    admin_leads_url: adminLeadsUrl,
    top_leads_inline: topLeadsInline,
    formatted_summary: formattedSummary,
    leads,
  });
}
