import { headers } from "next/headers";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

interface MemoryBucket {
  count: number;
  resetAt: number;
}

const MAX_MEMORY_ENTRIES = 5000;
const memoryStore = new Map<string, MemoryBucket>();

function cleanupMemoryStore(now: number) {
  if (memoryStore.size < MAX_MEMORY_ENTRIES) return;
  for (const [key, bucket] of memoryStore.entries()) {
    if (bucket.resetAt <= now) {
      memoryStore.delete(key);
    }
  }
  // Se ainda estiver cheio, remove as entradas mais antigas
  if (memoryStore.size >= MAX_MEMORY_ENTRIES) {
    const excess = memoryStore.size - Math.floor(MAX_MEMORY_ENTRIES * 0.8);
    let removed = 0;
    for (const key of memoryStore.keys()) {
      memoryStore.delete(key);
      removed += 1;
      if (removed >= excess) break;
    }
  }
}

async function checkUpstashRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim().replace(/\/+$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    return null;
  }

  try {
    const response = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, String(windowSeconds), "NX"],
        ["TTL", key],
      ]),
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as Array<{
      result?: number;
      error?: string;
    }>;

    const count = Number(payload?.[0]?.result ?? 0);
    const ttl = Math.max(1, Number(payload?.[2]?.result ?? windowSeconds));

    if (!Number.isFinite(count) || count <= 0) {
      return null;
    }

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetAt: Date.now() + ttl * 1000,
    };
  } catch {
    return null;
  }
}

function checkMemoryRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): RateLimitResult {
  const now = Date.now();
  cleanupMemoryStore(now);

  const windowMs = windowSeconds * 1000;
  const existing = memoryStore.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    memoryStore.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      resetAt,
    };
  }

  existing.count += 1;
  return {
    allowed: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
  };
}

/**
 * Aplica rate limiting por chave (usa Upstash Redis REST quando configurado
 * e fallback seguro em memória por instância do servidor).
 */
export async function checkRateLimit(params: {
  namespace: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
}): Promise<RateLimitResult> {
  const safeId = params.identifier.trim().toLowerCase().slice(0, 120) || "unknown";
  const key = `rl:${params.namespace}:${safeId}`;

  const distributed = await checkUpstashRateLimit(
    key,
    params.limit,
    params.windowSeconds,
  );
  if (distributed) {
    return distributed;
  }

  return checkMemoryRateLimit(key, params.limit, params.windowSeconds);
}

/**
 * Extrai o IP do cliente priorizando headers definidos pela borda confiável
 * (Vercel / Cloudflare / reverse proxy) antes de `x-forwarded-for`.
 */
export async function getClientIp(): Promise<string> {
  try {
    const headerStore = await headers();

    const vercelIp = headerStore.get("x-vercel-forwarded-for");
    if (vercelIp) {
      const firstVercelIp = vercelIp.split(",")[0]?.trim();
      if (firstVercelIp) return firstVercelIp;
    }

    const cfIp = headerStore.get("cf-connecting-ip")?.trim();
    if (cfIp) return cfIp;

    const realIp = headerStore.get("x-real-ip")?.trim();
    if (realIp) return realIp;

    const forwarded = headerStore.get("x-forwarded-for");
    if (forwarded) {
      const firstIp = forwarded.split(",")[0]?.trim();
      if (firstIp) return firstIp;
    }
  } catch {
    // Fallback se chamado fora de contexto HTTP
  }

  return "unknown";
}
