"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Loader2, Save } from "lucide-react";
import type {
  Owner,
  Property,
  PropertyPurpose,
  PropertyType,
} from "@/types/database";
import {
  parseIntField,
  parseOptionalNonNegativeDecimal,
} from "@/lib/parsers";
import { saveProperty } from "@/app/admin/(panel)/imoveis/actions";
import type { GenerateAdInput } from "@/app/admin/(panel)/imoveis/ai-actions";
import { PropertyAdFactory } from "@/components/admin/PropertyAdFactory";
import {
  PropertyAiNotesSection,
  PropertyBasicSection,
  PropertyFeaturesSection,
  PropertyLocationSection,
  PropertyValuesSection,
} from "@/components/admin/PropertyFormSections";
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
  const formRef = useRef<HTMLFormElement>(null);
  const [images, setImages] = useState<string[]>(initialImages);
  const [description, setDescription] = useState<string>(
    property?.description ?? "",
  );
  const [aiNotesOpen, setAiNotesOpen] = useState<boolean>(
    Boolean(property?.ai_notes?.trim()),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const folderKey = useMemo(() => {
    if (property?.id) return property.id;
    return `new-${Date.now().toString(36)}`;
  }, [property?.id]);

  function getFormSnapshot(): GenerateAdInput {
    const fd = formRef.current ? new FormData(formRef.current) : new FormData();
    return {
      title: fd.get("title")?.toString().trim() ?? "",
      type: (fd.get("type")?.toString() as PropertyType) || "casa",
      purpose: (fd.get("purpose")?.toString() as PropertyPurpose) || "venda",
      price: parseOptionalNonNegativeDecimal(fd.get("price")),
      condo_fee: parseOptionalNonNegativeDecimal(fd.get("condo_fee")),
      iptu: parseOptionalNonNegativeDecimal(fd.get("iptu")),
      area_total: parseOptionalNonNegativeDecimal(fd.get("area_total")),
      area_built: parseOptionalNonNegativeDecimal(fd.get("area_built")),
      bedrooms: Math.max(0, parseIntField(fd.get("bedrooms"), 0)),
      suites: Math.max(0, parseIntField(fd.get("suites"), 0)),
      bathrooms: Math.max(0, parseIntField(fd.get("bathrooms"), 0)),
      parking: Math.max(0, parseIntField(fd.get("parking"), 0)),
      condominium: fd.get("condominium")?.toString().trim() || null,
      neighborhood: fd.get("neighborhood")?.toString().trim() || null,
      city: fd.get("city")?.toString().trim() || "Cotia",
      address: fd.get("address")?.toString().trim() || null,
      notes: description.trim() || null,
    };
  }

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
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
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

      <PropertyBasicSection property={property} owners={owners} />
      <PropertyValuesSection property={property} />
      <PropertyFeaturesSection property={property} />
      <PropertyLocationSection property={property} />

      {/* Seção 5: Descrição e Fábrica de Anúncios (IA) */}
      <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-serif text-lg font-semibold text-foreground">
              5. Descrição do Imóvel
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Escreva manualmente ou use a IA abaixo para gerar textos para o
              Site, OLX e Marketplace.
            </p>
          </div>
        </div>
        <textarea
          id="description"
          name="description"
          rows={6}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descreva os diferenciais do imóvel, acabamento, lazer do condomínio e facilidades da região..."
          className="mt-4 w-full rounded-lg border border-border px-3.5 py-3 text-sm leading-relaxed text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        />

        <PropertyAdFactory
          getFormSnapshot={getFormSnapshot}
          onApplySiteDescription={(text) => setDescription(text)}
        />

        <PropertyAiNotesSection
          defaultValue={property?.ai_notes ?? ""}
          isOpen={aiNotesOpen}
          onToggle={() => setAiNotesOpen((prev) => !prev)}
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
