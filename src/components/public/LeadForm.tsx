"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import {
  submitPublicLead,
  type LeadFormState,
} from "@/app/(public)/imoveis/[slug]/actions";
import { trackLeadConversion } from "@/lib/tracking";

interface LeadFormProps {
  propertyId: string;
  propertyTitle: string;
  propertyCode: number;
  propertyPrice?: number | null;
}

const INITIAL_STATE: LeadFormState = {
  status: "idle",
};

function formatBrazilianPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function LeadForm({
  propertyId,
  propertyTitle,
  propertyCode,
  propertyPrice,
}: LeadFormProps) {
  const [state, formAction, isPending] = useActionState(
    submitPublicLead,
    INITIAL_STATE,
  );
  const [phone, setPhone] = useState("");
  const trackedSuccessRef = useRef(false);

  useEffect(() => {
    if (state.status === "success" && !trackedSuccessRef.current) {
      trackedSuccessRef.current = true;
      trackLeadConversion({
        method: "form",
        propertyCode,
        propertyTitle,
        value: propertyPrice,
      });
    }
  }, [state.status, propertyCode, propertyTitle, propertyPrice]);

  if (state.status === "success") {
    return (
      <div className="rounded-xl border border-primary/25 bg-primary/5 p-5 text-center">
        <CheckCircle2 className="mx-auto h-9 w-9 text-primary" />
        <h3 className="mt-3 font-serif text-lg font-semibold text-primary">
          Contato recebido!
        </h3>
        <p className="mt-1.5 text-sm text-muted">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3.5" noValidate>
      <input type="hidden" name="propertyId" value={propertyId} />

      <div>
        <label
          htmlFor="lead-name"
          className="mb-1 block text-xs font-semibold text-foreground"
        >
          Seu nome *
        </label>
        <input
          id="lead-name"
          name="name"
          type="text"
          required
          autoComplete="name"
          placeholder="Como podemos te chamar?"
          className="h-11 w-full rounded-lg border border-border bg-background px-3.5 text-sm text-foreground transition-colors focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/15"
        />
        {state.fieldErrors?.name && (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.name}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="lead-phone"
          className="mb-1 block text-xs font-semibold text-foreground"
        >
          WhatsApp ou Telefone *
        </label>
        <input
          id="lead-phone"
          name="phone"
          type="tel"
          required
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(formatBrazilianPhoneInput(e.target.value))}
          placeholder="(11) 99999-9999"
          className="h-11 w-full rounded-lg border border-border bg-background px-3.5 text-sm text-foreground transition-colors focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/15"
        />
        {state.fieldErrors?.phone && (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.phone}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="lead-email"
          className="mb-1 block text-xs font-semibold text-foreground"
        >
          E-mail <span className="font-normal text-muted">(opcional)</span>
        </label>
        <input
          id="lead-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          className="h-11 w-full rounded-lg border border-border bg-background px-3.5 text-sm text-foreground transition-colors focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/15"
        />
        {state.fieldErrors?.email && (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.email}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="lead-notes"
          className="mb-1 block text-xs font-semibold text-foreground"
        >
          Mensagem <span className="font-normal text-muted">(opcional)</span>
        </label>
        <textarea
          id="lead-notes"
          name="notes"
          rows={3}
          defaultValue={`Olá Marcelo, tenho interesse no imóvel ${propertyTitle} (Cód. ${propertyCode}) e gostaria de agendar uma visita.`}
          className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground transition-colors focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/15"
        />
        {state.fieldErrors?.notes && (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.notes}</p>
        )}
      </div>

      {state.status === "error" && state.message && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Enviando...</span>
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            <span>Tenho interesse neste imóvel</span>
          </>
        )}
      </button>

      <p className="text-center text-[11px] text-muted">
        Seus dados são utilizados apenas para o retorno do corretor.
      </p>
    </form>
  );
}
