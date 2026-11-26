import { describe, expect, it } from "vitest";
import {
  buildPhoneCandidates,
  buildPropertySlug,
  buildWhatsAppUrl,
  formatArea,
  formatCurrency,
  formatPhoneBR,
  normalizePhoneE164,
  slugify,
} from "@/lib/format";

describe("format utilities", () => {
  it("formats BRL currency and handles missing values", () => {
    expect(formatCurrency(650000).replace(/\u00a0/g, " ")).toBe("R$ 650.000");
    expect(formatCurrency(0).replace(/\u00a0/g, " ")).toBe("R$ 0");
    expect(formatCurrency(null)).toBe("Sob consulta");
    expect(formatCurrency(undefined)).toBe("Sob consulta");
    expect(formatCurrency(Number.NaN)).toBe("Sob consulta");
  });

  it("formats area in square meters", () => {
    expect(formatArea(250)).toBe("250 m²");
    expect(formatArea(1250)).toBe("1.250 m²");
    expect(formatArea(0)).toBeNull();
    expect(formatArea(-10)).toBeNull();
    expect(formatArea(null)).toBeNull();
  });

  it("formats Brazilian phone numbers from masked or E.164 inputs", () => {
    expect(formatPhoneBR("5511966332122")).toBe("(11) 96633-2122");
    expect(formatPhoneBR("11966332122")).toBe("(11) 96633-2122");
    expect(formatPhoneBR("1146123456")).toBe("(11) 4612-3456");
    expect(formatPhoneBR("(11) 96633-2122")).toBe("(11) 96633-2122");
    expect(formatPhoneBR("")).toBe("");
    expect(formatPhoneBR(null)).toBe("");
  });

  it("normalizes Brazilian phones to E.164 without plus and builds candidates", () => {
    expect(normalizePhoneE164("(11) 99999-8888")).toBe("5511999998888");
    expect(normalizePhoneE164("5511999998888")).toBe("5511999998888");
    expect(normalizePhoneE164("1146123456")).toBe("551146123456");
    expect(normalizePhoneE164("")).toBe("");

    expect(buildPhoneCandidates("(11) 99999-8888")).toEqual([
      "5511999998888",
      "11999998888",
    ]);
  });

  it("slugifies accented Portuguese strings and builds property slugs", () => {
    expect(slugify("Casa 3 Suítes — Granja Vianna / Cotia!")).toBe(
      "casa-3-suites-granja-vianna-cotia",
    );
    expect(
      buildPropertySlug({
        title: "Casa térrea",
        condominium: "Condomínio Vila Flórida",
        city: "Cotia",
        code: 105,
      }),
    ).toBe("casa-terrea-condominio-vila-florida-cotia-105");
  });

  it("builds WhatsApp links with normalized E.164 number and encoded message", () => {
    const url = buildWhatsAppUrl("Olá Marcelo!", "(11) 98888-7777");
    expect(url).toBe("https://wa.me/5511988887777?text=Ol%C3%A1%20Marcelo!");
  });
});
