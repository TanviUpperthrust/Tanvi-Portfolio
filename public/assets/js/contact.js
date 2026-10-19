// Form submission is the only action here that sends contact information.
(function () {
  'use strict';
  var form = document.getElementById('contactForm');
  if (!form) return;
  var status = document.getElementById('formStatus');
  var submit = form.querySelector('button[type="submit"]');
  var submitMarkup = submit ? submit.innerHTML : '';
  var defaultStatus = status ? status.textContent : '';
  var fields = ['name', 'email', 'topic', 'budget', 'message', 'website'];
  var sending = false;

  function setStatus(message, kind) {
    if (!status) return;
    status.textContent = message;
    status.classList.remove('bad', 'ok', 'is-error', 'is-success');
    if (kind) status.classList.add(kind, kind === 'ok' ? 'is-success' : 'is-error');
  }
  function clearErrors() {
    form.querySelectorAll('.field').forEach(function (field) { field.classList.remove('invalid'); });
    form.querySelectorAll('[aria-invalid]').forEach(function (input) { input.removeAttribute('aria-invalid'); });
    form.querySelectorAll('.err').forEach(function (error) { error.textContent = ''; });
  }
  function showErrors(errors) {
    var first = null;
    fields.forEach(function (name) {
      if (!errors[name]) return;
      var input = form.elements[name];
      var error = form.querySelector('.err[data-for="' + name + '"]');
      if (!input || !error) return;
      var field = input.closest('.field');
      if (field) field.classList.add('invalid');
      input.setAttribute('aria-invalid', 'true');
      error.textContent = errors[name];
      var focusTarget = input.type === 'hidden' ? form.querySelector(name === 'topic' ? '[data-need]' : '[data-budget]') : input;
      first = first || focusTarget;
    });
    if (first) first.focus();
  }
  function choices(selector, attribute, name, multiple) {
    var buttons = [].slice.call(form.querySelectorAll(selector));
    var selectedValues = buttons.filter(function (button) { return button.getAttribute('aria-pressed') === 'true'; }).map(function (button) { return button.getAttribute(attribute); });
    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        var selected = button.getAttribute('aria-pressed') !== 'true';
        var value = button.getAttribute(attribute);
        if (!multiple) selectedValues = selected ? [value] : [];
        else if (selected) selectedValues.push(value);
        else selectedValues = selectedValues.filter(function (item) { return item !== value; });
        buttons.forEach(function (choice) { choice.setAttribute('aria-pressed', String(selectedValues.indexOf(choice.getAttribute(attribute)) !== -1)); });
        if (form.elements[name]) form.elements[name].value = selectedValues[0] || '';
        if (form.elements[name]) form.elements[name].removeAttribute('aria-invalid');
        var field = button.closest('.field');
        if (field) field.classList.remove('invalid');
        var error = form.querySelector('.err[data-for="' + name + '"]');
        if (error) error.textContent = '';
      });
    });
    return {
      values: function () { return selectedValues.slice(); },
      reset: function () {
        selectedValues = [];
        buttons.forEach(function (button) { button.setAttribute('aria-pressed', 'false'); });
      }
    };
  }
  var needs = choices('[data-need]', 'data-need', 'topic', true);
  var budgets = choices('[data-budget]', 'data-budget', 'budget', false);

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (sending) return;
    clearErrors();
    var data = {};
    fields.forEach(function (name) { data[name] = form.elements[name] ? form.elements[name].value : ''; });
    var userMessage = data.message;
    var selectedNeeds = needs.values();
    if (selectedNeeds.length > 1) data.message += '\n\nDesign needs: ' + selectedNeeds.join(', ') + '.';
    var errors = {};
    if (!data.name.trim()) errors.name = 'Please enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email.trim())) errors.email = 'Please enter a valid email address.';
    if (userMessage.trim().length < 10) errors.message = 'Please add a little more detail (at least 10 characters).';
    if (data.message.length > 5000) errors.message = 'Please shorten your message slightly to leave room for the selected design needs.';
    if (Object.keys(errors).length) { showErrors(errors); setStatus('Please check the highlighted fields.', 'bad'); return; }
    sending = true;
    form.setAttribute('aria-busy', 'true');
    if (submit) { submit.disabled = true; submit.textContent = 'Sending…'; }
    setStatus('Sending your message…');
    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data)
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (body) { return { ok: response.ok, body: body }; });
    }).then(function (result) {
      if (result.ok) {
        form.reset();
        needs.reset();
        budgets.reset();
        setStatus('Thank you! Your message is in. I’ll get back to you soon.', 'ok');
      } else {
        if (result.body.fields) showErrors(result.body.fields);
        setStatus(result.body.error || 'Something went wrong. Please email me instead.', 'bad');
      }
    }).catch(function () {
      setStatus('Couldn’t reach the server. Please email ' + (form.dataset.email || 'me') + ' instead.', 'bad');
    }).then(function () {
      sending = false;
      form.removeAttribute('aria-busy');
      if (submit) { submit.disabled = false; submit.innerHTML = submitMarkup; }
    });
  });
  form.addEventListener('input', function (event) {
    if (status && status.classList.contains('ok')) setStatus(defaultStatus);
    var input = event.target;
    if (!input || !input.name || fields.indexOf(input.name) === -1) return;
    input.removeAttribute('aria-invalid');
    var field = input.closest('.field');
    if (field) field.classList.remove('invalid');
    var error = form.querySelector('.err[data-for="' + input.name + '"]');
    if (error) error.textContent = '';
  });
})();
