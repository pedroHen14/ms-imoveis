import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { BROKER_INFO } from "@/lib/format";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata = {
  title: "Acesso do Corretor",
  robots: { index: false, follow: false },
};

interface AdminLoginPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function AdminLoginPage({
  searchParams,
}: AdminLoginPageProps) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-admin-bg px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-4 font-serif text-2xl font-semibold text-foreground">
            Painel Administrativo
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {BROKER_INFO.brandName} — CRECI {BROKER_INFO.creci}
          </p>
        </div>

        <LoginForm nextPath={next} />

        <div className="mt-6 border-t border-border pt-5 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted transition hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar para a vitrine pública
          </Link>
        </div>
      </div>
    </main>
  );
}
