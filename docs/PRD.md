# PRD — Plataforma Marcelo Santos Negócios Imobiliários

## 1. Visão Geral do Projeto
Desenvolvimento de uma plataforma web sob medida composta por uma **Vitrine Pública Imobiliária (focada em SEO local)** e um **Painel Administrativo / Mini-CRM (desktop-first)** para o corretor autônomo Marcelo Santos.

* **Nome Comercial:** Marcelo Santos Negócios Imobiliários
* **CRECI:** 295730 (Pessoa Física)
* **Região de Atuação:** Cotia e Granja Vianna (SP)
* **Contatos Oficiais:**
  * WhatsApp: `(11) 96633-2122` (`5511966332122`)
  * E-mail: `ms.imoveis04@gmail.com`
  * Instagram: `@ms.imoveis04`
* **Meta de Negócio (6 meses):** Estruturar a carteira (~80 imóveis) e o acompanhamento de interessados para gerar pelo menos **1 venda mensal** na faixa de R$ 300.000+.

---

## 2. Dores Reais que o Sistema Precisa Resolver
1. **Retrabalho ao anunciar:** O corretor perde de 1h a 2h redigindo descrições, organizando fotos espalhadas e redigitando dados manualmente na OLX e Facebook Marketplace.
2. **Perda de leads por esquecimento:** Contatos ficam soltos no WhatsApp e o corretor já perdeu vendas por falta de follow-up.
3. **Falta de centralização:** Dados de proprietários, imóveis e interessados não estão unificados em um painel simples.
4. **Perfil de uso:** O corretor prefere operar o sistema pelo **computador** e tem rotina de atualização de **pelo menos 1 vez por semana**. A interface administrativa deve ter fricção mínima, fontes legíveis e botões diretos.

---

## 3. Identidade Visual e Design System ("Granja Vianna & Natureza")
Visual moderno, acolhedor e acessível para o público médio que busca qualidade de vida e imóveis em condomínios na região de Cotia e Granja Vianna.

* **Paleta de Cores:**
  * **Fundo Principal (Vitrine):** Off-white quente (`#FAF9F6`)
  * **Superfícies / Cards:** Branco puro (`#FFFFFF`) com borda sutil (`#E7E5E4`)
  * **Cor Primária (Marca / Botões / Header):** Verde Floresta (`#1B4332`), com hover em `#2D6A4F`
  * **Cor de Destaque (Acento / Badges):** Areia / Terracota suave (`#C89F65`)
  * **Texto Principal:** Grafite escuro (`#1C1917`)
  * **Texto Secundário:** Cinza quente (`#57534E`)
  * **CTA WhatsApp:** Verde WhatsApp (`#25D366`), com hover em `#1EBE5D`
* **Tipografia (via `next/font/google`):**
  * **Títulos principais (H1, H2, Nome da Marca):** `Lora` (semi-bold) — traz sofisticação acolhedora sem ficar elitista.
  * **Interface, Textos, Preços e Botões:** `Inter` — garante leitura rápida e clara de valores, m² e formulários.
* **Estilo dos Componentes:**
  * Bordas levemente arredondadas (`rounded-xl` nos cards, `rounded-lg` nos botões e inputs).
  * Sombras suaves e limpas (`shadow-sm` com elevação sutil no hover).
  * Fotos dos imóveis sempre como protagonistas nos cards (proporção `4:3` ou `16:10`).
  * No **Painel Admin (`/admin`)**, usar fundo neutro bem limpo (`#F8FAFC`) com a cor primária `#1B4332` nos botões de ação para máxima legibilidade no uso semanal pelo computador.

---

## 4. Escopo do MVP

### 4.1. Vitrine Pública (Site)
* **Identidade & Confiança:** Layout limpo e profissional (referência de estrutura: `bsnimoveis.com.br`), exibindo foto profissional do corretor, número do CRECI e foco regional (Cotia / Granja Vianna).
* **Home Page:**
  * **Header:** Nome da marca (*Marcelo Santos Negócios Imobiliários*), menu enxuto (*Início, Imóveis, Sobre, Contato*) e botão de WhatsApp.
  * **Hero (Capa):** Imagem acolhedora de fundo (condomínio/natureza com overlay escuro suave) + barra de busca centralizada: Finalidade (`Venda`, `Locação`), Tipo (`Casa`, `Apartamento`, `Terreno`, `Comercial`), Bairro/Condomínio e Faixa de Preço.
  * **Seção de Imóveis em Destaque:** Grade com os imóveis marcados como `is_featured` (inicialmente os 10 imóveis prioritários).
  * **Bloco "Sobre Marcelo Santos":** Foto profissional, CRECI `295730`, texto de confiança e CTA para WhatsApp e captação ("Quer vender ou alugar seu imóvel?").
* **Listagem e Filtros (`/imoveis`):** Grid responsivo com paginação, ordenação por preço/mais recentes e cards claros (foto, preço em destaque, condomínio, m², quartos, vagas, bairro/condomínio).
* **Página de Detalhes do Imóvel (`/imoveis/[slug]`):**
  * Galeria de fotos rápida com lightbox.
  * Informações completas: Preço, Condomínio, IPTU, Área, Quartos, Suítes, Vagas, Condomínio e **Endereço público** (autorizado pelo corretor).
  * **Dupla Conversão:**
    1. Botão destaque do WhatsApp com mensagem dinâmica pré-preenchida (*"Olá Marcelo, vi o imóvel [Título - Cód] no seu site e gostaria de mais informações."*).
    2. Formulário rápido (Nome, WhatsApp, Mensagem opcional) que grava diretamente na tabela `leads`.
  * **SEO & Open Graph:** `generateMetadata` dinâmico para que links enviados no WhatsApp exibam foto de capa, título e valor corretamente.

### 4.2. Painel Administrativo (`/admin`) — Desktop-First
* **Autenticação:** Login simples via Supabase Auth (acesso exclusivo do corretor).
* **Gestão de Imóveis (CRUD):**
  * Cadastro enxuto em uma tela limpa.
  * Upload múltiplo de fotos com **compressão automática no navegador** (WebP/JPEG) antes do envio ao Supabase Storage e reordenação simples (primeira foto = capa).
  * Toggle rápido de `status` (`disponivel`, `reservado`, `vendido`, `alugado`, `rascunho`) e `is_featured` (Destaque na Home).
* **Fábrica de Anúncios (IA Integrada):**
  * Botão **"Gerar Textos com IA"** dentro do cadastro/edição do imóvel.
  * Gera automaticamente 3 variações com botões individuais de **"Copiar"**:
    1. **Descrição para o Site:** Completa, organizada e persuasiva.
    2. **Texto para OLX:** Objetivo, com bullets e principais atributos em destaque.
    3. **Texto para Facebook Marketplace:** Curto, direto e com chamada para ação no WhatsApp.
* **Cadastro de Proprietários (`owners`):**
  * Área privada vinculada a cada imóvel (Nome, Telefone, Observações). Nunca exposta publicamente.
* **Mini-CRM de Leads (`leads`):**
  * Visualização em lista/tabela ou Kanban enxuto com status: `novo`, `em_contato`, `visita`, `proposta`, `fechado`, `perdido`.
  * Origem do lead (`site`, `whatsapp`, `indicacao`, `newcore`, `olx`, `marketplace`).
  * **Botão de 1 clique "Chamar no WhatsApp"**: Abre o WhatsApp Web com o cliente e atualiza automaticamente o campo `last_contact_at`.
  * Destaque visual (badge de alerta) para leads ativos com `last_contact_at` superior a 3 dias.

### 4.3. Automação Anti-Esquecimento (Fase Pós-MVP Imediato)
* Endpoint protegido (`/api/cron/followup`) ou fluxo via n8n que consulta leads ativos sem contato há mais de 3 dias e envia um resumo matinal no WhatsApp do corretor (segundas e quintas às 9h).

---

## 5. Modelagem de Dados (Supabase / PostgreSQL)

### `owners` (Privada — RLS restrito a autenticados)
* `id` (uuid, PK)
* `name` (text, not null)
* `phone` (text)
* `notes` (text)
* `created_at` (timestamptz)

### `properties` (Leitura pública apenas se `status = 'disponivel'`)
* `id` (uuid, PK)
* `code` (serial, unique — código amigável ex: `101`, `102`)
* `slug` (text, unique, not null)
* `title` (text, not null)
* `type` (text — `casa`, `apartamento`, `terreno`, `comercial`)
* `purpose` (text — `venda`, `locacao`)
* `price` (numeric)
* `condo_fee` (numeric)
* `iptu` (numeric)
* `area_total` (numeric)
* `area_built` (numeric)
* `bedrooms` (int)
* `suites` (int)
* `bathrooms` (int)
* `parking` (int)
* `condominium` (text)
* `neighborhood` (text)
* `city` (text, default `'Cotia'`)
* `address` (text)
* `description` (text)
* `status` (text, default `'disponivel'`)
* `is_featured` (boolean, default `false`)
* `owner_id` (uuid, FK -> `owners.id`, nullable)
* `created_at` (timestamptz)
* `updated_at` (timestamptz)

### `property_images` (Leitura pública)
* `id` (uuid, PK)
* `property_id` (uuid, FK -> `properties.id`, on delete cascade)
* `url` (text, not null)
* `position` (int, default `0`)
* `created_at` (timestamptz)

### `leads` (Insert público via formulário; Select/Update/Delete restrito a autenticados)
* `id` (uuid, PK)
* `name` (text, not null)
* `phone` (text, not null)
* `email` (text)
* `source` (text, default `'site'`)
* `property_id` (uuid, FK -> `properties.id`, nullable)
* `status` (text, default `'novo'`)
* `notes` (text)
* `last_contact_at` (timestamptz, default `now()`)
* `created_at` (timestamptz)

---

## 6. Imóveis Prioritários para Lançamento (Seed / Primeiro Cadastro)
1. Casa nova — Condomínio Terra Nobre
2. Terreno — Condomínio Terra Nobre
3. Apartamento — Condomínio Europa I
4. Casa 1 — Condomínio Vila Flórida
5. Casa 2 — Condomínio Vila Flórida
6. Terreno 1 — Condomínio Bella Vitá
7. Terreno 2 — Condomínio Bella Vitá
8. Casa — Condomínio Porto Seguro
9. Casa — Condomínio Modernittá
10. Casa — Condomínio Ipê Amarelo