function () {
  /*
   * Monta o user_data (Advanced Matching / Enhanced Conversions) lendo o
   * dataLayer REAL da loja meuseintimates.com.br (Tray).
   *
   * Fontes, em ordem:
   *   1) objeto user_data ja normalizado pelo adapter (compra) -> email/nome/CEP/cidade/UF
   *   2) campos do cliente na raiz (email/customerEmail/customerName) em qualquer pagina logada
   *   3) external_id sempre que houver: customerId/userId/visitorId
   *
   * Devolve SO campos preenchidos (em texto normalizado; o hash SHA-256 e feito
   * pelo Pixel no navegador e pelo template da CAPI no server). Nunca objeto vazio.
   */
  try {
    var dl = window.dataLayer || [];
    function low(v) { return (v != null && ('' + v).trim() !== '') ? ('' + v).trim().toLowerCase() : undefined; }
    function dig(v) { return v ? ('' + v).replace(/[^0-9]/g, '') : undefined; }
    function phoneE164(v) {
      var d = dig(v); if (!d) { return undefined; }
      d = d.replace(/^0+/, '');
      if (d.length === 10 || d.length === 11) { d = '55' + d; }
      return '+' + d;
    }

    var out = {};

    // 1) varre o dataLayer (do mais recente pro mais antigo)
    for (var i = dl.length - 1; i >= 0; i--) {
      var e = dl[i];
      if (!e || typeof e !== 'object') { continue; }

      // user_data ja pronto (vindo do adapter na compra)
      var u = e.user_data;
      if (u && typeof u === 'object') {
        if (!out.email && u.email) { out.email = low(u.email); }
        if (!out.phone_number && u.phone_number) { out.phone_number = u.phone_number; }
        if (!out.first_name && u.first_name) { out.first_name = low(u.first_name); }
        if (!out.last_name && u.last_name) { out.last_name = low(u.last_name); }
        if (!out.city && u.city) { out.city = low(u.city); }
        if (!out.region && u.region) { out.region = low(u.region); }
        if (!out.postal_code && u.postal_code) { out.postal_code = dig(u.postal_code); }
        if (!out.external_id && u.external_id) { out.external_id = '' + u.external_id; }
      }

      // campos crus na raiz (qualquer pagina)
      if (!out.email && (e.email || e.customerEmail)) { out.email = low(e.email || e.customerEmail); }
      if (!out.phone_number && (e.phone || e.telefone || e.customerPhone)) {
        out.phone_number = phoneE164(e.phone || e.telefone || e.customerPhone);
      }
      if ((!out.first_name || !out.last_name) && (e.customerName || e.name)) {
        var parts = ('' + (e.customerName || e.name)).trim().split(/\s+/);
        if (!out.first_name) { out.first_name = low(parts.shift()); }
        if (!out.last_name && parts.length) { out.last_name = low(parts.join(' ')); }
      }
      var demo = e.visitorDemographicInfo;
      if (demo && typeof demo === 'object') {
        if (!out.postal_code && demo.zipCode) { out.postal_code = dig(demo.zipCode); }
        if (!out.city && demo.city) { out.city = low(demo.city); }
        if (!out.region && demo.state) { out.region = low(demo.state); }
      }
      if (!out.external_id && (e.customerId || e.userId || e.visitorId)) {
        out.external_id = '' + (e.customerId || e.userId || e.visitorId);
      }
    }

    if (out.email || out.first_name) { out.country = out.country || 'br'; }

    return (out.email || out.phone_number || out.external_id) ? out : undefined;
  } catch (e) {
    return undefined;
  }
}
