// Behaviour shared by every public page: theme toggle, interactive background,
// card glow, cursor, magnetic buttons, scroll reveal, nav and mobile menu.
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Theme toggle ---------- */
  function currentTheme() {
    var t = root.getAttribute('data-theme');
    if (t) return t;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.getElementById('themeToggle').addEventListener('click', function () {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
  });

  /* ---------- Pointer-driven background ---------- */
  var mouse = { x: innerWidth / 2, y: innerHeight / 3 };
  var eased = { x: mouse.x, y: mouse.y };
  var orbs = [].slice.call(document.querySelectorAll('.orb-inner'));
  var cursor = document.querySelector('.cursor');

  window.addEventListener('pointermove', function (e) {
    mouse.x = e.clientX; mouse.y = e.clientY;
    if (finePointer) cursor.style.opacity = 1;
  }, { passive: true });

  function tick() {
    eased.x += (mouse.x - eased.x) * 0.08;
    eased.y += (mouse.y - eased.y) * 0.08;
    root.style.setProperty('--cx', eased.x + 'px');
    root.style.setProperty('--cy', eased.y + 'px');

    var nx = eased.x / innerWidth - 0.5;
    var ny = eased.y / innerHeight - 0.5;
    orbs.forEach(function (o) {
      var d = +o.dataset.depth;
      o.style.transform = 'translate(' + (nx * d * 2) + 'px,' + (ny * d * 2) + 'px)';
    });
    if (finePointer) cursor.style.transform = 'translate(' + mouse.x + 'px,' + mouse.y + 'px)';
    requestAnimationFrame(tick);
  }
  if (!reduce) requestAnimationFrame(tick);

  /* ---------- Card glow follows pointer ---------- */
  document.querySelectorAll('.card').forEach(function (card) {
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ---------- Cursor grows over interactive things ---------- */
  if (finePointer) {
    document.querySelectorAll('a, button, .card').forEach(function (el) {
      el.addEventListener('pointerenter', function () { cursor.classList.add('big'); });
      el.addEventListener('pointerleave', function () { cursor.classList.remove('big'); });
    });
  }

  /* ---------- Magnetic buttons ---------- */
  if (finePointer && !reduce) {
    document.querySelectorAll('.magnetic').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.25;
        var y = (e.clientY - r.top - r.height / 2) * 0.35;
        el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  /* ---------- Scroll reveal ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });

  /* ---------- Hide nav on scroll down, show on scroll up ---------- */
  var nav = document.getElementById('nav'), lastY = 0;
  window.addEventListener('scroll', function () {
    var y = scrollY;
    nav.classList.toggle('hidden', y > lastY && y > 200 && !root.classList.contains('menu-open'));
    lastY = y;
  }, { passive: true });

  /* ---------- Mobile menu ---------- */
  var menuBtn = document.getElementById('menuToggle');
  var menu = document.getElementById('mobileMenu');
  function setMenu(open) {
    root.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.inert = !open;
    if (open) menu.querySelector('a').focus();
  }
  menu.inert = true;
  menuBtn.addEventListener('click', function () { setMenu(!root.classList.contains('menu-open')); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && root.classList.contains('menu-open')) { setMenu(false); menuBtn.focus(); }
    if (e.key === 'Tab' && root.classList.contains('menu-open')) {
      var links = [].slice.call(menu.querySelectorAll('a'));
      var first = links[0], last = links[links.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); menuBtn.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); menuBtn.focus(); }
      else if (document.activeElement === menuBtn) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
    }
  });
  window.matchMedia('(min-width: 961px)').addEventListener('change', function (mq) { if (mq.matches) setMenu(false); });
})();
