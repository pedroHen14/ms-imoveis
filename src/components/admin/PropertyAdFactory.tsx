"use client";

import { useState } from "react";
import {
  AlertCircle,
  Check,
  Copy,
  FileText,
  Loader2,
  Sparkles,
} from "lucide-react";
import {
  generatePropertyAdTexts,
  type GenerateAdInput,
  type GeneratedAdTexts,
} from "@/app/admin/(panel)/imoveis/ai-actions";

interface PropertyAdFactoryProps {
  getFormSnapshot: () => GenerateAdInput;
  onApplySiteDescription: (description: string) => void;
}

type CopySlot = keyof GeneratedAdTexts;

const AD_CARDS: {
  key: CopySlot;
  title: string;
  subtitle: string;
  badge: string;
}[] = [
  {
    key: "site_description",
    title: "Descrição para o Site",
    subtitle: "Texto completo, organizado e persuasivo para a vitrine.",
    badge: "Site",
  },
  {
    key: "olx_text",
    title: "Texto para OLX",
    subtitle: "Objetivo, com bullets e principais atributos em destaque.",
    badge: "OLX",
  },
  {
    key: "marketplace_text",
    title: "Texto para Facebook Marketplace",
    subtitle: "Curto, direto e com chamada para ação no WhatsApp.",
    badge: "Marketplace",
  },
];

export function PropertyAdFactory({
  getFormSnapshot,
  onApplySiteDescription,
}: PropertyAdFactoryProps) {
  const [extraNotes, setExtraNotes] = useState("");
  const [texts, setTexts] = useState<GeneratedAdTexts | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedSlot, setCopiedSlot] = useState<CopySlot | null>(null);
  const [applied, setApplied] = useState(false);

  async function handleGenerate() {
    setError(null);
    setApplied(false);

    const snapshot = getFormSnapshot();
    if (!snapshot.title || snapshot.title.trim().length < 3) {
      setError(
        "Preencha pelo menos o Título do anúncio (seção 1) antes de gerar os textos com IA.",
      );
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generatePropertyAdTexts({
        ...snapshot,
        notes: [snapshot.notes, extraNotes.trim()].filter(Boolean).join("\n\n") || null,
      });

      if (result.ok && result.texts) {
        setTexts(result.texts);
      } else {
        setError(
          result.message ?? "Não foi possível gerar os textos com IA.",
        );
      }
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopy(slot: CopySlot, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedSlot(slot);
      window.setTimeout(() => {
        setCopiedSlot((current) => (current === slot ? null : current));
      }, 2000);
    } catch {
      setError("Não foi possível copiar automaticamente. Selecione e copie o texto manualmente.");
    }
  }

  function handleApply(value: string) {
    onApplySiteDescription(value);
    setApplied(true);
    window.setTimeout(() => setApplied(false), 2500);
  }

  return (
    <div className="mt-5 rounded-xl border border-primary/20 bg-slate-50/80 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
            <Sparkles className="h-4 w-4 text-accent" />
            Fábrica de Anúncios com IA
          </div>
          <p className="mt-0.5 text-xs text-muted">
            Usa os dados preenchidos acima para gerar automaticamente textos prontos para o Site, OLX e Facebook Marketplace.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Gerando textos...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              {texts ? "Gerar Novamente com IA" : "Gerar Textos com IA"}
            </>
          )}
        </button>
      </div>

      <div className="mt-3">
        <label
          htmlFor="ai-extra-notes"
          className="block text-xs font-medium text-foreground"
        >
          Diferenciais extras para a IA destacar (opcional)
        </label>
        <input
          id="ai-extra-notes"
          type="text"
          value={extraNotes}
          onChange={(e) => setExtraNotes(e.target.value)}
          placeholder="Ex.: Aceita financiamento, piscina aquecida, vista para área verde, portaria 24h..."
          className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </div>

      {error ? (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      ) : null}

      {texts ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {AD_CARDS.map((card) => {
            const value = texts[card.key];
            const isCopied = copiedSlot === card.key;
            const isSite = card.key === "site_description";

            return (
              <div
                key={card.key}
                className="flex flex-col rounded-xl border border-border bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      {card.badge}
                    </span>
                    <h3 className="mt-1.5 text-sm font-semibold text-foreground">
                      {card.title}
                    </h3>
                    <p className="text-xs text-muted">{card.subtitle}</p>
                  </div>
                </div>

                <textarea
                  readOnly
                  rows={8}
                  value={value}
                  aria-label={card.title}
                  className="mt-3 w-full flex-1 resize-y rounded-lg border border-border bg-slate-50/70 p-2.5 text-xs leading-relaxed text-foreground outline-none"
                />

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(card.key, value)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:text-primary"
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copiar
                      </>
                    )}
                  </button>

                  {isSite ? (
                    <button
                      type="button"
                      onClick={() => handleApply(value)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:bg-primary-hover"
                    >
                      {applied ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Aplicado!
                        </>
                      ) : (
                        <>
                          <FileText className="h-3.5 w-3.5" />
                          Usar no Site
                        </>
                      )}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
