"use server";

import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
import { getAdminUserForAction } from "@/lib/admin-auth";
import {
  BROKER_INFO,
  formatArea,
  formatCurrency,
  PROPERTY_PURPOSE_LABELS,
  PROPERTY_TYPE_LABELS,
} from "@/lib/format";

const generateAdInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Informe pelo menos o título do imóvel antes de gerar os textos.")
    .max(160),
  type: z.enum(["casa", "apartamento", "terreno", "comercial"]),
  purpose: z.enum(["venda", "locacao"]),
  price: z.number().min(0).nullable(),
  condo_fee: z.number().min(0).nullable(),
  iptu: z.number().min(0).nullable(),
  area_total: z.number().min(0).nullable(),
  area_built: z.number().min(0).nullable(),
  bedrooms: z.number().int().min(0),
  suites: z.number().int().min(0),
  bathrooms: z.number().int().min(0),
  parking: z.number().int().min(0),
  condominium: z.string().trim().max(120).nullable(),
  neighborhood: z.string().trim().max(120).nullable(),
  city: z.string().trim().max(80).nullable(),
  address: z.string().trim().max(240).nullable(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

const generatedAdsSchema = z.object({
  site_description: z.string().trim().min(20),
  olx_text: z.string().trim().min(20),
  marketplace_text: z.string().trim().min(20),
});

export type GenerateAdInput = z.infer<typeof generateAdInputSchema>;
export type GeneratedAdTexts = z.infer<typeof generatedAdsSchema>;

export interface GenerateAdResult {
  ok: boolean;
  message?: string;
  texts?: GeneratedAdTexts;
}

export async function generatePropertyAdTexts(
  input: GenerateAdInput,
): Promise<GenerateAdResult> {
  const auth = await getAdminUserForAction();
  if (!auth) {
    return { ok: false, message: "Sessão expirada. Faça login novamente." };
  }

  const parsedInput = generateAdInputSchema.safeParse(input);
  if (!parsedInput.success) {
    return {
      ok: false,
      message:
        parsedInput.error.issues[0]?.message ??
        "Preencha os dados principais do imóvel antes de gerar os textos.",
    };
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (
    !apiKey ||
    apiKey === "sua-chave-gemini-somente-servidor"
  ) {
    return {
      ok: false,
      message:
        "Chave da API do Gemini não configurada. Defina GEMINI_API_KEY no arquivo .env.local e reinicie o servidor.",
    };
  }

  const data = parsedInput.data;
  const typeLabel = PROPERTY_TYPE_LABELS[data.type] ?? data.type;
  const purposeLabel = PROPERTY_PURPOSE_LABELS[data.purpose] ?? data.purpose;

  const detailsLines = [
    `Título: ${data.title}`,
    `Tipo: ${typeLabel}`,
    `Finalidade: ${purposeLabel}`,
    `Valor: ${formatCurrency(data.price)}${data.purpose === "locacao" && data.price ? " /mês" : ""}`,
    data.condo_fee !== null ? `Condomínio: ${formatCurrency(data.condo_fee)}/mês` : null,
    data.iptu !== null ? `IPTU: ${formatCurrency(data.iptu)}/mês` : null,
    formatArea(data.area_total) ? `Área total: ${formatArea(data.area_total)}` : null,
    formatArea(data.area_built) ? `Área útil/construída: ${formatArea(data.area_built)}` : null,
    data.bedrooms > 0 ? `Quartos: ${data.bedrooms}` : null,
    data.suites > 0 ? `Suítes: ${data.suites}` : null,
    data.bathrooms > 0 ? `Banheiros: ${data.bathrooms}` : null,
    data.parking > 0 ? `Vagas de garagem: ${data.parking}` : null,
    data.condominium ? `Condomínio: ${data.condominium}` : null,
    data.neighborhood ? `Bairro/Região: ${data.neighborhood}` : null,
    data.city ? `Cidade: ${data.city}` : "Cidade: Cotia",
    data.address ? `Endereço público: ${data.address}` : null,
    data.notes ? `Observações e diferenciais informados pelo corretor:\n${data.notes}` : null,
  ].filter(Boolean);

  const prompt = `Você é especialista em copywriting imobiliário atuando em Cotia e Granja Vianna (SP) para a imobiliária ${BROKER_INFO.brandName} (Corretor ${BROKER_INFO.brokerName}, CRECI ${BROKER_INFO.creci}, WhatsApp ${BROKER_INFO.whatsappFormatted}).

Com base EXCLUSIVAMENTE nos dados abaixo, crie 3 textos prontos para publicação em Português do Brasil (pt-BR).
Regras obrigatórias:
- NÃO invente características, áreas de lazer, metragens, valores ou acabamentos que não estejam nos dados.
- Use linguagem natural, acolhedora, profissional e confiável (sem exageros em CAIXA ALTA ou excesso de emojis).
- Formate valores em R$ no padrão brasileiro.

Dados do imóvel:
${detailsLines.join("\n")}

Gere um JSON com exatamente 3 campos:
1. "site_description": Descrição completa, acolhedora e persuasiva para a página do imóvel no site, formatada em Markdown limpo para boa leitura e SEO:
   - Comece com um parágrafo curto de abertura apresentando o imóvel.
   - Use subtítulos exclusivamente com "### " (NUNCA use "#" ou "##"), por exemplo "### Destaques do Imóvel" e "### Localização".
   - Organize os atributos e diferenciais em lista com marcadores "- " (um item por linha) e use **negrito** apenas em termos-chave pontuais.
   - Não use HTML bruto nem emojis exagerados.
   - Finalize com um parágrafo curto convidando para agendar visita com ${BROKER_INFO.brokerName} (CRECI ${BROKER_INFO.creci}).
2. "olx_text": Texto PURO (SEM sintaxe Markdown como ** ou ###) objetivo e escaneável para anúncio na OLX, com título chamativo na primeira linha, lista com marcadores (•) dos principais atributos, valores e localização, e chamada direta para WhatsApp ${BROKER_INFO.whatsappFormatted} (${BROKER_INFO.brokerName} - CRECI ${BROKER_INFO.creci}).
3. "marketplace_text": Texto PURO (SEM sintaxe Markdown como ** ou ###) curto, direto e envolvente para Facebook Marketplace (ideal para leitura rápida no celular), com os principais diferenciais, valor e chamada clara para chamar no WhatsApp ${BROKER_INFO.whatsappFormatted}.`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            site_description: {
              type: Type.STRING,
              description: "Descrição completa e persuasiva para o site oficial.",
            },
            olx_text: {
              type: Type.STRING,
              description: "Texto objetivo com bullets para anúncio na OLX.",
            },
            marketplace_text: {
              type: Type.STRING,
              description: "Texto curto e direto com CTA no WhatsApp para Facebook Marketplace.",
            },
          },
          required: ["site_description", "olx_text", "marketplace_text"],
        },
      },
    });

    const rawText = response.text?.trim();
    if (!rawText) {
      return {
        ok: false,
        message: "A IA não retornou conteúdo. Tente novamente em instantes.",
      };
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      return {
        ok: false,
        message: "Não foi possível interpretar a resposta da IA. Tente novamente.",
      };
    }

    const validated = generatedAdsSchema.safeParse(parsedJson);
    if (!validated.success) {
      return {
        ok: false,
        message: "A resposta da IA veio incompleta. Tente gerar novamente.",
      };
    }

    return {
      ok: true,
      texts: validated.data,
    };
  } catch (error) {
    console.error("Erro ao gerar textos com Gemini:", error);

    const status =
      typeof error === "object" && error !== null && "status" in error
        ? Number((error as { status?: unknown }).status)
        : undefined;
    const rawMessage =
      error instanceof Error ? error.message : String(error ?? "");

    if (status === 402 || rawMessage.includes("prepayment credits")) {
      return {
        ok: false,
        message:
          "Os créditos pré-pagos da sua conta no Google AI Studio acabaram (erro 402). Gerencie seus créditos/faturamento em https://ai.studio/projects ou use uma chave com cota gratuita ativa.",
      };
    }

    if (status === 429 || rawMessage.includes("RESOURCE_EXHAUSTED")) {
      return {
        ok: false,
        message:
          "Limite de uso da API do Gemini atingido (erro 429). Aguarde alguns instantes e tente novamente.",
      };
    }

    if (status === 401 || status === 403 || rawMessage.includes("API_KEY")) {
      return {
        ok: false,
        message:
          "Chave GEMINI_API_KEY inválida ou sem permissão. Confira o valor em .env.local e reinicie o servidor.",
      };
    }

    return {
      ok: false,
      message:
        "Não foi possível gerar os textos com IA no momento. Tente novamente em instantes.",
    };
  }
}
