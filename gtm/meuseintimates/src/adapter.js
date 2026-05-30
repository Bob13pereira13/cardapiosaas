<script>
/*
 * Tray (loja MEUSE INTIMATES) -> GA4 dataLayer Adapter
 * ------------------------------------------------------------------
 * Calibrado com os dataLayers REAIS da loja meuseintimates.com.br.
 *
 * A Tray desta loja dispara eventos com NOMES proprios e em DOIS formatos:
 *
 *   1) PRODUTO  -> event:"tray.updateGTM", pageCategory:"Produto"
 *                  dados ACHATADOS na raiz (idProduct, nameProduct, priceSell, listSku[])
 *                  => GA4 view_item / Meta ViewContent
 *
 *   2) CARRINHO -> event:"cart", pageCategory:"Carrinho"
 *                  Enhanced Ecommerce em ecommerce.checkout.products[]
 *                  => GA4 view_cart / Meta ViewContent
 *
 *   3) CHECKOUT -> event:"checkout", pageCategory:"EasyCheckout_Identification" (step 1)
 *                  EEC em ecommerce.checkout.products[]
 *                  => GA4 begin_checkout / Meta InitiateCheckout
 *                  (steps de entrega/pagamento -> add_shipping_info/add_payment_info)
 *
 *   4) COMPRA   -> event:"purchase", pageCategory:"EasyCheckout_OrderPlaced" (step 6)
 *                  EEC em ecommerce.purchase.actionField + products[]
 *                  + dados do cliente na RAIZ (email, customerName, customerId,
 *                    visitorDemographicInfo{zipCode,city,state,...})
 *                  => GA4 purchase / Meta Purchase  (+ user_data p/ CAPI/Advanced Matching)
 *
 * Estrategia: este adapter le o evento BRUTO da Tray, normaliza para o
 * padrao GA4 (ecommerce.items) e re-empurra com o nome de evento GA4 + um
 * objeto user_data. Os gatilhos do GTM disparam nos nomes GA4.
 */
(function () {
  var w = window;
  w.dataLayer = w.dataLayer || [];
  if (w.__trayGa4AdapterLoaded) { return; }
  w.__trayGa4AdapterLoaded = true;

  var CURRENCY = 'BRL'; // a Tray nao envia currency no dataLayer

  function num(v) {
    if (v === null || v === undefined || v === '') { return undefined; }
    var n = parseFloat(('' + v).replace(/[^0-9.,-]/g, '').replace(',', '.'));
    return isNaN(n) ? undefined : n;
  }
  function round2(n) { return Math.round((n || 0) * 100) / 100; }

  /* ---------- normalizacao de itens ---------- */

  // categorias: aceita string "A/B" OU array categories:[{name,level}]
  function applyCategories(item, catStr, catArr) {
    if (catArr && catArr.length) {
      var sorted = catArr.slice().sort(function (a, b) { return (a.level || 0) - (b.level || 0); });
      for (var i = 0; i < sorted.length && i < 5; i++) {
        item['item_category' + (i === 0 ? '' : (i + 1))] = sorted[i].name;
      }
    } else if (catStr) {
      if (('' + catStr).indexOf('/') > -1) {
        var p = ('' + catStr).split('/');
        item.item_category = p[0];
        for (var j = 1; j < p.length && j <= 4; j++) { item['item_category' + (j + 1)] = p[j]; }
      } else {
        item.item_category = catStr;
      }
    }
  }

  // PRODUTO (formato achatado da pagina de produto)
  function itemFromFlat(o) {
    var item = {
      item_id: o.idProduct,
      item_name: o.nameProduct,
      price: num(o.priceSell != null ? o.priceSell : o.price),
      quantity: 1
    };
    if (o.brand) { item.item_brand = o.brand; }
    if (o.EAN) { item.ean = o.EAN; }
    // variante: usa o 1o SKU da lista, se houver
    if (o.listSku && o.listSku.length && o.listSku[0].nameSku) {
      item.item_variant = o.listSku[0].nameSku;
    }
    applyCategories(item, o.category, o.breadcrumbDetails);
    return item;
  }

  // EEC (carrinho / checkout / compra)
  function itemFromEEC(p) {
    if (!p) { return null; }
    var item = {
      item_id: p.id || p.sku,
      item_name: p.name,
      price: num(p.price),
      quantity: num(p.quantity) || 1
    };
    if (p.brand) { item.item_brand = p.brand; }
    if (p.variant) { item.item_variant = p.variant; }
    if (p.ean) { item.ean = p.ean; }
    applyCategories(item, p.category, p.categories);
    if (item.item_id == null && item.item_name == null) { return null; }
    return item;
  }

  function itemsFromEEC(arr) {
    var out = [];
    if (!arr) { return out; }
    for (var i = 0; i < arr.length; i++) {
      var it = itemFromEEC(arr[i]);
      if (it) { out.push(it); }
    }
    return out;
  }

  function sumValue(items) {
    var t = 0;
    for (var i = 0; i < items.length; i++) { t += (num(items[i].price) || 0) * (num(items[i].quantity) || 1); }
    return round2(t);
  }

  /* ---------- dados do cliente (compra) -> user_data ---------- */
  function buildUserData(o) {
    var d = o.visitorDemographicInfo || {};
    function low(v) { return (v != null && ('' + v).trim() !== '') ? ('' + v).trim().toLowerCase() : undefined; }
    function dig(v) { return v ? ('' + v).replace(/[^0-9]/g, '') : undefined; }

    var ud = {};
    var email = low(o.email || o.customerEmail);
    if (email) { ud.email = email; }

    var full = (o.customerName || o.name || '').trim();
    if (full) {
      var parts = full.split(/\s+/);
      ud.first_name = low(parts.shift());
      if (parts.length) { ud.last_name = low(parts.join(' ')); }
    }
    var zip = dig(d.zipCode);
    if (zip) { ud.postal_code = zip; }
    if (low(d.city)) { ud.city = low(d.city); }
    if (low(d.state)) { ud.region = low(d.state); }
    ud.country = 'br';

    var ext = o.customerId || o.userId || o.visitorId;
    if (ext) { ud.external_id = '' + ext; }

    return (ud.email || ud.external_id) ? ud : undefined;
  }

  /* ---------- roteamento por evento/pageCategory ---------- */
  /*
   * Funil enxuto desta loja (5 etapas):
   *   PageView -> view_item -> add_to_cart -> begin_checkout -> purchase
   *
   * - PageView: tratado pelo Meta Pixel base + GA4 Config (todas as paginas)
   * - add_to_cart: disparado por CLIQUE no botao "Comprar" (#button-buy),
   *   NAO aqui (a loja so emite o evento "cart" da pagina do carrinho, que
   *   propositalmente NAO mapeamos para nao duplicar com o add_to_cart).
   * Por isso o evento "cart" (pagina do carrinho) e ignorado abaixo.
   */
  function classify(o) {
    var ev = ('' + (o.event || '')).toLowerCase();
    var pc = ('' + (o.pageCategory || '')).toLowerCase();

    if (ev === 'tray.updategtm' && pc.indexOf('produto') > -1) { return 'view_item'; }
    if (ev === 'purchase' || pc.indexOf('orderplaced') > -1) { return 'purchase'; }
    if (ev === 'checkout' || pc.indexOf('easycheckout') > -1) { return 'begin_checkout'; }
    // ev === 'cart' (pagina do carrinho) -> ignorado de proposito (funil enxuto)
    return null;
  }

  function convert(o) {
    if (!o || typeof o !== 'object' || o.__trayNormalized) { return null; }
    var kind = classify(o);
    if (!kind) { return null; }

    var out = { event: kind, __trayNormalized: true, ecommerce: { currency: CURRENCY } };
    var ec = o.ecommerce || {};
    var items;

    if (kind === 'view_item') {
      var it = itemFromFlat(o);
      items = it ? [it] : [];
      out.ecommerce.items = items;
      out.ecommerce.value = sumValue(items);
    } else if (kind === 'begin_checkout') {
      items = itemsFromEEC((ec.checkout && ec.checkout.products) || ec.products);
      out.ecommerce.items = items;
      out.ecommerce.value = sumValue(items);
    } else if (kind === 'purchase') {
      var pf = (ec.purchase && ec.purchase.actionField) || {};
      items = itemsFromEEC((ec.purchase && ec.purchase.products) ||
                           (ec.checkout && ec.checkout.products) || ec.products);
      out.ecommerce.transaction_id = '' + (pf.id || '');
      out.ecommerce.value = num(pf.revenue) != null ? num(pf.revenue) : sumValue(items);
      if (num(pf.shipping) != null) { out.ecommerce.shipping = num(pf.shipping); }
      if (num(pf.tax) != null) { out.ecommerce.tax = num(pf.tax); }
      if (pf.coupon || pf.discountCode) { out.ecommerce.coupon = pf.coupon || pf.discountCode; }
      if (pf.affiliation) { out.ecommerce.affiliation = pf.affiliation; }
      out.ecommerce.items = items;

      var ud = buildUserData(o);
      if (ud) { out.user_data = ud; }
    }

    return out;
  }

  function handle(o) {
    try {
      var c = convert(o);
      if (c) {
        w.dataLayer.push({ ecommerce: null }); // limpa antes (evita vazar itens)
        w.dataLayer.push(c);
      }
    } catch (e) { /* nunca quebrar a loja */ }
  }

  // 1) processa o que ja estava no dataLayer
  try { for (var i = 0; i < w.dataLayer.length; i++) { handle(w.dataLayer[i]); } } catch (e) {}

  // 2) intercepta pushes futuros
  var origPush = w.dataLayer.push;
  w.dataLayer.push = function () {
    var res = origPush.apply(w.dataLayer, arguments);
    try { for (var j = 0; j < arguments.length; j++) { handle(arguments[j]); } } catch (e) {}
    return res;
  };
})();
</script>
