import { MessageSquareText } from "lucide-react";
import { requireAdminUser } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminLeadsPlaceholderPage() {
  const { supabase } = await requireAdminUser();
  const { count } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground sm:text-3xl">
          Leads (Mini-CRM)
        </h1>
        <p className="mt-1 text-sm text-muted">
          Acompanhamento de interessados captados pelo site, WhatsApp e indicações.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-white p-10 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <MessageSquareText className="h-6 w-6" />
        </div>
        <h2 className="mt-4 font-serif text-xl font-semibold text-foreground">
          Mini-CRM em preparação (Bloco 4)
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Você já possui <strong>{count ?? 0}</strong> lead(s) salvo(s) no banco.
          No Bloco 4 adicionaremos a gestão completa de status, alerta de
          follow-up (&gt;3 dias) e botão de 1 clique para chamar no WhatsApp.
        </p>
      </div>
    </div>
  );
}
