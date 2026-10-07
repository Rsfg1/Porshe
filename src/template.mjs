const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const rub = (n) => n.toLocaleString('ru-RU').replace(/ /g, ' ') + ' ₽';

const statusLabel = (d) => {
  if (d.status === 'full') return 'Мест нет · лист ожидания';
  if (d.status === 'few' && d.left) return `Осталось ${d.left} ${plural(d.left, 'экипаж', 'экипажа', 'экипажей')}`;
  return 'Идёт набор экипажей';
};

const plural = (n, one, few, many) => {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
};

const messengerLinks = (cfg, cls) => {
  const m = cfg.messengers;
  return [
    m.telegram && `<a class="${cls}" href="${esc(m.telegram)}" data-goal="messenger_tg" target="_blank" rel="noopener">Telegram</a>`,
    m.max && `<a class="${cls}" href="${esc(m.max)}" data-goal="messenger_max" target="_blank" rel="noopener">MAX</a>`,
    m.whatsapp && `<a class="${cls}" href="${esc(m.whatsapp)}" data-goal="messenger_wa" target="_blank" rel="noopener">WhatsApp</a>`,
  ].filter(Boolean).join('');
};

export function render(tour, cfg) {
  const perPersonDay = Math.round(tour.price / tour.crewSize / tour.days / 1000) * 1000;
  const seats = tour.crewSize * tour.crewsPerDeparture;
  const leadChannels = [
    cfg.messengers.telegram && 'Telegram',
    cfg.messengers.max && 'MAX',
    cfg.messengers.whatsapp && 'WhatsApp',
    'Звонок',
  ].filter(Boolean);

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(tour.meta.title)}</title>
<meta name="description" content="${esc(tour.meta.description)}">
<meta property="og:title" content="${esc(tour.meta.title)}">
<meta property="og:description" content="${esc(tour.meta.description)}">
<meta property="og:image" content="../${esc(tour.heroImage)}">
<meta name="theme-color" content="#0D1317">
<link rel="stylesheet" href="../assets/styles.css">
</head>
<body class="theme-${esc(tour.theme || 'poster')}">
<a class="skip" href="#lead">К заявке</a>

<div class="page">

<header class="topbar">
  <span class="wordmark">${esc(cfg.brand)}</span>
  <a class="topbar__phone" href="${esc(cfg.phoneHref)}" data-goal="phone">${esc(cfg.phone)}</a>
</header>

${tour.theme === 'glacier' ? `<section class="g-hero" aria-labelledby="g-title">
  <div class="g-wrap">
  <div class="g-frame">
    <div class="g-card">
      <div class="g-stage"><img class="g-photo" src="../${esc(tour.heroImage)}" alt="" decoding="async"><p class="g-word" aria-hidden="true">${esc(tour.name)}</p></div>
      <span class="g-corner g-corner--tl"></span><span class="g-corner g-corner--tr"></span><span class="g-corner g-corner--bl"></span><span class="g-corner g-corner--br"></span>
    </div>
    ${tour.heroCutout ? `<div class="g-cutwrap" aria-hidden="true"><div class="g-stage g-stage--cut"><img src="../${esc(tour.heroCutout)}" alt="" decoding="async"></div></div>` : ''}
  </div>
  <div class="g-body">
      <p class="eyebrow">${esc(tour.eyebrow)}</p>
      <h1 class="g-title" id="g-title">${esc(tour.headline)}</h1>
      <p class="g-lead">${esc(tour.lead)}</p>
      <div class="hero__cta">
        <a class="btn btn--signal" href="#lead" data-goal="cta_hero">Получить программу</a>
        ${messengerLinks(cfg, 'btn btn--ghost')}
      </div>
      <dl class="g-facts">
        ${tour.showPrice
          ? `<div><dt>Экипаж из двоих</dt><dd>${rub(tour.price)}</dd></div>`
          : `<div><dt>В заезде</dt><dd>${tour.crewsPerDeparture} машин</dd></div>`}
        <div><dt>Маршрут</dt><dd>${tour.days} дней · ${tour.km} км</dd></div>
        <div><dt>Заезды</dt><dd>${tour.departures.map((d) => esc(d.label)).join(' · ')}</dd></div>
      </dl>
    </div>
  </div>
</section>` : `<section class="hero" style="--hero-img:url('../${esc(tour.heroImage)}')">
  <div class="hero__shade" aria-hidden="true"></div>
  <p class="hero__word" aria-hidden="true">${esc(tour.name)}</p>
  <div class="wrap hero__body">
    <p class="eyebrow">${esc(tour.eyebrow)}</p>
    <h1 class="hero__title">${esc(tour.headline)}</h1>
    <p class="hero__lead">${esc(tour.lead)}</p>
    <dl class="hero__facts">
      ${tour.showPrice
        ? `<div><dt>Экипаж из двоих</dt><dd class="hero__big">${rub(tour.price)}</dd></div>`
        : `<div><dt>В заезде</dt><dd class="hero__big">${tour.crewsPerDeparture} машин</dd></div>`}
      <div><dt>Заезды</dt><dd>${tour.departures.map((d) => esc(d.label)).join('<br>')}</dd></div>
    </dl>
    <div class="hero__cta">
      <a class="btn btn--signal" href="#lead" data-goal="cta_hero">Получить программу</a>
      ${messengerLinks(cfg, 'btn btn--ghost')}
    </div>
  </div>
</section>`}

<main>

<section class="sec sec--snow" id="dates" aria-labelledby="dates-h">
  <div class="wrap">
    <p class="eyebrow">${tour.departures.length} заезда · ${tour.crewsPerDeparture} машин · ${seats} человек в каждом</p>
    <h2 class="h2" id="dates-h">Выберите заезд</h2>
    <ul class="tickets">
      ${tour.departures.map((d) => `
      <li class="ticket ticket--${esc(d.status)}">
        <p class="ticket__date">${esc(d.label)}</p>
        <p class="ticket__meta">${tour.days} ${plural(tour.days, 'день', 'дня', 'дней')} · ${tour.km} км · ${esc(tour.car)}</p>
        <p class="ticket__status">${esc(statusLabel(d))}</p>
        <a class="btn btn--ink" href="#lead" data-departure="${esc(d.id)}" data-goal="cta_departure">${d.status === 'full' ? 'В лист ожидания' : 'Забронировать место'}</a>
      </li>`).join('')}
    </ul>
  </div>
</section>

<section class="sec sec--night" aria-labelledby="price-h">
  <div class="wrap price">
    <div class="price__head">
      <p class="eyebrow">Что входит в стоимость</p>
      ${tour.showPrice ? `
      <h2 class="h2" id="price-h"><span class="price__sum">${rub(tour.price)}</span> за машину и двоих, всё включено</h2>
      <p class="price__per">Это около <strong>${rub(perPersonDay)}</strong> на человека в день: машина, отели, вся еда, экскурсии, баня, страховка и команда сопровождения.</p>` : `
      <h2 class="h2" id="price-h">Всё включено — от трансфера до бани</h2>
      <p class="price__per">Вы покупаете только билеты до ${esc(tour.airportCity)}. Машина, отели, еда, экскурсии и команда сопровождения уже в программе. Стоимость пришлём вместе с ней.</p>`}
    </div>
    <ul class="price__list">
      ${tour.included.map((i) => `<li>${esc(i)}</li>`).join('')}
    </ul>
    <p class="price__not">Не входит: ${esc(tour.notIncluded)}.</p>
  </div>
</section>

<section class="sec sec--snow roadbook" aria-labelledby="road-h">
  <div class="wrap">
    <p class="eyebrow">Программа</p>
    <h2 class="h2" id="road-h">${tour.days} ${plural(tour.days, 'день', 'дня', 'дней')}, ${tour.km} км</h2>
  </div>
  ${tour.roadImage ? `<figure class="road__photo road__photo--lead"><img src="../${esc(tour.roadImage.src)}" alt="${esc(tour.roadImage.alt)}" loading="lazy" decoding="async"></figure>` : ''}
  <ol class="road">
    ${tour.program.map((d) => `
    <li class="road__day">
      <span class="road__node" aria-hidden="true"></span>
      <div class="wrap">
        <p class="road__num">День ${d.day}${d.driving ? ' <span class="tag">За рулём</span>' : ''}</p>
        <h3 class="road__title">${esc(d.title)}</h3>
        <p class="road__route">${esc(d.route)}</p>
        <ul class="road__items">${d.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
        ${d.photo ? `<figure class="road__photo"><img src="../${esc(d.photo.src)}" alt="${esc(d.photo.alt)}" loading="lazy" decoding="async"></figure>` : ''}
      </div>
    </li>`).join('')}
    <li class="road__day road__day--finish">
      <span class="road__node" aria-hidden="true"></span>
      <div class="wrap">
        <p class="road__odo">${tour.km}<span>км</span></p>
        <a class="btn btn--ink" href="#lead" data-goal="cta_program">${tour.showPrice ? 'Получить программу с отелями и меню' : 'Узнать стоимость и получить программу'}</a>
      </div>
    </li>
  </ol>
  ${tour.gallery.length ? `
  <div class="gallery" style="--n:${tour.gallery.length}" aria-label="Фото с прошлых заездов">
    ${tour.gallery.map((src) => `<figure><img src="../${esc(src)}" alt="" loading="lazy" decoding="async"></figure>`).join('')}
  </div>` : ''}
</section>

<section class="sec sec--night" aria-labelledby="why-h">
  <div class="wrap">
    <p class="eyebrow">Почему это стоит своих денег</p>
    <h2 class="h2" id="why-h">Что будет, если…</h2>
    <dl class="whatif">
      ${tour.whatif.map((w) => `<div><dt>${esc(w.q)}</dt><dd>${esc(w.a)}</dd></div>`).join('')}
    </dl>
    <p class="why__note">${tour.crewsPerDeparture} машин в заезде — это ${seats} человек. Команда успевает заметить каждого.</p>
  </div>
</section>

<section class="sec sec--snow" aria-labelledby="trust-h">
  <div class="wrap trust">
    <h2 class="h2" id="trust-h">Договор с туроператором, а не с частным гидом</h2>
    <ul class="trust__facts">
      <li><strong>${esc(cfg.registry)}</strong><span>в Едином федеральном реестре туроператоров — <a href="${esc(cfg.registryUrl)}" target="_blank" rel="noopener">проверить</a></span></li>
      <li><strong>С 2019 года</strong><span>возим экипажи по 27 регионам России</span></li>
      <li><strong>РГО</strong><span>маршруты на Байконур и Соловки аккредитованы Русским географическим обществом</span></li>
      <li><strong>РСТ</strong><span>член Российского союза туриндустрии с 2021 года</span></li>
    </ul>
    <p class="trust__press">О наших турах писали РБК Стиль, Lenta.ru, «Ведомости», «Колёса», The Voice и журнал РГО.</p>
  </div>
</section>

${tour.reviews.length ? `
<section class="sec sec--snow" aria-labelledby="rev-h">
  <div class="wrap">
    <h2 class="h2" id="rev-h">Экипажи о поездках</h2>
    <ul class="reviews">${tour.reviews.map((r) => `<li><blockquote>${esc(r.text)}</blockquote><p>${esc(r.author)}</p></li>`).join('')}</ul>
  </div>
</section>` : ''}

<section class="sec sec--signal" id="lead" aria-labelledby="lead-h">
  <div class="wrap lead">
    <div class="lead__intro">
      <h2 class="h2" id="lead-h">${tour.showPrice ? 'Пришлём полную программу с отелями и меню' : 'Пришлём программу и стоимость'}</h2>
      <p>Три вопроса — и ${esc(cfg.manager)} подготовит программу под ваш заезд.</p>
    </div>

    <form class="quiz" novalidate data-tour="${esc(tour.slug)}">
      <p class="quiz__progress" aria-live="polite"><span data-step-label>Вопрос 1 из 3</span></p>

      <fieldset class="quiz__step" data-step="1">
        <legend>Какой заезд вам подходит?</legend>
        <div class="opts">
          ${tour.departures.map((d) => `<label class="opt"><input type="radio" name="departure" value="${esc(d.label)}" data-departure-id="${esc(d.id)}"><span>${esc(d.label)}</span></label>`).join('')}
          <label class="opt"><input type="radio" name="departure" value="Пока выбираю"><span>Пока выбираю</span></label>
        </div>
      </fieldset>

      <fieldset class="quiz__step" data-step="2" hidden>
        <legend>Кто поедет?</legend>
        <div class="opts">
          <label class="opt"><input type="radio" name="crew" value="Пара"><span>Мы вдвоём</span></label>
          <label class="opt"><input type="radio" name="crew" value="Двое друзей"><span>Двое друзей</span></label>
          <label class="opt"><input type="radio" name="crew" value="Несколько экипажей"><span>Несколько машин, компанией</span></label>
          <label class="opt"><input type="radio" name="crew" value="Корпоративная группа"><span>Группа от компании</span></label>
        </div>
      </fieldset>

      <fieldset class="quiz__step" data-step="3" hidden>
        <legend>Куда прислать программу?</legend>
        <div class="opts opts--row">
          ${leadChannels.map((c, i) => `<label class="opt"><input type="radio" name="channel" value="${c}"${i === 0 ? ' checked' : ''}><span>${c}</span></label>`).join('')}
        </div>
        <label class="field"><span>Имя</span><input name="name" autocomplete="given-name" required></label>
        <label class="field"><span>Телефон</span><input name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="+7" required></label>
        <label class="consent"><input type="checkbox" name="consent" required> <span>Согласен на обработку персональных данных по <a href="${esc(cfg.privacyUrl)}" target="_blank" rel="noopener">политике конфиденциальности</a></span></label>
        <p class="quiz__error" role="alert" hidden></p>
        <button class="btn btn--snow" type="submit">Получить программу</button>
      </fieldset>

      <div class="quiz__done" hidden tabindex="-1">
        <p class="quiz__done-title">Заявка у ${esc(cfg.manager)}</p>
        <p>Она свяжется с вами и пришлёт программу. Если удобнее сразу поговорить — <a href="${esc(cfg.phoneHref)}">${esc(cfg.phone)}</a>.</p>
      </div>

      <div class="quiz__nav">
        <button class="quiz__back" type="button" hidden>← Назад</button>
        <button class="quiz__next" type="button" disabled>Дальше →</button>
      </div>
    </form>
  </div>
</section>

<section class="sec sec--snow" aria-labelledby="faq-h">
  <div class="wrap">
    <h2 class="h2" id="faq-h">Частые вопросы</h2>
    <div class="faq">
      <details><summary>Что не входит в стоимость?</summary><p>${esc(tour.notIncluded)}. Встречаем и провожаем в аэропорту ${esc(tour.airportCity)} — трансфер включён.</p></details>
      <details><summary>Можно поехать одному или втроём?</summary><p>Программа рассчитана на машину с двумя участниками. Для другого состава ${esc(cfg.manager)} подберёт вариант.</p></details>
      <details><summary>Нужен ли опыт езды по снегу?</summary><p>Нет. В первый вечер проводим брифинг по безопасности, маршрут проверен командой заранее, рядом с колонной едет техподдержка.</p></details>
      <details><summary>Как бронировать и платить?</summary><p>Заключаем договор с туроператором из федерального реестра (${esc(cfg.registry)}). Условия оплаты и отмены прописаны в договоре — пришлём его вместе с программой.</p></details>
      <details><summary>Можно забронировать весь заезд для своей компании?</summary><p>Да. Выберите «Группа от компании» в форме выше или позвоните: ${esc(cfg.phone)}.</p></details>
    </div>
  </div>
</section>

</main>

<footer class="footer">
  <div class="wrap footer__in">
    <p class="wordmark">${esc(cfg.brand)}</p>
    <p>Туроператор ${esc(cfg.legalName)}, ${esc(cfg.registry)}<br>${esc(cfg.address)}</p>
    <p><a href="${esc(cfg.phoneHref)}" data-goal="phone">${esc(cfg.phone)}</a><br><a href="mailto:${esc(cfg.email)}">${esc(cfg.email)}</a></p>
  </div>
</footer>

</div>

<nav class="dock" aria-label="Быстрая связь">
  <a class="btn btn--signal" href="#lead" data-goal="cta_dock">Получить программу</a>
  <a class="btn btn--ghost" href="${esc(cfg.phoneHref)}" data-goal="phone" aria-label="Позвонить">Позвонить</a>
</nav>

<script>window.SITE=${JSON.stringify({ leadEndpoint: cfg.leadEndpoint, metrikaId: cfg.metrikaId, tour: tour.slug })};</script>
${cfg.metrikaId ? `<script>(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");ym(${Number(cfg.metrikaId)},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});</script>` : ''}
<script src="../assets/app.js" defer></script>
</body>
</html>
`;
}
