function () {
  /*
   * Gera um event_id estavel POR EVENTO do GTM.
   * O mesmo valor e usado pelo Meta Pixel (navegador) e enviado ao GA4 ->
   * sGTM -> Meta CAPI, permitindo a DEDUPLICACAO browser x server.
   * Cacheado por gtm.uniqueEventId para que todas as tags do mesmo
   * disparo recebam exatamente o mesmo id.
   */
  try {
    var uid = {{DLV - gtm.uniqueEventId}};
    var dlEid = {{DLV - event_id}};
    if (dlEid) { return dlEid; } // se a Tray/dataLayer ja forneceu um id, respeita
    window.__eidCache = window.__eidCache || {};
    var key = (uid != null) ? ('u' + uid) : 'nouid';
    if (!window.__eidCache[key]) {
      var rnd = (typeof crypto !== 'undefined' && crypto.getRandomValues)
        ? (function () {
            var a = new Uint32Array(4); crypto.getRandomValues(a);
            return a[0].toString(16) + a[1].toString(16) + a[2].toString(16) + a[3].toString(16);
          })()
        : (Date.now().toString(16) + Math.random().toString(16).slice(2));
      window.__eidCache[key] = 'evt.' + Date.now() + '.' + rnd;
    }
    return window.__eidCache[key];
  } catch (e) {
    return 'evt.' + (new Date().getTime()) + '.' + Math.floor(Math.random() * 1e9);
  }
}
