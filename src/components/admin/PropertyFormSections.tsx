"use client";

import { Bot, ChevronDown, Lock } from "lucide-react";
import type { Owner, Property } from "@/types/database";

const INPUT_CLASS =
  "mt-1.5 w-full rounded-lg border border-border px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

const SELECT_CLASS =
  "mt-1.5 w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

interface PropertyBasicSectionProps {
  property?: Property | null;
  owners: Pick<Owner, "id" | "name" | "phone">[];
}

export function PropertyBasicSection({
  property,
  owners,
}: PropertyBasicSectionProps) {
  return (
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
            className={INPUT_CLASS}
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
            className={SELECT_CLASS}
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
            className={SELECT_CLASS}
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
            className={SELECT_CLASS}
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
            className={SELECT_CLASS}
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
  );
}

export function PropertyValuesSection({
  property,
}: {
  property?: Property | null;
}) {
  return (
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
            className={INPUT_CLASS}
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
            className={INPUT_CLASS}
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
            className={INPUT_CLASS}
          />
        </div>
      </div>
    </section>
  );
}

export function PropertyFeaturesSection({
  property,
}: {
  property?: Property | null;
}) {
  return (
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
            className={INPUT_CLASS}
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
            className={INPUT_CLASS}
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
            className={INPUT_CLASS}
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
            className={INPUT_CLASS}
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
            className={INPUT_CLASS}
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
            className={INPUT_CLASS}
          />
        </div>
      </div>
    </section>
  );
}

export function PropertyLocationSection({
  property,
}: {
  property?: Property | null;
}) {
  return (
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
            className={INPUT_CLASS}
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
            className={INPUT_CLASS}
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
            className={INPUT_CLASS}
          />
        </div>

        <div className="sm:col-span-3">
          <label
            htmlFor="address"
            className="block text-sm font-medium text-foreground"
          >
            Endereço público (aproximado)
          </label>
          <input
            id="address"
            name="address"
            type="text"
            defaultValue={property?.address ?? ""}
            placeholder="Ex.: Estrada do Capuava — Condomínio Terra Nobre, Cotia/SP (evite número exato)"
            className={INPUT_CLASS}
          />
        </div>
      </div>
    </section>
  );
}

interface PropertyAiNotesSectionProps {
  defaultValue: string;
  isOpen: boolean;
  onToggle: () => void;
}

export function PropertyAiNotesSection({
  defaultValue,
  isOpen,
  onToggle,
}: PropertyAiNotesSectionProps) {
  return (
    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls="property-ai-notes-panel"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-100/70"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                Informações para o Assistente de WhatsApp (interno)
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-muted">
                <Lock className="h-3 w-3" />
                Não aparece no site
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted">
              Opcional — oriente a IA sobre negociação, financiamento, permuta e
              documentação deste imóvel.
            </p>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        id="property-ai-notes-panel"
        className={
          isOpen ? "border-t border-slate-200 px-4 pb-4 pt-3" : "hidden"
        }
      >
        <label
          htmlFor="ai_notes"
          className="block text-xs font-medium text-foreground"
        >
          Notas rápidas para o atendimento automatizado
        </label>
        <textarea
          id="ai_notes"
          name="ai_notes"
          rows={3}
          maxLength={2000}
          defaultValue={defaultValue}
          placeholder="Ex: Aceita financiamento? Aceita permuta? Posição do sol? Documentação OK?"
          className="mt-1.5 w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm leading-relaxed text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
        <p className="mt-1.5 text-[11px] text-muted">
          Não aparece no site público, mas pode ser lido pelo Assistente de
          WhatsApp ao responder clientes. Nunca informe dados pessoais do
          proprietário, senhas ou valor mínimo sigiloso neste campo.
        </p>
      </div>
    </div>
  );
}
