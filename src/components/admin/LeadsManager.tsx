"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  Building2,
  Clock,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { Lead, LeadSource, LeadStatus } from "@/types/database";
import {
  BROKER_INFO,
  buildWhatsAppUrl,
  formatPhoneBR,
} from "@/lib/format";
import {
  deleteLead,
  registerLeadWhatsAppContact,
  saveLead,
  updateLeadStatus,
} from "@/app/admin/(panel)/leads/actions";

export interface LeadPropertyRef {
  id: string;
  code: number;
  title: string;
  condominium: string | null;
}

export interface LeadWithProperty extends Lead {
  property: LeadPropertyRef | null;
}

interface LeadsManagerProps {
  leads: LeadWithProperty[];
  properties: LeadPropertyRef[];
}

const LEAD_STATUS_OPTIONS: {
  value: LeadStatus;
  label: string;
  className: string;
}[] = [
  {
    value: "novo",
    label: "Novo",
    className: "border-blue-200 bg-blue-50 text-blue-800",
  },
  {
    value: "em_contato",
    label: "Em contato",
    className: "border-amber-200 bg-amber-50 text-amber-800",
  },
  {
    value: "visita",
    label: "Visita",
    className: "border-purple-200 bg-purple-50 text-purple-800",
  },
  {
    value: "proposta",
    label: "Proposta",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  {
    value: "fechado",
    label: "Fechado",
    className: "border-primary/30 bg-primary/10 text-primary",
  },
  {
    value: "perdido",
    label: "Perdido",
    className: "border-stone-200 bg-stone-100 text-stone-600",
  },
];

const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  site: "Site",
  whatsapp: "WhatsApp",
  indicacao: "Indicação",
  newcore: "Newcore",
  olx: "OLX",
  marketplace: "Marketplace",
};

const LEAD_SOURCE_OPTIONS: { value: LeadSource; label: string }[] = [
  { value: "site", label: "Site" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "indicacao", label: "Indicação" },
  { value: "newcore", label: "Newcore" },
  { value: "olx", label: "OLX" },
  { value: "marketplace", label: "Facebook Marketplace" },
];

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

function isLeadActive(status: LeadStatus): boolean {
  return status !== "fechado" && status !== "perdido";
}

function getDaysSince(isoDate: string): number {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
}

function isLeadOverdue(lead: Lead): boolean {
  if (!isLeadActive(lead.status)) return false;
  return Date.now() - new Date(lead.last_contact_at).getTime() > THREE_DAYS_MS;
}

function formatLastContact(isoDate: string): string {
  const days = getDaysSince(isoDate);
  if (days === 0) return "Hoje";
  if (days === 1) return "Ontem";
  return `Há ${days} dias`;
}

function getStatusSelectClass(status: LeadStatus): string {
  return (
    LEAD_STATUS_OPTIONS.find((item) => item.value === status)?.className ??
    "border-border bg-white text-foreground"
  );
}

export function LeadsManager({ leads, properties }: LeadsManagerProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "todos" | "alertas" | "ativos" | LeadStatus
  >("todos");
  const [sourceFilter, setSourceFilter] = useState<"todas" | LeadSource>(
    "todas",
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<LeadWithProperty | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [busyLeadId, setBusyLeadId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const counts = useMemo(() => {
    let overdue = 0;
    let active = 0;
    for (const lead of leads) {
      if (isLeadActive(lead.status)) {
        active += 1;
        if (isLeadOverdue(lead)) overdue += 1;
      }
    }
    return { total: leads.length, active, overdue };
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((lead) => {
      if (statusFilter === "alertas" && !isLeadOverdue(lead)) return false;
      if (statusFilter === "ativos" && !isLeadActive(lead.status)) return false;
      if (
        statusFilter !== "todos" &&
        statusFilter !== "alertas" &&
        statusFilter !== "ativos" &&
        lead.status !== statusFilter
      ) {
        return false;
      }

      if (sourceFilter !== "todas" && lead.source !== sourceFilter) {
        return false;
      }

      if (!q) return true;
      return (
        lead.name.toLowerCase().includes(q) ||
        lead.phone.toLowerCase().includes(q) ||
        (lead.email ?? "").toLowerCase().includes(q) ||
        (lead.notes ?? "").toLowerCase().includes(q) ||
        (lead.property?.title ?? "").toLowerCase().includes(q) ||
        (lead.property ? `#${lead.property.code}` : "").includes(q)
      );
    });
  }, [leads, query, statusFilter, sourceFilter]);

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
          text: `Contato via WhatsApp registrado para ${lead.name}.`,
        });
      } else {
        setFeedback({
          type: "error",
          text: result.message ?? "Erro ao atualizar data de contato.",
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
          onClick={() => setStatusFilter("todos")}
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
          onClick={() => setStatusFilter("alertas")}
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
          onClick={() => setStatusFilter("ativos")}
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
            onClick={() => setStatusFilter(opt.value)}
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
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome, telefone, imóvel ou nota..."
              className="w-full rounded-lg border border-border bg-white py-2.5 pl-9 pr-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>

          <select
            aria-label="Filtrar por origem"
            value={sourceFilter}
            onChange={(e) =>
              setSourceFilter(e.target.value as "todas" | LeadSource)
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
        {filteredLeads.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-muted">
              {leads.length === 0
                ? "Nenhum lead cadastrado ainda. Os contatos do site aparecem aqui automaticamente ou você pode cadastrar indicações manualmente."
                : "Nenhum lead encontrado com os filtros aplicados."}
            </p>
            {leads.length === 0 ? (
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-muted">
                  <th className="px-5 py-3.5">Interessado</th>
                  <th className="px-5 py-3.5">Imóvel / Observações</th>
                  <th className="px-5 py-3.5">Origem</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Último Contato</th>
                  <th className="px-5 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLeads.map((lead) => {
                  const overdue = isLeadOverdue(lead);
                  const daysSince = getDaysSince(lead.last_contact_at);
                  const isRowBusy = isPending && busyLeadId === lead.id;

                  return (
                    <tr
                      key={lead.id}
                      className={`transition hover:bg-slate-50/70 ${
                        overdue ? "bg-amber-50/35" : ""
                      }`}
                    >
                      <td className="px-5 py-4 align-top">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-foreground">
                            {lead.name}
                          </span>
                          {overdue ? (
                            <span
                              title="Lead ativo sem contato há mais de 3 dias"
                              className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900"
                            >
                              <AlertTriangle className="h-3 w-3" />
                              Follow-up ({daysSince}d)
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-xs text-foreground">
                          {formatPhoneBR(lead.phone)}
                        </p>
                        {lead.email ? (
                          <p className="text-xs text-muted">{lead.email}</p>
                        ) : null}
                      </td>

                      <td className="max-w-xs px-5 py-4 align-top">
                        {lead.property ? (
                          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                            <Building2 className="h-3.5 w-3.5 shrink-0" />
                            <span className="line-clamp-1">
                              #{lead.property.code} — {lead.property.title}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted">
                            Interesse geral
                          </span>
                        )}
                        {lead.notes ? (
                          <p className="mt-1 line-clamp-2 text-xs text-muted">
                            {lead.notes}
                          </p>
                        ) : null}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 align-top">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-foreground">
                          {LEAD_SOURCE_LABELS[lead.source] ?? lead.source}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 align-top">
                        <select
                          aria-label={`Status do lead ${lead.name}`}
                          value={lead.status}
                          disabled={isRowBusy}
                          onChange={(e) =>
                            handleQuickStatusChange(
                              lead.id,
                              e.target.value as LeadStatus,
                            )
                          }
                          className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold outline-none transition focus:ring-2 focus:ring-primary/20 disabled:opacity-60 ${getStatusSelectClass(lead.status)}`}
                        >
                          {LEAD_STATUS_OPTIONS.map((opt) => (
                            <option
                              key={opt.value}
                              value={opt.value}
                              className="bg-white text-foreground"
                            >
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 align-top">
                        <div
                          className={`inline-flex items-center gap-1 text-xs font-medium ${
                            overdue ? "text-amber-800" : "text-muted"
                          }`}
                        >
                          <Clock className="h-3.5 w-3.5" />
                          {formatLastContact(lead.last_contact_at)}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right align-top">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleWhatsAppClick(lead)}
                            disabled={isRowBusy}
                            title="Abrir conversa no WhatsApp e registrar contato agora"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-whatsapp px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-whatsapp-hover disabled:opacity-60"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            Chamar no WhatsApp
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(lead)}
                            title="Editar lead"
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(lead)}
                            disabled={isRowBusy}
                            title="Excluir lead"
                            className="inline-flex items-center rounded-lg border border-border p-1.5 text-red-700 transition hover:border-red-200 hover:bg-red-50 disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Criar / Editar Lead */}
      {modalOpen ? (
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
                onClick={closeModal}
                className="rounded-lg p-1.5 text-muted hover:bg-slate-100"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-5 space-y-4">
              {editingLead ? (
                <input type="hidden" name="id" value={editingLead.id} />
              ) : null}

              {feedback?.type === "error" ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
                  {feedback.text}
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
                    defaultValue={editingLead?.phone ?? ""}
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
                    defaultValue={editingLead?.notes ?? ""}
                    placeholder="Ex.: Indicação da Newcore, busca casa até R$ 650 mil em Cotia com financiamento..."
                    className="mt-1.5 w-full rounded-lg border border-border px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={closeModal}
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
      ) : null}
    </div>
  );
}
