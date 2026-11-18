// Sayfa boyanmadan önce kayıtlı temayı uygular (beyaz yanıp sönmeyi önler). CSP gereği satır içi değil, ayrı dosya.
(function () {
  try {
    var t = localStorage.getItem('ykds_theme');
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  } catch (e) { /* depolama kapalı */ }
})();
