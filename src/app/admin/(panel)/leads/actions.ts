"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminUserForAction } from "@/lib/admin-auth";
import { buildPhoneCandidates } from "@/lib/format";
import type { LeadStatus } from "@/types/database";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

const LEAD_SOURCES = [
  "site",
  "whatsapp",
  "indicacao",
  "newcore",
  "olx",
  "marketplace",
] as const;

const LEAD_STATUSES = [
  "novo",
  "em_contato",
  "visita",
  "proposta",
  "fechado",
  "perdido",
] as const;

const leadSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome do interessado.")
    .max(120, "Nome muito longo."),
  phone: z
    .string()
    .trim()
    .min(8, "Informe um telefone/WhatsApp válido.")
    .max(30, "Telefone muito longo."),
  email: z
    .string()
    .trim()
    .email("Informe um e-mail válido.")
    .max(160)
    .optional()
    .or(z.literal("")),
  source: z.enum(LEAD_SOURCES),
  status: z.enum(LEAD_STATUSES),
  property_id: z.string().uuid().nullable(),
  notes: z
    .string()
    .trim()
    .max(2000, "As observações podem ter no máximo 2.000 caracteres.")
    .optional()
    .or(z.literal("")),
});

export interface LeadActionResult {
  ok: boolean;
  message?: string;
  lastContactAt?: string;
  botPausedUntil?: string | null;
  aiPaused?: boolean;
}

const toggleWhatsappAiSchema = z.object({
  leadId: z.string().uuid("Identificador de lead inválido."),
  pause: z.boolean(),
  sessionPhone: z.string().trim().max(30).nullable().optional(),
});

type AdminSupabaseClient = NonNullable<
  Awaited<ReturnType<typeof getAdminUserForAction>>
>["supabase"];

async function findMatchingWhatsappSessionPhones(
  supabase: AdminSupabaseClient,
  leadId: string,
  leadPhone: string | null | undefined,
  explicitSessionPhone?: string | null,
): Promise<{ phones: string[]; errorMessage?: string }> {
  const phoneCandidates = Array.from(
    new Set([
      ...buildPhoneCandidates(leadPhone),
      ...buildPhoneCandidates(explicitSessionPhone),
      ...(explicitSessionPhone?.trim() ? [explicitSessionPhone.trim()] : []),
    ]),
  );

  const [byLeadResult, byPhoneResult] = await Promise.all([
    supabase
      .from("whatsapp_sessions")
      .select("phone")
      .eq("lead_id", leadId),
    phoneCandidates.length > 0
      ? supabase
          .from("whatsapp_sessions")
          .select("phone")
          .in("phone", phoneCandidates)
      : Promise.resolve({ data: [] as { phone: string }[], error: null }),
  ]);

  if (byLeadResult.error && byPhoneResult.error) {
    return {
      phones: [],
      errorMessage: byLeadResult.error.message,
    };
  }

  const matched = new Set<string>();
  for (const row of byLeadResult.data ?? []) {
    matched.add(row.phone);
  }
  for (const row of byPhoneResult.data ?? []) {
    matched.add(row.phone);
  }

  return { phones: Array.from(matched) };
}

function revalidateLeadPaths() {
  revalidatePath("/admin/leads");
  revalidatePath("/admin");
}

export async function saveLead(
  formData: FormData,
): Promise<LeadActionResult> {
  const auth = await getAdminUserForAction();
  if (!auth) {
    return { ok: false, message: "Sessão expirada. Faça login novamente." };
  }

  const rawPropertyId = formData.get("property_id")?.toString().trim() ?? "";

  const parsed = leadSchema.safeParse({
    id: formData.get("id")?.toString() ?? "",
    name: formData.get("name")?.toString() ?? "",
    phone: formData.get("phone")?.toString() ?? "",
    email: formData.get("email")?.toString() ?? "",
    source: formData.get("source")?.toString() ?? "indicacao",
    status: formData.get("status")?.toString() ?? "novo",
    property_id: rawPropertyId || null,
    notes: formData.get("notes")?.toString() ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Revise os dados do lead.",
    };
  }

  const { id, name, phone, email, source, status, property_id, notes } =
    parsed.data;

  const payload = {
    name,
    phone,
    email: email || null,
    source,
    status,
    property_id,
    notes: notes || null,
  };

  if (id) {
    const { error } = await auth.supabase
      .from("leads")
      .update(payload)
      .eq("id", id);

    if (error) {
      console.error("Erro ao atualizar lead:", error.message);
      return { ok: false, message: "Não foi possível atualizar o lead." };
    }
  } else {
    const { error } = await auth.supabase.from("leads").insert({
      ...payload,
      last_contact_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Erro ao cadastrar lead:", error.message);
      return { ok: false, message: "Não foi possível cadastrar o lead." };
    }
  }

  revalidateLeadPaths();

  return {
    ok: true,
    message: id
      ? "Lead atualizado com sucesso."
      : "Lead cadastrado com sucesso.",
  };
}

export async function updateLeadStatus(
  id: string,
  status: LeadStatus,
): Promise<LeadActionResult> {
  const auth = await getAdminUserForAction();
  if (!auth) {
    return { ok: false, message: "Sessão expirada." };
  }

  const parsedId = z.string().uuid().safeParse(id);
  const parsedStatus = z.enum(LEAD_STATUSES).safeParse(status);

  if (!parsedId.success || !parsedStatus.success) {
    return { ok: false, message: "Dados inválidos." };
  }

  const { error } = await auth.supabase
    .from("leads")
    .update({ status: parsedStatus.data })
    .eq("id", parsedId.data);

  if (error) {
    return { ok: false, message: "Não foi possível atualizar o status." };
  }

  revalidateLeadPaths();
  return { ok: true };
}

export async function toggleLeadWhatsappAi(input: {
  leadId: string;
  pause: boolean;
  sessionPhone?: string | null;
}): Promise<LeadActionResult> {
  const auth = await getAdminUserForAction();
  if (!auth) {
    return { ok: false, message: "Sessão expirada. Faça login novamente." };
  }

  const parsed = toggleWhatsappAiSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const { leadId, pause, sessionPhone } = parsed.data;

  const { data: leadRow, error: leadError } = await auth.supabase
    .from("leads")
    .select("phone")
    .eq("id", leadId)
    .single();

  if (leadError || !leadRow) {
    return { ok: false, message: "Lead não encontrado." };
  }

  const { phones, errorMessage } = await findMatchingWhatsappSessionPhones(
    auth.supabase,
    leadId,
    leadRow.phone,
    sessionPhone,
  );

  if (errorMessage) {
    console.error("Erro ao consultar sessão WhatsApp:", errorMessage);
    return {
      ok: false,
      message: "Não foi possível consultar a sessão do Assistente de WhatsApp.",
    };
  }

  if (phones.length === 0) {
    return {
      ok: false,
      message:
        "Este lead não possui uma sessão ativa no Assistente de WhatsApp.",
    };
  }

  const nextPausedUntil = pause
    ? new Date(Date.now() + TWENTY_FOUR_HOURS_MS).toISOString()
    : null;

  const { error: updateError } = await auth.supabase
    .from("whatsapp_sessions")
    .update({ bot_paused_until: nextPausedUntil })
    .in("phone", phones);

  if (updateError) {
    console.error("Erro ao atualizar pausa da IA:", updateError.message);
    return {
      ok: false,
      message: pause
        ? "Não foi possível pausar a IA para este lead."
        : "Não foi possível reativar a IA para este lead.",
    };
  }

  revalidateLeadPaths();

  return {
    ok: true,
    botPausedUntil: nextPausedUntil,
    aiPaused: pause,
    message: pause
      ? "Assistente de IA pausado por 24h."
      : "Assistente de IA reativado.",
  };
}

export async function registerLeadWhatsAppContact(
  id: string,
): Promise<LeadActionResult> {
  const auth = await getAdminUserForAction();
  if (!auth) {
    return { ok: false, message: "Sessão expirada." };
  }

  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) {
    return { ok: false, message: "Identificador inválido." };
  }

  const nowIso = new Date().toISOString();
  const { data: updatedLead, error } = await auth.supabase
    .from("leads")
    .update({ last_contact_at: nowIso })
    .eq("id", parsedId.data)
    .select("phone")
    .single();

  if (error || !updatedLead) {
    return {
      ok: false,
      message: "Não foi possível registrar o contato no WhatsApp.",
    };
  }

  let aiPaused = false;
  let botPausedUntil: string | null = null;

  const { phones, errorMessage } = await findMatchingWhatsappSessionPhones(
    auth.supabase,
    parsedId.data,
    updatedLead.phone,
  );

  if (errorMessage) {
    console.warn(
      "Aviso ao verificar sessão WhatsApp durante contato:",
      errorMessage,
    );
  } else if (phones.length > 0) {
    const pauseUntilIso = new Date(
      Date.now() + TWENTY_FOUR_HOURS_MS,
    ).toISOString();

    const { error: pauseError } = await auth.supabase
      .from("whatsapp_sessions")
      .update({ bot_paused_until: pauseUntilIso })
      .in("phone", phones);

    if (pauseError) {
      console.error(
        "Erro ao pausar IA automaticamente ao chamar no WhatsApp:",
        pauseError.message,
      );
    } else {
      aiPaused = true;
      botPausedUntil = pauseUntilIso;
    }
  }

  revalidateLeadPaths();
  return {
    ok: true,
    lastContactAt: nowIso,
    botPausedUntil,
    aiPaused,
    message: aiPaused
      ? "Último contato atualizado e IA pausada por 24h."
      : "Último contato atualizado.",
  };
}

export async function deleteLead(id: string): Promise<LeadActionResult> {
  const auth = await getAdminUserForAction();
  if (!auth) {
    return { ok: false, message: "Sessão expirada." };
  }

  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) {
    return { ok: false, message: "Identificador inválido." };
  }

  const { error } = await auth.supabase
    .from("leads")
    .delete()
    .eq("id", parsedId.data);

  if (error) {
    return { ok: false, message: "Não foi possível excluir o lead." };
  }

  revalidateLeadPaths();
  return { ok: true, message: "Lead excluído." };
}
