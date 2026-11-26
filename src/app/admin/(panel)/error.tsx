"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, LayoutDashboard, RefreshCw } from "lucide-react";

interface AdminErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminPanelError({ error, reset }: AdminErrorProps) {
  useEffect(() => {
    console.error("[AdminPanelError]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-700">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h1 className="mt-4 font-serif text-xl font-semibold text-foreground">
        Erro ao carregar esta seção do painel
      </h1>
      <p className="mt-2 text-sm text-muted">
        Não foi possível consultar os dados no momento. Tente recarregar ou
        volte para o dashboard.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
        >
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </button>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-slate-50"
        >
          <LayoutDashboard className="h-4 w-4" />
          Ir para o Dashboard
        </Link>
      </div>
    </div>
  );
}
