"use client";

import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ImagePlus,
  Loader2,
  Star,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { compressImageForUpload } from "@/lib/image-compression";

const PROPERTY_BUCKET = "property-images";

interface PropertyPhotoManagerProps {
  images: string[];
  onChange: (nextImages: string[]) => void;
  folderKey: string;
}

export function PropertyPhotoManager({
  images,
  onChange,
  folderKey,
}: PropertyPhotoManagerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingStatus, setUploadingStatus] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function processAndUploadFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList).filter((file) =>
      file.type.startsWith("image/"),
    );

    if (files.length === 0) {
      setUploadError("Selecione apenas arquivos de imagem (JPG, PNG ou WebP).");
      return;
    }

    setUploadError(null);
    setUploadNotice(null);

    const supabase = createClient();
    const uploadedUrls: string[] = [];
    let totalOriginal = 0;
    let totalCompressed = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadingStatus(
          `Comprimindo e enviando foto ${i + 1} de ${files.length}...`,
        );

        const compressed = await compressImageForUpload(file);
        totalOriginal += compressed.originalSize;
        totalCompressed += compressed.compressedSize;

        const ext = compressed.file.name.split(".").pop() || "webp";
        const uniqueId =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const storagePath = `properties/${folderKey}/${uniqueId}.${ext}`;

        const { error } = await supabase.storage
          .from(PROPERTY_BUCKET)
          .upload(storagePath, compressed.file, {
            cacheControl: "31536000",
            contentType: compressed.file.type,
            upsert: false,
          });

        if (error) {
          throw new Error(
            `Erro ao enviar "${file.name}": ${error.message}`,
          );
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from(PROPERTY_BUCKET).getPublicUrl(storagePath);

        uploadedUrls.push(publicUrl);
      }

      if (uploadedUrls.length > 0) {
        onChange([...images, ...uploadedUrls]);
        const savedPct =
          totalOriginal > 0
            ? Math.max(
                0,
                Math.round((1 - totalCompressed / totalOriginal) * 100),
              )
            : 0;
        setUploadNotice(
          `${uploadedUrls.length} foto(s) enviada(s) com sucesso${
            savedPct > 0 ? ` (compressão reduziu ${savedPct}% do tamanho)` : ""
          }.`,
        );
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível enviar as fotos.";
      setUploadError(message);
    } finally {
      setUploadingStatus(null);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  function setAsCover(index: number) {
    if (index <= 0 || index >= images.length) return;
    const next = [...images];
    const [selected] = next.splice(index, 1);
    next.unshift(selected);
    onChange(next);
  }

  function moveImage(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function removeImage(index: number) {
    const next = images.filter((_, i) => i !== index);
    onChange(next);
  }

  return (
    <div className="space-y-4">
      {/* Zona de upload */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files?.length) {
            void processAndUploadFiles(e.dataTransfer.files);
          }
        }}
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border bg-slate-50/70 hover:border-primary/40"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={Boolean(uploadingStatus)}
          onChange={(e) => {
            if (e.target.files?.length) {
              void processAndUploadFiles(e.target.files);
            }
          }}
          className="hidden"
        />

        {uploadingStatus ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">
              {uploadingStatus}
            </p>
            <p className="text-xs text-muted">
              Otimizando para WebP (máx. 1600px) antes do envio...
            </p>
          </div>
        ) : (
          <>
            <UploadCloud className="h-8 w-8 text-primary" />
            <p className="mt-2 text-sm font-medium text-foreground">
              Arraste as fotos do imóvel aqui ou clique para selecionar
            </p>
            <p className="mt-1 text-xs text-muted">
              Upload múltiplo com compressão automática no navegador (JPG, PNG ou
              WebP). A primeira foto será a capa.
            </p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-hover"
            >
              <ImagePlus className="h-4 w-4" />
              Selecionar Fotos
            </button>
          </>
        )}
      </div>

      {uploadNotice ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800">
          {uploadNotice}
        </p>
      ) : null}

      {uploadError ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-800"
        >
          {uploadError}
        </p>
      ) : null}

      {/* Grade de miniaturas */}
      {images.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {images.map((url, index) => {
            const isCover = index === 0;
            return (
              <div
                key={`${url}-${index}`}
                className={`group overflow-hidden rounded-xl border bg-white shadow-sm ${
                  isCover
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border"
                }`}
              >
                <div className="relative aspect-[4/3] bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Foto ${index + 1} do imóvel`}
                    className="h-full w-full object-cover"
                  />
                  {isCover ? (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                      <Star className="h-3 w-3 fill-accent text-accent" />
                      Foto de Capa
                    </span>
                  ) : (
                    <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
                      #{index + 1}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-1 border-t border-border p-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveImage(index, -1)}
                      disabled={index === 0}
                      title="Mover para esquerda"
                      className="rounded-md border border-border p-1 text-muted transition hover:bg-slate-100 hover:text-foreground disabled:opacity-35"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveImage(index, 1)}
                      disabled={index === images.length - 1}
                      title="Mover para direita"
                      className="rounded-md border border-border p-1 text-muted transition hover:bg-slate-100 hover:text-foreground disabled:opacity-35"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {!isCover ? (
                      <button
                        type="button"
                        onClick={() => setAsCover(index)}
                        title="Definir como foto de capa"
                        className="rounded-md border border-border px-2 py-1 text-[11px] font-medium text-primary transition hover:border-primary/40 hover:bg-primary/5"
                      >
                        Capa
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      title="Remover foto"
                      className="rounded-md border border-border p-1 text-red-600 transition hover:border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted">
          Nenhuma foto adicionada ainda. Você pode enviar fotos agora ou depois
          na edição do imóvel.
        </p>
      )}
    </div>
  );
}
