function () {
  /*
   * Monta o objeto ecommerce (padrao GA4) do produto exibido na PAGINA DE PRODUTO,
   * para o evento add_to_cart disparado no CLIQUE do botao "Comprar" (#button-buy).
   * Le o formato ACHATADO da Tray (idProduct, nameProduct, priceSell, listSku[]).
   * Retorna undefined se nao estiver numa pagina de produto.
   */
  try {
    var dl = window.dataLayer || [];
    var o = null;
    for (var i = dl.length - 1; i >= 0; i--) {
      var e = dl[i];
      if (e && typeof e === 'object' && e.idProduct &&
          ('' + (e.pageCategory || '')).toLowerCase().indexOf('produto') > -1) { o = e; break; }
    }
    if (!o) { return undefined; }

    function num(v) {
      if (v == null || v === '') { return undefined; }
      var n = parseFloat(('' + v).replace(/[^0-9.,-]/g, '').replace(',', '.'));
      return isNaN(n) ? undefined : n;
    }

    var item = {
      item_id: o.idProduct,
      item_name: o.nameProduct,
      price: num(o.priceSell != null ? o.priceSell : o.price),
      quantity: 1
    };
    if (o.brand) { item.item_brand = o.brand; }
    if (o.EAN) { item.ean = o.EAN; }
    if (o.listSku && o.listSku.length && o.listSku[0].nameSku) { item.item_variant = o.listSku[0].nameSku; }
    if (o.breadcrumbDetails && o.breadcrumbDetails.length) {
      var c = o.breadcrumbDetails.slice().sort(function (a, b) { return (a.level || 0) - (b.level || 0); });
      for (var j = 0; j < c.length && j < 5; j++) { item['item_category' + (j === 0 ? '' : (j + 1))] = c[j].name; }
    } else if (o.category) { item.item_category = o.category; }

    return {
      currency: 'BRL',
      value: (num(item.price) || 0) * 1,
      items: [item]
    };
  } catch (e) { return undefined; }
}
