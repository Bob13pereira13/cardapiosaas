# GTM Web + Server para meuseintimates.com.br (Tray)

Setup completo de tagueamento server-side com **GA4 + Google Ads + Meta (Pixel + CAPI)**,
deduplicação browser × server, Advanced Matching / Enhanced Conversions, cookies
first-party e **Consent Mode v2 (LGPD)**.

```
Loja Tray ─► dataLayer ─► [GTM WEB] ─► GA4 / Google Ads / Meta Pixel (navegador)
                                │
                                └─(first-party)─► [GTM SERVER / Stape] ─► GA4
                                                                          ├─► Google Ads (server)
                                                                          └─► Meta CAPI (server)
```

---

## Conteúdo deste pacote

| Arquivo | O que é |
|---|---|
| `web-container.json` | Container **Web** pronto para importar no GTM |
| `server-container.json` | Container **Server** (núcleo GA4 + Google Ads + variáveis) |
| `src/adapter.js` | Adapter que traduz o dataLayer da Tray (UA/EEC **ou** GA4) para GA4 |
| `src/event_id.js` | Gera `event_id` estável (dedupe Pixel × CAPI) |
| `src/user_data.js` | Monta `user_data` (Advanced Matching / Enhanced Conversions) |
| `src/meta_pixel_base.html` | Pixel base + Advanced Matching + PageView |
| `src/meta_pixel_events.html` | Eventos de ecommerce do Pixel (com `eventID`) |
| `src/consent_default.html` | Consent Mode v2 — estado padrão negado |
| `build.js` | Regerador dos JSONs (caso você edite os `src/`) |

> Editou algo em `src/`? rode `node build.js` para regenerar os JSONs.

---

## 0) Pré-requisitos (IDs que você precisa ter)

| Placeholder no JSON | Onde pegar | Exemplo |
|---|---|---|
| `G-XXXXXXXXXX` | GA4 → Admin → Fluxos de dados | `G-ABC123DEF4` |
| `https://sgtm.meuseintimates.com.br` | URL do seu server container (Stape) | — |
| `000000000000000` (Pixel) | Meta Events Manager → Conjunto de dados | `1234567890` |
| `COLE_SEU_TOKEN_CAPI_AQUI` | Meta Events Manager → Configurações → API de Conversões → Gerar token | — |
| `000000000` (Google Ads ID) | Google Ads → a parte **numérica** depois de `AW-` | `987654321` |
| `XXXXXXXXXXXXXXXXX` (label) | Google Ads → Conversões → ação de compra | `abcDEfgh12` |

---

## 1) Criar os containers no GTM

1. Em <https://tagmanager.google.com> crie **2 containers** na conta da loja:
   - Um do tipo **Web** (plataforma "Web").
   - Um do tipo **Server** (plataforma "Server").

## 2) Subir o Server no Stape

1. Crie conta em <https://stape.io> → **Add Container**.
2. Cole o **Container Config** do seu container Server do GTM
   (GTM → container Server → Admin → "Container Configuration").
3. O Stape gera uma URL (ex.: `https://xxxx.stape.io`). **Recomendado:** configure o
   subdomínio próprio **`sgtm.meuseintimates.com.br`** (Stape → Domains) e aponte o
   CNAME no DNS. Usar subdomínio do próprio site é o que mantém os cookies
   **first-party** e maximiza a vida útil deles (essencial para Safari/ITP).
4. Essa URL final é o valor da constante **`Const - sGTM URL`** no container Web.

## 3) Importar os JSONs

- **Web:** GTM (container Web) → Admin → **Importar contêiner** → `web-container.json`
  → Workspace existente → **Mesclar** → **Substituir**.
- **Server:** GTM (container Server) → Admin → **Importar contêiner** → `server-container.json`
  → Mesclar.

> Se algum nome de tag conflitar, escolha "Substituir conflitos".

## 4) Preencher os IDs (constantes)

Em cada container, abra **Variáveis** e edite as `Const - ...` trocando os placeholders
da tabela do item 0. Faça isso no **Web** e no **Server**.

## 5) Instalar o GTM Web na Tray

1. Painel Tray → **Configurações → Integrações → Ferramentas Google** (ou
   *Dados da loja → Google*), campo **Google Tag Manager**.
2. Cole o **ID do container Web** (`GTM-XXXXXXX`). A Tray injeta o script do GTM e a
   camada de dados automaticamente — **não** precisa editar HTML do tema.
3. Salve. (A Tray cuida do snippet `<head>` e `<body>`.)

> O `Tray DataLayer Adapter` já trata tanto o formato antigo (Enhanced Ecommerce/UA)
> quanto o GA4. **Valide no Preview** quais nomes de evento a sua loja dispara e,
> se precisar, ajuste o mapa `MAP` em `src/adapter.js` (e rode `node build.js`).

---

## 6) Meta CAPI no Server (template da galeria)

O Meta CAPI server-side usa o **template oficial da galeria** — por segurança, o GTM
não permite embutir templates de galeria dentro de um JSON de terceiros, então é um
add de poucos cliques:

1. Container **Server** → **Tags → Nova → Tipo de tag → Descobrir mais na galeria**.
2. Procure **"Conversions API Tag"** (autor: *facebookarchive* / *Stape* — ambos servem)
   e **adicione ao workspace**.
3. Crie uma tag com esse template e configure:
   - **Pixel ID / Dataset ID:** `{{Const - Meta Pixel ID}}`
   - **API Access Token:** `{{Const - Meta CAPI Token}}`
   - **Event Name:** mapear pelo evento (ver tabela do item 9) ou usar `{{Event Name}}`
     com um Lookup Table GA4→Meta.
   - **Event ID (dedupe):** `{{ED - event_id}}`
   - **Action Source:** `website`
   - **User Data:** mapear os campos para as variáveis Event Data já incluídas:
     - Email → `{{ED - em}}`
     - Phone → `{{ED - ph}}`
     - First Name → `{{ED - fn}}` · Last Name → `{{ED - ln}}`
     - City → `{{ED - ct}}` · State → `{{ED - st}}` · Zip → `{{ED - zp}}`
     - Country → `{{ED - country}}` · External ID → `{{ED - external_id}}`
     > O template **hasheia SHA-256** automaticamente. IP e User-Agent são
     > preenchidos pelo servidor sozinho. `_fbp`/`_fbc` o template lê do request.
   - **Custom Data (compra):** Value → `{{ED - value}}`, Currency → `{{ED - currency}}`,
     Order ID → `{{ED - transaction_id}}`, Contents → `{{ED - items}}`.
4. **Trigger:** crie um gatilho de cliente "GA4" (Custom event) ou dispare em todos os
   eventos do client GA4. Para purchase específico, filtre `Event Name equals purchase`.

> Alternativa "plug-and-play": o Stape tem o **Facebook Conversion API Tag** próprio
> nos *Power-Ups*, com cookie-keeper para `_fbp`/`_fbc`. Mesma lógica de mapeamento.

---

## 7) Consent Mode v2 (LGPD)

- A tag **`Consent - Default (denied)`** já sobe com tudo negado e dispara no gatilho
  **Consent Initialization**. As tags de Ads/Meta estão marcadas como
  **"requer consentimento adicional" (`ad_storage`)** e só disparam após o "granted".
- Conecte ao seu **banner de cookies**. Quando o usuário aceitar, dispare:

```html
<script>
  gtag('consent','update',{
    ad_storage:'granted', ad_user_data:'granted',
    ad_personalization:'granted', analytics_storage:'granted'
  });
</script>
```

  ou `dataLayer.push({event:'consent_update'})` + uma tag de update no GTM.
- Se você usa um **CMP certificado** (Cookiebot, Iubenda, Osano…), use o template
  oficial dele e **remova** a tag `Consent - Default`.

---

## 8) Cookies de usuário (como ficam)

| Cookie | Quem cria | Para quê |
|---|---|---|
| `_ga`, `_ga_*` | GA4 | identidade GA4 (first-party) |
| `_fbp` | Meta Pixel | id de navegador Meta (lido pela CAPI) |
| `_fbc` | Pixel/CAPI a partir do `fbclid` | atribuição de clique Meta |
| `FPID`/`FPLC` | sGTM (server) | identidade first-party server-side (Stape) |
| `gclid`/`wbraid`/`gbraid` | Conversion Linker | atribuição Google Ads |

Com o sGTM no subdomínio próprio, esses cookies são **first-party HttpOnly**, com vida
útil maior e resistência a ITP/bloqueadores.

---

## 9) Eventos e parâmetros — MAPEAMENTO REAL desta loja

O adapter (`src/adapter.js`) foi calibrado com os `dataLayer` reais da loja.
A Tray **não** usa nomes GA4 nativos: ela dispara nomes próprios em **dois formatos**
(produto = campos achatados na raiz; carrinho/checkout/compra = Enhanced Ecommerce).
O roteamento é feito por `event` + `pageCategory`:

**Funil enxuto (5 etapas, por opção do projeto):**
`PageView` → `ViewContent` → `AddToCart` → `InitiateCheckout` → `Purchase`

| Origem (Tray) | → GA4 | → Meta | Dados |
|---|---|---|---|
| Todas as páginas | — (config) | **PageView** | Pixel base + GA4 Config |
| `tray.updateGTM` / `Produto` | `view_item` | **ViewContent** | raiz: `idProduct`, `nameProduct`, `priceSell`, `listSku[]`, `breadcrumbDetails` |
| **clique `#button-buy`** | `add_to_cart` | **AddToCart** | produto da página (`CJS - atc_ecommerce`) |
| `checkout` / `EasyCheckout_Identification` | `begin_checkout` | **InitiateCheckout** | `ecommerce.checkout.products[]` |
| `purchase` / `EasyCheckout_OrderPlaced` | `purchase` | **Purchase** | `ecommerce.purchase.actionField` + `products[]` + cliente na raiz |

> O evento `cart` (página do carrinho) é **ignorado de propósito** — o sinal de carrinho
> é o `add_to_cart` no clique do botão. Eventos secundários (`view_item_list`,
> `add_shipping_info`, etc.) não fazem parte deste funil.

**Mapeamento de campos (item):**

| GA4 | Produto (raiz) | Carrinho/Checkout/Compra (EEC) |
|---|---|---|
| `item_id` | `idProduct` | `id` (fallback `sku`) |
| `item_name` | `nameProduct` | `name` |
| `price` | `priceSell` (fallback `price`) | `price` |
| `quantity` | `1` | `quantity` |
| `item_brand` | `brand` | `brand` |
| `item_variant` | `listSku[0].nameSku` | `variant` |
| `item_category`(1..5) | `category` / `breadcrumbDetails[]` | `category` / `categories[]` |
| `ean` | `EAN` | `ean` |

**Compra (`purchase`):** `transaction_id` ← `actionField.id`, `value` ← `revenue`,
`shipping` ← `shipping`, `coupon` ← `coupon`/`discountCode`, `currency` = `BRL` (fixo).

**`user_data` (Advanced Matching + CAPI):** preenchido a partir da compra e de qualquer
página logada — `email`/`customerEmail`, `customerName`→`first/last_name`,
`visitorDemographicInfo.zipCode/city/state`, e **`external_id`** ← `customerId`/`userId`/`visitorId`
(este último presente em **todas** as páginas, então o match nunca fica zerado).

> ✅ **`add_to_cart` (AddToCart) — JÁ IMPLEMENTADO via clique.** A loja não emite evento
> no dataLayer ao clicar em "Comprar" (ela redireciona para o carrinho, que dispara
> `cart` → mapeado como `view_cart`). Por isso o `add_to_cart` é disparado por um
> **gatilho de clique** no botão de compra:
> - **Trigger:** `Click - Botao Comprar (add_to_cart)` — Click (All Elements) filtrado por
>   `Click Element` matches CSS `#button-buy, [data-tray-tst="button_buy_product"], button.botao-comprar, button.botao-comprar *`
>   (o `*` cobre o clique no `<span>` interno do botão).
> - **Dados:** a variável `CJS - atc_ecommerce` lê o produto da página (formato achatado
>   da Tray) e monta `items[]`. Tags `GA4 - add_to_cart` e `Meta Pixel - AddToCart`
>   disparam com o **mesmo `event_id`** (dedupe).
> - O envio resiste ao redirecionamento (GA4/Pixel usam beacon). Valide no Preview que o
>   `add_to_cart` aparece ao clicar em "Comprar". Se a Tray algum dia passar a emitir um
>   evento próprio de adicionar ao carrinho, troque para esse gatilho.

> Os eventos `view_item_list`, `select_item`, `remove_from_cart`, `search`, `sign_up`
> ficam suportados no GTM, mas **só dispararão** se a Tray (ou um gatilho extra)
> fornecer o dado correspondente. Hoje não vimos esses no dataLayer.

---

## 10) Validação (checklist)

1. **GTM Preview (Web):** Tag Assistant → navegue pela loja → confira em cada
   ação se o evento GA4 dispara com `ecommerce.items` preenchido.
2. **GA4 DebugView:** Admin → DebugView → ver `view_item`, `add_to_cart`, `purchase`
   com `items`, `value`, `currency`, `transaction_id`.
3. **GTM Preview (Server):** Stape → "Preview" / GTM server Preview → confira o request
   chegando, o GA4 tag e a Meta CAPI disparando.
4. **Meta Test Events:** Events Manager → Testar Eventos → ver Pixel **e** CAPI com o
   **mesmo `event_id`** e status **"Deduplicado"**. Cheque o **Event Match Quality**.
5. **Google Ads:** Conversões → diagnóstico da ação de compra → "Gravando conversões"
   e Enhanced Conversions "Ativo".
6. **Cookies:** DevTools → Application → Cookies → confirmar `_ga`, `_fbp`, `_fbc`,
   `FPID` no domínio `.meuseintimates.com.br`.

---

## 11) Observações importantes / troubleshooting

- **Dados pessoais só onde existem:** a Tray normalmente só expõe e-mail/telefone do
  cliente no checkout/`purchase`. O `user_data` envia **apenas campos preenchidos** —
  em páginas anônimas vão só `external_id`/`fbp`/`fbc`/IP/UA. Isso é o correto (campo
  vazio piora o match e gera warning).
- **`event_id`:** é o mesmo no Pixel e na CAPI por evento. Não remova o `event_id` do
  GA4 Event tag — é ele que viaja até o server para a dedupe.
- **Nomes de evento da Tray:** se no Preview algum evento de ecommerce **não** disparar,
  o nome no `dataLayer` da Tray difere do esperado → ajuste o objeto `MAP` em
  `src/adapter.js` e rode `node build.js`, reimporte o Web.
- **Tipos de tag no Server:** o `server-container.json` traz GA4 client, GA4 tag e
  Google Ads com os tipos nativos. Se a sua versão do GTM server renomear algum campo,
  o import ainda funciona — basta abrir a tag e confirmar o mapeamento.
- **Política da Tray:** instale o GTM **somente** pelo campo oficial (Ferramentas
  Google). Não duplique GA4/Pixel direto no tema, senão você conta evento em dobro.

---

## Resumo do que já vem pronto vs. manual

| Item | Status |
|---|---|
| Adapter Tray→GA4 (2 formatos) | ✅ no JSON Web |
| GA4 web → server (first-party) | ✅ no JSON Web |
| Meta Pixel + Advanced Matching + dedupe | ✅ no JSON Web |
| Google Ads remarketing + conversão + Enhanced Conv. | ✅ no JSON Web |
| Consent Mode v2 (default denied) | ✅ no JSON Web *(conectar ao banner)* |
| GA4 server tag + Event Data vars + constantes | ✅ no JSON Server |
| Google Ads server | ✅ no JSON Server |
| **Meta CAPI server** | ⚙️ add via galeria (item 6) — mapeamento pronto |
| Banner de cookies / CMP | ⚙️ seu banner chama `consent update` (item 7) |
