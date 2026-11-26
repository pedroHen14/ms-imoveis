import Link from "next/link";
import { Building2, Home, Search } from "lucide-react";

export default function GlobalNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-8 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Building2 className="h-7 w-7" />
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-accent">
          Erro 404
        </p>
        <h1 className="mt-1 font-serif text-2xl font-semibold text-primary sm:text-3xl">
          Página não encontrada
        </h1>
        <p className="mt-2 text-sm text-muted">
          O endereço que você procurou pode ter sido movido ou não está mais
          disponível.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover"
          >
            <Home className="h-4 w-4" />
            Ir para o início
          </Link>
          <Link
            href="/imoveis"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-5 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:text-primary"
          >
            <Search className="h-4 w-4" />
            Ver imóveis disponíveis
          </Link>
        </div>
      </div>
    </main>
  );
}
