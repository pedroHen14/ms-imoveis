import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  MessageSquareText,
  Plus,
  Star,
  Users,
} from "lucide-react";
import { requireAdminUser } from "@/lib/admin-auth";
import {
  formatCurrency,
  PROPERTY_PURPOSE_LABELS,
  PROPERTY_TYPE_LABELS,
} from "@/lib/format";
import { PROPERTY_STATUS_BADGES } from "@/lib/status-badges";
import type { PropertyStatus } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const { supabase } = await requireAdminUser();

  const threeDaysAgoIso = new Date(
    Date.now() - 3 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [
    { count: totalProperties },
    { count: availableProperties },
    { count: featuredProperties },
    { count: totalOwners },
    { count: activeLeads },
    { count: overdueLeads },
    { data: recentProperties },
  ] = await Promise.all([
    supabase.from("properties").select("id", { count: "exact", head: true }),
    supabase
      .from("properties")
      .select("id", { count: "exact", head: true })
      .eq("status", "disponivel"),
    supabase
      .from("properties")
      .select("id", { count: "exact", head: true })
      .eq("is_featured", true)
      .eq("status", "disponivel"),
    supabase.from("owners").select("id", { count: "exact", head: true }),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .not("status", "in", "(fechado,perdido)"),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .not("status", "in", "(fechado,perdido)")
      .lt("last_contact_at", threeDaysAgoIso),
    supabase
      .from("properties")
      .select("id, code, title, type, purpose, price, condominium, status, is_featured, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted">
            Visão geral da carteira de imóveis, proprietários e interessados.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/admin/proprietarios"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-slate-50"
          >
            <Users className="h-4 w-4 text-primary" />
            Proprietários
          </Link>
          <Link
            href="/admin/imoveis/novo"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            Novo Imóvel
          </Link>
        </div>
      </div>

      {/* Cards de métricas */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted">
              Imóveis Disponíveis
            </span>
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <p className="mt-3 text-3xl font-bold text-foreground">
            {availableProperties ?? 0}
          </p>
          <p className="mt-1 text-xs text-muted">
            de {totalProperties ?? 0} cadastrados no total
          </p>
        </div>

        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted">
              Destaques na Home
            </span>
            <Star className="h-5 w-5 text-accent" />
          </div>
          <p className="mt-3 text-3xl font-bold text-foreground">
            {featuredProperties ?? 0}
          </p>
          <p className="mt-1 text-xs text-muted">
            imóveis disponíveis em evidência
          </p>
        </div>

        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted">
              Proprietários
            </span>
            <Users className="h-5 w-5 text-primary" />
          </div>
          <p className="mt-3 text-3xl font-bold text-foreground">
            {totalOwners ?? 0}
          </p>
          <p className="mt-1 text-xs text-muted">cadastro privado protegido</p>
        </div>

        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted">Leads Ativos</span>
            <MessageSquareText className="h-5 w-5 text-primary" />
          </div>
          <p className="mt-3 text-3xl font-bold text-foreground">
            {activeLeads ?? 0}
          </p>
          {(overdueLeads ?? 0) > 0 ? (
            <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              {overdueLeads} sem contato há mais de 3 dias
            </p>
          ) : (
            <p className="mt-1 text-xs text-emerald-700">
              Todos os leads em dia
            </p>
          )}
        </div>
      </section>

      {/* Últimos imóveis cadastrados */}
      <section className="rounded-xl border border-border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="font-serif text-lg font-semibold text-foreground">
              Últimos imóveis cadastrados
            </h2>
            <p className="text-xs text-muted">
              Acesso rápido para edição de dados, fotos e destaque.
            </p>
          </div>
          <Link
            href="/admin/imoveis"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Ver todos
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {!recentProperties || recentProperties.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-muted">
              Nenhum imóvel cadastrado ainda.
            </p>
            <Link
              href="/admin/imoveis/novo"
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
            >
              <Plus className="h-4 w-4" />
              Cadastrar primeiro imóvel
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-slate-50/70 text-xs font-semibold uppercase tracking-wide text-muted">
                  <th className="px-6 py-3">Cód.</th>
                  <th className="px-6 py-3">Imóvel</th>
                  <th className="px-6 py-3">Tipo / Finalidade</th>
                  <th className="px-6 py-3">Valor</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentProperties.map((property) => {
                  const statusBadge =
                    PROPERTY_STATUS_BADGES[property.status as PropertyStatus] ??
                    PROPERTY_STATUS_BADGES.disponivel;
                  return (
                    <tr key={property.id} className="hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-6 py-3.5 font-mono text-xs text-muted">
                        #{property.code}
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {property.title}
                          </span>
                          {property.is_featured ? (
                            <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                          ) : null}
                        </div>
                        {property.condominium ? (
                          <p className="text-xs text-muted">
                            {property.condominium}
                          </p>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3.5 text-muted">
                        {PROPERTY_TYPE_LABELS[property.type] ?? property.type} •{" "}
                        {PROPERTY_PURPOSE_LABELS[property.purpose] ??
                          property.purpose}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3.5 font-semibold text-foreground">
                        {formatCurrency(property.price)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3.5">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadge.className}`}
                        >
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-3.5 text-right">
                        <Link
                          href={`/admin/imoveis/${property.id}/editar`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          Editar
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
