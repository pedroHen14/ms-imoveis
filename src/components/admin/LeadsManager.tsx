"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Plus, Search, X } from "lucide-react";
import type { Lead, LeadSource, LeadStatus } from "@/types/database";
import { BROKER_INFO, buildWhatsAppUrl } from "@/lib/format";
import { LEAD_SOURCE_OPTIONS, LEAD_STATUS_OPTIONS } from "@/lib/status-badges";
import {
  deleteLead,
  registerLeadWhatsAppContact,
  saveLead,
  toggleLeadWhatsappAi,
  updateLeadStatus,
} from "@/app/admin/(panel)/leads/actions";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { LeadFormModal } from "@/components/admin/LeadFormModal";
import { LeadTableRow } from "@/components/admin/LeadTableRow";

export type LeadFilterStatus = "todos" | "alertas" | "ativos" | LeadStatus;

export interface LeadPropertyRef {
  id: string;
  code: number;
  title: string;
  condominium: string | null;
}

export interface LeadWhatsappSession {
  phone: string;
  bot_paused_until: string | null;
  last_interaction_at: string;
}

export interface LeadWithProperty extends Lead {
  property: LeadPropertyRef | null;
  whatsappSession: LeadWhatsappSession | null;
}

interface LeadsManagerProps {
  leads: LeadWithProperty[];
  properties: LeadPropertyRef[];
  counts: {
    total: number;
    active: number;
    overdue: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  initialFilters: {
    q: string;
    status: LeadFilterStatus;
    source: "todas" | LeadSource;
  };
  referenceNowMs: number;
}

export function LeadsManager({
  leads,
  properties,
  counts,
  pagination,
  initialFilters,
  referenceNowMs,
}: LeadsManagerProps) {
  const router = useRouter();
  const [queryInput, setQueryInput] = useState(initialFilters.q);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<LeadWithProperty | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [busyLeadId, setBusyLeadId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isFirstRenderRef = useRef(true);

  const statusFilter = initialFilters.status;
  const sourceFilter = initialFilters.source;

  useEffect(() => {
    setQueryInput(initialFilters.q);
  }, [initialFilters.q]);

  function navigateWithFilters(next: {
    q?: string;
    status?: LeadFilterStatus;
    source?: "todas" | LeadSource;
    page?: number;
  }) {
    const q = (next.q ?? queryInput).trim();
    const status = next.status ?? statusFilter;
    const source = next.source ?? sourceFilter;
    const page = next.page ?? 1;

    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status && status !== "todos") params.set("status", status);
    if (source && source !== "todas") params.set("source", source);
    if (page > 1) params.set("page", String(page));

    const qs = params.toString();
    router.replace(qs ? `/admin/leads?${qs}` : "/admin/leads", {
      scroll: false,
    });
  }

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    if (queryInput.trim() === initialFilters.q.trim()) {
      return;
    }

    const timer = window.setTimeout(() => {
      const params = new URLSearchParams();
      const trimmed = queryInput.trim();
      if (trimmed) params.set("q", trimmed);
      if (initialFilters.status && initialFilters.status !== "todos") {
        params.set("status", initialFilters.status);
      }
      if (initialFilters.source && initialFilters.source !== "todas") {
        params.set("source", initialFilters.source);
      }
      const qs = params.toString();
      router.replace(qs ? `/admin/leads?${qs}` : "/admin/leads", {
        scroll: false,
      });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [
    queryInput,
    initialFilters.q,
    initialFilters.status,
    initialFilters.source,
    router,
  ]);

  function openNewModal() {
    setEditingLead(null);
    setFeedback(null);
    setModalOpen(true);
  }

  function openEditModal(lead: LeadWithProperty) {
    setEditingLead(lead);
    setFeedback(null);
    setModalOpen(true);
  }

  function closeModal() {
    if (isPending) return;
    setModalOpen(false);
    setEditingLead(null);
  }

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await saveLead(formData);
      if (result.ok) {
        setModalOpen(false);
        setEditingLead(null);
        setFeedback({
          type: "success",
          text: result.message ?? "Lead salvo com sucesso.",
        });
      } else {
        setFeedback({
          type: "error",
          text: result.message ?? "Não foi possível salvar o lead.",
        });
      }
    });
  }

  function handleQuickStatusChange(leadId: string, nextStatus: LeadStatus) {
    setBusyLeadId(leadId);
    setFeedback(null);
    startTransition(async () => {
      const result = await updateLeadStatus(leadId, nextStatus);
      setBusyLeadId(null);
      if (!result.ok) {
        setFeedback({
          type: "error",
          text: result.message ?? "Não foi possível atualizar o status.",
        });
      }
    });
  }

  function handleWhatsAppClick(lead: LeadWithProperty) {
    const cleanDigits = lead.phone.replace(/\D/g, "");
    const propertySnippet = lead.property
      ? ` sobre o imóvel ${lead.property.title} (Cód. #${lead.property.code})`
      : "";
    const message = `Olá ${lead.name}, aqui é o ${BROKER_INFO.brokerName} da ${BROKER_INFO.brandName}! Estou entrando em contato${propertySnippet}. Como posso ajudar?`;

    if (cleanDigits.length >= 10) {
      const url = buildWhatsAppUrl(message, cleanDigits);
      window.open(url, "_blank", "noopener,noreferrer");
    }

    setBusyLeadId(lead.id);
    startTransition(async () => {
      const result = await registerLeadWhatsAppContact(lead.id);
      setBusyLeadId(null);
      if (result.ok) {
        setFeedback({
          type: "success",
          text: result.aiPaused
            ? `Contato via WhatsApp registrado para ${lead.name} e IA pausada por 24h.`
            : `Contato via WhatsApp registrado para ${lead.name}.`,
        });
      } else {
        setFeedback({
          type: "error",
          text: result.message ?? "Erro ao atualizar data de contato.",
        });
      }
    });
  }

  function handleToggleAi(lead: LeadWithProperty, pause: boolean) {
    if (!lead.whatsappSession) return;

    setBusyLeadId(lead.id);
    setFeedback(null);
    startTransition(async () => {
      const result = await toggleLeadWhatsappAi({
        leadId: lead.id,
        pause,
      });
      setBusyLeadId(null);
      if (result.ok) {
        setFeedback({
          type: "success",
          text: pause
            ? `Assistente de IA pausado por 24h para ${lead.name}.`
            : `Assistente de IA reativado para ${lead.name}.`,
        });
      } else {
        setFeedback({
          type: "error",
          text:
            result.message ??
            (pause
              ? "Não foi possível pausar a IA."
              : "Não foi possível reativar a IA."),
        });
      }
    });
  }

  function handleDelete(lead: LeadWithProperty) {
    const confirmed = window.confirm(
      `Deseja excluir o lead "${lead.name}"? Esta ação não poderá ser desfeita.`,
    );
    if (!confirmed) return;

    setBusyLeadId(lead.id);
    startTransition(async () => {
      const result = await deleteLead(lead.id);
      setBusyLeadId(null);
      setFeedback({
        type: result.ok ? "success" : "error",
        text:
          result.message ??
          (result.ok ? "Lead excluído." : "Erro ao excluir lead."),
      });
    });
  }

  return (
    <div className="space-y-5">
      {/* Resumo / Filtros rápidos */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => navigateWithFilters({ status: "todos", page: 1 })}
          className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
            statusFilter === "todos"
              ? "border-primary bg-primary text-white"
              : "border-border bg-white text-foreground hover:bg-slate-50"
          }`}
        >
          Todos ({counts.total})
        </button>

        <button
          type="button"
          onClick={() => navigateWithFilters({ status: "alertas", page: 1 })}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
            statusFilter === "alertas"
              ? "border-amber-600 bg-amber-600 text-white"
              : counts.overdue > 0
                ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                : "border-border bg-white text-muted hover:bg-slate-50"
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Sem contato &gt; 3 dias ({counts.overdue})
        </button>

        <button
          type="button"
          onClick={() => navigateWithFilters({ status: "ativos", page: 1 })}
          className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
            statusFilter === "ativos"
              ? "border-primary bg-primary text-white"
              : "border-border bg-white text-foreground hover:bg-slate-50"
          }`}
        >
          Ativos ({counts.active})
        </button>

        {LEAD_STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => navigateWithFilters({ status: opt.value, page: 1 })}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              statusFilter === opt.value
                ? "border-primary bg-primary text-white"
                : "border-border bg-white text-muted hover:bg-slate-50 hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Barra de busca, filtro de origem e botão Novo Lead */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Buscar por nome, telefone, imóvel ou nota..."
              className="w-full rounded-lg border border-border bg-white py-2.5 pl-9 pr-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>

          <select
            aria-label="Filtrar por origem"
            value={sourceFilter}
            onChange={(e) =>
              navigateWithFilters({
                source: e.target.value as "todas" | LeadSource,
                page: 1,
              })
            }
            className="rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          >
            <option value="todas">Todas as origens</option>
            {LEAD_SOURCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={openNewModal}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          Novo Lead Manual
        </button>
      </div>

      {/* Feedback */}
      {feedback && !modalOpen ? (
        <div
          role="status"
          className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="rounded p-1 hover:bg-black/5"
            aria-label="Fechar aviso"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {/* Tabela do Mini-CRM */}
      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        {leads.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-muted">
              {counts.total === 0
                ? "Nenhum lead cadastrado ainda. Os contatos do site aparecem aqui automaticamente ou você pode cadastrar indicações manualmente."
                : "Nenhum lead encontrado com os filtros aplicados."}
            </p>
            {counts.total === 0 ? (
              <button
                type="button"
                onClick={openNewModal}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
              >
                <Plus className="h-4 w-4" />
                Cadastrar primeiro lead
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-muted">
                    <th className="px-4 py-3.5">Interessado</th>
                    <th className="px-4 py-3.5">Imóvel / Observações</th>
                    <th className="px-4 py-3.5">Origem</th>
                    <th className="px-4 py-3.5">Assistente IA</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Último Contato</th>
                    <th className="px-4 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {leads.map((lead) => (
                    <LeadTableRow
                      key={lead.id}
                      lead={lead}
                      referenceNowMs={referenceNowMs}
                      isBusy={isPending && busyLeadId === lead.id}
                      onStatusChange={handleQuickStatusChange}
                      onWhatsAppClick={handleWhatsAppClick}
                      onToggleAi={handleToggleAi}
                      onEdit={openEditModal}
                      onDelete={handleDelete}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <AdminPagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              pageSize={pagination.pageSize}
              itemLabelSingular="lead"
              itemLabelPlural="leads"
              disabled={isPending}
              onPageChange={(nextPage) =>
                navigateWithFilters({ page: nextPage })
              }
            />
          </>
        )}
      </div>

      {/* Modal Criar / Editar Lead */}
      {modalOpen ? (
        <LeadFormModal
          editingLead={editingLead}
          properties={properties}
          errorMessage={feedback?.type === "error" ? feedback.text : null}
          isPending={isPending}
          onClose={closeModal}
          onSubmit={handleSave}
        />
      ) : null}
    </div>
  );
}
