# Regras do Projeto — Marcelo Santos Negócios Imobiliários

## 1. Stack Tecnológica Obrigatória
* **Framework:** Next.js (App Router) com TypeScript em modo `strict`.
* **Estilização:** Tailwind CSS + componentes limpos (shadcn/ui ou Radix UI). Evite bibliotecas de UI pesadas ou legadas.
* **Backend / Banco / Auth / Storage:** Supabase (`@supabase/ssr` para Server Components, Server Actions e Middleware).
* **Validação:** Zod para todos os formulários e Server Actions.
* **Ícones:** `lucide-react`.
* **IA (Fábrica de Anúncios):** Google Gemini API (`@google/genai`) executada exclusivamente no servidor (Route Handler ou Server Action).

## 2. Arquitetura e Padrões de Código
* Prefira **Server Components** por padrão; use `'use client'` apenas onde houver interatividade real (formulários, filtros dinâmicos, galeria, upload).
* Use **Server Actions** para mutações no `/admin` e no formulário público de leads.
* Formate valores monetários em `pt-BR` (`R$ 300.000`) e telefones no padrão brasileiro `(11) 96633-2122`.
* Todos os textos da interface, mensagens de erro, labels e placeholders devem estar em **Português do Brasil (pt-BR)**.
* Gere `slug` SEO-friendly automaticamente (ex: `casa-condominio-terra-nobre-cotia-101`).

## 3. Segurança e Banco de Dados (CRÍTICO)
* **RLS (Row Level Security) obrigatório em todas as tabelas:**
  * `owners`: `SELECT`, `INSERT`, `UPDATE`, `DELETE` permitidos **apenas** para usuários autenticados. Nunca retornar `owner_id` ou dados do proprietário em queries públicas.
  * `leads`: `INSERT` permitido para anônimos (formulário do site); `SELECT`, `UPDATE`, `DELETE` permitidos **apenas** para autenticados.
  * `properties`: `SELECT` público apenas para registros com `status = 'disponivel'`; demais operações restritas a autenticados.
  * `property_images`: `SELECT` público; `INSERT`/`UPDATE`/`DELETE` restritos a autenticados.
* Nunca expor `SUPABASE_SERVICE_ROLE_KEY` ou `GEMINI_API_KEY` no client-side.

## 4. Diretrizes de UX / UI e Design System
* **Paleta Obrigatória (Tema "Granja Vianna & Natureza"):**
  * Fundo da vitrine: `#FAF9F6` (Off-white quente)
  * Cards e superfícies: `#FFFFFF` com borda `#E7E5E4`
  * Cor primária: `#1B4332` (Verde Floresta) | Hover: `#2D6A4F`
  * Cor de destaque/acento: `#C89F65` (Areia / Terracota suave)
  * Textos: `#1C1917` (principal) e `#57534E` (secundário)
  * Botão WhatsApp: `#25D366` | Hover: `#1EBE5D`
* **Tipografia (`next/font/google`):**
  * `Lora` para títulos principais (`h1`, `h2`) e nome da marca.
  * `Inter` para textos corridos, preços, especificações, labels e todo o painel `/admin`.
* **Vitrine Pública:** Mobile-first para clientes vindos do WhatsApp e Instagram, com foco nas fotos dos imóveis e conversão direta (WhatsApp + formulário curto).
* **Painel Admin (`/admin`):** Desktop-first, fundo neutro (`#F8FAFC`) com botões primários `#1B4332`. Evite menus aninhados complexos, jargões técnicos em inglês e formulários excessivamente longos.
* **Performance de Imagens:** Sempre comprimir imagens no client-side (ex: `browser-image-compression`) antes do upload para o Supabase Storage (largura máxima 1600px, formato WebP/JPEG).

## 5. Fluxo de Trabalho do Agente
* Sempre apresente um plano claro antes de criar múltiplos arquivos ou alterar o schema do banco.
* Ao finalizar um bloco funcional, execute `npm run build` ou verificação de tipos (`tsc --noEmit`) para garantir zero erros de compilação.
* Ao alterar UI, valide visualmente no navegador local (desktop e mobile) antes de considerar a tarefa concluída.