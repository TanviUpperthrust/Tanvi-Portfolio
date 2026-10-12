// Home page only: process scroller, testimonials carousel, contact form.
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* A rotating deck: the designer first, followed by published projects. */
  var deck = document.querySelector('.hero-deck');
  var deckCards = [].slice.call(document.querySelectorAll('[data-deck-card]'));
  if (deck && deckCards.length) {
    var deckIndex = 0, deckTimer, deckPaused = reduce;
    var pauseButton = document.getElementById('deckPause');
    function renderDeck(announce) {
      deckCards.forEach(function (card, i) {
        var position = (i - deckIndex + deckCards.length) % deckCards.length;
        card.dataset.position = position;
        card.inert = position !== 0;
        card.setAttribute('aria-hidden', String(position !== 0));
      });
      // Automatic rotation stays quiet for screen readers.
      var status = document.getElementById('deckStatus');
      status.setAttribute('aria-live', announce ? 'polite' : 'off');
      status.textContent = deckCards[deckIndex].getAttribute('aria-label');
    }
    function scheduleDeck() {
      clearInterval(deckTimer);
      if (!deckPaused && !document.hidden && !deck.matches(':hover') && !deck.contains(document.activeElement)) {
        deckTimer = setInterval(function () { deckIndex = (deckIndex + 1) % deckCards.length; renderDeck(false); }, 4800);
      }
    }
    function moveDeck(direction) {
      deckIndex = (deckIndex + direction + deckCards.length) % deckCards.length;
      renderDeck(true); scheduleDeck();
    }
    document.getElementById('deckPrev').onclick = function () { moveDeck(-1); };
    document.getElementById('deckNext').onclick = function () { moveDeck(1); };
    function syncPauseButton() {
      pauseButton.textContent = deckPaused ? 'Play' : 'Pause';
      pauseButton.setAttribute('aria-label', deckPaused ? 'Play card animation' : 'Pause card animation');
      pauseButton.setAttribute('aria-pressed', String(deckPaused));
    }
    pauseButton.onclick = function () { deckPaused = !deckPaused; syncPauseButton(); scheduleDeck(); };
    deck.addEventListener('pointerenter', function () { clearInterval(deckTimer); });
    deck.addEventListener('pointerleave', scheduleDeck);
    deck.addEventListener('focusin', function () { clearInterval(deckTimer); });
    deck.addEventListener('focusout', function () { setTimeout(scheduleDeck, 0); });
    document.addEventListener('visibilitychange', scheduleDeck);
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', function (event) {
      deckPaused = event.matches; syncPauseButton(); scheduleDeck();
    });
    renderDeck(false); syncPauseButton(); scheduleDeck();
  }

  document.querySelectorAll('[data-filter]').forEach(function (button) {
    button.addEventListener('click', function () {
      var count = 0;
      document.querySelectorAll('[data-filter]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === button)); });
      document.querySelectorAll('[data-platform]').forEach(function (card) {
        card.hidden = button.dataset.filter !== 'all' && card.dataset.platform !== button.dataset.filter;
        if (!card.hidden) { count++; card.classList.add('in'); }
      });
      document.getElementById('workCount').textContent = count + (count === 1 ? ' project' : ' projects');
    });
  });

  /* ---------- Process scroller: buttons + drag ---------- */
  var steps = document.getElementById('steps');
  function stepBy(dir) { steps.scrollBy({ left: dir * (steps.firstElementChild.offsetWidth + 16), behavior: 'smooth' }); }
  document.getElementById('stepPrev').onclick = function () { stepBy(-1); };
  document.getElementById('stepNext').onclick = function () { stepBy(1); };
  var drag = null;
  steps.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse') return;
    drag = { x: e.clientX, left: steps.scrollLeft };
    steps.classList.add('dragging');
  });
  window.addEventListener('pointermove', function (e) { if (drag) steps.scrollLeft = drag.left - (e.clientX - drag.x); });
  window.addEventListener('pointerup', function () { drag = null; steps.classList.remove('dragging'); });

  /* ---------- Testimonials ---------- */
  // The server renders the first quote and embeds the full list as JSON.
  var box = document.getElementById('quoteBox');
  var dataEl = document.getElementById('quotesData');
  var quotes = dataEl ? JSON.parse(dataEl.textContent) : [];
  if (box && quotes.length > 1) {
    var qi = 0;
    var showQuote = function (i) {
      box.classList.add('out');
      setTimeout(function () {
        var q = quotes[i];
        document.getElementById('quoteText').innerHTML = q.html;
        document.getElementById('quoteName').textContent = q.name;
        document.getElementById('quoteRole').textContent = q.role;
        box.classList.remove('out');
      }, 300);
    };
    var nextQ = function (d) { qi = (qi + d + quotes.length) % quotes.length; showQuote(qi); };
    var auto;
    var resetAuto = function () { clearInterval(auto); if (!reduce) auto = setInterval(function () { nextQ(1); }, 7000); };
    document.getElementById('qPrev').onclick = function () { nextQ(-1); resetAuto(); };
    document.getElementById('qNext').onclick = function () { nextQ(1); resetAuto(); };
    resetAuto();
  }

  /* ---------- Contact form ---------- */
  var form = document.getElementById('contactForm');
  var status = document.getElementById('formStatus');
  var submitBtn = form.querySelector('button[type="submit"]');
  var defaultStatus = status.textContent;
  var fallbackEmail = form.dataset.email;

  // "Read more" on a service card pre-selects that project type.
  document.querySelectorAll('[data-topic]').forEach(function (link) {
    link.addEventListener('click', function () {
      form.elements.topic.value = link.dataset.topic;
      setTimeout(function () { form.elements.name.focus({ preventScroll: true }); }, 600);
    });
  });

  function setStatus(text, kind) {
    status.textContent = text;
    status.className = 'form-status' + (kind ? ' ' + kind : '');
  }
  function clearErrors() {
    form.querySelectorAll('.field').forEach(function (f) { f.classList.remove('invalid'); });
    form.querySelectorAll('.err').forEach(function (e) { e.textContent = ''; });
  }
  function showErrors(fields) {
    var first = null;
    Object.keys(fields).forEach(function (name) {
      var input = form.elements[name];
      var err = form.querySelector('.err[data-for="' + name + '"]');
      if (!input || !err) return;
      input.closest('.field').classList.add('invalid');
      input.setAttribute('aria-invalid', 'true');
      err.textContent = fields[name];
      first = first || input;
    });
    if (first) first.focus();
  }
  function checkLocally(data) {
    var errs = {};
    if (!data.name.trim()) errs.name = 'Required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email.trim())) errs.email = 'Enter a valid email.';
    if (data.message.trim().length < 10) errs.message = 'A little more detail, please (10+ characters).';
    return errs;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearErrors();
    form.querySelectorAll('[aria-invalid]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
    var data = {};
    ['name', 'email', 'topic', 'budget', 'message', 'website'].forEach(function (k) { data[k] = form.elements[k].value; });

    var local = checkLocally(data);
    if (Object.keys(local).length) { showErrors(local); setStatus('Please check the highlighted fields.', 'bad'); return; }

    submitBtn.disabled = true;
    setStatus('Sending…');
    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (body) { return { ok: r.ok, body: body }; });
    }).then(function (res) {
      if (res.ok) {
        form.reset();
        setStatus('Thank you! Your message is in. I\'ll get back to you soon.', 'ok');
        return;
      }
      if (res.body.fields) showErrors(res.body.fields);
      setStatus(res.body.error || 'Something went wrong. Please email me instead.', 'bad');
    }).catch(function () {
      setStatus('Couldn\'t reach the server. Please email ' + fallbackEmail + ' instead.', 'bad');
    }).then(function () {
      submitBtn.disabled = false;
    });
  });
  form.addEventListener('input', function () {
    if (status.classList.contains('ok')) setStatus(defaultStatus);
  });
})();
