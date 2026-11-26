import { describe, expect, it } from "vitest";
import {
  formatListingSeoCopy,
  serializeJsonLd,
  stripMarkdown,
} from "@/lib/seo";

describe("seo utilities", () => {
  it("strips basic markdown syntax cleanly", () => {
    const md = "### Destaques\n- **3 suítes** amplas\n- *Piscina* aquecida";
    expect(stripMarkdown(md)).toBe("Destaques 3 suítes amplas Piscina aquecida");
    expect(stripMarkdown(null)).toBe("");
  });

  it("escapes dangerous characters in serialized JSON-LD", () => {
    const serialized = serializeJsonLd({
      name: "</script><script>alert(1)&</script>",
    });
    expect(serialized).not.toContain("<");
    expect(serialized).not.toContain(">");
    expect(serialized).not.toContain("&");
    expect(serialized).toContain("\\u003c/script\\u003e");
  });

  it("formats listing SEO copy for condominiums and neighborhoods", () => {
    const condoCopy = formatListingSeoCopy({
      purpose: "venda",
      type: "casa",
      location: "Terra Nobre",
      activeCondominiums: [
        { name: "Condomínio Terra Nobre", count: 3, neighborhood: "Cotia" },
      ],
    });
    expect(condoCopy.title).toBe(
      "Casas à venda no Condomínio Terra Nobre em Cotia",
    );
    expect(condoCopy.heading).toBe("Casas à venda no Condomínio Terra Nobre");

    const defaultCopy = formatListingSeoCopy({});
    expect(defaultCopy.title).toBe("Imóveis em Cotia e Granja Vianna");
  });
});
