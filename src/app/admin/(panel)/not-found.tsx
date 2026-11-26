import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";

export default function AdminPanelNotFound() {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Building2 className="h-6 w-6" />
      </div>
      <h1 className="mt-4 font-serif text-xl font-semibold text-foreground">
        Registro não encontrado
      </h1>
      <p className="mt-2 text-sm text-muted">
        O item solicitado não existe ou foi removido da sua carteira.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/admin/imoveis"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Imóveis
        </Link>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-slate-50"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
