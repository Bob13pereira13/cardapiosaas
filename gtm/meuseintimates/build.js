/* eslint-disable */
/*
 * Builder dos containers GTM (web + server) para meuseintimates.com.br
 * Injeta o codigo de src/*.js|html dentro do JSON com escape correto.
 * Uso: node build.js
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');
const read = (f) => fs.readFileSync(path.join(SRC, f), 'utf8');

const adapter = read('adapter.js');
const consentDefault = read('consent_default.html');
const metaBase = read('meta_pixel_base.html');
const metaEvents = read('meta_pixel_events.html');
const eventIdJs = read('event_id.js');
const userDataJs = read('user_data.js');
const atcEcommerceJs = read('atc_ecommerce.js');
const metaAddToCart = read('meta_addtocart.html');

/* ---------- helpers de parametro ---------- */
const tpl = (key, value) => ({ type: 'TEMPLATE', key, value });
const bool = (key, value) => ({ type: 'BOOLEAN', key, value: value ? 'true' : 'false' });
const mapRow = (name, value) => ({ type: 'MAP', map: [tpl('name', name), tpl('value', value)] });
const list = (key, rows) => ({ type: 'LIST', key, list: rows });

/* ============================================================
 * IDs internos (placeholders) — troque no GTM apos importar
 * ============================================================ */
const PH = {
  GA4: 'G-XXXXXXXXXX',
  SGTM: 'https://sgtm.meuseintimates.com.br',
  PIXEL: '000000000000000',
  CAPI_TOKEN: 'COLE_SEU_TOKEN_CAPI_AQUI',
  ADS_ID: '000000000',
  ADS_LABEL: 'XXXXXXXXXXXXXXXXX'
};

/* ============================================================
 *  CONTAINER WEB
 * ============================================================ */
function buildWeb() {
  let vId = 0, tId = 0, trId = 0;
  const nv = () => '' + (++vId);
  const nt = () => '' + (++tId);
  const ntr = () => '' + (++trId);

  const variable = [];
  const trigger = [];
  const tag = [];

  // ---- Constantes ----
  const C_GA4 = nv();
  variable.push({ variableId: C_GA4, name: 'Const - GA4 Measurement ID', type: 'c', parameter: [tpl('value', PH.GA4)] });
  const C_SGTM = nv();
  variable.push({ variableId: C_SGTM, name: 'Const - sGTM URL', type: 'c', parameter: [tpl('value', PH.SGTM)] });
  const C_PIXEL = nv();
  variable.push({ variableId: C_PIXEL, name: 'Const - Meta Pixel ID', type: 'c', parameter: [tpl('value', PH.PIXEL)] });
  const C_ADS = nv();
  variable.push({ variableId: C_ADS, name: 'Const - Google Ads ID (numerico)', type: 'c', parameter: [tpl('value', PH.ADS_ID)] });
  const C_ADSLBL = nv();
  variable.push({ variableId: C_ADSLBL, name: 'Const - Google Ads Purchase Label', type: 'c', parameter: [tpl('value', PH.ADS_LABEL)] });

  // ---- DataLayer variables ----
  const dlv = (name) => {
    const id = nv();
    variable.push({ variableId: id, name: 'DLV - ' + name, type: 'v',
      parameter: [tpl('name', name), { type: 'INTEGER', key: 'dataLayerVersion', value: '2' }, bool('setDefaultValue', false)] });
    return id;
  };
  const V_ECOM = dlv('ecommerce');
  const V_UEID = dlv('gtm.uniqueEventId');
  const V_DL_EID = dlv('event_id');
  const V_SEARCH = dlv('search_term');
  const V_VAL = dlv('ecommerce.value');
  const V_CUR = dlv('ecommerce.currency');
  const V_TID = dlv('ecommerce.transaction_id');

  // ---- Custom JS: event_id e user_data ----
  const V_EID = nv();
  variable.push({ variableId: V_EID, name: 'CJS - event_id', type: 'jsm', parameter: [tpl('javascript', eventIdJs)] });
  const V_UD = nv();
  variable.push({ variableId: V_UD, name: 'CJS - user_data', type: 'jsm', parameter: [tpl('javascript', userDataJs)] });
  const V_ATC = nv();
  variable.push({ variableId: V_ATC, name: 'CJS - atc_ecommerce', type: 'jsm', parameter: [tpl('javascript', atcEcommerceJs)] });

  // ---- Wrappers de campo do user_data (escalares p/ enviar ao server) ----
  const udFields = [
    ['ud_em', 'email'], ['ud_ph', 'phone_number'], ['ud_fn', 'first_name'],
    ['ud_ln', 'last_name'], ['ud_ct', 'city'], ['ud_st', 'region'],
    ['ud_zp', 'postal_code'], ['ud_country', 'country'], ['ud_external_id', 'external_id']
  ];
  const udVarIds = {};
  udFields.forEach(([alias, prop]) => {
    const id = nv();
    const js = 'function(){var u={{CJS - user_data}};return (u&&u.' + prop + ')?u.' + prop + ':undefined;}';
    variable.push({ variableId: id, name: 'CJS - ' + alias, type: 'jsm', parameter: [tpl('javascript', js)] });
    udVarIds[alias] = id;
  });

  // ---- Triggers ----
  const TR_ECOM = ntr();
  trigger.push({
    triggerId: TR_ECOM, name: 'CE - Ecommerce Events', type: 'CUSTOM_EVENT',
    customEventFilter: [{
      type: 'MATCH_REGEX',
      parameter: [
        tpl('arg0', '{{_event}}'),
        tpl('arg1', '^(view_item|view_item_list|select_item|add_to_cart|remove_from_cart|view_cart|begin_checkout|add_shipping_info|add_payment_info|purchase|view_promotion|select_promotion|search|sign_up)$')
      ]
    }]
  });

  const TR_PURCHASE = ntr();
  trigger.push({
    triggerId: TR_PURCHASE, name: 'CE - purchase', type: 'CUSTOM_EVENT',
    customEventFilter: [{ type: 'EQUALS', parameter: [tpl('arg0', '{{_event}}'), tpl('arg1', 'purchase')] }]
  });

  // Clique no botao "Comprar" (#button-buy / data-tray-tst=button_buy_product) -> add_to_cart
  const TR_ATC = ntr();
  trigger.push({
    triggerId: TR_ATC, name: 'Click - Botao Comprar (add_to_cart)', type: 'CLICK',
    filter: [
      { type: 'CSS_SELECTOR', parameter: [tpl('arg0', '{{Click Element}}'),
        tpl('arg1', '#button-buy, [data-tray-tst="button_buy_product"], button.botao-comprar, button.botao-comprar *')] }
    ],
    // dispara em todos os cliques e filtra pelo seletor acima
    autoEventFilter: []
  });

  // ---- Tags ----
  // Consent Mode default (Consent Initialization)
  tag.push({
    tagId: nt(), name: 'Consent - Default (denied)', type: 'html',
    parameter: [tpl('html', consentDefault), bool('supportDocumentWrite', false)],
    firingTriggerId: ['2147479572'], tagFiringOption: 'oncePerEvent'
  });

  // Adapter Tray -> GA4 (Initialization - All Pages, alta prioridade)
  tag.push({
    tagId: nt(), name: 'Tray DataLayer Adapter', type: 'html',
    parameter: [tpl('html', adapter), bool('supportDocumentWrite', false)],
    firingTriggerId: ['2147479571'], priority: { type: 'INTEGER', value: '100' },
    tagFiringOption: 'oncePerEvent'
  });

  // GA4 Configuration (Google tag) -> envia ao server
  tag.push({
    tagId: nt(), name: 'GA4 - Configuration', type: 'gaawc',
    parameter: [
      tpl('measurementId', '{{Const - GA4 Measurement ID}}'),
      bool('enableSendToServerContainer', true),
      tpl('serverContainerUrl', '{{Const - sGTM URL}}'),
      list('fieldsToSet', [mapRow('first_party_collection', 'true')])
    ],
    firingTriggerId: ['2147479553'], tagFiringOption: 'oncePerEvent'
  });

  // GA4 Event (todos os eventos ecommerce) + event_id + user data escalar
  const eventParams = [
    mapRow('event_id', '{{CJS - event_id}}'),
    mapRow('em', '{{CJS - ud_em}}'),
    mapRow('ph', '{{CJS - ud_ph}}'),
    mapRow('fn', '{{CJS - ud_fn}}'),
    mapRow('ln', '{{CJS - ud_ln}}'),
    mapRow('ct', '{{CJS - ud_ct}}'),
    mapRow('st', '{{CJS - ud_st}}'),
    mapRow('zp', '{{CJS - ud_zp}}'),
    mapRow('country', '{{CJS - ud_country}}'),
    mapRow('external_id', '{{CJS - ud_external_id}}')
  ];
  tag.push({
    tagId: nt(), name: 'GA4 - Ecommerce Events', type: 'gaawe',
    parameter: [
      tpl('eventName', '{{Event}}'),
      tpl('measurementId', '{{Const - GA4 Measurement ID}}'),
      bool('sendEcommerceData', true),
      tpl('ecommerceMacroData', 'dataLayer'),
      list('eventParameters', eventParams)
    ],
    firingTriggerId: [TR_ECOM], tagFiringOption: 'oncePerEvent'
  });

  // Meta Pixel base
  tag.push({
    tagId: nt(), name: 'Meta Pixel - Base + PageView', type: 'html',
    parameter: [tpl('html', metaBase), bool('supportDocumentWrite', false)],
    firingTriggerId: ['2147479553'],
    consentSettings: { consentStatus: 'NEEDED', consentType: { type: 'LIST', list: [tpl('', 'ad_storage')] } },
    tagFiringOption: 'oncePerEvent'
  });

  // Meta Pixel eventos
  tag.push({
    tagId: nt(), name: 'Meta Pixel - Ecommerce Events', type: 'html',
    parameter: [tpl('html', metaEvents), bool('supportDocumentWrite', false)],
    firingTriggerId: [TR_ECOM],
    consentSettings: { consentStatus: 'NEEDED', consentType: { type: 'LIST', list: [tpl('', 'ad_storage')] } },
    tagFiringOption: 'oncePerEvent'
  });

  // GA4 add_to_cart (clique no botao Comprar) - le ecommerce da variavel da pagina
  tag.push({
    tagId: nt(), name: 'GA4 - add_to_cart (clique Comprar)', type: 'gaawe',
    parameter: [
      tpl('eventName', 'add_to_cart'),
      tpl('measurementId', '{{Const - GA4 Measurement ID}}'),
      bool('sendEcommerceData', true),
      tpl('ecommerceMacroData', '{{CJS - atc_ecommerce}}'),
      list('eventParameters', [
        mapRow('event_id', '{{CJS - event_id}}'),
        mapRow('external_id', '{{CJS - ud_external_id}}')
      ])
    ],
    firingTriggerId: [TR_ATC], tagFiringOption: 'oncePerEvent'
  });

  // Meta AddToCart (clique no botao Comprar) - mesmo event_id (dedupe)
  tag.push({
    tagId: nt(), name: 'Meta Pixel - AddToCart (clique Comprar)', type: 'html',
    parameter: [tpl('html', metaAddToCart), bool('supportDocumentWrite', false)],
    firingTriggerId: [TR_ATC],
    consentSettings: { consentStatus: 'NEEDED', consentType: { type: 'LIST', list: [tpl('', 'ad_storage')] } },
    tagFiringOption: 'oncePerEvent'
  });

  // Conversion Linker
  tag.push({
    tagId: nt(), name: 'Google Ads - Conversion Linker', type: 'lcl',
    parameter: [bool('enableCrossDomain', false)],
    firingTriggerId: ['2147479553'], tagFiringOption: 'oncePerEvent'
  });

  // Google Ads Remarketing (All Pages)
  tag.push({
    tagId: nt(), name: 'Google Ads - Remarketing', type: 'sp',
    parameter: [
      tpl('conversionId', '{{Const - Google Ads ID (numerico)}}'),
      bool('enableConversionLinker', true)
    ],
    firingTriggerId: ['2147479553'],
    consentSettings: { consentStatus: 'NEEDED', consentType: { type: 'LIST', list: [tpl('', 'ad_storage')] } },
    tagFiringOption: 'oncePerEvent'
  });

  // Google Ads Conversion (purchase) + Enhanced Conversions
  tag.push({
    tagId: nt(), name: 'Google Ads - Conversao Compra', type: 'awct',
    parameter: [
      tpl('conversionId', '{{Const - Google Ads ID (numerico)}}'),
      tpl('conversionLabel', '{{Const - Google Ads Purchase Label}}'),
      tpl('conversionValue', '{{DLV - ecommerce.value}}'),
      tpl('currencyCode', '{{DLV - ecommerce.currency}}'),
      tpl('orderId', '{{DLV - ecommerce.transaction_id}}'),
      bool('enableConversionLinker', true),
      bool('enableEnhancedConversions', true)
    ],
    firingTriggerId: [TR_PURCHASE],
    consentSettings: { consentStatus: 'NEEDED', consentType: { type: 'LIST', list: [tpl('', 'ad_storage')] } },
    tagFiringOption: 'oncePerEvent'
  });

  const builtInVariable = [
    'PAGE_URL', 'PAGE_HOSTNAME', 'PAGE_PATH', 'REFERRER', 'EVENT',
    'CONTAINER_ID', 'CONTAINER_VERSION', 'RANDOM_NUMBER', 'DEBUG_MODE',
    'CLICK_URL', 'CLICK_TEXT', 'CLICK_ELEMENT', 'CLICK_CLASSES', 'CLICK_ID',
    'CLICK_TARGET'
  ].map((t) => ({ type: t }));

  return wrap('GTM-WEBMEUSE', ['WEB'], { tag, trigger, variable, builtInVariable });
}

/* ============================================================
 *  CONTAINER SERVER
 * ============================================================ */
function buildServer() {
  let vId = 0, tId = 0, cId = 0;
  const nv = () => '' + (++vId);
  const nt = () => '' + (++tId);
  const nc = () => '' + (++cId);

  const variable = [];
  const tag = [];
  const client = [];

  // Constantes
  const cst = (name, val) => { const id = nv(); variable.push({ variableId: id, name, type: 'c', parameter: [tpl('value', val)] }); return id; };
  cst('Const - GA4 Measurement ID', PH.GA4);
  cst('Const - Meta Pixel ID', PH.PIXEL);
  cst('Const - Meta CAPI Token', PH.CAPI_TOKEN);
  cst('Const - Google Ads ID (numerico)', PH.ADS_ID);
  cst('Const - Google Ads Purchase Label', PH.ADS_LABEL);

  // Event Data variables (leem o que o web mandou)
  const ed = (name, keyPath) => {
    const id = nv();
    variable.push({ variableId: id, name, type: 'ed', parameter: [tpl('keyPath', keyPath)] });
    return id;
  };
  ed('ED - event_id', 'event_id');
  ed('ED - value', 'value');
  ed('ED - currency', 'currency');
  ed('ED - transaction_id', 'transaction_id');
  ed('ED - items', 'items');
  ed('ED - em', 'em');
  ed('ED - ph', 'ph');
  ed('ED - fn', 'fn');
  ed('ED - ln', 'ln');
  ed('ED - ct', 'ct');
  ed('ED - st', 'st');
  ed('ED - zp', 'zp');
  ed('ED - country', 'country');
  ed('ED - external_id', 'external_id');

  // GA4 Client
  client.push({
    clientId: nc(), name: 'GA4', type: 'gaaw_client',
    parameter: [
      tpl('activationPath', '/g/collect'),
      bool('allowGtagConfigOverride', true)
    ], priority: 0
  });

  // Trigger "All events" para tags server: usamos firing em todos os eventos do client
  // (no server, tags sem trigger especifico podem usar o gatilho "All" custom)
  const TR_ALL = '2147479553';

  // GA4 tag (relay para o GA4)
  tag.push({
    tagId: nt(), name: 'GA4 - Server', type: 'sgtmgaaw',
    parameter: [
      tpl('measurementId', '{{Const - GA4 Measurement ID}}'),
      bool('redactVisitorIp', false)
    ],
    firingTriggerId: [TR_ALL], tagFiringOption: 'oncePerEvent'
  });

  // Google Ads Conversion (server)
  tag.push({
    tagId: nt(), name: 'Google Ads - Conversao (server)', type: 'sgtmadsct',
    parameter: [
      tpl('conversionId', '{{Const - Google Ads ID (numerico)}}'),
      tpl('conversionLabel', '{{Const - Google Ads Purchase Label}}'),
      tpl('conversionValue', '{{ED - value}}'),
      tpl('currencyCode', '{{ED - currency}}'),
      tpl('orderId', '{{ED - transaction_id}}')
    ],
    firingTriggerId: [TR_ALL], tagFiringOption: 'oncePerEvent'
  });

  const builtInVariable = ['EVENT_NAME', 'CLIENT_NAME', 'PAGE_HOSTNAME', 'REQUEST_PATH']
    .map((t) => ({ type: t }));

  const result = wrap('GTM-SRVMEUSE', ['SERVER'], { tag, trigger: [], variable, builtInVariable });
  result.containerVersion.client = client;
  return result;
}

/* ---------- wrapper de export ---------- */
function wrap(publicId, usageContext, parts) {
  return {
    exportFormatVersion: 2,
    exportTime: new Date().toISOString(),
    containerVersion: {
      path: 'accounts/0/containers/0/versions/0',
      accountId: '0',
      containerId: '0',
      containerVersionId: '0',
      name: publicId.indexOf('WEB') > -1 ? 'Meuseintimates - WEB v1' : 'Meuseintimates - SERVER v1',
      container: {
        path: 'accounts/0/containers/0',
        accountId: '0',
        containerId: '0',
        name: 'meuseintimates.com.br ' + usageContext[0],
        publicId,
        usageContext,
        fingerprint: '0',
        tagManagerUrl: ''
      },
      tag: parts.tag,
      trigger: parts.trigger,
      variable: parts.variable,
      builtInVariable: parts.builtInVariable,
      fingerprint: '0'
    }
  };
}

/* ---------- escreve ---------- */
const web = buildWeb();
const server = buildServer();
fs.writeFileSync(path.join(__dirname, 'web-container.json'), JSON.stringify(web, null, 2));
fs.writeFileSync(path.join(__dirname, 'server-container.json'), JSON.stringify(server, null, 2));

// validacao basica de JSON
JSON.parse(fs.readFileSync(path.join(__dirname, 'web-container.json'), 'utf8'));
JSON.parse(fs.readFileSync(path.join(__dirname, 'server-container.json'), 'utf8'));
console.log('OK  web tags=' + web.containerVersion.tag.length +
  '  vars=' + web.containerVersion.variable.length +
  '  triggers=' + web.containerVersion.trigger.length);
console.log('OK  server tags=' + server.containerVersion.tag.length +
  '  clients=' + server.containerVersion.client.length +
  '  vars=' + server.containerVersion.variable.length);
