import { requireAdminUser } from "@/lib/admin-auth";
import { PropertyForm } from "@/components/admin/PropertyForm";

export const dynamic = "force-dynamic";

export default async function NewPropertyPage() {
  const { supabase } = await requireAdminUser();

  const { data: owners } = await supabase
    .from("owners")
    .select("id, name, phone")
    .order("name", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground sm:text-3xl">
          Cadastrar Novo Imóvel
        </h1>
        <p className="mt-1 text-sm text-muted">
          Preencha os dados do imóvel e envie as fotos. O link SEO (slug) será
          gerado automaticamente.
        </p>
      </div>

      <PropertyForm owners={owners ?? []} />
    </div>
  );
}
