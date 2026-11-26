"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { getAdminUserForAction } from "@/lib/admin-auth";
import { buildPropertySlug } from "@/lib/format";
import { parseIntField, parseOptionalDecimal } from "@/lib/parsers";
import { PROPERTIES_CACHE_TAG } from "@/lib/properties";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import type { PropertyStatus } from "@/types/database";

const PROPERTY_BUCKET = "property-images";
const PUBLIC_STORAGE_PREFIX = `/storage/v1/object/public/${PROPERTY_BUCKET}/`;

function getExpectedSupabaseOrigin(): string | null {
  const env = getSupabasePublicEnv();
  if (!env) return null;
  try {
    return new URL(env.url).origin;
  } catch {
    return null;
  }
}

function isAllowedPropertyImageUrl(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:") {
    return false;
  }

  const supabaseOrigin = getExpectedSupabaseOrigin();
  if (
    supabaseOrigin &&
    parsed.origin === supabaseOrigin &&
    parsed.pathname.startsWith(PUBLIC_STORAGE_PREFIX)
  ) {
    return true;
  }

  // Permite fotos de seed/demonstração hospedadas no Unsplash
  if (parsed.hostname === "images.unsplash.com") {
    return true;
  }

  return false;
}

function extractStoragePathFromPublicUrl(url: string): string | null {
  const supabaseOrigin = getExpectedSupabaseOrigin();
  if (!supabaseOrigin) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.origin !== supabaseOrigin ||
    !parsed.pathname.startsWith(PUBLIC_STORAGE_PREFIX)
  ) {
    return null;
  }

  const encodedPath = parsed.pathname.slice(PUBLIC_STORAGE_PREFIX.length);
  if (!encodedPath) return null;

  try {
    const decoded = decodeURIComponent(encodedPath);
    if (!decoded || decoded.startsWith("/") || decoded.includes("..")) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
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
  price: z
    .number()
    .min(0, "O valor não pode ser negativo.")
    .max(9_999_999_999.99, "Valor acima do limite permitido.")
    .nullable(),
  condo_fee: z
    .number()
    .min(0, "O condomínio não pode ser negativo.")
    .max(99_999_999.99, "Valor de condomínio acima do limite permitido.")
    .nullable(),
  iptu: z
    .number()
    .min(0, "O IPTU não pode ser negativo.")
    .max(99_999_999.99, "Valor de IPTU acima do limite permitido.")
    .nullable(),
  area_total: z
    .number()
    .min(0, "A área total não pode ser negativa.")
    .max(99_999_999.99, "Área total acima do limite permitido.")
    .nullable(),
  area_built: z
    .number()
    .min(0, "A área construída não pode ser negativa.")
    .max(99_999_999.99, "Área construída acima do limite permitido.")
    .nullable(),
  bedrooms: z.number().int().min(0).max(100),
  suites: z.number().int().min(0).max(100),
  bathrooms: z.number().int().min(0).max(100),
  parking: z.number().int().min(0).max(200),
  condominium: z.string().trim().max(120).nullable(),
  neighborhood: z.string().trim().max(120).nullable(),
  city: z.string().trim().min(2, "Informe a cidade.").max(80),
  address: z.string().trim().max(240).nullable(),
  description: z.string().trim().max(6000).nullable(),
  ai_notes: z
    .string()
    .trim()
    .max(
      2000,
      "As informações para o Assistente de WhatsApp podem ter no máximo 2.000 caracteres.",
    )
    .nullable(),
  imageUrls: z
    .array(
      z
        .string()
        .trim()
        .max(2048)
        .refine(
          isAllowedPropertyImageUrl,
          "URL de imagem inválida ou fora do Storage autorizado.",
        ),
    )
    .max(40),
});

export interface PropertyActionResult {
  ok: boolean;
  message?: string;
  propertyId?: string;
}

function revalidatePropertyPaths(slug?: string | null) {
  revalidateTag(PROPERTIES_CACHE_TAG);
  revalidatePath("/");
  revalidatePath("/imoveis");
  revalidatePath("/sitemap.xml");
  if (slug) {
    revalidatePath(`/imoveis/${slug}`);
  }
  revalidatePath("/admin");
  revalidatePath("/admin/imoveis");
}

async function removeUnreferencedStorageUrls(
  supabase: NonNullable<Awaited<ReturnType<typeof getAdminUserForAction>>>["supabase"],
  candidateUrls: string[],
) {
  const uniqueUrls = Array.from(new Set(candidateUrls));
  if (uniqueUrls.length === 0) return;

  // Garante que nenhuma imagem ainda referenciada por outro imóvel seja apagada
  const { data: stillUsed } = await supabase
    .from("property_images")
    .select("url")
    .in("url", uniqueUrls);

  const stillUsedSet = new Set((stillUsed ?? []).map((row) => row.url));
  const storagePaths = uniqueUrls
    .filter((url) => !stillUsedSet.has(url))
    .map(extractStoragePathFromPublicUrl)
    .filter((p): p is string => Boolean(p));

  if (storagePaths.length > 0) {
    await supabase.storage.from(PROPERTY_BUCKET).remove(storagePaths);
  }
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
    price: parseOptionalDecimal(formData.get("price")),
    condo_fee: parseOptionalDecimal(formData.get("condo_fee")),
    iptu: parseOptionalDecimal(formData.get("iptu")),
    area_total: parseOptionalDecimal(formData.get("area_total")),
    area_built: parseOptionalDecimal(formData.get("area_built")),
    bedrooms: parseIntField(formData.get("bedrooms")),
    suites: parseIntField(formData.get("suites")),
    bathrooms: parseIntField(formData.get("bathrooms")),
    parking: parseIntField(formData.get("parking")),
    condominium: formData.get("condominium")?.toString().trim() || null,
    neighborhood: formData.get("neighborhood")?.toString().trim() || null,
    city: formData.get("city")?.toString().trim() || "Cotia",
    address: formData.get("address")?.toString().trim() || null,
    description: formData.get("description")?.toString().trim() || null,
    ai_notes: formData.get("ai_notes")?.toString().trim() || null,
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
  const slugBase = buildPropertySlug({
    title: data.title,
    condominium: data.condominium,
    city: data.city,
  });

  // Tenta salvar atomicamente via RPC transacional (Migration 004).
  // Na edição, a RPC preserva o `slug` atual para não quebrar links/SEO.
  const { data: rpcRows, error: rpcError } = await auth.supabase.rpc(
    "save_property_with_images",
    {
      p_id: data.id || null,
      p_slug_base: slugBase,
      p_title: data.title,
      p_type: data.type,
      p_purpose: data.purpose,
      p_status: data.status,
      p_is_featured: data.is_featured,
      p_owner_id: data.owner_id,
      p_price: data.price,
      p_condo_fee: data.condo_fee,
      p_iptu: data.iptu,
      p_area_total: data.area_total,
      p_area_built: data.area_built,
      p_bedrooms: data.bedrooms,
      p_suites: data.suites,
      p_bathrooms: data.bathrooms,
      p_parking: data.parking,
      p_condominium: data.condominium,
      p_neighborhood: data.neighborhood,
      p_city: data.city,
      p_address: data.address,
      p_description: data.description,
      p_ai_notes: data.ai_notes,
      p_image_urls: data.imageUrls,
    },
  );

  if (!rpcError) {
    const saved = Array.isArray(rpcRows) ? rpcRows[0] : null;
    if (!saved) {
      return {
        ok: false,
        message: "Não foi possível confirmar o salvamento do imóvel.",
      };
    }

    if (saved.removed_image_urls && saved.removed_image_urls.length > 0) {
      await removeUnreferencedStorageUrls(
        auth.supabase,
        saved.removed_image_urls,
      );
    }

    revalidatePropertyPaths(saved.property_slug);

    return {
      ok: true,
      propertyId: saved.property_id,
      message: data.id
        ? "Imóvel atualizado com sucesso!"
        : "Imóvel cadastrado com sucesso!",
    };
  }

  // Erro de negócio explícito vindo da RPC (ex.: registro inexistente ou permissão)
  if (rpcError.code === "P0002") {
    return { ok: false, message: "Imóvel não encontrado." };
  }

  const isMissingRpc =
    rpcError.code === "PGRST202" ||
    rpcError.message.toLowerCase().includes("save_property_with_images");

  if (!isMissingRpc) {
    console.error("Erro ao salvar imóvel via RPC:", rpcError.message);
    return {
      ok: false,
      message: data.id
        ? "Não foi possível salvar as alterações do imóvel."
        : "Não foi possível cadastrar o imóvel. Tente novamente.",
    };
  }

  console.warn(
    "[saveProperty] RPC save_property_with_images não encontrada; usando fallback legado até aplicar a Migration 004.",
  );

  // FALLBACK LEGADO — EDITAR IMÓVEL EXISTENTE (preservando slug atual)
  if (data.id) {
    const { data: existing, error: fetchError } = await auth.supabase
      .from("properties")
      .select("id, code, slug")
      .eq("id", data.id)
      .single();

    if (fetchError || !existing) {
      return { ok: false, message: "Imóvel não encontrado." };
    }

    const { error: updateError } = await auth.supabase
      .from("properties")
      .update({
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
        ai_notes: data.ai_notes,
      })
      .eq("id", data.id);

    if (updateError) {
      console.error("Erro ao atualizar imóvel:", updateError.message);
      return {
        ok: false,
        message: "Não foi possível salvar as alterações do imóvel.",
      };
    }

    const { data: oldImages } = await auth.supabase
      .from("property_images")
      .select("url")
      .eq("property_id", data.id);

    const newUrlSet = new Set(data.imageUrls);
    const removedUrls = (oldImages ?? [])
      .map((img) => img.url)
      .filter((url) => !newUrlSet.has(url));

    const { error: imgDeleteError } = await auth.supabase
      .from("property_images")
      .delete()
      .eq("property_id", data.id);

    if (imgDeleteError) {
      console.error("Erro ao limpar imagens antigas:", imgDeleteError.message);
      return {
        ok: false,
        message: "Imóvel salvo, mas houve erro ao atualizar a galeria de fotos.",
      };
    }

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

    if (removedUrls.length > 0) {
      await removeUnreferencedStorageUrls(auth.supabase, removedUrls);
    }

    revalidatePropertyPaths(existing.slug);

    return {
      ok: true,
      propertyId: data.id,
      message: "Imóvel atualizado com sucesso!",
    };
  }

  // FALLBACK LEGADO — CRIAR NOVO IMÓVEL
  const tempSlug = `${slugBase || "imovel"}-${Date.now().toString(36)}`;

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
      ai_notes: data.ai_notes,
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

  const { error: slugUpdateError } = await auth.supabase
    .from("properties")
    .update({ slug: finalSlug })
    .eq("id", inserted.id);

  if (slugUpdateError) {
    console.error("Erro ao atualizar slug definitivo:", slugUpdateError.message);
  }

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
      revalidatePropertyPaths(slugUpdateError ? tempSlug : finalSlug);
      return {
        ok: false,
        propertyId: inserted.id,
        message:
          "Imóvel criado, mas houve erro ao vincular as fotos. Abra a edição para reenviar.",
      };
    }
  }

  revalidatePropertyPaths(slugUpdateError ? tempSlug : finalSlug);

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

  const parsedId = z.string().uuid().safeParse(id);
  const validStatus = z
    .enum(["disponivel", "reservado", "vendido", "alugado", "rascunho"])
    .safeParse(status);

  if (!parsedId.success || !validStatus.success) {
    return { ok: false, message: "Dados inválidos." };
  }

  const { data, error } = await auth.supabase
    .from("properties")
    .update({ status: validStatus.data })
    .eq("id", parsedId.data)
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

  const parsedId = z.string().uuid().safeParse(id);
  const parsedFeatured = z.boolean().safeParse(isFeatured);

  if (!parsedId.success || !parsedFeatured.success) {
    return { ok: false, message: "Dados inválidos." };
  }

  const { data, error } = await auth.supabase
    .from("properties")
    .update({ is_featured: parsedFeatured.data })
    .eq("id", parsedId.data)
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

  const candidateUrls = (imgs ?? []).map((img) => img.url);
  if (candidateUrls.length > 0) {
    await removeUnreferencedStorageUrls(auth.supabase, candidateUrls);
  }

  revalidatePropertyPaths(prop?.slug);
  return { ok: true, message: "Imóvel excluído com sucesso." };
}
