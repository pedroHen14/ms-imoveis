export interface CompressedImageResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
}

const MAX_WIDTH = 1600;
const MAX_HEIGHT = 1600;
const OUTPUT_QUALITY = 0.82;

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Não foi possível ler a imagem "${file.name}".`));
    };
    img.src = objectUrl;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

/**
 * Comprime e redimensiona uma imagem no navegador antes do upload para o Supabase Storage.
 * Largura/altura máxima: 1600px. Formato preferencial: WebP (fallback JPEG).
 */
export async function compressImageForUpload(
  file: File,
): Promise<CompressedImageResult> {
  const img = await loadImageElement(file);

  let targetWidth = img.naturalWidth || img.width;
  let targetHeight = img.naturalHeight || img.height;

  if (targetWidth > MAX_WIDTH || targetHeight > MAX_HEIGHT) {
    const ratio = Math.min(MAX_WIDTH / targetWidth, MAX_HEIGHT / targetHeight);
    targetWidth = Math.max(1, Math.round(targetWidth * ratio));
    targetHeight = Math.max(1, Math.round(targetHeight * ratio));
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Contexto gráfico indisponível no navegador.");
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  let blob = await canvasToBlob(canvas, "image/webp", OUTPUT_QUALITY);
  let extension = "webp";
  let mimeType = "image/webp";

  if (!blob || blob.type !== "image/webp") {
    blob = await canvasToBlob(canvas, "image/jpeg", OUTPUT_QUALITY);
    extension = "jpg";
    mimeType = "image/jpeg";
  }

  if (!blob) {
    throw new Error(`Falha ao comprimir a imagem "${file.name}".`);
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "imovel";
  const compressedFile = new File([blob], `${baseName}.${extension}`, {
    type: mimeType,
    lastModified: Date.now(),
  });

  return {
    file: compressedFile,
    originalSize: file.size,
    compressedSize: compressedFile.size,
    width: targetWidth,
    height: targetHeight,
  };
}
