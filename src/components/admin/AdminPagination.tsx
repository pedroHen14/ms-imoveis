"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface AdminPaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  itemLabelSingular: string;
  itemLabelPlural: string;
  onPageChange: (nextPage: number) => void;
  disabled?: boolean;
}

export function AdminPagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  itemLabelSingular,
  itemLabelPlural,
  onPageChange,
  disabled = false,
}: AdminPaginationProps) {
  if (totalItems === 0) {
    return null;
  }

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, page * pageSize);
  const label = totalItems === 1 ? itemLabelSingular : itemLabelPlural;

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border bg-slate-50/60 px-4 py-3 text-xs text-muted sm:flex-row sm:px-6">
      <p>
        Exibindo{" "}
        <strong className="font-semibold text-foreground">
          {startItem}–{endItem}
        </strong>{" "}
        de{" "}
        <strong className="font-semibold text-foreground">{totalItems}</strong>{" "}
        {label}
      </p>

      {totalPages > 1 ? (
        <nav
          aria-label="Paginação"
          className="flex items-center gap-2"
        >
          <button
            type="button"
            disabled={disabled || page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-3 py-1.5 font-medium text-foreground transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Anterior
          </button>

          <span className="px-1.5 font-medium text-foreground">
            Página {page} de {totalPages}
          </span>

          <button
            type="button"
            disabled={disabled || page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-3 py-1.5 font-medium text-foreground transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
          >
            Próxima
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </nav>
      ) : null}
    </div>
  );
}
