# Spec Técnica — Fase 2: Agente WhatsApp, Follow-up e Captação

## 1. Contexto e Objetivo
Com o MVP base concluído (Blocos 1 a 5), a Fase 2 prepara a plataforma **Marcelo Santos Negócios Imobiliários** para operar com captação ativa, atendimento automatizado 24/7 em chip dedicado (Meta Cloud API + n8n) e alertas anti-esquecimento.

**Escopo desta fase:**
1. Preparação do banco (Supabase) com tabela de sessões WhatsApp, campo de observações para a IA nos imóveis e RPCs seguras.
2. Evolução do Painel Admin (`/admin`) para controlar o status do robô por lead (pausar/reativar) e alimentar o contexto da IA.
3. Endpoint protegido para disparo de follow-up (leads sem contato há mais de 3 dias).
4. Roteamento de WhatsApp do site para o número comercial dedicado + melhorias de SEO local por condomínio e preparação de Pixel/Analytics.

**Explicitamente fora de escopo agora (Backlog):**
* Feed XML (`VRSync`) para ZAP/VivaReal/Imovelweb — mantido via Newcore por decisão operacional.

---

## 2. Alterações no Banco de Dados (`supabase/migrations/002_whatsapp_ai_and_followup.sql`)

### 2.1. Novo campo em `properties`
Adicionar coluna opcional para orientar o Agente de IA sem poluir a descrição pública:
* `ai_notes` (`TEXT`, nullable): Notas rápidas para a IA responder dúvidas frequentes de negociação (ex.: *"Aceita financiamento bancário; estuda permuta até R$ 200 mil; documentação OK; sol da manhã"*).

### 2.2. Nova tabela `whatsapp_sessions`
Controla a conversa ativa por telefone e impede o robô de atropelar o atendimento humano:
* `phone` (`TEXT`, PK — formato E.164 sem `+`, ex: `5511999999999`)
* `lead_id` (`UUID`, FK -> `leads.id`, `ON DELETE SET NULL`)
* `bot_paused_until` (`TIMESTAMPTZ`, nullable)
* `last_interaction_at` (`TIMESTAMPTZ`, default `NOW()`)
* `created_at` (`TIMESTAMPTZ`, default `NOW()`)

**RLS obrigatório:**
* `SELECT` e `UPDATE` permitidos para usuários autenticados (para o `/admin` visualizar e pausar/reativar).
* `INSERT`/`DELETE` restritos à `service_role` (utilizada pelo n8n). Bloqueio total para anônimos.

### 2.3. Funções RPC Seguras (consumidas pelo n8n)
Criar extensão `unaccent` e expor 4 funções com `SECURITY DEFINER`:

1. **`search_properties_for_ai(p_purpose, p_type, p_location, p_max_price, p_min_bedrooms)`**
   * Filtra apenas imóveis com status disponível.
   * Busca sem diferenciar acentos (`unaccent`) em `condominium`, `neighborhood` e `title`.
   * Aplica margem de **+15%** sobre `p_max_price` para não descartar imóveis negociáveis.
   * Retorna até **3 imóveis** (`is_featured DESC, price ASC`), incluindo `code`, `slug`, `price`, `condo_fee`, `iptu`, `area_built`/`area_total`, `bedrooms`, `suites`, `parking`, `condominium`, `neighborhood`, resumo de `description` (até 400 chars) e `ai_notes`.
2. **`get_property_by_code_or_slug(p_query TEXT)`**
   * Usada quando o cliente chega já citando o código (ex: `104`) ou link específico do site. Retorna ficha completa + `ai_notes`.
3. **`upsert_whatsapp_lead(p_phone, p_name, p_notes, p_property_id)`**
   * Busca lead existente pelo telefone; se não existir, cria com `source = 'whatsapp'` e `status = 'novo'`.
   * Se já existir, atualiza `last_contact_at` e concatena o novo resumo em `notes` sem apagar o histórico anterior.
   * Faz `upsert` automático na tabela `whatsapp_sessions` vinculando `lead_id`.
4. **`get_stale_leads_for_followup(p_days INT DEFAULT 3)`**
   * Retorna leads com `status IN ('novo', 'em_contato', 'visita', 'proposta')` cujo `last_contact_at < NOW() - make_interval(days => p_days)`, trazendo também o título do imóvel vinculado (se houver).

---

## 3. Alterações na Aplicação Next.js

### 3.1. Variáveis de Ambiente (`.env.example`)
Adicionar:
* `NEXT_PUBLIC_WHATSAPP_BOT_NUMBER` — Número do chip dedicado (ex: `55119XXXXXXXX`). Todos os CTAs de WhatsApp da vitrine pública devem usar este número (com fallback para `5511966332122` se vazio).
* `CRON_SECRET` — Token secreto para proteger o endpoint de follow-up (apenas server-side).
* `NEXT_PUBLIC_META_PIXEL_ID` (opcional) — ID do Pixel da Meta.
* `NEXT_PUBLIC_GA_ID` (opcional) — ID do Google Analytics 4.

### 3.2. Vitrine Pública — Conversão e SEO Local
* **Mensagem pré-preenchida otimizada para IA:** Nos botões de WhatsApp da página `/imoveis/[slug]`, padronizar a mensagem contendo o código exato:
  > `"Olá! Vi o imóvel [Título] (Cód. [code]) no site e gostaria de mais informações."`
  *(Isso permite que a IA identifique o imóvel exato na primeira mensagem sem precisar perguntar ao cliente.)*
* **SEO Local por Condomínio:**
  * Adicionar dados estruturados JSON-LD (`RealEstateAgent` na Home e `RealEstateListing` em `/imoveis/[slug]`).
  * Garantir que filtros por condomínio em `/imoveis` gerem `<title>` e `<meta description>` dinâmicos (ex: *"Imóveis no Condomínio Terra Nobre em Cotia | Marcelo Santos"*) e adicionar rotas/links internos dos condomínios ativos no rodapé ou seção "Condomínios em Destaque" para fortalecer o rastreamento do Google.
* **Rastreamento Condicional (Pixel + GA4):**
  * Componente client leve que só injeta os scripts se `NEXT_PUBLIC_META_PIXEL_ID` ou `NEXT_PUBLIC_GA_ID` estiverem definidos.
  * Disparar evento `Lead` (Meta Pixel) e `generate_lead` (GA4) no submit do formulário de interesse e no clique do botão de WhatsApp.

### 3.3. Painel Administrativo (`/admin`)
* **Cadastro/Edição de Imóvel (`/admin/imoveis`):**
  * Incluir seção recolhível ou bloco discreto: **"Informações para o Assistente de WhatsApp (interno)"** mapeado para `ai_notes`, com placeholder didático: *"Ex: Aceita financiamento? Aceita permuta? Posição do sol? Documentação OK?"*.
* **Mini-CRM (`/admin/leads`):**
  * Fazer join leve com `whatsapp_sessions` (via `lead_id` ou `phone`).
  * Exibir indicador visual quando houver sessão de WhatsApp vinculada:
    * Badge verde: `IA Ativa`
    * Badge âmbar: `IA Pausada até DD/MM HH:mm`
  * Botão de 1 clique **"Pausar IA (24h)"** / **"Reativar IA"** via Server Action para o corretor controlar a automação sem precisar abrir o n8n.
  * Manter o botão **"Chamar no WhatsApp"** abrindo o WhatsApp Web no computador do Marcelo e atualizando `last_contact_at` + pausando a IA automaticamente por 24h (se houver sessão vinculada).

### 3.4. Endpoint de Follow-up (`/api/cron/followup`)
* Método `GET`, protegido via `Authorization: Bearer ${process.env.CRON_SECRET}` (retorna `401` se inválido).
* Usa cliente Supabase com `SUPABASE_SERVICE_ROLE_KEY` para chamar `get_stale_leads_for_followup(3)`.
* Retorna JSON contendo `count`, `leads` (nome, telefone formatado, link `https://wa.me/...`, dias sem contato, imóvel) e um campo `formatted_summary` pronto para envio via n8n no WhatsApp pessoal do Marcelo.

---

## 4. Blueprint Externo: n8n + Meta Cloud API

### 4.1. Templates de Utilidade na Meta (Aprovação Prévia)
Como o alerta ao número pessoal do Marcelo (`5511966332122`) pode ocorrer fora da janela de 24h, cadastrar 2 templates na categoria **Utility (Utilidade)**:
1. **`alerta_novo_lead_ms`**:
   * *"Novo cliente qualificado no site/WhatsApp! Nome: {{1}} | Interesse: {{2}} | Resumo: {{3}} | Chamar agora: https://wa.me/{{4}}"*
2. **`lembrete_followup_ms`**:
   * *"Bom dia Marcelo! Você tem {{1}} clientes sem retorno há mais de 3 dias no seu painel. Principais: {{2}}. Acesse o painel para atualizar: {{3}}"*

### 4.2. Pipeline no n8n (Workflow Principal — Atendimento)
1. **WhatsApp Trigger (Meta Cloud API)** -> Filtra apenas mensagens recebidas do cliente.
2. **Switch de Mídia** -> Se áudio, faz download na Meta API e transcreve com **Gemini 2.5 Flash**.
3. **Debounce (8–10s)** -> Agrupa mensagens picadas do mesmo telefone antes de acionar a IA.
4. **Checagem de Pausa (Supabase)** -> Consulta `whatsapp_sessions`; se `bot_paused_until > NOW()`, encerra em silêncio.
5. **AI Agent (Gemini 2.5 Flash + Postgres Chat Memory)** com 3 tools:
   * `buscar_imoveis` -> `search_properties_for_ai`
   * `buscar_imovel_exato` -> `get_property_by_code_or_slug`
   * `escalar_para_corretor` -> chama sub-workflow que executa `upsert_whatsapp_lead`, pausa o bot por 12h na `whatsapp_sessions` e dispara o template `alerta_novo_lead_ms` para `5511966332122`.
6. **Envio de Resposta** -> Quebra textos longos por parágrafo e envia via Meta Cloud API.

### 4.3. Pipeline no n8n (Workflow Secundário — Follow-up)
* **Schedule Trigger:** Segundas e quintas-feiras às `09:00` (horário de Brasília).
* **HTTP Request (`GET /api/cron/followup`):** Passa o `CRON_SECRET`.
* **IF (`count > 0`):** Dispara o template `lembrete_followup_ms` para `5511966332122`.