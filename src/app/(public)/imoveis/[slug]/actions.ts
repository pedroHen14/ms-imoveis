"use server";

import { z } from "zod";
import { normalizePhoneE164 } from "@/lib/format";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTurnstileToken } from "@/lib/turnstile";

const leadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe seu nome completo.")
    .max(120, "Nome muito longo."),
  phone: z
    .string()
    .trim()
    .max(30, "Telefone muito longo.")
    .refine((val) => {
      const digits = val.replace(/\D/g, "");
      return digits.length >= 10 && digits.length <= 13;
    }, "Informe um WhatsApp ou telefone válido com DDD."),
  email: z
    .string()
    .trim()
    .max(160, "E-mail muito longo.")
    .email("Informe um e-mail válido.")
    .optional()
    .or(z.literal("")),
  notes: z
    .string()
    .trim()
    .max(1000, "A mensagem pode ter no máximo 1.000 caracteres.")
    .optional()
    .or(z.literal("")),
  propertyId: z.string().uuid().optional().or(z.literal("")),
});

export interface LeadFormState {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<"name" | "phone" | "email" | "notes", string>>;
  resetTurnstile?: boolean;
}

export async function submitPublicLead(
  _prevState: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  // Honeypot anti-bot: bots automatizados costumam preencher campos ocultos.
  // Retorna sucesso silencioso sem persistir no banco.
  const honeypot = formData.get("website")?.toString().trim() ?? "";
  if (honeypot.length > 0) {
    return {
      status: "success",
      message:
        "Mensagem enviada com sucesso! O Marcelo entrará em contato em breve.",
    };
  }

  const clientIp = await getClientIp();
  const rateLimit = await checkRateLimit({
    namespace: "public-lead",
    identifier: clientIp,
    limit: 5,
    windowSeconds: 15 * 60,
  });

  if (!rateLimit.allowed) {
    return {
      status: "error",
      message:
        "Muitas mensagens enviadas recentemente. Aguarde alguns minutos ou chame diretamente pelo WhatsApp.",
      resetTurnstile: false,
    };
  }

  // Valida os campos do formulário ANTES de consumir o token de uso único do Turnstile,
  // evitando que um erro de digitação invalide a verificação anti-bot.
  const parsed = leadSchema.safeParse({
    name: formData.get("name") ?? "",
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    notes: formData.get("notes") ?? "",
    propertyId: formData.get("propertyId") ?? "",
  });

  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    return {
      status: "error",
      message: "Por favor, revise os campos destacados abaixo.",
      fieldErrors: {
        name: flattened.name?.[0],
        phone: flattened.phone?.[0],
        email: flattened.email?.[0],
        notes: flattened.notes?.[0],
      },
      resetTurnstile: false,
    };
  }

  const turnstileToken = formData.get("cf-turnstile-response")?.toString();
  const turnstileCheck = await verifyTurnstileToken(turnstileToken, clientIp);
  if (!turnstileCheck.ok) {
    return {
      status: "error",
      message:
        "Não foi possível concluir a verificação de segurança. Tente enviar novamente.",
      resetTurnstile: true,
    };
  }

  const supabase = createAdminClient();
  if (!supabase) {
    console.error(
      "[submitPublicLead] SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_URL ausente no servidor.",
    );
    return {
      status: "error",
      message:
        "O formulário está temporariamente indisponível. Por favor, fale diretamente pelo WhatsApp.",
      resetTurnstile: turnstileCheck.configured,
    };
  }

  try {
    const { name, phone, email, notes, propertyId } = parsed.data;
    let verifiedPropertyId: string | null = null;

    if (propertyId) {
      // Valida que o imóvel existe e está público (`disponivel`), evitando
      // sondagem de UUIDs de rascunhos/imóveis ocultos.
      const { data: propertyRow, error: propError } = await supabase
        .from("properties")
        .select("id")
        .eq("id", propertyId)
        .eq("status", "disponivel")
        .maybeSingle();

      if (propError || !propertyRow) {
        return {
          status: "error",
          message:
            "Este imóvel não está mais disponível para contato pelo formulário. Chame no WhatsApp para ver opções semelhantes.",
          resetTurnstile: turnstileCheck.configured,
        };
      }

      verifiedPropertyId = propertyRow.id;
    }

    const normalizedPhone = normalizePhoneE164(phone) || phone;

    const { error } = await supabase.from("leads").insert({
      name,
      phone: normalizedPhone,
      email: email || null,
      notes: notes || null,
      property_id: verifiedPropertyId,
      source: "site",
      status: "novo",
    });

    if (error) {
      console.error("Erro ao salvar lead público:", error.message);
      return {
        status: "error",
        message:
          "Não foi possível enviar sua mensagem agora. Tente novamente ou chame no WhatsApp.",
        resetTurnstile: turnstileCheck.configured,
      };
    }

    return {
      status: "success",
      message:
        "Mensagem enviada com sucesso! O Marcelo entrará em contato em breve.",
    };
  } catch (err) {
    console.error("Falha inesperada ao salvar lead:", err);
    return {
      status: "error",
      message:
        "Ocorreu um erro inesperado. Se preferir, chame diretamente pelo WhatsApp.",
      resetTurnstile: turnstileCheck.configured,
    };
  }
}
