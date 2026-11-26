import { describe, expect, it } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";

describe("in-memory rate limit", () => {
  it("allows requests up to limit and blocks subsequent ones within the window", async () => {
    const namespace = `test-ns-${Date.now()}`;
    const identifier = "203.0.113.10";

    const r1 = await checkRateLimit({
      namespace,
      identifier,
      limit: 2,
      windowSeconds: 60,
    });
    const r2 = await checkRateLimit({
      namespace,
      identifier,
      limit: 2,
      windowSeconds: 60,
    });
    const r3 = await checkRateLimit({
      namespace,
      identifier,
      limit: 2,
      windowSeconds: 60,
    });

    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(1);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(0);
    expect(r3.allowed).toBe(false);
    expect(r3.remaining).toBe(0);
  });

  it("isolates different identifiers in the same namespace", async () => {
    const namespace = `test-iso-${Date.now()}`;

    const a1 = await checkRateLimit({
      namespace,
      identifier: "user-a",
      limit: 1,
      windowSeconds: 60,
    });
    const a2 = await checkRateLimit({
      namespace,
      identifier: "user-a",
      limit: 1,
      windowSeconds: 60,
    });
    const b1 = await checkRateLimit({
      namespace,
      identifier: "user-b",
      limit: 1,
      windowSeconds: 60,
    });

    expect(a1.allowed).toBe(true);
    expect(a2.allowed).toBe(false);
    expect(b1.allowed).toBe(true);
  });
});
