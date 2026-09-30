// Loaded synchronously in <head>: apply the saved theme before first paint so the page doesn't flash.
(function () {
  try {
    var t = localStorage.getItem('theme');
    if (t) document.documentElement.setAttribute('data-theme', t);
  } catch (e) {}
})();
