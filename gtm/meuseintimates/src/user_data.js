function () {
  /*
   * Monta o objeto user_data (Advanced Matching / Enhanced Conversions).
   * Le os dados do cliente que a Tray expoe no dataLayer (varios formatos
   * possiveis) e devolve SO os campos preenchidos. Valores vao em texto
   * normalizado (lowercase/trim); o hash SHA-256 e feito:
   *   - pelo proprio Pixel (fbq) no navegador, e
   *   - pelo container Server (CAPI / Enhanced Conversions) no envio CAPI.
   * Nunca incluir campo vazio (piora o Event Match Quality e gera warning).
   */
  try {
    var dl = window.dataLayer || [];
    // procura o objeto de cliente mais recente no dataLayer
    var c = {};
    for (var i = dl.length - 1; i >= 0; i--) {
      var e = dl[i];
      if (!e || typeof e !== 'object') { continue; }
      var cand = e.user_data || e.customer || e.user || e.usuario || e.cliente;
      if (cand && typeof cand === 'object') { c = cand; break; }
    }

    function pick() {
      for (var k = 0; k < arguments.length; k++) {
        var v = arguments[k];
        if (v !== undefined && v !== null && ('' + v).trim() !== '') { return ('' + v).trim(); }
      }
      return undefined;
    }
    function low(v) { return v ? v.toLowerCase() : v; }
    function digits(v) { return v ? v.replace(/[^0-9]/g, '') : v; }
    function phoneE164(v) {
      if (!v) { return v; }
      var d = digits(v);
      if (!d) { return undefined; }
      if (d.charAt(0) === '0') { d = d.replace(/^0+/, ''); }
      // assume Brasil quando vier sem DDI (10/11 digitos)
      if (d.length === 10 || d.length === 11) { d = '55' + d; }
      return '+' + d;
    }

    var out = {};
    var email = low(pick(c.email, c.em, c.e_mail, c.mail));
    var phone = phoneE164(pick(c.phone, c.ph, c.telefone, c.celular, c.tel, c.whatsapp));
    var fn = low(pick(c.first_name, c.fn, c.firstName, c.nome, c.primeiro_nome));
    var ln = low(pick(c.last_name, c.ln, c.lastName, c.sobrenome, c.ultimo_nome));
    var city = low(pick(c.city, c.ct, c.cidade));
    var st = low(pick(c.state, c.st, c.estado, c.uf));
    var zip = digits(pick(c.zip, c.zp, c.postal_code, c.cep));
    var country = low(pick(c.country, c.pais)) || 'br';
    var extId = pick(c.external_id, c.id, c.customer_id, c.cliente_id, c.codigo);

    // se nome veio junto, separa
    if (!fn && !ln) {
      var full = pick(c.name, c.nome_completo, c.full_name);
      if (full) { var p = full.split(/\s+/); fn = low(p.shift()); ln = low(p.join(' ')) || undefined; }
    }

    if (email) { out.email = email; out.em = email; out.sha256_email_address = email; }
    if (phone) { out.phone_number = phone; out.ph = phone; }
    if (fn) { out.first_name = fn; out.fn = fn; }
    if (ln) { out.last_name = ln; out.ln = ln; }
    if (city) { out.city = city; out.ct = city; }
    if (st) { out.region = st; out.st = st; }
    if (zip) { out.postal_code = zip; out.zp = zip; }
    if (country) { out.country = country; }
    if (extId) { out.external_id = '' + extId; }

    // sem nenhum dado pessoal? devolve undefined para nao mandar objeto vazio
    return (out.email || out.phone_number || out.external_id) ? out : undefined;
  } catch (e) {
    return undefined;
  }
}
