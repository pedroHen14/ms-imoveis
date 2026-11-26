export interface TurnstileVerificationResult {
  ok: boolean;
  configured: boolean;
}

interface TurnstileApiResponse {
  success?: boolean;
}

/**
 * Verifica token do Cloudflare Turnstile no servidor quando TURNSTILE_SECRET_KEY
 * estiver configurada. Se não configurada, retorna `{ ok: true, configured: false }`.
 */
export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string,
): Promise<TurnstileVerificationResult> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secretKey) {
    return { ok: true, configured: false };
  }

  const trimmedToken = token?.trim();
  if (!trimmedToken || trimmedToken.length > 4096) {
    return { ok: false, configured: true };
  }

  try {
    const body = new URLSearchParams();
    body.set("secret", secretKey);
    body.set("response", trimmedToken);
    if (remoteIp && remoteIp !== "unknown") {
      body.set("remoteip", remoteIp);
    }

    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      },
    );

    if (!response.ok) {
      return { ok: false, configured: true };
    }

    const data = (await response.json()) as TurnstileApiResponse;
    return { ok: data.success === true, configured: true };
  } catch (err) {
    console.error("[turnstile] Falha ao validar token anti-bot:", err);
    return { ok: false, configured: true };
  }
}
