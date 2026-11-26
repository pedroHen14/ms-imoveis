import type { NextConfig } from "next";

function getSupabaseHostConfig(): {
  hostname: string;
  origin: string;
  wsOrigin: string;
} | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return null;

  try {
    const parsed = new URL(raw);
    return {
      hostname: parsed.hostname,
      origin: parsed.origin,
      wsOrigin: parsed.origin.replace(/^https?:/, "wss:"),
    };
  } catch {
    return null;
  }
}

const supabaseHost = getSupabaseHostConfig();
const isProd = process.env.NODE_ENV === "production";

function buildContentSecurityPolicy(): string {
  const supabaseOrigin = supabaseHost?.origin ?? "https://*.supabase.co";
  const supabaseWs = supabaseHost?.wsOrigin ?? "wss://*.supabase.co";

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    // Next.js App Router usa inline scripts de hidratação; mantemos ISR/CDN cache
    // e restringimos scripts externos apenas aos domínios explicitamente integrados.
    `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"} https://www.googletagmanager.com https://connect.facebook.net https://challenges.cloudflare.com`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${supabaseOrigin} https://images.unsplash.com https://www.facebook.com`,
    "font-src 'self' data:",
    `connect-src 'self' ${supabaseOrigin} ${supabaseWs} https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com https://www.googletagmanager.com https://connect.facebook.net https://challenges.cloudflare.com`,
    "frame-src 'self' https://challenges.cloudflare.com",
    ...(isProd ? ["upgrade-insecure-requests"] : []),
  ];

  return directives.join("; ");
}

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: buildContentSecurityPolicy(),
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost?.hostname ?? "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
