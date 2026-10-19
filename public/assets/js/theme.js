// Respect an explicit page theme; otherwise restore a saved theme before first paint.
(function () {
  if (document.documentElement.hasAttribute('data-theme')) return;
  try {
    var t = localStorage.getItem('theme');
    if (t) document.documentElement.setAttribute('data-theme', t);
  } catch (e) {}
})();
