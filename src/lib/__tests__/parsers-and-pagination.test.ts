import { describe, expect, it } from "vitest";
import {
  parsePageParam,
  sanitizePostgrestSearch,
} from "@/lib/admin-pagination";
import {
  parseIntField,
  parseOptionalDecimal,
  parseOptionalNonNegativeDecimal,
} from "@/lib/parsers";

describe("parsers and admin pagination utilities", () => {
  it("parses Brazilian formatted decimals and handles invalid inputs", () => {
    expect(parseOptionalDecimal("450.000,50")).toBe(450000.5);
    expect(parseOptionalDecimal("120,75")).toBe(120.75);
    expect(parseOptionalDecimal("650000")).toBe(650000);
    expect(parseOptionalDecimal("")).toBeNull();
    expect(parseOptionalDecimal(null)).toBeNull();
    expect(Number.isNaN(parseOptionalDecimal("abc"))).toBe(true);

    expect(parseOptionalNonNegativeDecimal("-10")).toBeNull();
    expect(parseOptionalNonNegativeDecimal("abc")).toBeNull();
    expect(parseOptionalNonNegativeDecimal("350.000,00")).toBe(350000);
  });

  it("parses integer fields with configurable invalid fallback", () => {
    expect(parseIntField("3")).toBe(3);
    expect(parseIntField("")).toBe(0);
    expect(parseIntField(null)).toBe(0);
    expect(parseIntField("abc")).toBe(-1);
    expect(parseIntField("abc", 0)).toBe(0);
  });

  it("sanitizes PostgREST filter characters and caps length", () => {
    expect(
      sanitizePostgrestSearch("Vila,id.eq.1),title.ilike.%hack%*()'\"\\"),
    ).toBe("Vila id.eq.1 title.ilike. hack");
    expect(sanitizePostgrestSearch("a".repeat(120)).length).toBe(80);
  });

  it("parses page parameter safely within bounds", () => {
    expect(parsePageParam(undefined)).toBe(1);
    expect(parsePageParam("0")).toBe(1);
    expect(parsePageParam("-5")).toBe(1);
    expect(parsePageParam("abc")).toBe(1);
    expect(parsePageParam("3")).toBe(3);
    expect(parsePageParam(["4", "9"])).toBe(4);
    expect(parsePageParam("9999")).toBe(500);
  });
});
