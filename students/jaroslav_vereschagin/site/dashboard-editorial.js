/* Personal editorial shell. The existing competency-map.js owns all mastery and repeat state. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const menu = $('menuButton'), nav = $('primaryNav'), backdrop = $('navBackdrop');
  const closeButton = $('closeMenu'), narrow = window.matchMedia('(max-width: 840px)');
  function setMenu(open, focusBack = false) {
    const active = Boolean(open && narrow.matches);
    document.body.classList.toggle('menu-open', active);
    menu.setAttribute('aria-expanded', String(active));
    menu.setAttribute('aria-label', active ? 'Закрыть навигацию' : 'Открыть навигацию');
    backdrop.hidden = !active;
    nav.inert = narrow.matches && !active;
    if (active) closeButton.focus();
    else if (focusBack) menu.focus();
  }
  menu.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open'), true));
  closeButton.addEventListener('click', () => setMenu(false, true));
  backdrop.addEventListener('click', () => setMenu(false, true));
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.body.classList.contains('menu-open')) setMenu(false, true);
    if (e.key !== 'Tab' || !document.body.classList.contains('menu-open')) return;
    const links = [...nav.querySelectorAll('a')], last = links.at(-1);
    if (e.shiftKey && document.activeElement === closeButton) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); closeButton.focus(); }
  });
  narrow.addEventListener('change', () => setMenu(false));
  setMenu(false);

  // Match exactly the level displayed by the student's existing SVG map.
  // Changes in the dialog, localStorage restoration and reset all re-render these paths.
  const svg = $('radialMap');
  function updateStats() {
    const cells = [...svg.querySelectorAll('.radial-cell[data-level]')];
    if (!cells.length) return;
    const count = level => cells.filter(node => Number(node.dataset.level) === level).length;
    const num = (id, value) => { const element = $(id); if (element) element.textContent = String(value); };
    num('evaluatedCount', cells.filter(node => Number(node.dataset.level) > 0).length);
    num('confidentCount', count(3));
    num('processCount', count(1) + count(2));
    num('masteredCount', count(4));
  }
  new MutationObserver(updateStats).observe(svg, { childList: true });
  updateStats();

  const validHref = value => typeof value === 'string' && value.trim() && !value.startsWith('/') &&
    !value.startsWith('#') && !value.includes('\\') && !/^[a-z][\w+.-]*:/i.test(value);
  const createLink = (url, label) => {
    const a = document.createElement('a'); a.href = url; a.textContent = label; return a;
  };
  const formatDate = iso => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return 'Последнее занятие';
    const [year, month, day] = iso.split('-');
    return day + '.' + month + '.' + year.slice(-2);
  };
  function showLesson(lesson) {
    if (!lesson || !validHref(lesson.href)) return;
    const card = document.querySelector('.editorial-lesson .start-card');
    if (!card) return;
    card.querySelector('.start-card-label').textContent = '01 / Последнее занятие · ' + formatDate(lesson.date);
    card.querySelector('strong').textContent = lesson.navTitle || lesson.title || 'Учебное занятие';
    card.querySelector('p').textContent = lesson.summary || lesson.navSubtitle || 'Материалы последнего занятия';
    const resources = card.querySelector('.material-links');
    resources.replaceChildren(createLink(lesson.href, 'Открыть занятие →'));
    for (const [key, label] of [['lab','Лаборатория'],['pdf','PDF'],['tex','TeX'],['review','Ревью']]) {
      if (validHref(lesson.materials?.[key])) resources.append(createLink(lesson.materials[key], label));
    }
    if (['2026-10-15','2026-10-19'].includes(lesson.date)) resources.append(createLink('../images/' + formatDate(lesson.date) + '.png', 'Постер'));
    const results = $('lessonOutcomes');
    results.replaceChildren();
    const heading = document.createElement('p'); heading.className='editorial-kicker';
    heading.textContent = 'Содержание занятия';
    const title = document.createElement('h3'); title.textContent = 'Разобранные навыки';
    results.append(heading,title);
    const catalog = window.JAROSLAV_OGE_PROGRAM;
    const titles = new Map((catalog?.groups || []).flatMap(group =>
      (group.items || []).map(item => [item.id, item.title])));
    const outcomes = (lesson.outcomes || []).filter(outcome => titles.has(outcome.competencyId));
    if (!outcomes.length) {
      const p = document.createElement('p');
      p.textContent = 'Материал доступен в архиве занятий.';
      results.append(p); return;
    }
    const list = document.createElement('ul');
    for (const outcome of outcomes.slice(0,5)) {
      const li = document.createElement('li'); li.textContent = titles.get(outcome.competencyId);
      const info = document.createElement('small');
      info.textContent = outcome.relation === 'assessed' ? 'Есть диагностические данные' :
        outcome.relation === 'practiced' ? 'Работа на занятии' : 'Тема обсуждалась';
      li.append(info); list.append(li);
    }
    results.append(list);
    const note = document.createElement('p');
    note.textContent = 'История занятия описывает работу над навыками, а уровень самостоятельности определяется отдельно.';
    results.append(note);
  }
  import('./lesson-registry.js').then(module => {
    const records = [...module.LESSONS].sort((a,b) => b.date.localeCompare(a.date));
    if (records.length) showLesson(records[0]);
  }).catch(() => {
    // Keep the pre-rendered, verified latest lesson and materials links available.
    const root = $('lessonOutcomes');
    if (root) root.textContent = 'Сведения о занятии доступны на странице урока.';
  });
})();
