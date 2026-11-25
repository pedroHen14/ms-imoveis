"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Loader2, Save } from "lucide-react";
import type { Owner, Property } from "@/types/database";
import { saveProperty } from "@/app/admin/(panel)/imoveis/actions";
import { PropertyPhotoManager } from "@/components/admin/PropertyPhotoManager";

interface PropertyFormProps {
  property?: Property | null;
  initialImages?: string[];
  owners: Pick<Owner, "id" | "name" | "phone">[];
}

export function PropertyForm({
  property,
  initialImages = [],
  owners,
}: PropertyFormProps) {
  const router = useRouter();
  const [images, setImages] = useState<string[]>(initialImages);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const folderKey = useMemo(() => {
    if (property?.id) return property.id;
    return `new-${Date.now().toString(36)}`;
  }, [property?.id]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    const formData = new FormData(event.currentTarget);
    formData.set("imageUrls", JSON.stringify(images));

    startTransition(async () => {
      const result = await saveProperty(formData);
      if (result.ok) {
        router.push("/admin/imoveis");
        router.refresh();
      } else {
        setErrorMessage(
          result.message ?? "Não foi possível salvar o imóvel.",
        );
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {property?.id ? (
        <input type="hidden" name="id" value={property.id} />
      ) : null}

      {errorMessage ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      {/* Seção 1: Informações principais */}
      <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <h2 className="font-serif text-lg font-semibold text-foreground">
          1. Informações Principais
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-4">
            <label
              htmlFor="title"
              className="block text-sm font-medium text-foreground"
            >
              Título do anúncio *
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              defaultValue={property?.title ?? ""}
              placeholder="Ex.: Casa nova com 3 suítes no Condomínio Terra Nobre"
              className="mt-1.5 w-full rounded-lg border border-border px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>

          <div>
            <label
              htmlFor="type"
              className="block text-sm font-medium text-foreground"
            >
              Tipo *
            </label>
            <select
              id="type"
              name="type"
              defaultValue={property?.type ?? "casa"}
              className="mt-1.5 w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            >
              <option value="casa">Casa</option>
              <option value="apartamento">Apartamento</option>
              <option value="terreno">Terreno</option>
              <option value="comercial">Comercial</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="purpose"
              className="block text-sm font-medium text-foreground"
            >
              Finalidade *
            </label>
            <select
              id="purpose"
              name="purpose"
              defaultValue={property?.purpose ?? "venda"}
              className="mt-1.5 w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            >
              <option value="venda">Venda</option>
              <option value="locacao">Locação</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="status"
              className="block text-sm font-medium text-foreground"
            >
              Status *
            </label>
            <select
              id="status"
              name="status"
              defaultValue={property?.status ?? "disponivel"}
              className="mt-1.5 w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            >
              <option value="disponivel">Disponível (Visível no site)</option>
              <option value="rascunho">Rascunho (Oculto)</option>
              <option value="reservado">Reservado</option>
              <option value="vendido">Vendido</option>
              <option value="alugado">Alugado</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="owner_id"
              className="block text-sm font-medium text-foreground"
            >
              Proprietário (Privado)
            </label>
            <select
              id="owner_id"
              name="owner_id"
              defaultValue={property?.owner_id ?? ""}
              className="mt-1.5 w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            >
              <option value="">Sem proprietário vinculado</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2 lg:col-span-4">
            <label className="inline-flex cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                name="is_featured"
                defaultChecked={property?.is_featured ?? false}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              Exibir este imóvel em destaque na página inicial
            </label>
          </div>
        </div>
      </section>

      {/* Seção 2: Valores */}
      <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <h2 className="font-serif text-lg font-semibold text-foreground">
          2. Valores
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label
              htmlFor="price"
              className="block text-sm font-medium text-foreground"
            >
              Valor do Imóvel (R$)
            </label>
            <input
              id="price"
              name="price"
              type="text"
              inputMode="decimal"
              defaultValue={property?.price ?? ""}
              placeholder="Ex.: 650000"
              className="mt-1.5 w-full rounded-lg border border-border px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>

          <div>
            <label
              htmlFor="condo_fee"
              className="block text-sm font-medium text-foreground"
            >
              Condomínio mensal (R$)
            </label>
            <input
              id="condo_fee"
              name="condo_fee"
              type="text"
              inputMode="decimal"
              defaultValue={property?.condo_fee ?? ""}
              placeholder="Ex.: 550"
              className="mt-1.5 w-full rounded-lg border border-border px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>

          <div>
            <label
              htmlFor="iptu"
              className="block text-sm font-medium text-foreground"
            >
              IPTU mensal (R$)
            </label>
            <input
              id="iptu"
              name="iptu"
              type="text"
              inputMode="decimal"
              defaultValue={property?.iptu ?? ""}
              placeholder="Ex.: 180"
              className="mt-1.5 w-full rounded-lg border border-border px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>
        </div>
      </section>

      {/* Seção 3: Características */}
      <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <h2 className="font-serif text-lg font-semibold text-foreground">
          3. Características
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div>
            <label
              htmlFor="area_total"
              className="block text-sm font-medium text-foreground"
            >
              Área total (m²)
            </label>
            <input
              id="area_total"
              name="area_total"
              type="text"
              inputMode="decimal"
              defaultValue={property?.area_total ?? ""}
              placeholder="250"
              className="mt-1.5 w-full rounded-lg border border-border px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>

          <div>
            <label
              htmlFor="area_built"
              className="block text-sm font-medium text-foreground"
            >
              Área útil (m²)
            </label>
            <input
              id="area_built"
              name="area_built"
              type="text"
              inputMode="decimal"
              defaultValue={property?.area_built ?? ""}
              placeholder="165"
              className="mt-1.5 w-full rounded-lg border border-border px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>

          <div>
            <label
              htmlFor="bedrooms"
              className="block text-sm font-medium text-foreground"
            >
              Quartos
            </label>
            <input
              id="bedrooms"
              name="bedrooms"
              type="number"
              min={0}
              defaultValue={property?.bedrooms ?? 0}
              className="mt-1.5 w-full rounded-lg border border-border px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>

          <div>
            <label
              htmlFor="suites"
              className="block text-sm font-medium text-foreground"
            >
              Suítes
            </label>
            <input
              id="suites"
              name="suites"
              type="number"
              min={0}
              defaultValue={property?.suites ?? 0}
              className="mt-1.5 w-full rounded-lg border border-border px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>

          <div>
            <label
              htmlFor="bathrooms"
              className="block text-sm font-medium text-foreground"
            >
              Banheiros
            </label>
            <input
              id="bathrooms"
              name="bathrooms"
              type="number"
              min={0}
              defaultValue={property?.bathrooms ?? 0}
              className="mt-1.5 w-full rounded-lg border border-border px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>

          <div>
            <label
              htmlFor="parking"
              className="block text-sm font-medium text-foreground"
            >
              Vagas
            </label>
            <input
              id="parking"
              name="parking"
              type="number"
              min={0}
              defaultValue={property?.parking ?? 0}
              className="mt-1.5 w-full rounded-lg border border-border px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>
        </div>
      </section>

      {/* Seção 4: Localização */}
      <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <h2 className="font-serif text-lg font-semibold text-foreground">
          4. Localização
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label
              htmlFor="condominium"
              className="block text-sm font-medium text-foreground"
            >
              Condomínio
            </label>
            <input
              id="condominium"
              name="condominium"
              type="text"
              defaultValue={property?.condominium ?? ""}
              placeholder="Ex.: Condomínio Terra Nobre"
              className="mt-1.5 w-full rounded-lg border border-border px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>

          <div>
            <label
              htmlFor="neighborhood"
              className="block text-sm font-medium text-foreground"
            >
              Bairro / Região
            </label>
            <input
              id="neighborhood"
              name="neighborhood"
              type="text"
              defaultValue={property?.neighborhood ?? ""}
              placeholder="Ex.: Granja Vianna"
              className="mt-1.5 w-full rounded-lg border border-border px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>

          <div>
            <label
              htmlFor="city"
              className="block text-sm font-medium text-foreground"
            >
              Cidade *
            </label>
            <input
              id="city"
              name="city"
              type="text"
              required
              defaultValue={property?.city ?? "Cotia"}
              className="mt-1.5 w-full rounded-lg border border-border px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>

          <div className="sm:col-span-3">
            <label
              htmlFor="address"
              className="block text-sm font-medium text-foreground"
            >
              Endereço público
            </label>
            <input
              id="address"
              name="address"
              type="text"
              defaultValue={property?.address ?? ""}
              placeholder="Ex.: Estrada do Capuava, 1200 — Cotia/SP"
              className="mt-1.5 w-full rounded-lg border border-border px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>
        </div>
      </section>

      {/* Seção 5: Descrição */}
      <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-serif text-lg font-semibold text-foreground">
            5. Descrição do Imóvel
          </h2>
          <span className="text-xs text-muted">
            Geração de textos com IA (Site, OLX e Marketplace) chegará no Bloco 4.
          </span>
        </div>
        <textarea
          id="description"
          name="description"
          rows={6}
          defaultValue={property?.description ?? ""}
          placeholder="Descreva os diferenciais do imóvel, acabamento, lazer do condomínio e facilidades da região..."
          className="mt-4 w-full rounded-lg border border-border px-3.5 py-3 text-sm leading-relaxed text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </section>

      {/* Seção 6: Fotos */}
      <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <h2 className="font-serif text-lg font-semibold text-foreground">
          6. Fotos do Imóvel
        </h2>
        <p className="mt-1 text-xs text-muted">
          As imagens são comprimidas automaticamente antes de subir ao Supabase
          Storage. Escolha a foto de capa e reordene como preferir.
        </p>
        <div className="mt-4">
          <PropertyPhotoManager
            images={images}
            onChange={setImages}
            folderKey={folderKey}
          />
        </div>
      </section>

      {/* Ações finais */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/admin/imoveis"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Imóveis
        </Link>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando imóvel...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {property ? "Salvar Alterações" : "Cadastrar Imóvel"}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
