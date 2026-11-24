"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Menu, MessageCircle, X } from "lucide-react";
import { BROKER_INFO, buildWhatsAppUrl } from "@/lib/format";

const NAV_LINKS = [
  { href: "/", label: "Início" },
  { href: "/imoveis", label: "Imóveis" },
  { href: "/#sobre", label: "Sobre" },
  { href: "/#contato", label: "Contato" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const whatsappHref = buildWhatsAppUrl(
    "Olá Marcelo, vim pelo seu site e gostaria de mais informações sobre imóveis em Cotia e Granja Vianna.",
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Marca + CRECI */}
        <Link
          href="/"
          className="group flex items-center gap-3 focus:outline-none"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white shadow-sm transition-colors group-hover:bg-primary-hover">
            <Building2 className="h-5 w-5 text-accent" />
          </div>
          <div className="min-w-0">
            <span className="block truncate font-serif text-base font-semibold leading-tight text-primary sm:text-lg">
              {BROKER_INFO.brandName}
            </span>
            <span className="block text-xs font-medium tracking-wide text-muted">
              CRECI {BROKER_INFO.creci} • Cotia e Granja Vianna
            </span>
          </div>
        </Link>

        {/* Navegação Desktop */}
        <nav
          aria-label="Navegação principal"
          className="hidden items-center gap-7 md:flex"
        >
          {NAV_LINKS.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : link.href === "/imoveis"
                  ? pathname.startsWith("/imoveis")
                  : false;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  isActive
                    ? "text-primary underline decoration-accent decoration-2 underline-offset-8"
                    : "text-muted hover:text-primary"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* CTA WhatsApp Desktop */}
        <div className="hidden items-center gap-3 md:flex">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-whatsapp px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-whatsapp-hover"
          >
            <MessageCircle className="h-4 w-4" />
            <span>WhatsApp</span>
          </a>
        </div>

        {/* Botão Menu Mobile */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={mobileMenuOpen}
          className="inline-flex items-center justify-center rounded-lg border border-border p-2 text-primary transition-colors hover:bg-background md:hidden"
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Menu Mobile */}
      {mobileMenuOpen && (
        <div className="border-t border-border bg-surface px-4 pb-5 pt-3 shadow-md md:hidden">
          <nav
            aria-label="Navegação mobile"
            className="flex flex-col space-y-1"
          >
            {NAV_LINKS.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : link.href === "/imoveis"
                    ? pathname.startsWith("/imoveis")
                    : false;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-background font-semibold text-primary"
                      : "text-foreground hover:bg-background"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 border-t border-border pt-4">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-whatsapp px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-whatsapp-hover"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Falar no WhatsApp • {BROKER_INFO.whatsappFormatted}</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
