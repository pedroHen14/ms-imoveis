"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

const leadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe seu nome completo.")
    .max(120, "Nome muito longo."),
  phone: z
    .string()
    .trim()
    .refine((val) => {
      const digits = val.replace(/\D/g, "");
      return digits.length >= 10 && digits.length <= 13;
    }, "Informe um WhatsApp ou telefone válido com DDD."),
  email: z
    .string()
    .trim()
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
}

export async function submitPublicLead(
  _prevState: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
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
    };
  }

  if (!getSupabasePublicEnv()) {
    return {
      status: "error",
      message:
        "O formulário está temporariamente indisponível. Por favor, fale diretamente pelo WhatsApp.",
    };
  }

  try {
    const supabase = await createClient();
    const { name, phone, email, notes, propertyId } = parsed.data;

    // IMPORTANTE: anon possui apenas INSERT em `leads` (sem SELECT por RLS),
    // portanto não encadeamos `.select()` após `.insert()`.
    const { error } = await supabase.from("leads").insert({
      name,
      phone,
      email: email || null,
      notes: notes || null,
      property_id: propertyId || null,
      source: "site",
      status: "novo",
    });

    if (error) {
      console.error("Erro ao salvar lead público:", error.message);
      return {
        status: "error",
        message:
          "Não foi possível enviar sua mensagem agora. Tente novamente ou chame no WhatsApp.",
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
    };
  }
}
