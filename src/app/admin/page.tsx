import { ShieldCheck } from "lucide-react";

export default function AdminDashboardPlaceholderPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-admin-bg px-6 py-16">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 text-center shadow-sm">
        <ShieldCheck className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-4 font-serif text-2xl font-semibold text-foreground">
          Painel Administrativo
        </h1>
        <p className="mt-2 text-sm text-muted">
          Rota protegida pelo middleware do Supabase Auth. O painel completo e o
          Mini-CRM serão implementados no Bloco 3.
        </p>
      </div>
    </main>
  );
}
