import { Lock } from "lucide-react";
import { BROKER_INFO } from "@/lib/format";

export default function AdminLoginPlaceholderPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-admin-bg px-6 py-16">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 text-center shadow-sm">
        <Lock className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-4 font-serif text-2xl font-semibold text-foreground">
          Acesso do Corretor
        </h1>
        <p className="mt-2 text-sm text-muted">
          {BROKER_INFO.brandName} — CRECI {BROKER_INFO.creci}
        </p>
        <p className="mt-4 text-xs text-muted">
          A tela de autenticação com Supabase Auth será construída no Bloco 3.
        </p>
      </div>
    </main>
  );
}
