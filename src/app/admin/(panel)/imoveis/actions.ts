"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminUserForAction } from "@/lib/admin-auth";
import { buildPropertySlug } from "@/lib/format";
import type { PropertyStatus } from "@/types/database";

const PROPERTY_BUCKET = "property-images";

function parseOptionalNumber(raw: FormDataEntryValue | null): number | null {
  if (raw === null) return null;
  const text = raw.toString().trim();
  if (!text) return null;
  // Suporta formato pt-BR (ex: "450.000,00" ou "450000")
  const normalized =
    text.includes(",") && text.includes(".")
      ? text.replace(/\./g, "").replace(",", ".")
      : text.includes(",")
        ? text.replace(",", ".")
        : text;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : Number.NaN;
}

function parseIntField(raw: FormDataEntryValue | null): number {
  if (raw === null) return 0;
  const text = raw.toString().trim();
  if (!text) return 0;
  const num = Number.parseInt(text, 10);
  return Number.isFinite(num) ? num : -1;
}

function extractStoragePathFromPublicUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${PROPERTY_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
}

const propertySchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  title: z
    .string()
    .trim()
    .min(4, "Informe um título com pelo menos 4 caracteres.")
    .max(160, "Título muito longo."),
  type: z.enum(["casa", "apartamento", "terreno", "comercial"]),
  purpose: z.enum(["venda", "locacao"]),
  status: z.enum(["disponivel", "reservado", "vendido", "alugado", "rascunho"]),
  is_featured: z.boolean(),
  owner_id: z.string().uuid().nullable(),
  price: z.number().min(0, "O valor não pode ser negativo.").nullable(),
  condo_fee: z.number().min(0, "O condomínio não pode ser negativo.").nullable(),
  iptu: z.number().min(0, "O IPTU não pode ser negativo.").nullable(),
  area_total: z.number().min(0, "A área total não pode ser negativa.").nullable(),
  area_built: z
    .number()
    .min(0, "A área construída não pode ser negativa.")
    .nullable(),
  bedrooms: z.number().int().min(0),
  suites: z.number().int().min(0),
  bathrooms: z.number().int().min(0),
  parking: z.number().int().min(0),
  condominium: z.string().trim().max(120).nullable(),
  neighborhood: z.string().trim().max(120).nullable(),
  city: z.string().trim().min(2, "Informe a cidade.").max(80),
  address: z.string().trim().max(240).nullable(),
  description: z.string().trim().max(6000).nullable(),
  imageUrls: z.array(z.string().url()).max(40),
});

export interface PropertyActionResult {
  ok: boolean;
  message?: string;
  propertyId?: string;
}

function revalidatePropertyPaths(slug?: string | null) {
  revalidatePath("/");
  revalidatePath("/imoveis");
  revalidatePath("/sitemap.xml");
  if (slug) {
    revalidatePath(`/imoveis/${slug}`);
  }
  revalidatePath("/admin");
  revalidatePath("/admin/imoveis");
}

export async function saveProperty(
  formData: FormData,
): Promise<PropertyActionResult> {
  const auth = await getAdminUserForAction();
  if (!auth) {
    return { ok: false, message: "Sessão expirada. Faça login novamente." };
  }

  let parsedImages: unknown = [];
  const rawImages = formData.get("imageUrls")?.toString() ?? "[]";
  try {
    parsedImages = JSON.parse(rawImages);
  } catch {
    return { ok: false, message: "Lista de imagens inválida." };
  }

  const rawOwnerId = formData.get("owner_id")?.toString().trim() ?? "";

  const parsed = propertySchema.safeParse({
    id: formData.get("id")?.toString() ?? "",
    title: formData.get("title")?.toString() ?? "",
    type: formData.get("type")?.toString() ?? "casa",
    purpose: formData.get("purpose")?.toString() ?? "venda",
    status: formData.get("status")?.toString() ?? "disponivel",
    is_featured: formData.get("is_featured") === "on",
    owner_id: rawOwnerId || null,
    price: parseOptionalNumber(formData.get("price")),
    condo_fee: parseOptionalNumber(formData.get("condo_fee")),
    iptu: parseOptionalNumber(formData.get("iptu")),
    area_total: parseOptionalNumber(formData.get("area_total")),
    area_built: parseOptionalNumber(formData.get("area_built")),
    bedrooms: parseIntField(formData.get("bedrooms")),
    suites: parseIntField(formData.get("suites")),
    bathrooms: parseIntField(formData.get("bathrooms")),
    parking: parseIntField(formData.get("parking")),
    condominium: formData.get("condominium")?.toString().trim() || null,
    neighborhood: formData.get("neighborhood")?.toString().trim() || null,
    city: formData.get("city")?.toString().trim() || "Cotia",
    address: formData.get("address")?.toString().trim() || null,
    description: formData.get("description")?.toString().trim() || null,
    imageUrls: parsedImages,
  });

  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ??
        "Revise os campos numéricos e obrigatórios do formulário.",
    };
  }

  const data = parsed.data;

  // EDITAR IMÓVEL EXISTENTE
  if (data.id) {
    const { data: existing, error: fetchError } = await auth.supabase
      .from("properties")
      .select("id, code, slug")
      .eq("id", data.id)
      .single();

    if (fetchError || !existing) {
      return { ok: false, message: "Imóvel não encontrado." };
    }

    const updatedSlug = buildPropertySlug({
      title: data.title,
      condominium: data.condominium,
      city: data.city,
      code: existing.code,
    });

    const { error: updateError } = await auth.supabase
      .from("properties")
      .update({
        slug: updatedSlug,
        title: data.title,
        type: data.type,
        purpose: data.purpose,
        status: data.status,
        is_featured: data.is_featured,
        owner_id: data.owner_id,
        price: data.price,
        condo_fee: data.condo_fee,
        iptu: data.iptu,
        area_total: data.area_total,
        area_built: data.area_built,
        bedrooms: data.bedrooms,
        suites: data.suites,
        bathrooms: data.bathrooms,
        parking: data.parking,
        condominium: data.condominium,
        neighborhood: data.neighborhood,
        city: data.city,
        address: data.address,
        description: data.description,
      })
      .eq("id", data.id);

    if (updateError) {
      console.error("Erro ao atualizar imóvel:", updateError.message);
      return {
        ok: false,
        message: "Não foi possível salvar as alterações do imóvel.",
      };
    }

    // Sincronizar imagens (identifica removidas para limpar Storage)
    const { data: oldImages } = await auth.supabase
      .from("property_images")
      .select("url")
      .eq("property_id", data.id);

    const newUrlSet = new Set(data.imageUrls);
    const removedStoragePaths = (oldImages ?? [])
      .map((img) => img.url)
      .filter((url) => !newUrlSet.has(url))
      .map(extractStoragePathFromPublicUrl)
      .filter((p): p is string => Boolean(p));

    await auth.supabase
      .from("property_images")
      .delete()
      .eq("property_id", data.id);

    if (data.imageUrls.length > 0) {
      const { error: imgInsertError } = await auth.supabase
        .from("property_images")
        .insert(
          data.imageUrls.map((url, index) => ({
            property_id: data.id as string,
            url,
            position: index,
          })),
        );

      if (imgInsertError) {
        console.error("Erro ao salvar imagens:", imgInsertError.message);
        return {
          ok: false,
          message: "Imóvel salvo, mas houve erro ao atualizar a galeria de fotos.",
        };
      }
    }

    if (removedStoragePaths.length > 0) {
      await auth.supabase.storage
        .from(PROPERTY_BUCKET)
        .remove(removedStoragePaths);
    }

    revalidatePropertyPaths(existing.slug);
    if (updatedSlug !== existing.slug) {
      revalidatePropertyPaths(updatedSlug);
    }

    return {
      ok: true,
      propertyId: data.id,
      message: "Imóvel atualizado com sucesso!",
    };
  }

  // CRIAR NOVO IMÓVEL
  const tempSlug = `${buildPropertySlug({
    title: data.title,
    condominium: data.condominium,
    city: data.city,
  })}-${Date.now().toString(36)}`;

  const { data: inserted, error: insertError } = await auth.supabase
    .from("properties")
    .insert({
      slug: tempSlug,
      title: data.title,
      type: data.type,
      purpose: data.purpose,
      status: data.status,
      is_featured: data.is_featured,
      owner_id: data.owner_id,
      price: data.price,
      condo_fee: data.condo_fee,
      iptu: data.iptu,
      area_total: data.area_total,
      area_built: data.area_built,
      bedrooms: data.bedrooms,
      suites: data.suites,
      bathrooms: data.bathrooms,
      parking: data.parking,
      condominium: data.condominium,
      neighborhood: data.neighborhood,
      city: data.city,
      address: data.address,
      description: data.description,
    })
    .select("id, code")
    .single();

  if (insertError || !inserted) {
    console.error("Erro ao cadastrar imóvel:", insertError?.message);
    return {
      ok: false,
      message: "Não foi possível cadastrar o imóvel. Tente novamente.",
    };
  }

  const finalSlug = buildPropertySlug({
    title: data.title,
    condominium: data.condominium,
    city: data.city,
    code: inserted.code,
  });

  await auth.supabase
    .from("properties")
    .update({ slug: finalSlug })
    .eq("id", inserted.id);

  if (data.imageUrls.length > 0) {
    const { error: imgInsertError } = await auth.supabase
      .from("property_images")
      .insert(
        data.imageUrls.map((url, index) => ({
          property_id: inserted.id,
          url,
          position: index,
        })),
      );

    if (imgInsertError) {
      console.error("Erro ao vincular fotos:", imgInsertError.message);
    }
  }

  revalidatePropertyPaths(finalSlug);

  return {
    ok: true,
    propertyId: inserted.id,
    message: "Imóvel cadastrado com sucesso!",
  };
}

export async function quickUpdatePropertyStatus(
  id: string,
  status: PropertyStatus,
): Promise<PropertyActionResult> {
  const auth = await getAdminUserForAction();
  if (!auth) {
    return { ok: false, message: "Sessão expirada." };
  }

  const validStatus = z
    .enum(["disponivel", "reservado", "vendido", "alugado", "rascunho"])
    .safeParse(status);
  if (!validStatus.success) {
    return { ok: false, message: "Status inválido." };
  }

  const { data, error } = await auth.supabase
    .from("properties")
    .update({ status: validStatus.data })
    .eq("id", id)
    .select("slug")
    .single();

  if (error) {
    return { ok: false, message: "Não foi possível alterar o status." };
  }

  revalidatePropertyPaths(data?.slug);
  return { ok: true };
}

export async function quickTogglePropertyFeatured(
  id: string,
  isFeatured: boolean,
): Promise<PropertyActionResult> {
  const auth = await getAdminUserForAction();
  if (!auth) {
    return { ok: false, message: "Sessão expirada." };
  }

  const { data, error } = await auth.supabase
    .from("properties")
    .update({ is_featured: isFeatured })
    .eq("id", id)
    .select("slug")
    .single();

  if (error) {
    return { ok: false, message: "Não foi possível alterar o destaque." };
  }

  revalidatePropertyPaths(data?.slug);
  return { ok: true };
}

export async function deleteProperty(
  id: string,
): Promise<PropertyActionResult> {
  const auth = await getAdminUserForAction();
  if (!auth) {
    return { ok: false, message: "Sessão expirada." };
  }

  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) {
    return { ok: false, message: "Identificador inválido." };
  }

  const [{ data: prop }, { data: imgs }] = await Promise.all([
    auth.supabase
      .from("properties")
      .select("slug")
      .eq("id", parsedId.data)
      .single(),
    auth.supabase
      .from("property_images")
      .select("url")
      .eq("property_id", parsedId.data),
  ]);

  const { error } = await auth.supabase
    .from("properties")
    .delete()
    .eq("id", parsedId.data);

  if (error) {
    return { ok: false, message: "Não foi possível excluir o imóvel." };
  }

  const storagePaths = (imgs ?? [])
    .map((img) => extractStoragePathFromPublicUrl(img.url))
    .filter((p): p is string => Boolean(p));

  if (storagePaths.length > 0) {
    await auth.supabase.storage.from(PROPERTY_BUCKET).remove(storagePaths);
  }

  revalidatePropertyPaths(prop?.slug);
  return { ok: true, message: "Imóvel excluído com sucesso." };
}
