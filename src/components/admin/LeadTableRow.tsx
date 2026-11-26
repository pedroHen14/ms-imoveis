"use client";

import {
  AlertTriangle,
  Bot,
  BotOff,
  Building2,
  Clock,
  Loader2,
  MessageCircle,
  PauseCircle,
  Pencil,
  PlayCircle,
  Trash2,
} from "lucide-react";
import type { Lead, LeadStatus } from "@/types/database";
import { formatPhoneBR, formatShortDateTimeBR } from "@/lib/format";
import {
  getLeadStatusSelectClass,
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_OPTIONS,
} from "@/lib/status-badges";
import type {
  LeadWhatsappSession,
  LeadWithProperty,
} from "@/components/admin/LeadsManager";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

function isLeadActive(status: LeadStatus): boolean {
  return status !== "fechado" && status !== "perdido";
}

function getDaysSince(isoDate: string, referenceNowMs: number): number {
  const diffMs = referenceNowMs - new Date(isoDate).getTime();
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
}

function isLeadOverdue(lead: Lead, referenceNowMs: number): boolean {
  if (!isLeadActive(lead.status)) return false;
  return referenceNowMs - new Date(lead.last_contact_at).getTime() > THREE_DAYS_MS;
}

function formatLastContact(isoDate: string, referenceNowMs: number): string {
  const days = getDaysSince(isoDate, referenceNowMs);
  if (days === 0) return "Hoje";
  if (days === 1) return "Ontem";
  return `Há ${days} dias`;
}

function isWhatsappBotPaused(
  session: LeadWhatsappSession | null,
  referenceNowMs: number,
): boolean {
  if (!session?.bot_paused_until) return false;
  const pausedUntilMs = new Date(session.bot_paused_until).getTime();
  return !Number.isNaN(pausedUntilMs) && pausedUntilMs > referenceNowMs;
}

interface LeadTableRowProps {
  lead: LeadWithProperty;
  referenceNowMs: number;
  isBusy: boolean;
  onStatusChange: (leadId: string, nextStatus: LeadStatus) => void;
  onWhatsAppClick: (lead: LeadWithProperty) => void;
  onToggleAi: (lead: LeadWithProperty, pause: boolean) => void;
  onEdit: (lead: LeadWithProperty) => void;
  onDelete: (lead: LeadWithProperty) => void;
}

export function LeadTableRow({
  lead,
  referenceNowMs,
  isBusy,
  onStatusChange,
  onWhatsAppClick,
  onToggleAi,
  onEdit,
  onDelete,
}: LeadTableRowProps) {
  const overdue = isLeadOverdue(lead, referenceNowMs);
  const daysSince = getDaysSince(lead.last_contact_at, referenceNowMs);
  const hasSession = Boolean(lead.whatsappSession);
  const botPaused = isWhatsappBotPaused(lead.whatsappSession, referenceNowMs);
  const pausedUntilLabel =
    botPaused && lead.whatsappSession?.bot_paused_until
      ? formatShortDateTimeBR(lead.whatsappSession.bot_paused_until)
      : "";

  return (
    <tr
      className={`transition hover:bg-slate-50/70 ${
        overdue ? "bg-amber-50/35" : ""
      }`}
    >
      <td className="px-4 py-4 align-top">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-foreground">{lead.name}</span>
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

      <td className="max-w-xs px-4 py-4 align-top">
        {lead.property ? (
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-1">
              #{lead.property.code} — {lead.property.title}
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted">Interesse geral</span>
        )}
        {lead.notes ? (
          <p className="mt-1 line-clamp-2 text-xs text-muted">{lead.notes}</p>
        ) : null}
      </td>

      <td className="whitespace-nowrap px-4 py-4 align-top">
        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-foreground">
          {LEAD_SOURCE_LABELS[lead.source] ?? lead.source}
        </span>
      </td>

      <td className="whitespace-nowrap px-4 py-4 align-top">
        {hasSession ? (
          <div className="flex flex-col items-start gap-1.5">
            {botPaused ? (
              <span
                title={`Atendimento automatizado pausado até ${pausedUntilLabel}`}
                className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900"
              >
                <BotOff className="h-3 w-3 shrink-0" />
                IA Pausada até {pausedUntilLabel}
              </span>
            ) : (
              <span
                title="Assistente de WhatsApp respondendo este contato normalmente"
                className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800"
              >
                <Bot className="h-3 w-3 shrink-0" />
                IA Ativa
              </span>
            )}

            <button
              type="button"
              disabled={isBusy}
              onClick={() => onToggleAi(lead, !botPaused)}
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition disabled:opacity-60 ${
                botPaused
                  ? "border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50"
                  : "border-amber-200 bg-white text-amber-900 hover:bg-amber-50"
              }`}
            >
              {isBusy ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : botPaused ? (
                <PlayCircle className="h-3 w-3" />
              ) : (
                <PauseCircle className="h-3 w-3" />
              )}
              {botPaused ? "Reativar IA" : "Pausar IA (24h)"}
            </button>
          </div>
        ) : (
          <span className="text-xs text-muted">—</span>
        )}
      </td>

      <td className="whitespace-nowrap px-4 py-4 align-top">
        <select
          aria-label={`Status do lead ${lead.name}`}
          value={lead.status}
          disabled={isBusy}
          onChange={(e) =>
            onStatusChange(lead.id, e.target.value as LeadStatus)
          }
          className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold outline-none transition focus:ring-2 focus:ring-primary/20 disabled:opacity-60 ${getLeadStatusSelectClass(lead.status)}`}
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

      <td className="whitespace-nowrap px-4 py-4 align-top">
        <div
          className={`inline-flex items-center gap-1 text-xs font-medium ${
            overdue ? "text-amber-800" : "text-muted"
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          {formatLastContact(lead.last_contact_at, referenceNowMs)}
        </div>
      </td>

      <td className="whitespace-nowrap px-4 py-4 text-right align-top">
        <div className="inline-flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onWhatsAppClick(lead)}
            disabled={isBusy}
            title={
              hasSession
                ? "Abrir conversa no WhatsApp, registrar contato e pausar IA por 24h"
                : "Abrir conversa no WhatsApp e registrar contato agora"
            }
            className="inline-flex items-center gap-1.5 rounded-lg bg-whatsapp px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-whatsapp-hover disabled:opacity-60"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Chamar no WhatsApp
          </button>

          <button
            type="button"
            onClick={() => onEdit(lead)}
            title="Editar lead"
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </button>

          <button
            type="button"
            onClick={() => onDelete(lead)}
            disabled={isBusy}
            title="Excluir lead"
            className="inline-flex items-center rounded-lg border border-border p-1.5 text-red-700 transition hover:border-red-200 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}
