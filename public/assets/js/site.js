// Behaviour shared by every public page: theme toggle, interactive background,
// card glow, cursor, magnetic buttons, scroll reveal, nav and mobile menu.
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var motionPaused = reduce;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Theme toggle ---------- */
  function currentTheme() {
    return root.getAttribute('data-theme') || 'light';
  }
  document.getElementById('themeToggle').addEventListener('click', function () {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    document.querySelector('meta[name="theme-color"]').setAttribute('content', next === 'dark' ? '#07060D' : '#FBF9FF');
  });

  /* ---------- Pointer-driven background ---------- */
  var mouse = { x: innerWidth / 2, y: innerHeight / 3 };
  var eased = { x: mouse.x, y: mouse.y };
  var orbs = [].slice.call(document.querySelectorAll('.orb-inner'));
  var cursor = document.querySelector('.cursor');

  window.addEventListener('pointermove', function (e) {
    mouse.x = e.clientX; mouse.y = e.clientY;
    if (finePointer && !motionPaused) {
      cursor.style.opacity = 1;
      if (!backgroundFrame) backgroundFrame = requestAnimationFrame(tick);
    }
  }, { passive: true });

  var backgroundFrame = 0;
  function tick() {
    backgroundFrame = 0;
    if (motionPaused || document.hidden) return;
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
    if (Math.abs(mouse.x - eased.x) + Math.abs(mouse.y - eased.y) > .5) backgroundFrame = requestAnimationFrame(tick);
  }
  if (!reduce) backgroundFrame = requestAnimationFrame(tick);
  function setMotionPaused(paused) {
    motionPaused = paused;
    if (paused) {
      cancelAnimationFrame(backgroundFrame);
      backgroundFrame = 0;
      cursor.style.opacity = 0;
      document.querySelectorAll('.magnetic').forEach(function (el) { el.style.transform = ''; });
    } else if (!backgroundFrame) backgroundFrame = requestAnimationFrame(tick);
  }
  window.addEventListener('portfolio:motion', function (event) { setMotionPaused(event.detail.paused); });
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', function (event) { setMotionPaused(event.matches); });
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && !motionPaused && !backgroundFrame) backgroundFrame = requestAnimationFrame(tick);
  });

  /* ---------- Card glow follows pointer ---------- */
  document.querySelectorAll('.card').forEach(function (card) {
    card.addEventListener('pointermove', function (e) {
      if (motionPaused) return;
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
        if (motionPaused) return;
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
  root.classList.add('reveal-ready');
  document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });

  /* ---------- Navigation stays visible while the page scrolls ---------- */
  var nav = document.getElementById('nav');
  nav.classList.remove('hidden');
  function updateNav() { nav.classList.toggle('is-scrolled', window.scrollY > 24); }
  updateNav();
  window.addEventListener('scroll', function () {
    updateNav();
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
