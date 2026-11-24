# Guia de Execução no Google Antigravity

Use os prompts abaixo em sequência dentro do Antigravity. Sempre inicie cada etapa com `/plan` para revisar o plano antes de o agente escrever código.

---

## Bloco 1: Fundação e Banco de Dados
```text
/plan Leia @docs/PRD.md e @.agent/rules/project-rules.md.
Vamos executar o Bloco 1 (Fundação):
1. Inicialize/configure o projeto Next.js (App Router, TypeScript, Tailwind CSS) com `@supabase/ssr`, `zod` e `lucide-react`.
2. Crie o arquivo `supabase/migrations/001_initial_schema.sql` com as 4 tabelas (`owners`, `properties`, `property_images`, `leads`), bucket de Storage `property-images` e todas as políticas rigorosas de RLS descritas nas regras.
3. Configure os utilitários de cliente Supabase (browser, server e middleware protegendo `/admin`).
4. Crie um `.env.example` documentando as variáveis necessárias.
```

---

## Bloco 2: Vitrine Pública e SEO
```text
/plan Com base no @docs/PRD.md, vamos construir o Bloco 2 (Vitrine Pública):
1. Layout público com Header (Marcelo Santos Negócios Imobiliários + CRECI 295730 + botão WhatsApp) e Footer.
2. Home Page com barra de filtros, seção de imóveis em destaque e bloco "Sobre o Corretor".
3. Página `/imoveis` com filtros via searchParams (finalidade, tipo, bairro/condomínio, faixa de preço).
4. Página `/imoveis/[slug]` com galeria de imagens, ficha técnica completa (incluindo endereço), botão de WhatsApp com mensagem pré-preenchida e formulário de lead funcional salvando na tabela `leads`.
5. `generateMetadata` dinâmico para Open Graph (WhatsApp preview) e `sitemap.ts`.
6. Crie um seed SQL opcional com alguns dos 10 imóveis prioritários para testarmos o visual no navegador.
```

---

## Bloco 3: Painel Admin e Upload de Fotos
```text
/plan Vamos construir o Bloco 3 (Painel Administrativo desktop-first em `/admin`):
1. Tela de login em `/admin/login` usando Supabase Auth.
2. Layout do `/admin` com navegação lateral simples: Dashboard, Imóveis, Leads (Mini-CRM) e Proprietários.
3. CRUD completo de Proprietários (`/admin/proprietarios`).
4. CRUD completo de Imóveis (`/admin/imoveis`) com upload múltiplo de fotos, compressão automática no navegador antes de enviar ao Supabase Storage e seleção de foto de capa.
```

---

## Bloco 4: Fábrica de Anúncios (IA) e Mini-CRM
```text
/plan Vamos construir o Bloco 4 (Produtividade e Retenção):
1. Crie uma Server Action ou Route Handler usando a API do Gemini que recebe os dados de um imóvel e retorna um JSON estruturado com 3 textos prontos: `site_description`, `olx_text` e `marketplace_text`.
2. Adicione o botão "Gerar Textos com IA" na tela de cadastro/edição do imóvel, exibindo os 3 textos com botões individuais de "Copiar" e opção de aplicar o texto do site diretamente no campo de descrição.
3. Implemente o Mini-CRM em `/admin/leads` com alteração rápida de status, criação manual de lead (para indicações/Newcore), badge de alerta para leads sem contato há >3 dias e botão de 1 clique "Chamar no WhatsApp" que atualiza `last_contact_at`.
```

---

## Bloco 5: Validação Visual com `/browser`
```text
/browser Suba o servidor local, navegue pela Home, pela página de detalhes de um imóvel (em desktop e mobile) e teste o envio do formulário de lead. Depois acesse `/admin` para validar a legibilidade da tabela de imóveis e do Mini-CRM. Gere screenshots para revisão.
```