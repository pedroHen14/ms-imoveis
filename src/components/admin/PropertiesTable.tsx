"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  ExternalLink,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import type { Property, PropertyStatus } from "@/types/database";
import {
  formatCurrency,
  PROPERTY_PURPOSE_LABELS,
  PROPERTY_TYPE_LABELS,
} from "@/lib/format";
import { PROPERTY_STATUS_BADGES } from "@/lib/status-badges";
import {
  deleteProperty,
  quickTogglePropertyFeatured,
  quickUpdatePropertyStatus,
} from "@/app/admin/(panel)/imoveis/actions";
import { AdminPagination } from "@/components/admin/AdminPagination";

export type AdminPropertyRow = Pick<
  Property,
  | "id"
  | "code"
  | "slug"
  | "title"
  | "type"
  | "purpose"
  | "price"
  | "condominium"
  | "neighborhood"
  | "city"
  | "status"
  | "is_featured"
  | "owner_id"
  | "created_at"
> & {
  coverUrl: string | null;
  imageCount: number;
  ownerName: string | null;
};

interface PropertiesTableProps {
  properties: AdminPropertyRow[];
  hasAnyProperty: boolean;
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  initialFilters: {
    q: string;
    status: string;
    purpose: string;
  };
}

export function PropertiesTable({
  properties,
  hasAnyProperty,
  pagination,
  initialFilters,
}: PropertiesTableProps) {
  const router = useRouter();
  const [queryInput, setQueryInput] = useState(initialFilters.q);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    setQueryInput(initialFilters.q);
  }, [initialFilters.q]);

  function navigateWithFilters(next: {
    q?: string;
    status?: string;
    purpose?: string;
    page?: number;
  }) {
    const q = (next.q ?? queryInput).trim();
    const status = next.status ?? initialFilters.status;
    const purpose = next.purpose ?? initialFilters.purpose;
    const page = next.page ?? 1;

    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status && status !== "all") params.set("status", status);
    if (purpose && purpose !== "all") params.set("purpose", purpose);
    if (page > 1) params.set("page", String(page));

    const qs = params.toString();
    router.replace(qs ? `/admin/imoveis?${qs}` : "/admin/imoveis", {
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
      if (initialFilters.status && initialFilters.status !== "all") {
        params.set("status", initialFilters.status);
      }
      if (initialFilters.purpose && initialFilters.purpose !== "all") {
        params.set("purpose", initialFilters.purpose);
      }
      const qs = params.toString();
      router.replace(qs ? `/admin/imoveis?${qs}` : "/admin/imoveis", {
        scroll: false,
      });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [queryInput, initialFilters.q, initialFilters.status, initialFilters.purpose, router]);

  function handleStatusChange(id: string, nextStatus: PropertyStatus) {
    setFeedback(null);
    startTransition(async () => {
      const res = await quickUpdatePropertyStatus(id, nextStatus);
      if (!res.ok && res.message) {
        setFeedback(res.message);
      }
    });
  }

  function handleToggleFeatured(id: string, current: boolean) {
    setFeedback(null);
    startTransition(async () => {
      const res = await quickTogglePropertyFeatured(id, !current);
      if (!res.ok && res.message) {
        setFeedback(res.message);
      }
    });
  }

  function handleDelete(property: AdminPropertyRow) {
    const confirmed = window.confirm(
      `Deseja excluir permanentemente o imóvel #${property.code} ("${property.title}") e suas fotos?`,
    );
    if (!confirmed) return;

    setFeedback(null);
    startTransition(async () => {
      const res = await deleteProperty(property.id);
      if (res.message) {
        setFeedback(res.message);
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Filtros e ação */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Buscar por código, título, condomínio..."
              className="w-full rounded-lg border border-border bg-white py-2.5 pl-9 pr-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>

          <select
            value={initialFilters.status}
            onChange={(e) =>
              navigateWithFilters({ status: e.target.value, page: 1 })
            }
            aria-label="Filtrar por status"
            className="rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
          >
            <option value="all">Todos os status</option>
            <option value="disponivel">Disponível</option>
            <option value="reservado">Reservado</option>
            <option value="vendido">Vendido</option>
            <option value="alugado">Alugado</option>
            <option value="rascunho">Rascunho</option>
          </select>

          <select
            value={initialFilters.purpose}
            onChange={(e) =>
              navigateWithFilters({ purpose: e.target.value, page: 1 })
            }
            aria-label="Filtrar por finalidade"
            className="rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
          >
            <option value="all">Venda e Locação</option>
            <option value="venda">Venda</option>
            <option value="locacao">Locação</option>
          </select>
        </div>

        <Link
          href="/admin/imoveis/novo"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          Novo Imóvel
        </Link>
      </div>

      {feedback ? (
        <div
          role="status"
          className="rounded-lg border border-border bg-white px-4 py-3 text-sm text-foreground shadow-sm"
        >
          {feedback}
        </div>
      ) : null}

      {/* Tabela */}
      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        {properties.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-muted">
              {!hasAnyProperty
                ? "Nenhum imóvel cadastrado ainda."
                : "Nenhum imóvel corresponde aos filtros selecionados."}
            </p>
            {!hasAnyProperty ? (
              <Link
                href="/admin/imoveis/novo"
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
              >
                <Plus className="h-4 w-4" />
                Cadastrar primeiro imóvel
              </Link>
            ) : null}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-muted">
                    <th className="px-4 py-3.5">Imóvel</th>
                    <th className="px-3 py-3.5">Tipo / Finalidade</th>
                    <th className="px-3 py-3.5">Valor</th>
                    <th className="px-3 py-3.5">Status</th>
                    <th className="px-3 py-3.5 text-center">Destaque</th>
                    <th className="px-4 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {properties.map((property) => (
                    <tr key={property.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-slate-100">
                            {property.coverUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={property.coverUrl}
                                alt={property.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-muted">
                                <Building2 className="h-5 w-5 opacity-50" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 max-w-[240px] xl:max-w-[300px]">
                            <div className="flex items-center gap-1.5">
                              <span className="shrink-0 font-mono text-xs text-muted">
                                #{property.code}
                              </span>
                              <Link
                                href={`/admin/imoveis/${property.id}/editar`}
                                title={property.title}
                                className="truncate font-medium text-foreground hover:text-primary hover:underline"
                              >
                                {property.title}
                              </Link>
                            </div>
                            <p className="mt-0.5 truncate text-xs text-muted">
                              {[property.condominium, property.neighborhood]
                                .filter(Boolean)
                                .join(" • ") || property.city}
                              {property.ownerName
                                ? ` • Prop.: ${property.ownerName}`
                                : ""}
                              {` • ${property.imageCount} foto(s)`}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-3 py-3 text-muted">
                        {PROPERTY_TYPE_LABELS[property.type] ?? property.type} •{" "}
                        {PROPERTY_PURPOSE_LABELS[property.purpose] ??
                          property.purpose}
                      </td>

                      <td className="whitespace-nowrap px-3 py-3 font-semibold text-foreground">
                        {formatCurrency(property.price)}
                      </td>

                      <td className="whitespace-nowrap px-3 py-3">
                        <select
                          value={property.status}
                          disabled={isPending}
                          onChange={(e) =>
                            handleStatusChange(
                              property.id,
                              e.target.value as PropertyStatus,
                            )
                          }
                          aria-label={`Status do imóvel ${property.code}`}
                          className={`rounded-full border px-2.5 py-1 text-xs font-medium outline-none transition ${
                            PROPERTY_STATUS_BADGES[property.status].className
                          }`}
                        >
                          <option value="disponivel">Disponível</option>
                          <option value="reservado">Reservado</option>
                          <option value="vendido">Vendido</option>
                          <option value="alugado">Alugado</option>
                          <option value="rascunho">Rascunho</option>
                        </select>
                      </td>

                      <td className="whitespace-nowrap px-3 py-3 text-center">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            handleToggleFeatured(
                              property.id,
                              property.is_featured,
                            )
                          }
                          title={
                            property.is_featured
                              ? "Remover destaque da Home"
                              : "Marcar como destaque na Home"
                          }
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border transition hover:border-accent hover:bg-amber-50/50 disabled:opacity-50"
                        >
                          <Star
                            className={`h-4 w-4 ${
                              property.is_featured
                                ? "fill-accent text-accent"
                                : "text-slate-300"
                            }`}
                          />
                        </button>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {property.status === "disponivel" ? (
                            <Link
                              href={`/imoveis/${property.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Ver na vitrine pública"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted transition hover:border-primary/40 hover:text-primary"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          ) : null}
                          <Link
                            href={`/admin/imoveis/${property.id}/editar`}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                          </Link>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleDelete(property)}
                            title="Excluir imóvel"
                            aria-label={`Excluir imóvel ${property.code}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-red-700 transition hover:border-red-200 hover:bg-red-50 disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <AdminPagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              pageSize={pagination.pageSize}
              itemLabelSingular="imóvel"
              itemLabelPlural="imóveis"
              disabled={isPending}
              onPageChange={(nextPage) =>
                navigateWithFilters({ page: nextPage })
              }
            />
          </>
        )}
      </div>
    </div>
  );
}
