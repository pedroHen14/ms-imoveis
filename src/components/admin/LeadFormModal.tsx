"use client";

import { Loader2, X } from "lucide-react";
import { formatPhoneBR } from "@/lib/format";
import { LEAD_SOURCE_OPTIONS, LEAD_STATUS_OPTIONS } from "@/lib/status-badges";
import type {
  LeadPropertyRef,
  LeadWithProperty,
} from "@/components/admin/LeadsManager";

interface LeadFormModalProps {
  editingLead: LeadWithProperty | null;
  properties: LeadPropertyRef[];
  errorMessage: string | null;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

export function LeadFormModal({
  editingLead,
  properties,
  errorMessage,
  isPending,
  onClose,
  onSubmit,
}: LeadFormModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lead-modal-title"
    >
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-border bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <h2
            id="lead-modal-title"
            className="font-serif text-xl font-semibold text-foreground"
          >
            {editingLead ? "Editar Lead" : "Novo Lead Manual"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-slate-100"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          {editingLead ? (
            <input type="hidden" name="id" value={editingLead.id} />
          ) : null}

          {errorMessage ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
              {errorMessage}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                htmlFor="lead-name"
                className="block text-sm font-medium text-foreground"
              >
                Nome do interessado *
              </label>
              <input
                id="lead-name"
                name="name"
                type="text"
                required
                defaultValue={editingLead?.name ?? ""}
                placeholder="Ex.: Fernanda Oliveira"
                className="mt-1.5 w-full rounded-lg border border-border px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </div>

            <div>
              <label
                htmlFor="lead-phone"
                className="block text-sm font-medium text-foreground"
              >
                Telefone / WhatsApp *
              </label>
              <input
                id="lead-phone"
                name="phone"
                type="tel"
                required
                defaultValue={editingLead ? formatPhoneBR(editingLead.phone) : ""}
                placeholder="(11) 99999-9999"
                className="mt-1.5 w-full rounded-lg border border-border px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </div>

            <div>
              <label
                htmlFor="lead-email"
                className="block text-sm font-medium text-foreground"
              >
                E-mail (opcional)
              </label>
              <input
                id="lead-email"
                name="email"
                type="email"
                defaultValue={editingLead?.email ?? ""}
                placeholder="cliente@email.com"
                className="mt-1.5 w-full rounded-lg border border-border px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </div>

            <div>
              <label
                htmlFor="lead-source"
                className="block text-sm font-medium text-foreground"
              >
                Origem *
              </label>
              <select
                id="lead-source"
                name="source"
                defaultValue={editingLead?.source ?? "indicacao"}
                className="mt-1.5 w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                {LEAD_SOURCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="lead-status"
                className="block text-sm font-medium text-foreground"
              >
                Status *
              </label>
              <select
                id="lead-status"
                name="status"
                defaultValue={editingLead?.status ?? "novo"}
                className="mt-1.5 w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                {LEAD_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="lead-property"
                className="block text-sm font-medium text-foreground"
              >
                Imóvel de interesse (opcional)
              </label>
              <select
                id="lead-property"
                name="property_id"
                defaultValue={editingLead?.property_id ?? ""}
                className="mt-1.5 w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                <option value="">Interesse geral / sem imóvel vinculado</option>
                {properties.map((prop) => (
                  <option key={prop.id} value={prop.id}>
                    #{prop.code} — {prop.title}
                    {prop.condominium ? ` (${prop.condominium})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="lead-notes"
                className="block text-sm font-medium text-foreground"
              >
                Observações / Histórico
              </label>
              <textarea
                id="lead-notes"
                name="notes"
                rows={3}
                maxLength={10000}
                defaultValue={editingLead?.notes ?? ""}
                placeholder="Ex.: Indicação da Newcore, busca casa até R$ 650 mil em Cotia com financiamento..."
                className="mt-1.5 w-full rounded-lg border border-border px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : editingLead ? (
                "Salvar Alterações"
              ) : (
                "Cadastrar Lead"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
