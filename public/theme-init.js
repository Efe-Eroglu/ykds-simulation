// Sayfa boyanmadan önce kayıtlı temayı ve vurgu rengini uygular (beyaz yanıp sönmeyi önler). CSP gereği satır içi değil, ayrı dosya.
(function () {
  try {
    var t = localStorage.getItem('ykds_theme');
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
    var a = localStorage.getItem('ykds_accent');
    if (/^(ocean|emerald|sunset|rose)$/.test(a || '')) document.documentElement.setAttribute('data-accent', a);
  } catch (e) { /* depolama kapalı */ }
})();
