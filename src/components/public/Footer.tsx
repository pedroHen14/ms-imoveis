import Link from "next/link";
import {
  Building2,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { BROKER_INFO, buildWhatsAppUrl } from "@/lib/format";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const whatsappHref = buildWhatsAppUrl(
    "Olá Marcelo, vim pelo seu site e gostaria de conversar sobre um imóvel.",
  );

  return (
    <footer className="border-t border-primary-hover/30 bg-primary text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-3">
          {/* Coluna 1: Marca e CRECI */}
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
                <Building2 className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="font-serif text-lg font-semibold leading-tight text-white">
                  {BROKER_INFO.brandName}
                </p>
                <p className="text-xs font-medium text-accent">
                  CRECI {BROKER_INFO.creci}
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-white/80">
              Atendimento próximo, transparente e personalizado para compra,
              venda e locação de imóveis em condomínios de Cotia e Granja
              Vianna.
            </p>

            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
              <ShieldCheck className="h-3.5 w-3.5 text-accent" />
              <span>Corretor credenciado CRECI-SP {BROKER_INFO.creci}</span>
            </div>
          </div>

          {/* Coluna 2: Navegação Rápida */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-accent">
              Navegação
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-white/80">
              <li>
                <Link href="/" className="transition-colors hover:text-white">
                  Início
                </Link>
              </li>
              <li>
                <Link
                  href="/imoveis"
                  className="transition-colors hover:text-white"
                >
                  Todos os imóveis
                </Link>
              </li>
              <li>
                <Link
                  href="/imoveis?purpose=venda"
                  className="transition-colors hover:text-white"
                >
                  Imóveis à venda
                </Link>
              </li>
              <li>
                <Link
                  href="/imoveis?purpose=locacao"
                  className="transition-colors hover:text-white"
                >
                  Imóveis para locação
                </Link>
              </li>
              <li>
                <Link
                  href="/#sobre"
                  className="transition-colors hover:text-white"
                >
                  Sobre Marcelo Santos
                </Link>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Contatos Oficiais */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-accent">
              Contato Direto
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-white/85">
              <li>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 transition-colors hover:text-white"
                >
                  <MessageCircle className="h-4 w-4 text-whatsapp" />
                  <span>{BROKER_INFO.whatsappFormatted}</span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${BROKER_INFO.email}`}
                  className="inline-flex items-center gap-2.5 transition-colors hover:text-white"
                >
                  <Mail className="h-4 w-4 text-accent" />
                  <span>{BROKER_INFO.email}</span>
                </a>
              </li>
              <li>
                <a
                  href={BROKER_INFO.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 transition-colors hover:text-white"
                >
                  <Instagram className="h-4 w-4 text-accent" />
                  <span>{BROKER_INFO.instagram}</span>
                </a>
              </li>
              <li className="inline-flex items-center gap-2.5 text-white/75">
                <MapPin className="h-4 w-4 shrink-0 text-accent" />
                <span>{BROKER_INFO.region}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/15 pt-6 text-xs text-white/70 sm:flex-row">
          <p>
            © {currentYear} {BROKER_INFO.brandName}. Todos os direitos
            reservados.
          </p>
          <Link
            href="/admin"
            className="text-white/60 transition-colors hover:text-white"
          >
            Área do Corretor
          </Link>
        </div>
      </div>
    </footer>
  );
}
