import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  Building2,
  CheckCircle2,
  Handshake,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Trees,
} from "lucide-react";
import { PropertyCard } from "@/components/public/PropertyCard";
import { PropertySearchBar } from "@/components/public/PropertySearchBar";
import { TrackedWhatsAppLink } from "@/components/public/TrackedWhatsAppLink";
import {
  BROKER_INFO,
  buildWhatsAppUrl,
  getPublicWhatsAppFormatted,
} from "@/lib/format";
import {
  getActiveCondominiums,
  getAvailableLocations,
  getFeaturedProperties,
} from "@/lib/properties";
import { buildRealEstateAgentJsonLd, serializeJsonLd } from "@/lib/seo";

export const revalidate = 60;

const HERO_IMAGE_URL =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=80";

export default async function HomePage() {
  const [featuredProperties, availableLocations, activeCondominiums] =
    await Promise.all([
      getFeaturedProperties(6),
      getAvailableLocations(),
      getActiveCondominiums(8),
    ]);

  const generalWhatsApp = buildWhatsAppUrl(
    "Olá Marcelo, vim pelo seu site e gostaria de conversar sobre imóveis em Cotia e Granja Vianna.",
  );

  const captacaoWhatsApp = buildWhatsAppUrl(
    "Olá Marcelo, tenho um imóvel em Cotia / Granja Vianna e gostaria de anunciar com você.",
  );

  const publicWhatsAppFormatted = getPublicWhatsAppFormatted();
  const agentJsonLd = buildRealEstateAgentJsonLd();

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(agentJsonLd) }}
      />
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-primary">
        <div className="absolute inset-0">
          <Image
            src={HERO_IMAGE_URL}
            alt="Casa em condomínio cercada por natureza em Cotia e Granja Vianna"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-primary/85 via-primary/75 to-primary/95" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8 lg:pb-24 lg:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium text-white backdrop-blur-sm sm:text-sm">
              <Trees className="h-4 w-4 text-accent" />
              <span>
                Especialista em Condomínios • {BROKER_INFO.region}
              </span>
            </div>

            <h1 className="mt-6 font-serif text-3xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
              Encontre seu próximo lar em Cotia e Granja Vianna
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg">
              Casas, apartamentos e terrenos selecionados nos melhores
              condomínios da região, com atendimento direto, transparente e
              personalizado.
            </p>
          </div>

          {/* Barra de Busca Centralizada */}
          <div className="mx-auto mt-10 max-w-5xl">
            <PropertySearchBar
              availableLocations={availableLocations}
              variant="hero"
            />
          </div>
        </div>
      </section>

      {/* Pilares de Confiança */}
      <section className="border-b border-border bg-surface py-10">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:grid-cols-3 sm:px-6 lg:px-8">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Trees className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Foco Regional na Granja Vianna
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Conhecimento real dos condomínios de Cotia, valores de mercado e
                potencial de valorização.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Handshake className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Atendimento Direto com o Corretor
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Sem robôs ou repasses: você conversa diretamente com Marcelo
                Santos da visita à escritura.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Segurança Jurídica • CRECI {BROKER_INFO.creci}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Acompanhamento completo na documentação, financiamento bancário
                e negociação transparente.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Seção de Imóveis em Destaque */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-accent">
              Seleção Especial
            </span>
            <h2 className="mt-1 font-serif text-2xl font-semibold text-primary sm:text-3xl">
              Imóveis em Destaque
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Oportunidades escolhidas a dedo nos principais condomínios de
              Cotia e Granja Vianna.
            </p>
          </div>

          <Link
            href="/imoveis"
            className="inline-flex items-center gap-2 rounded-lg border border-primary/25 bg-surface px-4 py-2.5 text-sm font-semibold text-primary shadow-sm transition-colors hover:bg-primary hover:text-white"
          >
            <span>Ver todos os imóveis</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {featuredProperties.length > 0 ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-xl border border-dashed border-border bg-surface p-10 text-center">
            <Building2 className="mx-auto h-10 w-10 text-primary/40" />
            <h3 className="mt-3 font-serif text-lg font-semibold text-foreground">
              Novos imóveis sendo cadastrados
            </h3>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">
              Nossa carteira está sendo atualizada. Fale diretamente com o
              Marcelo no WhatsApp para receber opções exclusivas na região.
            </p>
            <TrackedWhatsAppLink
              href={generalWhatsApp}
              label="Home Empty State WhatsApp"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-whatsapp px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-whatsapp-hover"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Solicitar opções no WhatsApp</span>
            </TrackedWhatsAppLink>
          </div>
        )}
      </section>

      {/* Condomínios em Destaque (SEO Local) */}
      {activeCondominiums.length > 0 && (
        <section className="border-t border-border bg-background py-14 lg:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                  Busca por Localização
                </span>
                <h2 className="mt-1 font-serif text-2xl font-semibold text-primary sm:text-3xl">
                  Condomínios em Destaque em Cotia
                </h2>
                <p className="mt-1.5 max-w-2xl text-sm text-muted">
                  Explore diretamente os imóveis disponíveis nos principais
                  condomínios atendidos na Granja Vianna e região.
                </p>
              </div>

              <Link
                href="/imoveis"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary-hover"
              >
                <span>Explorar catálogo completo</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-7 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              {activeCondominiums.map((condo) => (
                <Link
                  key={condo.name}
                  href={`/imoveis?location=${encodeURIComponent(condo.name)}`}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                        {condo.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {condo.count === 1
                          ? "1 imóvel disponível"
                          : `${condo.count} imóveis disponíveis`}
                        {condo.neighborhood ? ` • ${condo.neighborhood}` : ""}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Bloco "Sobre Marcelo Santos" */}
      <section
        id="sobre"
        className="scroll-mt-20 border-y border-border bg-surface py-16 lg:py-20"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Cartão Visual do Corretor */}
            <div className="lg:col-span-5">
              <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary via-primary to-primary-hover p-8 text-white shadow-md">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/20 bg-white/10 font-serif text-3xl font-semibold text-accent">
                  MS
                </div>

                <div className="mt-6">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-accent">
                    <Award className="h-3.5 w-3.5" />
                    CRECI-SP {BROKER_INFO.creci}
                  </span>
                  <h3 className="mt-3 font-serif text-2xl font-semibold">
                    {BROKER_INFO.brokerName}
                  </h3>
                  <p className="mt-1 text-sm text-white/80">
                    Corretor de Imóveis • {BROKER_INFO.region}
                  </p>
                </div>

                <ul className="mt-6 space-y-2.5 border-t border-white/15 pt-6 text-sm text-white/90">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
                    <span>Atendimento consultivo e sem pressão</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
                    <span>Carteira focada em condomínios de Cotia</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
                    <span>Acompanhamento completo até a entrega das chaves</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Texto e CTAs */}
            <div className="lg:col-span-7">
              <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                Sobre o Corretor
              </span>
              <h2 className="mt-2 font-serif text-3xl font-semibold text-primary sm:text-4xl">
                Confiança e proximidade para realizar o melhor negócio
              </h2>

              <p className="mt-4 text-base leading-relaxed text-muted">
                Comprar, vender ou alugar um imóvel é uma das decisões mais
                importantes da vida. Atuando em{" "}
                <strong className="font-semibold text-foreground">
                  Cotia e Granja Vianna
                </strong>
                , ajudo famílias e investidores a encontrarem imóveis com
                qualidade de vida, segurança de condomínio e preço justo.
              </p>

              <p className="mt-3 text-base leading-relaxed text-muted">
                Cada cliente recebe acompanhamento próximo — desde a escolha dos
                imóveis certos para o seu perfil até a negociação, análise de
                documentação e fechamento com tranquilidade.
              </p>

              {/* CTAs */}
              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <TrackedWhatsAppLink
                  href={generalWhatsApp}
                  label="Home Sobre WhatsApp"
                  className="inline-flex items-center gap-2 rounded-lg bg-whatsapp px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-whatsapp-hover"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Conversar no WhatsApp</span>
                </TrackedWhatsAppLink>

                <TrackedWhatsAppLink
                  href={captacaoWhatsApp}
                  label="Home Captacao WhatsApp"
                  className="inline-flex items-center gap-2 rounded-lg border border-primary bg-surface px-5 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
                >
                  <span>Quer vender ou alugar seu imóvel?</span>
                  <ArrowRight className="h-4 w-4" />
                </TrackedWhatsAppLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bloco de Contato */}
      <section
        id="contato"
        className="scroll-mt-20 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm sm:p-10">
          <div className="grid items-center gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                Fale Comigo
              </span>
              <h2 className="mt-1 font-serif text-2xl font-semibold text-primary sm:text-3xl">
                Pronto para agendar uma visita ou tirar dúvidas?
              </h2>
              <p className="mt-2.5 text-sm leading-relaxed text-muted sm:text-base">
                Envie uma mensagem no WhatsApp ou escolha o canal de sua
                preferência. Retorno rápido e atendimento direto.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <TrackedWhatsAppLink
                  href={generalWhatsApp}
                  label="Home Contato Card WhatsApp"
                  className="flex items-center gap-3 rounded-xl border border-border bg-background p-3.5 transition-colors hover:border-whatsapp"
                >
                  <MessageCircle className="h-5 w-5 shrink-0 text-whatsapp" />
                  <div className="min-w-0">
                    <span className="block text-xs text-muted">WhatsApp</span>
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {publicWhatsAppFormatted}
                    </span>
                  </div>
                </TrackedWhatsAppLink>

                <a
                  href={`mailto:${BROKER_INFO.email}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-background p-3.5 transition-colors hover:border-primary"
                >
                  <Mail className="h-5 w-5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <span className="block text-xs text-muted">E-mail</span>
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {BROKER_INFO.email}
                    </span>
                  </div>
                </a>

                <a
                  href={BROKER_INFO.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-border bg-background p-3.5 transition-colors hover:border-primary"
                >
                  <Instagram className="h-5 w-5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <span className="block text-xs text-muted">Instagram</span>
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {BROKER_INFO.instagram}
                    </span>
                  </div>
                </a>

                <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-3.5">
                  <MapPin className="h-5 w-5 shrink-0 text-accent" />
                  <div className="min-w-0">
                    <span className="block text-xs text-muted">Atuação</span>
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {BROKER_INFO.region}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-stretch justify-center rounded-xl bg-background p-6 text-center lg:col-span-5">
              <p className="font-serif text-lg font-semibold text-primary">
                Atendimento ágil via WhatsApp
              </p>
              <p className="mt-1.5 text-sm text-muted">
                Conte o que você procura e receba uma curadoria personalizada de
                imóveis disponíveis.
              </p>
              <TrackedWhatsAppLink
                href={generalWhatsApp}
                label="Home Contato CTA WhatsApp"
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-whatsapp px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-whatsapp-hover"
              >
                <MessageCircle className="h-5 w-5" />
                <span>Chamar Marcelo no WhatsApp</span>
              </TrackedWhatsAppLink>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
