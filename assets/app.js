(function () {
  var SITE = window.SITE || {};

  function goal(name, params) {
    if (SITE.metrikaId && window.ym) window.ym(SITE.metrikaId, 'reachGoal', name, params);
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-goal]');
    if (el) goal(el.getAttribute('data-goal'));
  });

  // ---- Quiz ----
  var form = document.querySelector('.quiz');
  if (form) {
    var steps = Array.prototype.slice.call(form.querySelectorAll('.quiz__step'));
    var label = form.querySelector('[data-step-label]');
    var back = form.querySelector('.quiz__back');
    var next = form.querySelector('.quiz__next');
    var errorBox = form.querySelector('.quiz__error');
    var done = form.querySelector('.quiz__done');
    var current = 0;

    var show = function (i) {
      current = i;
      steps.forEach(function (s, k) { s.hidden = k !== i; });
      label.textContent = 'Вопрос ' + (i + 1) + ' из ' + steps.length;
      back.hidden = i === 0;
      next.hidden = i === steps.length - 1;
      syncNext();
      goal('quiz_step_' + (i + 1));
    };
    var syncNext = function () {
      next.disabled = !steps[current].querySelector('input[type=radio]:checked');
    };

    // a radio answer in steps 1–2 advances automatically; "Дальше" is the manual fallback
    var advanceTimer;
    var onPick = function (e) {
      var t = e.target;
      if (t.type !== 'radio' || t.name === 'channel') return;
      syncNext();
      clearTimeout(advanceTimer);
      var from = current;
      advanceTimer = setTimeout(function () { if (current === from && current < steps.length - 1) show(current + 1); }, 220);
    };
    form.addEventListener('change', onPick);
    form.addEventListener('input', onPick);
    next.addEventListener('click', function () { if (!next.disabled && current < steps.length - 1) show(current + 1); });

    back.addEventListener('click', function () { if (current > 0) show(current - 1); });

    // departure buttons preselect the date and skip to "who"
    document.querySelectorAll('[data-departure]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var input = form.querySelector('[data-departure-id="' + btn.getAttribute('data-departure') + '"]');
        if (input) { input.checked = true; show(1); }
      });
    });

    var utm = {};
    new URLSearchParams(location.search).forEach(function (v, k) {
      if (/^(utm_|yclid|gclid)/.test(k)) utm[k] = v;
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = new FormData(form);
      var phoneDigits = String(data.get('phone') || '').replace(/\D/g, '');
      var problem =
        !String(data.get('name') || '').trim() ? 'Укажите имя.' :
        phoneDigits.length < 10 ? 'Проверьте телефон: нужно 10–11 цифр.' :
        !data.get('consent') ? 'Отметьте согласие на обработку данных.' : '';
      if (problem) { errorBox.textContent = problem; errorBox.hidden = false; return; }
      errorBox.hidden = true;

      var payload = {
        tour: SITE.tour,
        departure: data.get('departure') || '',
        crew: data.get('crew') || '',
        channel: data.get('channel') || '',
        name: data.get('name'),
        phone: data.get('phone'),
        page: location.href,
        utm: utm
      };

      var finish = function () {
        steps.forEach(function (s) { s.hidden = true; });
        label.parentNode.hidden = true;
        back.hidden = true;
        next.hidden = true;
        done.hidden = false;
        done.focus();
        goal('lead', { departure: payload.departure, crew: payload.crew });
      };

      var btn = form.querySelector('[type=submit]');
      if (!SITE.leadEndpoint) { console.info('[lead] no endpoint configured', payload); finish(); return; }
      btn.disabled = true;
      fetch(SITE.leadEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        .then(function (r) { if (!r.ok) throw new Error(r.status); finish(); })
        .catch(function () {
          btn.disabled = false;
          errorBox.textContent = 'Заявка не отправилась. Попробуйте ещё раз или позвоните нам.';
          errorBox.hidden = false;
        });
    });
  }

  // ---- Mobile dock: visible after the hero, hidden while the form is on screen ----
  var dock = document.querySelector('.dock');
  var hero = document.querySelector('.hero');
  var lead = document.getElementById('lead');
  if (dock && hero && lead && 'IntersectionObserver' in window) {
    var heroOut = false, leadIn = false;
    var sync = function () { dock.classList.toggle('is-on', heroOut && !leadIn); };
    new IntersectionObserver(function (en) { heroOut = !en[0].isIntersecting; sync(); }).observe(hero);
    new IntersectionObserver(function (en) { leadIn = en[0].isIntersecting; sync(); }).observe(lead);
  }
})();
