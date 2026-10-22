// Shared studio interactions. Native links, page scrolling and touch gestures
// remain the navigation model; animation frames run only while input settles.
(function () {
  'use strict';

  var root = document.documentElement;
  var body = document.body;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  var userPaused = false;
  var paused = reduced.matches;
  var toggles = [].slice.call(document.querySelectorAll('[data-motion-toggle]'));
  var header = document.getElementById('siteHeader');
  var menuButton = document.getElementById('menuToggle');
  var menu = document.getElementById('siteMenu');
  var menuOpen = false;
  var aura = document.querySelector('.cursor-aura');
  var cursor = document.querySelector('.custom-cursor');
  var cursorLabel = document.querySelector('.cursor-label');
  var nameLines = [].slice.call(document.querySelectorAll('.home-name .name-line'));
  var titleLetters = [];
  function splitKinetic(title, output, footer) {
    if (!title.hasAttribute('aria-label')) title.setAttribute('aria-label', title.textContent.trim());
    // Keep decorative wrappers, counts and other semantic children intact.
    // Only text is split, and superscripts/subscripts keep their original flow.
    var textNodes = [];
    function collectText(parent) {
      [].slice.call(parent.childNodes).forEach(function (node) {
        if (node.nodeType === 3 && node.textContent.trim()) textNodes.push({ node: node, parent: parent });
        else if (node.nodeType === 1 && !/^(SUP|SUB|SVG|SCRIPT|STYLE)$/.test(node.tagName) && node.getAttribute('aria-hidden') !== 'true') collectText(node);
      });
    }
    collectText(title);
    textNodes.forEach(function (entry) {
      var node = entry.node;
      var fragment = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(function (word) {
        if (!word.trim()) { fragment.appendChild(document.createTextNode(word)); return; }
        var wrapper = document.createElement('span');
        wrapper.className = 'kinetic-word';
        wrapper.style.display = 'inline-block';
        wrapper.style.whiteSpace = 'nowrap';
        wrapper.setAttribute('aria-hidden', 'true');
        Array.from(word).forEach(function (character) {
          var glyph = document.createElement('span');
          glyph.className = 'kinetic-letter';
          glyph.setAttribute('data-kinetic-letter', '');
          if (footer) glyph.setAttribute('data-footer-letter', '');
          glyph.textContent = character;
          glyph.style.display = 'inline-block';
          wrapper.appendChild(glyph);
          output.push(glyph);
        });
        fragment.appendChild(wrapper);
      });
      entry.parent.replaceChild(fragment, node);
    });
  }
  document.querySelectorAll('[data-kinetic]').forEach(function (title) { splitKinetic(title, titleLetters, false); });
  var footerGroups = [];
  var hoveredFooter = null;
  document.querySelectorAll('[data-kinetic-footer]').forEach(function (text) {
    var glyphs = [];
    var owner = closest(text, '[data-footer-cta]');
    if (owner && !owner.hasAttribute('aria-label')) owner.setAttribute('aria-label', text.textContent.trim());
    splitKinetic(text, glyphs, true);
    footerGroups.push({ element: text, owner: owner, glyphs: glyphs, states: [], baseWidth: 0, availableWidth: 0 });
  });
  var letterElements = [].slice.call(document.querySelectorAll('[data-hero-letter]')).concat(titleLetters);
  var letters = letterElements.map(function (element) {
    return { element: element, width: 70, weight: 800, x: 0, y: 0 };
  });
  footerGroups.forEach(function (group) {
    group.glyphs.forEach(function (element) {
      var letter = { element: element, width: 70, weight: 800, x: 0, y: 0, footer: group, targetStrength: 0, samples: [] };
      group.states.push(letter);
      letters.push(letter);
    });
  });
  var entryAnimations = [];
  var magnetSelector = '[data-magnet], .pill-button, .outline-button, .header-cta';
  var magnets = [].slice.call(document.querySelectorAll(magnetSelector));
  var activeMagnet = null;
  var hoverTargets = [].slice.call(document.querySelectorAll('.project-card, .project-art, .work-table-row[data-project-preview], .about-portrait, [data-portrait]'));
  var hoverBounds = new Map();
  var hoverTarget = null;
  var featured = document.querySelector('.featured-layout');
  var rows = featured ? [].slice.call(featured.querySelectorAll('[data-featured-index]')) : [];
  var previews = featured ? [].slice.call(featured.querySelectorAll('[data-featured-slide]')) : [];
  var featuredBounds = [];
  var hoveredRow = -1;
  var activeFeatured = 0;
  var pageRange = 1;
  var pointer = { x: 0, y: 0, seen: false };
  var eased = { x: 0, y: 0 };
  var needsMeasure = true;
  var footerNeedsMeasure = true;
  var frame = 0;
  var windowFocused = document.hasFocus ? document.hasFocus() : true;

  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  function closest(target, selector) { return target && target.closest ? target.closest(selector) : null; }
  function schedule(measure, footerMeasure) {
    if (measure === true) needsMeasure = true;
    if (footerMeasure === true) footerNeedsMeasure = true;
    if (!frame && !document.hidden) frame = window.requestAnimationFrame(render);
  }
  function measure() {
    // Footer geometry always comes from the base axes, not the previous hover
    // frame. This prevents moving glyph targets and feedback in the fit budget.
    var footerSettings = [];
    footerGroups.forEach(function (group) {
      group.states.forEach(function (letter) {
        footerSettings.push([letter.element, letter.element.style.fontVariationSettings]);
        letter.element.style.fontVariationSettings = '"wdth" 70, "wght" 800';
      });
    });
    pageRange = Math.max(1, root.scrollHeight - window.innerHeight);
    hoverTargets.concat(magnets).forEach(function (element) {
      var rect = element.getBoundingClientRect();
      hoverBounds.set(element, { left: rect.left, top: rect.top + window.scrollY, width: rect.width, height: rect.height });
    });
    featuredBounds = rows.map(function (row) {
      var rect = row.getBoundingClientRect();
      return rect.top + window.scrollY + rect.height / 2;
    });
    letters.forEach(function (letter) {
      var rect = letter.element.getBoundingClientRect();
      letter.x = rect.left + rect.width / 2;
      letter.y = rect.top + window.scrollY + rect.height / 2;
    });
    footerGroups.forEach(function (group) {
      // A block-sized text wrapper can occupy the entire CTA even when its
      // glyphs leave room. Measure the actual letter row, including its gaps.
      var left = Infinity, right = -Infinity;
      group.states.forEach(function (letter) {
        var rect = letter.element.getBoundingClientRect();
        left = Math.min(left, rect.left);
        right = Math.max(right, rect.left + rect.width);
      });
      group.baseWidth = group.states.length ? Math.max(0, right - left) : 0;
      var ownerRect = group.owner ? group.owner.getBoundingClientRect() : null;
      group.availableWidth = ownerRect ? Math.max(0, ownerRect.left + ownerRect.width - left) : group.baseWidth;
      group.states.forEach(function (letter) {
        if (!footerNeedsMeasure && letter.samples.length) return;
        letter.samples = [];
        for (var step = 0; step <= 16; step++) {
          var strength = step / 16;
          letter.element.style.fontVariationSettings = '"wdth" ' + (70 + strength * 55) + ', "wght" ' + (800 - strength * 540);
          letter.samples.push(letter.element.getBoundingClientRect().width);
        }
        letter.element.style.fontVariationSettings = '"wdth" 70, "wght" 800';
      });
    });
    footerSettings.forEach(function (setting) { setting[0].style.fontVariationSettings = setting[1]; });
    footerNeedsMeasure = false;
    needsMeasure = false;
  }
  function resetFooterLetters() {
    footerGroups.forEach(function (group) {
      group.states.forEach(function (letter) {
        letter.width = 70; letter.weight = 800; letter.targetStrength = 0;
        letter.element.style.fontVariationSettings = '"wdth" 70.00, "wght" 800.00';
      });
    });
  }
  function footerGrowth(letter, strength) {
    if (!letter.samples.length) return 0;
    var position = clamp(strength, 0, 1) * 16;
    var low = Math.floor(position), high = Math.min(16, low + 1);
    return letter.samples[low] + (letter.samples[high] - letter.samples[low]) * (position - low) - letter.samples[0];
  }
  function fitFooterTargets(enabled, follows) {
    footerGroups.forEach(function (group) {
      var focused = !!(group.owner && group.owner.contains(document.activeElement));
      var hovered = !!(group.owner && group.owner === hoveredFooter && follows);
      var strengths = group.states.map(function (letter) {
        if (!enabled || (!hovered && !focused)) return 0;
        if (!hovered) return 0.65;
        var near = clamp(1 - Math.hypot(pointer.x - letter.x, pointer.y + window.scrollY - letter.y) / 360, 0, 1);
        return near * near * (3 - 2 * near);
      });
      var budget = Math.max(0, group.availableWidth - group.baseWidth - 1);
      function growth(scale) {
        return group.states.reduce(function (sum, letter, index) { return sum + footerGrowth(letter, strengths[index] * scale); }, 0);
      }
      var cap = 1;
      if (growth(1) > budget) {
        var low = 0, high = 1;
        for (var step = 0; step < 12; step++) {
          var mid = (low + high) / 2;
          if (growth(mid) <= budget) low = mid; else high = mid;
        }
        cap = low;
      }
      group.states.forEach(function (letter, index) { letter.targetStrength = strengths[index] * cap; });
    });
  }
  function setFeatured(index) {
    if (!previews.length) return;
    activeFeatured = clamp(index, 0, previews.length - 1);
    rows.forEach(function (row, i) {
      row.classList.toggle('is-active', i === activeFeatured);
      if (i === activeFeatured) row.setAttribute('aria-current', 'true');
      else row.removeAttribute('aria-current');
    });
    previews.forEach(function (preview, i) {
      preview.classList.toggle('is-active', i === activeFeatured);
      preview.inert = i !== activeFeatured;
      if (i !== activeFeatured) preview.setAttribute('aria-hidden', 'true');
      else preview.removeAttribute('aria-hidden');
    });
  }
  function render() {
    frame = 0;
    if (needsMeasure) measure();
    var enabled = fine.matches && !paused && !document.hidden && windowFocused;
    var follows = enabled && pointer.seen;
    var settling = false;
    body.classList.toggle('cursor-active', follows);
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 24);
    nameLines.forEach(function (line, index) {
      line.style.setProperty('--name-shift', paused ? '0px' : (clamp(window.scrollY * 0.045, 0, 60) * (index % 2 ? 1 : -1)).toFixed(2) + 'px');
    });

    if (follows) {
      eased.x += (pointer.x - eased.x) * 0.18;
      eased.y += (pointer.y - eased.y) * 0.18;
      settling = Math.abs(pointer.x - eased.x) + Math.abs(pointer.y - eased.y) > 0.2;
    }
    [aura, cursor].forEach(function (element) {
      if (!element) return;
      element.style.opacity = follows ? '1' : '0';
      element.style.setProperty('--cursor-x', eased.x.toFixed(2) + 'px');
      element.style.setProperty('--cursor-y', eased.y.toFixed(2) + 'px');
    });
    if (cursor) cursor.style.transform = 'translate(' + eased.x.toFixed(2) + 'px,' + eased.y.toFixed(2) + 'px)';

    hoverTargets.forEach(function (element) {
      var rect = hoverBounds.get(element);
      var x = 0, y = 0;
      if (follows && hoverTarget === element && rect) {
        x = clamp((pointer.x - rect.left) / Math.max(1, rect.width) * 2 - 1, -1, 1);
        y = clamp((pointer.y + window.scrollY - rect.top) / Math.max(1, rect.height) * 2 - 1, -1, 1);
      }
      element.style.setProperty('--pointer-x', (x * 8).toFixed(2) + 'px');
      element.style.setProperty('--pointer-y', (y * 8).toFixed(2) + 'px');
      element.style.setProperty('--tilt-x', (-y * 5).toFixed(2) + 'deg');
      element.style.setProperty('--tilt-y', (x * 5).toFixed(2) + 'deg');
      if (follows && hoverTarget === element && rect) {
        element.style.setProperty('--preview-x', clamp(pointer.x - rect.left, 0, rect.width).toFixed(2) + 'px');
        element.style.setProperty('--preview-y', clamp(pointer.y + window.scrollY - rect.top, 0, rect.height).toFixed(2) + 'px');
      }
    });
    magnets.forEach(function (element) {
      var rect = hoverBounds.get(element);
      var x = 0, y = 0;
      if (follows && activeMagnet === element && rect) {
        x = clamp((pointer.x - rect.left) / Math.max(1, rect.width) * 2 - 1, -1, 1) * 8;
        y = clamp((pointer.y + window.scrollY - rect.top) / Math.max(1, rect.height) * 2 - 1, -1, 1) * 8;
      }
      element.style.setProperty('--magnet-x', x.toFixed(2) + 'px');
      element.style.setProperty('--magnet-y', y.toFixed(2) + 'px');
      // The individual translate property composes with CSS transforms.
      element.style.translate = x.toFixed(2) + 'px ' + y.toFixed(2) + 'px';
    });
    fitFooterTargets(enabled, follows);
    letters.forEach(function (letter) {
      var distance = follows ? Math.hypot(pointer.x - letter.x, pointer.y + window.scrollY - letter.y) : 360;
      var strength = letter.footer ? letter.targetStrength : clamp(1 - distance / 360, 0, 1);
      var width = 70 + strength * 55;
      var weight = 800 - strength * 540;
      if (enabled) {
        letter.width += (width - letter.width) * 0.12;
        letter.weight += (weight - letter.weight) * 0.12;
        if (Math.abs(letter.width - width) > 0.05 || Math.abs(letter.weight - weight) > 0.5) settling = true;
        else { letter.width = width; letter.weight = weight; }
      } else { letter.width = 70; letter.weight = 800; }
      letter.element.style.fontVariationSettings = '"wdth" ' + letter.width.toFixed(2) + ', "wght" ' + letter.weight.toFixed(2);
    });

    if (rows.length && previews.length) {
      var focusedPreview = previews.findIndex(function (preview) { return preview.contains(document.activeElement); });
      var focusedRow = rows.findIndex(function (row) { return row.contains(document.activeElement); });
      var chosen = 0, nearest = Infinity;
      featuredBounds.forEach(function (center, i) {
        var distance = Math.abs(center - window.scrollY - window.innerHeight * 0.4);
        if (distance < nearest) { nearest = distance; chosen = i; }
      });
      setFeatured(focusedPreview !== -1 ? focusedPreview : (focusedRow !== -1 ? focusedRow : (hoveredRow !== -1 ? hoveredRow : chosen)));
    }
    if (settling && enabled) schedule();
  }

  /* Fullscreen navigation, including a keyboard focus loop. */
  function menuItems() {
    return menu ? [].slice.call(menu.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')) : [];
  }
  function setMenu(open, restoreFocus) {
    if (!menu || !menuButton) return;
    menuOpen = open;
    menu.hidden = !open;
    menu.inert = !open;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    root.classList.toggle('menu-open', open);
    body.classList.toggle('menu-open', open);
    if (open) { var first = menuItems()[0]; if (first) first.focus(); }
    else if (restoreFocus) menuButton.focus();
  }
  if (menuButton && menu) {
    menuButton.addEventListener('click', function () { setMenu(!menuOpen, true); });
    menu.addEventListener('click', function (event) { if (closest(event.target, 'a[href]')) setMenu(false, true); });
    setMenu(false, false);
  }
  document.addEventListener('keydown', function (event) {
    if (!menuOpen) return;
    if (event.key === 'Escape') { event.preventDefault(); setMenu(false, true); }
    if (event.key === 'Tab') {
      var items = [menuButton].concat(menuItems());
      var index = items.indexOf(document.activeElement);
      if (index === -1 || (event.shiftKey && index === 0) || (!event.shiftKey && index === items.length - 1)) {
        event.preventDefault();
        items[event.shiftKey ? items.length - 1 : 0].focus();
      }
    }
  });

  /* One clock timer, suspended whenever the page is hidden. */
  var times = [].slice.call(document.querySelectorAll('[data-local-time]'));
  var clockTimer = 0;
  var clockFormat = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
  function syncClock() {
    window.clearInterval(clockTimer);
    clockTimer = 0;
    if (document.hidden || !times.length) return;
    function update() {
      var now = new Date();
      times.forEach(function (time) { time.textContent = clockFormat.format(now); time.dateTime = now.toISOString(); });
    }
    update();
    clockTimer = window.setInterval(update, 60000);
  }

  /* About statement: lines light up one at a time as the section scrolls through the viewport. */
  var statement = document.querySelector('.about-statement');
  var statementWords = [];
  var statementLine = 0;
  if (statement) {
    (function wrap(parent) {
      [].slice.call(parent.childNodes).forEach(function (node) {
        if (node.nodeType === 3) {
          var fragment = document.createDocumentFragment();
          node.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part.trim()) { if (part) fragment.appendChild(document.createTextNode(part)); return; }
            var span = document.createElement('span');
            span.className = 'scroll-word';
            span.textContent = part;
            span.dataset.line = statementLine;
            statementWords.push(span);
            fragment.appendChild(span);
          });
          parent.replaceChild(fragment, node);
        } else if (node.nodeType === 1 && node.tagName === 'BR') statementLine++;
        else if (node.nodeType === 1) wrap(node);
      });
    })(statement);
  }
  var statementTick = 0;
  function updateStatement() {
    statementTick = 0;
    if (!statementWords.length) return;
    statement.classList.toggle('scroll-words', !paused);
    if (paused) return;
    var rect = statement.getBoundingClientRect();
    var viewport = window.innerHeight || 1;
    var progress = clamp((viewport * 0.85 - rect.top) / (viewport * 0.55 + rect.height * 0.6), 0, 1);
    // One line at a time: the active line is fully lit, the others fall back to dim.
    var position = progress * statementLine + 0.5;
    statementWords.forEach(function (word) {
      var distance = Math.abs(position - (Number(word.dataset.line) + 0.5));
      word.style.setProperty('--lit', clamp((0.75 - distance) / 0.3, 0, 1).toFixed(3));
    });
  }
  function queueStatement() { if (!statementTick) statementTick = window.requestAnimationFrame(updateStatement); }
  if (statementWords.length) {
    window.addEventListener('scroll', queueStatement, { passive: true });
    window.addEventListener('resize', queueStatement);
    updateStatement();
  }

  /* Reveal stays opt-in: unsupported browsers and reduced motion stay readable. */
  var reveals = [].slice.call(document.querySelectorAll('.reveal, [data-reveal]'));
  if ('IntersectionObserver' in window) {
    var observer = new window.IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('in'); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });
    reveals.forEach(function (element) { observer.observe(element); });
  } else reveals.forEach(function (element) { element.classList.add('in'); });
  function syncMotion() {
    paused = userPaused || reduced.matches;
    root.classList.toggle('motion-paused', paused);
    queueStatement();
    toggles.forEach(function (button) {
      var label = button.querySelector('.motion-label') || button;
      label.textContent = paused ? 'Play motion' : 'Pause motion';
      button.setAttribute('aria-pressed', String(paused));
      button.setAttribute('aria-label', reduced.matches ? 'Reduced motion is enabled in your device settings' : (paused ? 'Play motion' : 'Pause motion'));
      button.disabled = reduced.matches;
    });
    if (paused) {
      reveals.forEach(function (element) { element.classList.add('in'); });
      pointer.seen = false;
      hoverTarget = null;
      activeMagnet = null;
      hoveredFooter = null;
      resetFooterLetters();
      entryAnimations.forEach(function (animation) { animation.cancel(); });
      entryAnimations = [];
      cursorLink(null);
    }
    window.dispatchEvent(new CustomEvent('portfolio:motion', { detail: { paused: paused } }));
    schedule();
  }
  toggles.forEach(function (button) { button.addEventListener('click', function () { userPaused = !userPaused; syncMotion(); }); });
  reduced.addEventListener('change', syncMotion);
  fine.addEventListener('change', function () {
    pointer.seen = false; hoverTarget = null; activeMagnet = null; hoveredFooter = null;
    resetFooterLetters(); cursorLink(null); schedule();
  });

  rows.forEach(function (row, index) {
    row.addEventListener('pointerenter', function () { hoveredRow = index; schedule(); });
    row.addEventListener('pointerleave', function () { hoveredRow = -1; schedule(); });
    row.addEventListener('focusin', function () { schedule(); });
  });
  if (featured) featured.addEventListener('focusout', function () { schedule(); });
  footerGroups.forEach(function (group) {
    if (!group.owner) return;
    group.owner.addEventListener('focusin', function () { schedule(); });
    group.owner.addEventListener('focusout', function () { schedule(); });
    group.owner.addEventListener('pointerleave', function (event) {
      hoveredFooter = null;
      cursorLink(event.relatedTarget);
      schedule();
    });
  });
  window.addEventListener('pointermove', function (event) {
    if (event.pointerType === 'touch') {
      pointer.seen = false; hoveredFooter = null;
      resetFooterLetters(); cursorLink(null); schedule();
      return;
    }
    if (!fine.matches || paused || document.hidden) return;
    // Hover remains useful while the address bar owns keyboard focus. A real
    // page pointer event is enough to resume the response after blur/navigation.
    windowFocused = true;
    if (!pointer.seen) { eased.x = event.clientX; eased.y = event.clientY; }
    pointer.x = event.clientX; pointer.y = event.clientY; pointer.seen = true;
    hoverTarget = closest(event.target, '.project-card, .project-art, .work-table-row[data-project-preview], .about-portrait, [data-portrait]');
    activeMagnet = closest(event.target, magnetSelector);
    cursorLink(event.target);
    schedule();
  }, { passive: true });
  document.addEventListener('pointerleave', function () {
    pointer.seen = false; hoverTarget = null; activeMagnet = null; hoveredFooter = null;
    resetFooterLetters(); cursorLink(null); schedule();
  });
  function cursorLink(target) {
    var link = closest(target, 'a, button, [data-cursor-label], [data-cursor]');
    var enabled = fine.matches && !paused && !document.hidden && windowFocused && !!link;
    hoveredFooter = enabled ? closest(target, '[data-footer-cta]') : null;
    [cursor, aura].forEach(function (element) {
      if (!element) return;
      element.classList.toggle('is-link', enabled);
      element.classList.toggle('is-footer', !!hoveredFooter);
      element.classList.toggle('is-service', enabled && link.classList.contains('simple-service'));
    });
    if (cursorLabel) cursorLabel.textContent = enabled ? (link.getAttribute('data-cursor-label') || link.getAttribute('data-cursor') || '') : '';
  }
  document.addEventListener('pointerover', function (event) {
    if (event.pointerType !== 'touch' && fine.matches && !paused && !document.hidden) windowFocused = true;
    cursorLink(event.pointerType === 'touch' ? null : event.target);
    schedule();
  });
  document.addEventListener('pointerout', function (event) { cursorLink(event.pointerType === 'touch' ? null : event.relatedTarget); schedule(); });

  /* Work list/grid views preserve the selected control's keyboard focus. */
  var viewButtons = [].slice.call(document.querySelectorAll('[data-work-view]'));
  var viewPanels = [].slice.call(document.querySelectorAll('[data-view-panel]'));
  viewButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      var value = button.dataset.workView;
      viewButtons.forEach(function (control) { control.setAttribute('aria-pressed', String(control.dataset.workView === value)); });
      viewPanels.forEach(function (panel) { panel.hidden = panel.dataset.viewPanel !== value; });
      var collection = document.querySelector('.work-collection');
      if (collection) collection.dataset.view = value;
      schedule(true);
    });
  });

  /* Mouse drag supplements native horizontal overflow; touch remains native. */
  document.querySelectorAll('.detail-track').forEach(function (track) {
    var drag = null, blockClick = false;
    track.addEventListener('pointerdown', function (event) {
      blockClick = false;
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      drag = { id: event.pointerId, x: event.clientX, left: track.scrollLeft, moved: false };
    });
    window.addEventListener('pointermove', function (event) {
      if (!drag || drag.id !== event.pointerId) return;
      var distance = event.clientX - drag.x;
      if (Math.abs(distance) > 6) drag.moved = true;
      if (!drag.moved) return;
      event.preventDefault();
      track.classList.add('is-dragging');
      track.scrollLeft = drag.left - distance;
    });
    function endDrag(event) {
      if (!drag || drag.id !== event.pointerId) return;
      blockClick = drag.moved;
      drag = null;
      track.classList.remove('is-dragging');
    }
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    track.addEventListener('click', function (event) {
      if (blockClick && event.detail !== 0) { event.preventDefault(); event.stopPropagation(); }
      blockClick = false;
    }, true);
  });
  document.querySelectorAll('[data-detail-prev], [data-detail-next]').forEach(function (button) {
    button.addEventListener('click', function () {
      var container = closest(button, '.detail-gallery') || document;
      var track = container.querySelector('.detail-track');
      if (track) track.scrollBy({ left: (button.hasAttribute('data-detail-prev') ? -1 : 1) * track.clientWidth * 0.85, behavior: paused ? 'instant' : 'smooth' });
    });
  });

  /* Page transitions leave external, modified, download and in-page links native. */
  var transition = document.getElementById('pageTransition');
  var navigationTimer = 0, navigating = false;
  document.addEventListener('click', function (event) {
    var top = closest(event.target, '[data-top]');
    if (top) { event.preventDefault(); window.scrollTo({ top: 0, behavior: paused ? 'instant' : 'smooth' }); return; }
    var link = closest(event.target, 'a[href]');
    if (!transition || !link || paused || event.defaultPrevented || event.button !== 0 || event.detail === 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    var href = link.getAttribute('href');
    if (!href || href.charAt(0) === '#') return;
    var destination;
    try { destination = new URL(href, window.location.href); } catch (error) { return; }
    if (destination.origin !== window.location.origin || !/^https?:$/.test(destination.protocol) || (destination.pathname === window.location.pathname && destination.search === window.location.search)) return;
    event.preventDefault();
    if (navigating) return;
    navigating = true;
    var title = transition.querySelector('.transition-title');
    if (title) title.textContent = link.getAttribute('data-transition-title') || link.textContent.trim().slice(0, 60);
    root.classList.add('is-leaving');
    transition.classList.add('is-leaving');
    navigationTimer = window.setTimeout(function () { window.location.assign(destination.href); }, 450);
  });
  window.addEventListener('pageshow', function () {
    window.clearTimeout(navigationTimer);
    navigating = false;
    root.classList.remove('is-leaving');
    if (transition) transition.classList.remove('is-leaving');
    setMenu(false, false);
    schedule(true, true);
  });

  window.addEventListener('scroll', function () { schedule(); }, { passive: true });
  window.addEventListener('resize', function () { schedule(true, true); }, { passive: true });
  window.addEventListener('load', function () { schedule(true, true); }, { once: true });
  document.addEventListener('animationend', function (event) { if (closest(event.target, '[data-hero-letter]')) schedule(true); });
  document.addEventListener('visibilitychange', function () {
    syncClock();
    if (document.hidden) {
      window.cancelAnimationFrame(frame); frame = 0;
      pointer.seen = false; hoverTarget = null; activeMagnet = null;
      hoveredFooter = null;
      resetFooterLetters();
      cursorLink(null);
      body.classList.remove('cursor-active');
      entryAnimations.forEach(function (animation) { animation.pause(); });
      [aura, cursor].forEach(function (element) { if (element) element.style.opacity = '0'; });
    } else {
      if (!paused) entryAnimations.forEach(function (animation) { animation.play(); });
      schedule(true);
    }
  });
  window.addEventListener('blur', function () {
    windowFocused = false; pointer.seen = false; hoveredFooter = null;
    resetFooterLetters(); cursorLink(null); schedule();
  });
  window.addEventListener('focus', function () { windowFocused = true; schedule(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { schedule(true, true); });
  root.classList.add('motion-ready');
  syncClock();
  syncMotion();
  if (!paused && !document.hidden) {
    letterElements.forEach(function (element, index) {
      if (!element.animate) return;
      var animation = element.animate([
        { transform: 'translateY(115%)', opacity: 0 },
        { transform: 'translateY(0)', opacity: 1 }
      ], { duration: 1300, delay: index * 55, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' });
      entryAnimations.push(animation);
      animation.onfinish = function () {
        animation.cancel();
        entryAnimations = entryAnimations.filter(function (item) { return item !== animation; });
        schedule(true);
      };
    });
  }
  schedule(true);
})();
