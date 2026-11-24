"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Expand,
  X,
} from "lucide-react";
import type { PropertyImage } from "@/types/database";

interface PropertyGalleryProps {
  images: PropertyImage[];
  title: string;
}

export function PropertyGallery({ images, title }: PropertyGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const total = images.length;

  const goPrev = useCallback(() => {
    setActiveIndex((prev) => (prev === 0 ? total - 1 : prev - 1));
  }, [total]);

  const goNext = useCallback(() => {
    setActiveIndex((prev) => (prev === total - 1 ? 0 : prev + 1));
  }, [total]);

  useEffect(() => {
    if (!lightboxOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setLightboxOpen(false);
      if (event.key === "ArrowLeft" && total > 1) goPrev();
      if (event.key === "ArrowRight" && total > 1) goNext();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, total, goPrev, goNext]);

  if (total === 0) {
    return (
      <div className="flex aspect-[16/10] w-full flex-col items-center justify-center rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-surface to-accent/15 text-primary/50">
        <Building2 className="h-12 w-12" />
        <p className="mt-3 text-sm font-medium">
          Fotos deste imóvel em atualização
        </p>
      </div>
    );
  }

  const currentImage = images[activeIndex] ?? images[0];

  return (
    <>
      <div className="space-y-3">
        {/* Imagem Principal */}
        <div className="group relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-border bg-foreground/5">
          <Image
            src={currentImage.url}
            alt={`${title} — foto ${activeIndex + 1} de ${total}`}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 66vw"
            className="cursor-zoom-in object-cover transition-transform duration-300"
            onClick={() => setLightboxOpen(true)}
          />

          {/* Contador + Botão Expandir */}
          <div className="absolute bottom-3 left-3 rounded-lg bg-foreground/75 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {activeIndex + 1} / {total}
          </div>

          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            aria-label="Ampliar foto"
            className="absolute bottom-3 right-3 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-surface/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-surface"
          >
            <Expand className="h-3.5 w-3.5" />
            <span>Ampliar</span>
          </button>

          {/* Setas de Navegação */}
          {total > 1 && (
            <>
              <button
                type="button"
                onClick={goPrev}
                aria-label="Foto anterior"
                className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-surface/90 text-foreground shadow-md backdrop-blur-sm transition-all hover:bg-surface"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Próxima foto"
                className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-surface/90 text-foreground shadow-md backdrop-blur-sm transition-all hover:bg-surface"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        {/* Miniaturas */}
        {total > 1 && (
          <div className="flex gap-2.5 overflow-x-auto pb-1">
            {images.map((img, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  aria-label={`Ver foto ${idx + 1}`}
                  className={`relative h-16 w-24 shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 transition-all sm:h-20 sm:w-28 ${
                    isSelected
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-transparent opacity-75 hover:opacity-100"
                  }`}
                >
                  <Image
                    src={img.url}
                    alt={`${title} miniatura ${idx + 1}`}
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Galeria de fotos ampliada"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Fechar galeria"
            className="absolute right-4 top-4 z-10 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
          >
            <X className="h-6 w-6" />
          </button>

          <div
            className="relative flex h-full max-h-[85vh] w-full max-w-5xl items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={currentImage.url}
              alt={`${title} — foto ampliada ${activeIndex + 1}`}
              fill
              sizes="100vw"
              className="object-contain"
            />

            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="Foto anterior"
                  className="absolute left-2 top-1/2 flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/30"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  aria-label="Próxima foto"
                  className="absolute right-2 top-1/2 flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/30"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-4 py-1.5 text-xs font-medium text-white">
              Foto {activeIndex + 1} de {total}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
