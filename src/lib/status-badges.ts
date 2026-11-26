import type { LeadSource, LeadStatus, PropertyStatus } from "@/types/database";

export const PROPERTY_STATUS_BADGES: Record<
  PropertyStatus,
  { label: string; className: string }
> = {
  disponivel: {
    label: "Disponível",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  reservado: {
    label: "Reservado",
    className: "border-amber-200 bg-amber-50 text-amber-800",
  },
  vendido: {
    label: "Vendido",
    className: "border-slate-200 bg-slate-100 text-slate-700",
  },
  alugado: {
    label: "Alugado",
    className: "border-blue-200 bg-blue-50 text-blue-800",
  },
  rascunho: {
    label: "Rascunho",
    className: "border-stone-200 bg-stone-100 text-stone-600",
  },
};

export const LEAD_STATUS_OPTIONS: {
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

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  novo: "Novo",
  em_contato: "Em contato",
  visita: "Visita",
  proposta: "Proposta",
  fechado: "Fechado",
  perdido: "Perdido",
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  site: "Site",
  whatsapp: "WhatsApp",
  indicacao: "Indicação",
  newcore: "Newcore",
  olx: "OLX",
  marketplace: "Marketplace",
};

export const LEAD_SOURCE_OPTIONS: { value: LeadSource; label: string }[] = [
  { value: "site", label: "Site" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "indicacao", label: "Indicação" },
  { value: "newcore", label: "Newcore" },
  { value: "olx", label: "OLX" },
  { value: "marketplace", label: "Facebook Marketplace" },
];

export function getLeadStatusSelectClass(status: LeadStatus): string {
  return (
    LEAD_STATUS_OPTIONS.find((item) => item.value === status)?.className ??
    "border-border bg-white text-foreground"
  );
}
