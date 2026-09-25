(() => {
  'use strict';

  const data = window.IVAN_PETRACHENKOV_COMPETENCY_DATA;
  if (!data) throw new Error('Competency data is unavailable');

  const byId = new Map();
  data.groups.forEach(group => group.items.forEach(item => {
    item.groupId = group.id;
    item.groupName = group.name;
    item.groupCode = group.code;
    byId.set(item.id, item);
  }));

  const keys = {
    levels: `${data.meta.storagePrefix}-competency-map`,
    repeat: `${data.meta.storagePrefix}-repeat`,
    theme: `${data.meta.storagePrefix}-theme`
  };

  const safeJSON = (raw, fallback) => {
    try {
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
    } catch (_) {
      return fallback;
    }
  };

  let manualLevels = safeJSON(localStorage.getItem(keys.levels), {});
  let repeatState = safeJSON(localStorage.getItem(keys.repeat), {added: [], removed: []});
  if (!repeatState || !Array.isArray(repeatState.added) || !Array.isArray(repeatState.removed)) {
    repeatState = {added: [], removed: []};
  }

  let activeFilter = 'all';
  let searchTerm = '';
  let activeItem = null;

  const $ = id => document.getElementById(id);
  const els = {
    svg: $('radialMap'),
    tooltip: $('mapTooltip'),
    catalog: $('topicIndex'),
    search: $('topicSearch'),
    filters: [...document.querySelectorAll('[data-filter]')],
    total: $('totalCount'),
    covered: $('coveredCount'),
    coverage: $('coverageCount'),
    repeat: $('repeatCount'),
    centerPercent: $('radialPercent'),
    centerCount: $('radialTopicCount'),
    desc: $('radialDescription'),
    reset: $('resetMap'),
    dialog: $('competencyDialog'),
    dialogTitle: $('dialogTitle'),
    dialogGroup: $('dialogGroup'),
    dialogLevel: $('dialogLevel'),
    dialogDescription: $('dialogDescription'),
    dialogDiagnostic: $('dialogDiagnostic'),
    dialogHistory: $('dialogHistory'),
    dialogLink: $('dialogLink'),
    markRepeat: $('markRepeat'),
    closeDialog: $('closeDialog'),
    levelButtons: [...document.querySelectorAll('.level-btn')],
    focusTitle: $('focusTitle'),
    focusGroup: $('focusGroup'),
    focusText: $('focusText'),
    focusLink: $('focusLink'),
    themeToggle: $('themeToggle'),
    mobileThemeToggle: $('mobileThemeToggle'),
    menuButton: $('menuButton'),
    sidebarClose: $('sidebarClose'),
    backdrop: $('sidebarBackdrop')
  };

  function getLevel(id) {
    if (Object.prototype.hasOwnProperty.call(manualLevels, id)) {
      const value = Number(manualLevels[id]);
      return Number.isFinite(value) ? Math.max(0, Math.min(4, value)) : 0;
    }
    return Number(data.baselineLevels[id] || 0);
  }

  function isRepeat(id) {
    if (repeatState.removed.includes(id)) return false;
    if (repeatState.added.includes(id)) return true;
    return data.baselineRepeat.includes(id);
  }

  function getStatus(id) {
    if (isRepeat(id)) return 'repeat';
    return getLevel(id) > 0 ? 'covered' : 'upcoming';
  }

  const levelLabel = level => [
    'Ещё впереди',
    'Нужна помощь',
    'Пройдена с опорой',
    'Почти уверенно',
    'Освоено'
  ][level] || 'Ещё впереди';

  function saveLevels() {
    localStorage.setItem(keys.levels, JSON.stringify(manualLevels));
  }

  function saveRepeat() {
    localStorage.setItem(keys.repeat, JSON.stringify(repeatState));
  }

  function polar(radius, angle) {
    const radians = (angle - 90) * Math.PI / 180;
    return {
      x: 400 + radius * Math.cos(radians),
      y: 400 + radius * Math.sin(radians)
    };
  }

  function arcPath(innerRadius, outerRadius, startAngle, endAngle) {
    const p1 = polar(outerRadius, startAngle);
    const p2 = polar(outerRadius, endAngle);
    const p3 = polar(innerRadius, endAngle);
    const p4 = polar(innerRadius, startAngle);
    const large = endAngle - startAngle > 180 ? 1 : 0;
    return [
      `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
      `A ${outerRadius} ${outerRadius} 0 ${large} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
      `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
      `A ${innerRadius} ${innerRadius} 0 ${large} 0 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
      'Z'
    ].join(' ');
  }

  function itemMatches(item) {
    const status = getStatus(item.id);
    const filterMatch = activeFilter === 'all' || activeFilter === status;
    const q = searchTerm.trim().toLocaleLowerCase('ru');
    const searchMatch = !q ||
      item.title.toLocaleLowerCase('ru').includes(q) ||
      item.groupName.toLocaleLowerCase('ru').includes(q);
    return {filterMatch, searchMatch};
  }

  function setCellClasses(node, item) {
    const status = getStatus(item.id);
    const {filterMatch, searchMatch} = itemMatches(item);
    node.dataset.status = status;
    node.dataset.level = String(getLevel(item.id));
    node.classList.toggle('is-muted', !filterMatch || !searchMatch);
    node.classList.toggle('is-search-match', Boolean(searchTerm.trim()) && searchMatch);
  }

  function buildMap() {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svgTitle = els.svg.querySelector('#radialTitle');
    const svgDesc = els.svg.querySelector('#radialDescription');
    els.svg.replaceChildren(svgTitle, svgDesc);

    const innerRadius = 146;
    const outerRadius = 382;
    const maxRings = Math.max(...data.groups.map(group => group.items.length));
    const ringWidth = (outerRadius - innerRadius) / maxRings;
    const ringGap = 1.7;
    const sectorSize = 360 / data.groups.length;
    const sectorGap = 1.15;

    data.groups.forEach((group, groupIndex) => {
      const sectorStart = groupIndex * sectorSize + sectorGap / 2;
      const sectorEnd = (groupIndex + 1) * sectorSize - sectorGap / 2;

      group.items.forEach((item, itemIndex) => {
        const ringInner = innerRadius + itemIndex * ringWidth;
        const ringOuter = ringInner + ringWidth - ringGap;
        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', arcPath(ringInner, ringOuter, sectorStart, sectorEnd));
        path.setAttribute('class', 'radial-cell');
        path.setAttribute('tabindex', '0');
        path.setAttribute('role', 'button');
        path.setAttribute(
          'aria-label',
          `${item.title}. Раздел: ${group.name}. ${isRepeat(item.id) ? 'Пора повторить' : levelLabel(getLevel(item.id))}.`
        );
        path.dataset.topicId = item.id;

        const title = document.createElementNS(svgNS, 'title');
        title.textContent = `${item.title} · ${group.name} · ${isRepeat(item.id) ? 'Пора повторить' : levelLabel(getLevel(item.id))}`;
        path.appendChild(title);

        path.addEventListener('mouseenter', event => showTooltip(item, event.clientX, event.clientY));
        path.addEventListener('mousemove', event => moveTooltip(event.clientX, event.clientY));
        path.addEventListener('mouseleave', hideTooltip);
        path.addEventListener('focus', () => {
          const rect = path.getBoundingClientRect();
          showTooltip(item, rect.left + rect.width / 2, rect.top + rect.height / 2);
        });
        path.addEventListener('blur', hideTooltip);
        path.addEventListener('click', () => openDialog(item));
        path.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openDialog(item);
          }
        });

        setCellClasses(path, item);
        els.svg.appendChild(path);
      });

      const labelAngle = groupIndex * sectorSize + sectorSize / 2;
      const labelPoint = polar(394, labelAngle);
      const label = document.createElementNS(svgNS, 'text');
      label.setAttribute('x', labelPoint.x);
      label.setAttribute('y', labelPoint.y);
      label.setAttribute('class', 'radial-group-label');
      label.setAttribute('dominant-baseline', 'middle');
      label.textContent = group.code;
      els.svg.appendChild(label);
    });

    renderCenter();
  }

  function renderCenter() {
    const items = [...byId.values()];
    const repeatCount = items.filter(item => isRepeat(item.id)).length;
    const coveredOnly = items.filter(item => getLevel(item.id) > 0 && !isRepeat(item.id)).length;
    const touched = coveredOnly + repeatCount;
    const coverage = Math.round(touched / items.length * 100);

    els.total.textContent = items.length;
    els.covered.textContent = coveredOnly;
    els.repeat.textContent = repeatCount;
    els.coverage.textContent = `${coverage}%`;
    els.centerPercent.textContent = `${coverage}%`;
    els.centerCount.textContent = `${touched} из ${items.length} тем затронуто`;
    els.desc.textContent =
      `Интерактивная круговая карта программы «${data.meta.program}»: ${data.groups.length} тематических секторов, ${items.length} конкретных тем и навыков.`;
  }

  function renderCatalog() {
    els.catalog.replaceChildren();
    data.groups.forEach((group, index) => {
      const details = document.createElement('details');
      details.className = 'topic-group';
      const groupTouched = group.items.filter(item => getLevel(item.id) > 0 || isRepeat(item.id)).length;
      if (groupTouched || index === 0) details.open = true;

      const summary = document.createElement('summary');
      summary.innerHTML = `<span>${group.code} · ${group.name}</span><small>${groupTouched} / ${group.items.length}</small>`;
      details.appendChild(summary);

      const list = document.createElement('div');
      list.className = 'topic-list';

      group.items.forEach(item => {
        const button = document.createElement('button');
        button.className = 'topic-row';
        button.type = 'button';
        button.dataset.topicId = item.id;
        button.innerHTML = `
          <span class="topic-dot" data-status="${getStatus(item.id)}" aria-hidden="true"></span>
          <span>${item.title}</span>
          <span class="topic-level">${isRepeat(item.id) ? 'повтор' : getLevel(item.id)}</span>`;
        const {filterMatch, searchMatch} = itemMatches(item);
        button.classList.toggle('is-muted', !filterMatch || !searchMatch);
        button.classList.toggle('is-search-match', Boolean(searchTerm.trim()) && searchMatch);
        button.addEventListener('click', () => openDialog(item));
        list.appendChild(button);
      });

      details.appendChild(list);
      els.catalog.appendChild(details);
    });
  }

  function updateVisualState() {
    els.svg.querySelectorAll('.radial-cell').forEach(path => {
      const item = byId.get(path.dataset.topicId);
      if (!item) return;
      setCellClasses(path, item);
      path.setAttribute(
        'aria-label',
        `${item.title}. Раздел: ${item.groupName}. ${isRepeat(item.id) ? 'Пора повторить' : levelLabel(getLevel(item.id))}.`
      );
      const title = path.querySelector('title');
      if (title) title.textContent = `${item.title} · ${item.groupName} · ${isRepeat(item.id) ? 'Пора повторить' : levelLabel(getLevel(item.id))}`;
    });
    renderCatalog();
    renderCenter();
    renderFocus();
  }

  function showTooltip(item, x, y) {
    els.tooltip.innerHTML = `
      <strong>${item.title}</strong>
      <span>${item.groupName}</span>
      <em>${isRepeat(item.id) ? 'Пора повторить' : levelLabel(getLevel(item.id))}</em>`;
    els.tooltip.hidden = false;
    moveTooltip(x, y);
  }

  function moveTooltip(x, y) {
    if (els.tooltip.hidden) return;
    const pad = 14;
    const gap = 16;
    const rect = els.tooltip.getBoundingClientRect();
    let left = x + gap;
    let top = y + gap;
    if (left + rect.width + pad > window.innerWidth) left = x - rect.width - gap;
    if (top + rect.height + pad > window.innerHeight) top = y - rect.height - gap;
    left = Math.max(pad, Math.min(left, window.innerWidth - rect.width - pad));
    top = Math.max(pad, Math.min(top, window.innerHeight - rect.height - pad));
    els.tooltip.style.left = `${left}px`;
    els.tooltip.style.top = `${top}px`;
  }

  function hideTooltip() {
    els.tooltip.hidden = true;
  }

  function openDialog(item) {
    activeItem = item;
    const level = getLevel(item.id);
    const evidence = data.evidence[item.id];

    els.dialogGroup.textContent = `${item.groupCode} · ${item.groupName}`;
    els.dialogTitle.textContent = item.title;
    els.dialogLevel.textContent = `${level} / 4 · ${levelLabel(level)}`;
    els.dialogDescription.textContent = item.description;
    els.dialogDiagnostic.textContent = item.diagnostic;
    els.dialogHistory.textContent = evidence
      ? `${evidence.date}: ${evidence.text}`
      : 'Диагностических данных пока нет.';
    els.dialogLink.hidden = !evidence?.href;
    if (evidence?.href) els.dialogLink.href = evidence.href;

    els.levelButtons.forEach(button => {
      const pressed = Number(button.dataset.level) === level;
      button.setAttribute('aria-pressed', String(pressed));
    });

    els.markRepeat.textContent = isRepeat(item.id) ? 'Убрать из повторения' : 'Добавить в повторение';

    if (!els.dialog.open) {
      hideTooltip();
      els.dialog.showModal();
    }
  }

  function setLevel(level) {
    if (!activeItem) return;
    manualLevels[activeItem.id] = level;
    saveLevels();
    openDialog(activeItem);
    updateVisualState();
  }

  function toggleRepeat() {
    if (!activeItem) return;
    const id = activeItem.id;
    const base = data.baselineRepeat.includes(id);
    const current = isRepeat(id);

    repeatState.added = repeatState.added.filter(topicId => topicId !== id);
    repeatState.removed = repeatState.removed.filter(topicId => topicId !== id);

    if (current) {
      if (base) repeatState.removed.push(id);
    } else if (!base) {
      repeatState.added.push(id);
    }
    saveRepeat();
    openDialog(activeItem);
    updateVisualState();
  }

  function renderFocus() {
    const all = [...byId.values()];
    const repeat = all.find(item => isRepeat(item.id));
    const nextKinematics = data.groups.find(group => group.id === 'kinematics')?.items
      .find(item => getLevel(item.id) === 0 && !isRepeat(item.id));
    const upcoming = nextKinematics || all.find(item => getLevel(item.id) === 0 && !isRepeat(item.id));
    const low = all.find(item => getLevel(item.id) === 1);
    const target = repeat || upcoming || low || all[0];

    els.focusTitle.textContent = target.title;
    els.focusGroup.textContent = `${target.groupCode} · ${target.groupName}`;

    if (isRepeat(target.id)) {
      els.focusText.textContent = `Повторите «${target.title}» и решите одну проверочную задачу без подсказки.`;
    } else if (getLevel(target.id) === 1) {
      els.focusText.textContent = 'Вернитесь к базовому определению и решите один типовой пример с пояснением каждого шага.';
    } else {
      els.focusText.textContent = 'Следующая тема программы. Начните с определения, физического смысла и одного простого примера.';
    }

    const evidence = data.evidence[target.id];
    els.focusLink.hidden = !evidence?.href;
    if (evidence?.href) els.focusLink.href = evidence.href;
  }

  function applyFilter(filter) {
    activeFilter = filter;
    els.filters.forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.filter === filter));
    });
    updateVisualState();
  }

  function resetToBaseline() {
    const ok = window.confirm(
      'Вернуть подтверждённые преподавателем статусы? Ручные уровни и ручные изменения списка повторения будут очищены.'
    );
    if (!ok) return;
    manualLevels = {};
    repeatState = {added: [], removed: []};
    localStorage.removeItem(keys.levels);
    localStorage.removeItem(keys.repeat);
    updateVisualState();
  }

  function applyTheme(theme) {
    const resolved = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = resolved;
    document.body.dataset.theme = resolved;
    localStorage.setItem(keys.theme, resolved);
    const label = resolved === 'dark' ? 'Светлая тема' : 'Тёмная тема';
    [els.themeToggle, els.mobileThemeToggle].filter(Boolean).forEach(button => {
      button.setAttribute('aria-label', label);
      if (button === els.themeToggle) {
        const text = button.querySelector('[data-theme-label]');
        if (text) text.textContent = label;
      }
    });
  }

  function toggleTheme() {
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  }

  function initLesson() {
    const lesson = data.meta.latestLesson;
    $('lessonTitle').textContent = lesson.title;
    $('lessonLead').textContent = lesson.lead;
    $('lessonDate').textContent = lesson.date;
    const topics = $('lessonTopics');
    topics.replaceChildren(...lesson.topics.map(topic => {
      const span = document.createElement('span');
      span.className = 'chip';
      span.textContent = topic;
      return span;
    }));
    $('latestPdfLink').href = lesson.pdf;
    $('latestTexLink').href = lesson.tex;
    $('latestMindmapLink').href = lesson.mindmap;
    $('latestPdfSidebar').href = lesson.pdf;
    $('latestTexSidebar').href = lesson.tex;
    $('latestMindmapSidebar').href = lesson.mindmap;
  }

  function initMobileNav() {
    const setOpen = open => {
      document.body.classList.toggle('sidebar-open', open);
      els.menuButton?.setAttribute('aria-expanded', String(open));
      if (els.backdrop) els.backdrop.hidden = !open;
    };
    els.menuButton?.addEventListener('click', () => setOpen(true));
    els.sidebarClose?.addEventListener('click', () => setOpen(false));
    els.backdrop?.addEventListener('click', () => setOpen(false));
    document.querySelectorAll('.sidebar a').forEach(link => link.addEventListener('click', () => setOpen(false)));
  }

  function init() {
    const storedTheme = localStorage.getItem(keys.theme);
    const preferred = storedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(preferred);
    initLesson();
    buildMap();
    renderCatalog();
    renderFocus();
    initMobileNav();

    els.filters.forEach(button => button.addEventListener('click', () => applyFilter(button.dataset.filter)));
    els.search.addEventListener('input', () => {
      searchTerm = els.search.value;
      updateVisualState();
    });
    els.reset.addEventListener('click', resetToBaseline);
    els.closeDialog.addEventListener('click', () => els.dialog.close());
    els.dialog.addEventListener('close', () => {
      const selected = activeItem && [...els.svg.querySelectorAll('.radial-cell')]
        .find(cell => cell.dataset.topicId === activeItem.id);
      selected?.focus({preventScroll:true});
    });
    els.dialog.addEventListener('click', event => {
      if (event.target === els.dialog) els.dialog.close();
    });
    els.levelButtons.forEach(button => button.addEventListener('click', () => setLevel(Number(button.dataset.level))));
    els.markRepeat.addEventListener('click', toggleRepeat);
    els.themeToggle?.addEventListener('click', toggleTheme);
    els.mobileThemeToggle?.addEventListener('click', toggleTheme);
  }

  init();
})();
