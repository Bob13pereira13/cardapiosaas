<script>
/*
 * Tray -> GA4 dataLayer Adapter  |  meuseintimates.com.br
 * ------------------------------------------------------------------
 * Objetivo: deixar o tagueamento "100% redondo" independente do formato
 * que a Tray usar. A Tray pode empurrar eventos no formato antigo
 * (Universal Analytics / Enhanced Ecommerce) OU no formato GA4. Este
 * adapter:
 *   1) Escuta tudo que entra no dataLayer (push original + itens ja existentes)
 *   2) Se o evento ja estiver no padrao GA4 (tem ecommerce.items) -> passa direto
 *   3) Se estiver no padrao UA/EEC (ecommerce.detail/add/remove/checkout/...)
 *      -> converte para o evento GA4 equivalente com ecommerce.items
 *   4) Sempre limpa ecommerce (ecommerce:null) antes de empurrar o normalizado,
 *      evitando "vazamento" de itens entre eventos.
 *
 * IMPORTANTE: valide no GTM Preview os NOMES de evento que a Tray dispara
 * e ajuste o mapa MAP abaixo se necessario. Tudo esta centralizado aqui.
 */
(function () {
  var w = window;
  w.dataLayer = w.dataLayer || [];
  if (w.__trayGa4AdapterLoaded) { return; }
  w.__trayGa4AdapterLoaded = true;

  // Eventos que ja sao GA4 nativos -> nao mexer
  var GA4_NATIVE = {
    view_item: 1, view_item_list: 1, select_item: 1, add_to_cart: 1,
    remove_from_cart: 1, view_cart: 1, begin_checkout: 1, add_shipping_info: 1,
    add_payment_info: 1, purchase: 1, refund: 1, view_promotion: 1,
    select_promotion: 1, search: 1, sign_up: 1, login: 1, add_to_wishlist: 1
  };

  // Mapa de nomes de evento UA/Tray -> evento GA4
  var MAP = {
    'productImpression': 'view_item_list',
    'eec.impressionView': 'view_item_list',
    'impressionView': 'view_item_list',
    'impressions': 'view_item_list',
    'productClick': 'select_item',
    'eec.productClick': 'select_item',
    'productDetail': 'view_item',
    'eec.detail': 'view_item',
    'detail': 'view_item',
    'productView': 'view_item',
    'addToCart': 'add_to_cart',
    'eec.add': 'add_to_cart',
    'add': 'add_to_cart',
    'removeFromCart': 'remove_from_cart',
    'eec.remove': 'remove_from_cart',
    'remove': 'remove_from_cart',
    'checkout': 'begin_checkout',
    'eec.checkout': 'begin_checkout',
    'beginCheckout': 'begin_checkout',
    'purchase': 'purchase',
    'eec.purchase': 'purchase',
    'transaction': 'purchase',
    'promoView': 'view_promotion',
    'promotionView': 'view_promotion',
    'promoClick': 'select_promotion',
    'promotionClick': 'select_promotion'
  };

  function num(v) {
    if (v === null || v === undefined || v === '') { return undefined; }
    var n = parseFloat(('' + v).replace(/[^0-9.,-]/g, '').replace(/\.(?=.*\.)/g, '').replace(',', '.'));
    return isNaN(n) ? undefined : n;
  }

  // Converte um produto UA/EEC para item GA4
  function toItem(p, idx) {
    if (!p) { return null; }
    var item = {
      item_id: p.id || p.item_id || p.sku || p.product_id,
      item_name: p.name || p.item_name || p.title,
      price: num(p.price != null ? p.price : p.item_price),
      quantity: num(p.quantity != null ? p.quantity : (p.qty != null ? p.qty : 1)) || 1
    };
    if (p.brand || p.item_brand) { item.item_brand = p.brand || p.item_brand; }
    if (p.variant || p.item_variant) { item.item_variant = p.variant || p.item_variant; }
    if (p.coupon || p.item_coupon) { item.coupon = p.coupon || p.item_coupon; }
    if (p.list || p.list_name || p.item_list_name) { item.item_list_name = p.list || p.list_name || p.item_list_name; }
    if (p.position != null || p.index != null) { item.index = num(p.position != null ? p.position : p.index); }
    // category / category2 / category3...
    var cat = p.category || p.item_category;
    if (cat) {
      if (typeof cat === 'string' && cat.indexOf('/') > -1) {
        var parts = cat.split('/');
        item.item_category = parts[0];
        for (var i = 1; i < parts.length && i <= 4; i++) {
          item['item_category' + (i + 1)] = parts[i];
        }
      } else {
        item.item_category = cat;
      }
    }
    if (item.item_id == null && item.item_name == null) { return null; }
    return item;
  }

  function toItems(arr) {
    var out = [];
    if (!arr || !arr.length) { return out; }
    for (var i = 0; i < arr.length; i++) {
      var it = toItem(arr[i], i);
      if (it) { out.push(it); }
    }
    return out;
  }

  function sumValue(items) {
    var t = 0;
    for (var i = 0; i < items.length; i++) {
      t += (num(items[i].price) || 0) * (num(items[i].quantity) || 1);
    }
    return Math.round(t * 100) / 100;
  }

  // Recebe um objeto pushado e devolve {event, ecommerce} no padrao GA4, ou null
  function convert(obj) {
    if (!obj || typeof obj !== 'object') { return null; }
    var ev = obj.event;
    if (!ev) { return null; }
    if (GA4_NATIVE[ev]) { return null; } // ja GA4 -> nao converter

    var ga4Event = MAP[ev];
    if (!ga4Event) { return null; } // evento que nao nos interessa

    var ec = obj.ecommerce || {};
    var currency = ec.currencyCode || ec.currency || obj.currencyCode || 'BRL';
    var out = { event: ga4Event, ecommerce: { currency: currency } };
    var block, items;

    switch (ga4Event) {
      case 'view_item_list':
        block = ec.impressions || (ec.items) || [];
        items = toItems(block);
        if (block[0] && (block[0].list || block[0].list_name)) {
          out.ecommerce.item_list_name = block[0].list || block[0].list_name;
        }
        out.ecommerce.items = items;
        break;
      case 'select_item':
        block = (ec.click && ec.click.products) || ec.products || [];
        out.ecommerce.items = toItems(block);
        break;
      case 'view_item':
        block = (ec.detail && ec.detail.products) || ec.products || [];
        items = toItems(block);
        out.ecommerce.items = items;
        out.ecommerce.value = sumValue(items);
        break;
      case 'add_to_cart':
        block = (ec.add && ec.add.products) || ec.products || [];
        items = toItems(block);
        out.ecommerce.items = items;
        out.ecommerce.value = sumValue(items);
        break;
      case 'remove_from_cart':
        block = (ec.remove && ec.remove.products) || ec.products || [];
        items = toItems(block);
        out.ecommerce.items = items;
        out.ecommerce.value = sumValue(items);
        break;
      case 'begin_checkout':
        block = (ec.checkout && ec.checkout.products) || ec.products || [];
        items = toItems(block);
        out.ecommerce.items = items;
        out.ecommerce.value = sumValue(items);
        var af = ec.checkout && ec.checkout.actionField;
        if (af && af.option) { out.ecommerce.checkout_option = af.option; }
        break;
      case 'purchase':
        var pf = (ec.purchase && ec.purchase.actionField) || ec.actionField || {};
        block = (ec.purchase && ec.purchase.products) || ec.products || [];
        items = toItems(block);
        out.ecommerce.transaction_id = pf.id || pf.transaction_id || obj.transaction_id;
        out.ecommerce.value = num(pf.revenue != null ? pf.revenue : pf.value);
        if (out.ecommerce.value == null) { out.ecommerce.value = sumValue(items); }
        if (pf.tax != null) { out.ecommerce.tax = num(pf.tax); }
        if (pf.shipping != null) { out.ecommerce.shipping = num(pf.shipping); }
        if (pf.coupon) { out.ecommerce.coupon = pf.coupon; }
        if (pf.affiliation) { out.ecommerce.affiliation = pf.affiliation; }
        out.ecommerce.items = items;
        break;
      case 'view_promotion':
      case 'select_promotion':
        var promo = ec.promoView || ec.promoClick || ec.promotion || {};
        var promos = promo.promotions || ec.promotions || [];
        if (promos[0]) {
          out.ecommerce.promotion_id = promos[0].id;
          out.ecommerce.promotion_name = promos[0].name;
          out.ecommerce.creative_name = promos[0].creative;
          out.ecommerce.creative_slot = promos[0].position;
        }
        out.ecommerce.items = [];
        break;
      default:
        return null;
    }

    // Repassa dados de usuario se a Tray tiver enviado junto
    if (obj.user_data) { out.user_data = obj.user_data; }
    if (obj.customer) { out.customer = obj.customer; }
    return out;
  }

  function handle(obj) {
    try {
      var converted = convert(obj);
      if (converted) {
        w.dataLayer.push({ ecommerce: null }); // limpa antes
        w.dataLayer.push(converted);
      }
    } catch (e) { /* nunca quebrar a loja */ }
  }

  // 1) Processa itens que ja estavam no dataLayer antes do adapter carregar
  try {
    for (var i = 0; i < w.dataLayer.length; i++) { handle(w.dataLayer[i]); }
  } catch (e) {}

  // 2) Intercepta pushes futuros (sem quebrar o push nativo do GTM)
  var origPush = w.dataLayer.push;
  w.dataLayer.push = function () {
    var res = origPush.apply(w.dataLayer, arguments);
    try {
      for (var j = 0; j < arguments.length; j++) { handle(arguments[j]); }
    } catch (e) {}
    return res;
  };
})();
</script>
