// Admin panel: login, message inbox, content editors and site settings.
(function () {
  var $ = function (s, el) { return (el || document).querySelector(s); };
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') el.className = attrs[k];
      else if (k === 'text') el.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== false && attrs[k] != null) el.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) el.append(c); });
    return el;
  }

  var toastTimer;
  function toast(text, bad) {
    var t = $('#toast');
    t.textContent = text;
    t.className = 'toast show' + (bad ? ' bad' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = 'toast'; }, 2600);
  }

  function api(method, url, body) {
    return fetch('/api/admin' + url, {
      method: method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin'
    }).then(function (r) {
      if (r.status === 401) { showLogin(); throw Object.assign(new Error('Signed out.'), { silent: true }); }
      if (r.status === 204) return null;
      return r.json().then(function (data) {
        if (!r.ok) throw Object.assign(new Error(data.error || 'Request failed.'), { fields: data.fields });
        return data;
      });
    });
  }
  function fail(err) { if (!err.silent) toast(err.message, true); }

  /* ---------- Auth ---------- */
  function showLogin() { $('#appView').classList.add('hidden'); $('#loginView').classList.remove('hidden'); }
  function showApp() { $('#loginView').classList.add('hidden'); $('#appView').classList.remove('hidden'); loadMessages(); }

  $('#loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    $('#loginErr').textContent = '';
    api('POST', '/login', { password: e.target.password.value })
      .then(function () { e.target.reset(); showApp(); })
      .catch(function (err) { $('#loginErr').textContent = err.message; });
  });
  $('#logoutBtn').addEventListener('click', function () { api('POST', '/logout').then(showLogin).catch(fail); });

  fetch('/api/admin/me').then(function (r) { return r.json(); })
    .then(function (d) { d.authed ? showApp() : showLogin(); })
    .catch(showLogin);

  /* ---------- Tabs ---------- */
  var loaded = {};
  document.querySelectorAll('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.tab').forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on);
        $('#tab-' + t.dataset.tab).classList.toggle('hidden', !on);
      });
      var name = tab.dataset.tab;
      if (name === 'messages') loadMessages();
      else if (name === 'site') loadSite();
      else if (!loaded[name]) loadContent(name);
    });
  });

  /* ---------- Messages ---------- */
  function fmtDate(iso) {
    return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function loadMessages() {
    var qs = $('#unreadOnly').checked ? '?unread=1&limit=200' : '?limit=200';
    return api('GET', '/messages' + qs).then(function (data) {
      var badge = $('#unreadBadge');
      badge.textContent = data.unread;
      badge.classList.toggle('hidden', !data.unread);
      $('#msgCount').textContent = data.total + ' message' + (data.total === 1 ? '' : 's') + ', ' + data.unread + ' unread';
      var list = $('#msgList');
      list.replaceChildren();
      if (!data.items.length) {
        list.append(h('div', { class: 'empty', text: $('#unreadOnly').checked ? 'All caught up.' : 'No messages yet. They will appear here when someone uses the contact form.' }));
        return;
      }
      data.items.forEach(function (m) { list.append(messageItem(m)); });
    }).catch(fail);
  }
  $('#unreadOnly').addEventListener('change', loadMessages);

  function messageItem(m) {
    var item = h('div', { class: 'item' + (m.read_at ? '' : ' unread') });
    var dot = h('span', { class: 'dot' + (m.read_at ? ' read' : '') });
    var body = h('div', { class: 'item-body hidden' });
    var head = h('button', { class: 'item-head', 'aria-expanded': 'false', onclick: function () {
      var open = body.classList.toggle('hidden') === false;
      head.setAttribute('aria-expanded', open);
      if (open && !m.read_at) setRead(true);
    } }, [
      dot,
      h('div', { class: 'main' }, [
        h('div', { class: 'title' }, [m.name, m.topic ? h('span', { class: 'pill', text: m.topic }) : null]),
        h('div', { class: 'sub', text: m.message })
      ]),
      h('span', { class: 'when', text: fmtDate(m.created_at) })
    ]);

    function setRead(read) {
      return api('PATCH', '/messages/' + m.id, { read: read }).then(function (updated) {
        m = updated;
        dot.className = 'dot' + (read ? ' read' : '');
        item.classList.toggle('unread', !read);
        readBtn.textContent = read ? 'Mark unread' : 'Mark read';
        refreshCounts();
      }).catch(fail);
    }

    var subject = 'Re: ' + (m.topic ? m.topic + ' project' : 'your message');
    var readBtn = h('button', { class: 'btn ghost sm', text: m.read_at ? 'Mark unread' : 'Mark read', onclick: function () { setRead(!m.read_at); } });
    body.append(
      h('div', { class: 'meta-row' }, [
        h('span', {}, [h('b', { text: 'Email ' }), m.email]),
        m.budget ? h('span', {}, [h('b', { text: 'Budget ' }), m.budget]) : null,
        h('span', {}, [h('b', { text: 'Received ' }), fmtDate(m.created_at)]),
        h('span', { text: m.emailed ? 'Email notification sent' : 'Not emailed' })
      ]),
      h('p', { class: 'msg-text', text: m.message }),
      h('div', { class: 'row-actions' }, [
        h('a', { class: 'btn sm', href: 'mailto:' + encodeURIComponent(m.email) + '?subject=' + encodeURIComponent(subject), text: 'Reply by email' }),
        readBtn,
        h('button', { class: 'btn danger sm', text: 'Delete', onclick: function () {
          if (!confirm('Delete this message from ' + m.name + '? This cannot be undone.')) return;
          api('DELETE', '/messages/' + m.id).then(function () { item.remove(); toast('Message deleted'); refreshCounts(); }).catch(fail);
        } })
      ])
    );
    item.append(head, body);
    return item;
  }

  function refreshCounts() {
    api('GET', '/messages?limit=1').then(function (d) {
      $('#unreadBadge').textContent = d.unread;
      $('#unreadBadge').classList.toggle('hidden', !d.unread);
      $('#msgCount').textContent = d.total + ' message' + (d.total === 1 ? '' : 's') + ', ' + d.unread + ' unread';
    }).catch(fail);
  }

  /* ---------- Projects & testimonials ---------- */
  var FIELDS = {
    projects: [
      { type: 'section', label: 'Card' },
      { key: 'title', label: 'Title', full: true, hint: 'Text after a colon is set in italic on the case study page, e.g. "Paisa: Budgeting App"' },
      { key: 'category', label: 'Category line', hint: 'e.g. Mobile · Fintech · 2025' },
      { key: 'tags', label: 'Services / tags', hint: 'Comma separated' },
      { key: 'theme', label: 'Colour', type: 'select', options: [['s1', 'Violet → pink'], ['s2', 'Indigo → violet'], ['s3', 'Night → pink'], ['s4', 'Pink → lavender']] },
      { key: 'layout', label: 'Mockup', type: 'select', options: [['phone', 'Phone'], ['wide', 'Wide screen'], ['phone-profile', 'Phone (profile)'], ['wide-sidebar', 'Wide (sidebar)']] },
      { key: 'sort_order', label: 'Order', type: 'number' },
      { key: 'published', label: 'Show on site', type: 'check' },
      { type: 'section', label: 'Case study page' },
      { key: 'slug', label: 'Page address', hint: 'The page lives at /work/<this>. Leave empty to generate from the title.', mono: true },
      { key: 'url', label: 'Live project link', hint: 'Optional: https://… shown as a button' },
      { key: 'summary', label: 'Summary', type: 'textarea', full: true, rows: 2, hint: 'One or two sentences under the title' },
      { key: 'client', label: 'Client' },
      { key: 'role', label: 'My role' },
      { key: 'duration', label: 'Timeline', hint: 'e.g. 14 weeks' },
      { key: 'metrics', label: 'Results', type: 'metrics', full: true, hint: 'One per line: value | label, e.g. 52% | fewer drop-offs' },
      { key: 'challenge', label: 'The challenge', type: 'textarea', full: true, hint: 'Blank line = new paragraph. Lines starting with "- " become a bullet list. *word* = italic.' },
      { key: 'approach', label: 'The approach', type: 'textarea', full: true },
      { key: 'outcome', label: 'The outcome', type: 'textarea', full: true }
    ],
    testimonials: [
      { key: 'quote', label: 'Quote', type: 'textarea', full: true, hint: 'Wrap a word in *asterisks* for italic emphasis' },
      { key: 'name', label: 'Name' },
      { key: 'role', label: 'Role & company' },
      { key: 'sort_order', label: 'Order', type: 'number' },
      { key: 'published', label: 'Show on site', type: 'check' }
    ]
  };
  var DEFAULTS = {
    projects: {
      title: '', slug: '', category: '', tags: [], url: '', theme: 's1', layout: 'phone', sort_order: 0, published: true,
      summary: '', client: '', role: '', duration: '', metrics: [], challenge: '', approach: '', outcome: ''
    },
    testimonials: { quote: '', name: '', role: '', sort_order: 0, published: true }
  };

  function loadContent(type) {
    return api('GET', '/' + type).then(function (rows) {
      loaded[type] = true;
      var list = $('#list-' + type);
      list.replaceChildren();
      if (!rows.length) list.append(h('div', { class: 'empty', text: 'Nothing here yet.' }));
      rows.forEach(function (row) { list.append(contentItem(type, row)); });
    }).catch(fail);
  }

  function summary(type, row) {
    return type === 'projects'
      ? { title: row.title, sub: [row.category].concat(row.tags).filter(Boolean).join(' · ') }
      : { title: row.name, sub: row.quote };
  }

  function contentItem(type, row, startOpen) {
    var item = h('div', { class: 'item' });
    var s = summary(type, row || DEFAULTS[type]);
    var editor = editorFor(type, row, function onSaved(saved) {
      if (!row) { loadContent(type); return; } // new item: re-render in sort order
      item.replaceWith(contentItem(type, saved));
    }, function onCancel() {
      if (!row) item.remove(); else { editor.classList.add('hidden'); head.setAttribute('aria-expanded', 'false'); }
    });
    if (!startOpen) editor.classList.add('hidden');

    var head = h('button', { class: 'item-head', 'aria-expanded': String(!!startOpen), onclick: function () {
      var open = editor.classList.toggle('hidden') === false;
      head.setAttribute('aria-expanded', open);
    } }, [
      h('div', { class: 'main' }, [
        h('div', { class: 'title' }, [row ? s.title : 'New ' + type.slice(0, -1), row && !row.published ? h('span', { class: 'pill', text: 'Hidden' }) : null]),
        h('div', { class: 'sub', text: row ? s.sub : '' })
      ]),
      row ? h('span', { class: 'when', text: '#' + row.sort_order }) : null
    ]);
    item.append(head, editor);
    return item;
  }

  function editorFor(type, row, onSaved, onCancel) {
    var data = Object.assign({}, DEFAULTS[type], row || {});
    var form = h('form', { class: 'editor item-body', novalidate: true });
    var inputs = {};

    if (type === 'projects' && row && row.published) {
      form.append(h('a', { class: 'preview full', href: '/work/' + encodeURIComponent(row.slug), target: '_blank', rel: 'noopener', text: 'View case study page ↗' }));
    }

    FIELDS[type].forEach(function (f) {
      if (f.type === 'section') { form.append(h('div', { class: 'section-label', text: f.label })); return; }
      var val = data[f.key];
      var input;
      if (f.type === 'select') {
        input = h('select', { name: f.key }, f.options.map(function (o) { return h('option', { value: o[0], text: o[1], selected: o[0] === val }); }));
      } else if (f.type === 'textarea') {
        input = h('textarea', { name: f.key, rows: f.rows || false }); input.value = val;
        if (f.rows) input.style.minHeight = 'auto';
      } else if (f.type === 'metrics') {
        input = h('textarea', { name: f.key, class: 'mono', rows: 4 });
        input.value = (val || []).map(function (m) { return m.value + (m.label ? ' | ' + m.label : ''); }).join('\n');
        input.style.minHeight = 'auto';
      } else if (f.type === 'check') {
        input = h('input', { type: 'checkbox', name: f.key, checked: !!val });
      } else {
        input = h('input', { name: f.key, type: f.type === 'number' ? 'number' : 'text', class: f.mono ? 'mono' : false });
        input.value = Array.isArray(val) ? val.join(', ') : val;
      }
      inputs[f.key] = input;
      var err = h('span', { class: 'err' });
      input._err = err;
      form.append(f.type === 'check'
        ? h('label', { class: 'field check' + (f.full ? ' full' : '') }, [input, h('span', { text: f.label })])
        : h('label', { class: 'field' + (f.full ? ' full' : '') }, [h('span', { text: f.label }), input, f.hint ? h('small', { text: f.hint }) : null, err]));
    });

    var saveBtn = h('button', { class: 'btn sm', type: 'submit', text: row ? 'Save changes' : 'Create' });
    form.append(h('div', { class: 'row-actions' }, [
      row ? h('button', { class: 'btn danger sm', type: 'button', text: 'Delete', onclick: function () {
        if (!confirm('Delete "' + summary(type, row).title + '"? This cannot be undone.')) return;
        api('DELETE', '/' + type + '/' + row.id).then(function () { toast('Deleted'); loadContent(type); }).catch(fail);
      } }) : null,
      h('button', { class: 'btn ghost sm', type: 'button', text: 'Cancel', onclick: onCancel }),
      saveBtn
    ]));

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var body = {};
      Object.keys(inputs).forEach(function (k) {
        var el = inputs[k];
        el.closest('.field').classList.remove('invalid');
        if (el._err) el._err.textContent = '';
        body[k] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? Number(el.value || 0) : el.value;
      });
      saveBtn.disabled = true;
      (row ? api('PATCH', '/' + type + '/' + row.id, body) : api('POST', '/' + type, body))
        .then(function (saved) { toast(row ? 'Saved' : 'Created'); onSaved(saved); })
        .catch(function (err) {
          Object.keys(err.fields || {}).forEach(function (k) {
            if (!inputs[k]) return;
            inputs[k].closest('.field').classList.add('invalid');
            if (inputs[k]._err) inputs[k]._err.textContent = err.fields[k];
          });
          fail(err);
        })
        .then(function () { saveBtn.disabled = false; });
    });
    return form;
  }

  /* ---------- Site settings ---------- */
  var siteForm = $('#siteForm');
  var STAT_COUNT = 4, HIGHLIGHT_COUNT = 3;

  function fieldInput(label, name, opts) {
    opts = opts || {};
    var input = h(opts.textarea ? 'textarea' : 'input', { name: name, maxlength: opts.max || false, rows: opts.textarea ? 2 : false });
    if (opts.textarea) input.style.minHeight = 'auto';
    return h('label', { class: 'field' + (opts.full ? ' full' : '') }, [h('span', { text: label }), input, h('span', { class: 'err', 'data-err': name })]);
  }

  // Build the fixed rows for stats and highlights once.
  (function buildRows() {
    var stats = $('#statsFields');
    for (var i = 0; i < STAT_COUNT; i++) {
      stats.append(
        h('div', { class: 'group-label', text: 'Stat ' + (i + 1) }),
        fieldInput('Label', 'stats.' + i + '.tag', { max: 30 }),
        fieldInput('Number', 'stats.' + i + '.value', { max: 12 }),
        fieldInput('Description', 'stats.' + i + '.text', { max: 160, full: true, textarea: true }),
        h('label', { class: 'field check full' }, [h('input', { type: 'checkbox', name: 'stats.' + i + '.accent' }), h('span', { text: 'Gradient number' })])
      );
    }
    var hl = $('#highlightFields');
    for (var j = 0; j < HIGHLIGHT_COUNT; j++) {
      hl.append(
        fieldInput('Number ' + (j + 1), 'highlights.' + j + '.value', { max: 12 }),
        fieldInput('Description ' + (j + 1), 'highlights.' + j + '.text', { max: 120 })
      );
    }
  })();

  function setField(name, value) {
    var el = siteForm.elements[name];
    if (!el) return;
    if (el.type === 'checkbox') el.checked = !!value; else el.value = value == null ? '' : value;
  }

  function loadSite() {
    return api('GET', '/site').then(function (site) {
      ['availability', 'available', 'email', 'location', 'linkedin', 'behance', 'dribbble'].forEach(function (k) { setField(k, site[k]); });
      site.stats.forEach(function (s, i) { ['tag', 'value', 'text', 'accent'].forEach(function (k) { setField('stats.' + i + '.' + k, s[k]); }); });
      site.highlights.forEach(function (s, i) { ['value', 'text'].forEach(function (k) { setField('highlights.' + i + '.' + k, s[k]); }); });
    }).catch(fail);
  }

  siteForm.addEventListener('submit', function (e) {
    e.preventDefault();
    siteForm.querySelectorAll('.field.invalid').forEach(function (f) { f.classList.remove('invalid'); });
    siteForm.querySelectorAll('[data-err]').forEach(function (el) { el.textContent = ''; });
    var el = siteForm.elements;
    var body = {
      availability: el.availability.value, available: el.available.checked, email: el.email.value, location: el.location.value,
      linkedin: el.linkedin.value, behance: el.behance.value, dribbble: el.dribbble.value, stats: [], highlights: []
    };
    for (var i = 0; i < STAT_COUNT; i++) {
      body.stats.push({ tag: el['stats.' + i + '.tag'].value, value: el['stats.' + i + '.value'].value, text: el['stats.' + i + '.text'].value, accent: el['stats.' + i + '.accent'].checked });
    }
    for (var j = 0; j < HIGHLIGHT_COUNT; j++) {
      body.highlights.push({ value: el['highlights.' + j + '.value'].value, text: el['highlights.' + j + '.text'].value });
    }
    var btn = siteForm.querySelector('button[type=submit]');
    btn.disabled = true;
    api('PUT', '/site', body).then(function () { toast('Settings saved'); }).catch(function (err) {
      var first = null;
      Object.keys(err.fields || {}).forEach(function (k) {
        var msg = siteForm.querySelector('[data-err="' + k + '"]');
        if (!msg) return;
        msg.textContent = err.fields[k];
        msg.closest('.field').classList.add('invalid');
        first = first || msg.closest('.field').querySelector('input, textarea');
      });
      if (first) first.focus();
      fail(err);
    }).then(function () { btn.disabled = false; });
  });

  document.querySelectorAll('[data-new]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var type = btn.dataset.new;
      var list = $('#list-' + type);
      var empty = $('.empty', list);
      if (empty) empty.remove();
      var item = contentItem(type, null, true);
      list.prepend(item);
      var first = $('input, textarea', item);
      if (first) first.focus();
    });
  });
})();
