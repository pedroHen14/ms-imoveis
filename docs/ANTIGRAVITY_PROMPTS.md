# Guia de Execução no Google Antigravity

Use os prompts abaixo em sequência dentro do Antigravity. Sempre inicie cada etapa com `/plan` para revisar o plano antes de o agente escrever código.

---

## FASE 1 — MVP Base (Concluída)

### Bloco 1: Fundação e Banco de Dados
```
/plan Leia @docs/PRD.md e @.agent/rules/project-rules.md.
Vamos executar o Bloco 1 (Fundação):
1. Inicialize/configure o projeto Next.js (App Router, TypeScript, Tailwind CSS) com `@supabase/ssr`, `zod` e `lucide-react`.
2. Crie o arquivo `supabase/migrations/001_initial_schema.sql` com as 4 tabelas (`owners`, `properties`, `property_images`, `leads`), bucket de Storage `property-images` e todas as políticas rigorosas de RLS descritas nas regras.
3. Configure os utilitários de cliente Supabase (browser, server e middleware protegendo `/admin`).
4. Crie um `.env.example` documentando as variáveis necessárias.
```

### Bloco 2: Vitrine Pública e SEO
```
/plan Com base no @docs/PRD.md, vamos construir o Bloco 2 (Vitrine Pública):
1. Layout público com Header (Marcelo Santos Negócios Imobiliários + CRECI 295730 + botão WhatsApp) e Footer.
2. Home Page com barra de filtros, seção de imóveis em destaque e bloco "Sobre o Corretor".
3. Página `/imoveis` com filtros via searchParams (finalidade, tipo, bairro/condomínio, faixa de preço).
4. Página `/imoveis/[slug]` com galeria de imagens, ficha técnica completa (incluindo endereço), botão de WhatsApp com mensagem pré-preenchida e formulário de lead funcional salvando na tabela `leads`.
5. `generateMetadata` dinâmico para Open Graph (WhatsApp preview) e `sitemap.ts`.
6. Crie um seed SQL opcional com alguns dos 10 imóveis prioritários para testarmos o visual no navegador.
```

### Bloco 3: Painel Admin e Upload de Fotos
```
/plan Vamos construir o Bloco 3 (Painel Administrativo desktop-first em `/admin`):
1. Tela de login em `/admin/login` usando Supabase Auth.
2. Layout do `/admin` com navegação lateral simples: Dashboard, Imóveis, Leads (Mini-CRM) e Proprietários.
3. CRUD completo de Proprietários (`/admin/proprietarios`).
4. CRUD completo de Imóveis (`/admin/imoveis`) com upload múltiplo de fotos, compressão automática no navegador antes de enviar ao Supabase Storage e seleção de foto de capa.
```

### Bloco 4: Fábrica de Anúncios (IA) e Mini-CRM
```
/plan Vamos construir o Bloco 4 (Produtividade e Retenção):
1. Crie uma Server Action ou Route Handler usando a API do Gemini que recebe os dados de um imóvel e retorna um JSON estruturado com 3 textos prontos: `site_description`, `olx_text` e `marketplace_text`.
2. Adicione o botão "Gerar Textos com IA" na tela de cadastro/edição do imóvel, exibindo os 3 textos com botões individuais de "Copiar" e opção de aplicar o texto do site diretamente no campo de descrição.
3. Implemente o Mini-CRM em `/admin/leads` com alteração rápida de status, criação manual de lead (para indicações/Newcore), badge de alerta para leads sem contato há >3 dias e botão de 1 clique "Chamar no WhatsApp" que atualiza `last_contact_at`.
```

### Bloco 5: Validação Visual com `/browser`
```
/browser Suba o servidor local, navegue pela Home, pela página de detalhes de um imóvel (em desktop e mobile) e teste o envio do formulário de lead. Depois acesse `/admin` para validar a legibilidade da tabela de imóveis e do Mini-CRM. Gere screenshots para revisão.
```

---

## FASE 2 — Preparação para Agente WhatsApp, Follow-up e Captação

### Bloco 6: Migration Fase 2, RPCs de IA e Endpoint de Follow-up
```
/plan Leia @docs/SPEC_FASE2_DEV.md e @.agent/rules/project-rules.md.
Vamos executar o Bloco 6 (Banco e APIs para Automação):
1. Inspecione primeiro `supabase/migrations/001_initial_schema.sql` para garantir 100% de compatibilidade com os nomes exatos das colunas existentes.
2. Crie `supabase/migrations/002_whatsapp_ai_and_followup.sql` contendo:
   - Extensão `unaccent`;
   - Coluna `ai_notes` em `properties`;
   - Tabela `whatsapp_sessions` com RLS configurado;
   - Funções RPC `search_properties_for_ai`, `get_property_by_code_or_slug`, `upsert_whatsapp_lead` e `get_stale_leads_for_followup`.
3. Crie a rota protegida `GET /api/cron/followup` validando `Authorization: Bearer ${CRON_SECRET}` e retornando a lista e o resumo formatado dos leads sem retorno há >3 dias.
4. Atualize o `.env.example` com `NEXT_PUBLIC_WHATSAPP_BOT_NUMBER`, `CRON_SECRET`, `NEXT_PUBLIC_META_PIXEL_ID` e `NEXT_PUBLIC_GA_ID`.
5. Rode `tsc --noEmit` ao final para validar os tipos.
```

### Bloco 7: Controles da IA no Painel Admin (`/admin`)
```
/plan Com base no @docs/SPEC_FASE2_DEV.md, vamos executar o Bloco 7 (Evolução do Admin):
1. Adicione o campo opcional `ai_notes` ("Informações para o Assistente de WhatsApp") no formulário de criação/edição de imóveis em `/admin/imoveis`, atualizando os schemas Zod e Server Actions.
2. Na tela `/admin/leads`, integre a leitura de `whatsapp_sessions` para mostrar se o lead possui atendimento via IA ativo ou pausado (com data/hora de expiração da pausa).
3. Crie uma Server Action e um botão direto na linha/card do lead para "Pausar IA (24h)" ou "Reativar IA".
4. Garanta que, ao clicar em "Chamar no WhatsApp" dentro de `/admin/leads`, além de atualizar `last_contact_at`, o sistema também pause a IA por 24h caso o lead possua sessão em `whatsapp_sessions`.
5. Valide a compilação com `npm run build`.
```

### Bloco 8: Vitrine (Chip Dedicado, SEO Local e Pixel) + Validação Visual
```
/plan Com base no @docs/SPEC_FASE2_DEV.md, vamos executar o Bloco 8 (Captação e SEO):
1. Atualize os botões de WhatsApp da vitrine pública para ler `NEXT_PUBLIC_WHATSAPP_BOT_NUMBER` (com fallback para `5511966332122`) e padronize a mensagem da página do imóvel incluindo explicitamente o código `(Cód. [code])`.
2. Adicione JSON-LD `RealEstateAgent` na Home e `RealEstateListing` em `/imoveis/[slug]`.
3. Implemente `<title>` e `<meta description>` dinâmicos em `/imoveis` quando houver filtro de condomínio ou bairro na URL, e adicione links rápidos dos condomínios ativos na Home ou Footer para SEO local.
4. Crie um componente client leve para carregar Meta Pixel e GA4 apenas quando as respectivas variáveis de ambiente estiverem configuradas, disparando evento de conversão (`Lead` / `generate_lead`) no envio do formulário e no clique do WhatsApp.
5. Use `/browser` para validar a renderização da Home, da página de detalhes (incluindo o link do WhatsApp gerado) e dos novos controles em `/admin/imoveis` e `/admin/leads`.
```