import Link from "next/link";
import { ArrowLeft, Building2, MessageCircle } from "lucide-react";
import { buildWhatsAppUrl } from "@/lib/format";

export default function PropertyNotFound() {
  const whatsappHref = buildWhatsAppUrl(
    "Olá Marcelo, acessei um link de imóvel no seu site que não está mais disponível. Pode me mostrar opções semelhantes?",
  );

  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Building2 className="h-8 w-8" />
      </div>

      <h1 className="mt-6 font-serif text-3xl font-semibold text-primary">
        Imóvel não encontrado ou já negociado
      </h1>

      <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
        Este imóvel pode ter sido vendido, alugado recentemente ou o endereço
        digitado está incorreto. Confira outras opções disponíveis na região ou
        fale diretamente com o Marcelo.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/imoveis"
          className="inline-flex items-center gap-2 rounded-lg border border-primary bg-surface px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Ver imóveis disponíveis</span>
        </Link>

        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-whatsapp px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-whatsapp-hover"
        >
          <MessageCircle className="h-4 w-4" />
          <span>Pedir opções no WhatsApp</span>
        </a>
      </div>
    </main>
  );
}
