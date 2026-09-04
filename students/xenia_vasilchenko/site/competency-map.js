(() => {
  'use strict';

  const DATA = window.COMPETENCY_MAP_DATA;
  if (!DATA || !Array.isArray(DATA.groups)) {
    throw new Error('COMPETENCY_MAP_DATA не загружен');
  }

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const allItems = DATA.groups.flatMap(group => group.items.map(item => ({ ...item, groupId: group.id, groupTitle: group.title, groupCode: group.code })));
  const byId = new Map(allItems.map(item => [item.id, item]));
  const groupById = new Map(DATA.groups.map(group => [group.id, group]));

  const baseKey = `${DATA.meta.student}-${slug(DATA.meta.program)}`;
  const LEVELS_KEY = `${baseKey}-competency-map`;
  const REPEAT_KEY = `${baseKey}-repeat`;
  const THEME_KEY = `${baseKey}-theme`;

  const state = {
    levels: loadLevels(),
    repeat: new Set(loadRepeat()),
    filter: 'all',
    query: '',
    activeId: null,
    theme: localStorage.getItem(THEME_KEY) || preferredTheme()
  };

  const els = {
    svg: $('#radialMap'),
    tooltip: $('#mapTooltip'),
    catalog: $('#topicCatalog'),
    search: $('#topicSearch'),
    dialog: $('#topicDialog'),
    dialogTitle: $('#dialogTitle'),
    dialogGroup: $('#dialogGroup'),
    dialogLevel: $('#dialogLevel'),
    dialogDescription: $('#dialogDescription'),
    dialogDiagnosis: $('#dialogDiagnosis'),
    dialogHistory: $('#dialogHistory'),
    dialogMaterial: $('#dialogMaterial'),
    repeatButton: $('#repeatButton'),
    levelButtons: $$('.level-button'),
    resetButton: $('#resetConfirmed'),
    themeToggle: $('#themeToggle'),
    themeToggleMobile: $('#themeToggleMobile'),
    nextFocus: $('#nextFocus'),
    statCovered: $('#statCovered'),
    statCoverage: $('#statCoverage'),
    statRepeat: $('#statRepeat'),
    statTotal: $('#statTotal'),
    centerCoverage: $('#centerCoverage'),
    centerMeta: $('#centerMeta'),
    catalogMeta: $('#catalogMeta'),
    mapDescription: $('#mapDescription')
  };

  init();

  function init() {
    document.documentElement.dataset.theme = state.theme;
    syncThemeButtons();
    bindControls();
    renderAll();
  }

  function slug(value) {
    return String(value).toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[^a-z0-9а-я]+/gi, '-')
      .replace(/^-+|-+$/g, '');
  }

  function preferredTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function baselineLevels() {
    return Object.fromEntries(allItems.map(item => [item.id, Number(item.baselineLevel) || 0]));
  }

  function loadLevels() {
    const baseline = baselineLevels();
    try {
      const parsed = JSON.parse(localStorage.getItem(LEVELS_KEY) || '{}');
      for (const [id, level] of Object.entries(parsed)) {
        if (byId.has(id) && Number.isInteger(Number(level))) {
          baseline[id] = clampLevel(Number(level));
        }
      }
    } catch (_) {}
    return baseline;
  }

  function loadRepeat() {
    const baseline = Array.isArray(DATA.repeatTopics) ? DATA.repeatTopics.filter(id => byId.has(id)) : [];
    try {
      const parsed = JSON.parse(localStorage.getItem(REPEAT_KEY) || 'null');
      if (Array.isArray(parsed)) return parsed.filter(id => byId.has(id));
    } catch (_) {}
    return baseline;
  }

  function saveState() {
    localStorage.setItem(LEVELS_KEY, JSON.stringify(state.levels));
    localStorage.setItem(REPEAT_KEY, JSON.stringify([...state.repeat]));
  }

  function clampLevel(level) {
    return Math.max(0, Math.min(4, Number(level) || 0));
  }

  function statusOf(item) {
    if (state.repeat.has(item.id)) return 'repeat';
    return (state.levels[item.id] || 0) > 0 ? 'covered' : 'future';
  }

  function statusText(item) {
    const status = statusOf(item);
    if (status === 'repeat') return 'Пора повторить';
    if (status === 'covered') return 'Пройдено';
    return 'Ещё впереди';
  }

  function levelText(level) {
    return ['Ещё впереди', 'Нужна помощь', 'Пройдена с опорой', 'Почти уверенно', 'Освоено'][clampLevel(level)];
  }

  function renderAll() {
    renderMap();
    renderCatalog();
    renderStats();
    renderNextFocus();
    refreshDialog();
  }

  function renderMap() {
    const svg = els.svg;
    svg.innerHTML = '';
    const NS = 'http://www.w3.org/2000/svg';

    const desc = document.createElementNS(NS, 'desc');
    desc.id = 'mapDescription';
    desc.textContent = `Круговая карта программы: ${DATA.groups.length} разделов, ${allItems.length} тем. Каждая кольцевая ячейка открывает карточку навыка.`;
    svg.append(desc);

    const centerX = 400;
    const centerY = 400;
    const innerRadius = 146;
    const outerRadius = 382;
    const maxRings = Math.max(...DATA.groups.map(group => group.items.length));
    const ringWidth = (outerRadius - innerRadius) / maxRings;
    const ringGap = Math.min(1.8, ringWidth * 0.16);
    const sectorSize = 360 / DATA.groups.length;
    const sectorGap = Math.min(1.7, sectorSize * 0.08);

    DATA.groups.forEach((group, groupIndex) => {
      const sectorStart = groupIndex * sectorSize + sectorGap / 2;
      const sectorEnd = (groupIndex + 1) * sectorSize - sectorGap / 2;

      group.items.forEach((rawItem, itemIndex) => {
        const item = byId.get(rawItem.id);
        const ringInner = innerRadius + itemIndex * ringWidth;
        const ringOuter = ringInner + ringWidth - ringGap;
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('d', arcPath(ringInner, ringOuter, sectorStart, sectorEnd));
        path.setAttribute('class', cellClass(item));
        path.setAttribute('data-id', item.id);
        path.setAttribute('tabindex', '0');
        path.setAttribute('role', 'button');
        path.setAttribute('aria-label', `${item.title}. Раздел: ${item.groupTitle}. ${statusText(item)}. Уровень ${state.levels[item.id]} из 4.`);
        path.setAttribute('vector-effect', 'non-scaling-stroke');

        const title = document.createElementNS(NS, 'title');
        title.textContent = `${item.title} — ${item.groupTitle} — ${statusText(item)}`;
        path.append(title);

        bindCell(path, item);
        svg.append(path);
      });

      const middleAngle = groupIndex * sectorSize + sectorSize / 2;
      const labelPoint = polar(390, middleAngle);
      const label = document.createElementNS(NS, 'text');
      label.setAttribute('x', labelPoint.x);
      label.setAttribute('y', labelPoint.y);
      label.setAttribute('class', 'sector-label');
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('dominant-baseline', 'middle');
      label.textContent = group.code;
      label.setAttribute('aria-hidden', 'true');
      svg.append(label);
    });
  }

  function cellClass(item) {
    const classes = ['map-cell', `status-${statusOf(item)}`, `level-${state.levels[item.id] || 0}`];
    const queryMatches = matchesQuery(item);
    const filterMatches = matchesFilter(item);
    if (!filterMatches || (state.query && !queryMatches)) classes.push('is-muted');
    if (state.query && queryMatches) classes.push('is-search-hit');
    if (state.activeId === item.id) classes.push('is-active');
    return classes.join(' ');
  }

  function matchesFilter(item) {
    if (state.filter === 'all') return true;
    return statusOf(item) === state.filter;
  }

  function matchesQuery(item) {
    if (!state.query) return true;
    const haystack = `${item.title} ${item.groupTitle}`.toLocaleLowerCase('ru-RU');
    return haystack.includes(state.query);
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
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return [
      `M ${p1.x.toFixed(3)} ${p1.y.toFixed(3)}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${p2.x.toFixed(3)} ${p2.y.toFixed(3)}`,
      `L ${p3.x.toFixed(3)} ${p3.y.toFixed(3)}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${p4.x.toFixed(3)} ${p4.y.toFixed(3)}`,
      'Z'
    ].join(' ');
  }

  function bindCell(node, item) {
    node.addEventListener('mouseenter', event => showTooltip(item, event.clientX, event.clientY));
    node.addEventListener('mousemove', event => positionTooltip(event.clientX, event.clientY));
    node.addEventListener('mouseleave', hideTooltip);
    node.addEventListener('focus', () => {
      const rect = node.getBoundingClientRect();
      showTooltip(item, rect.left + rect.width / 2, rect.top + rect.height / 2);
    });
    node.addEventListener('blur', hideTooltip);
    node.addEventListener('click', () => openTopic(item.id));
    node.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openTopic(item.id);
      }
    });
  }

  function showTooltip(item, x, y) {
    els.tooltip.innerHTML = `<strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.groupTitle)}</span><em>${escapeHtml(statusText(item))}</em>`;
    els.tooltip.hidden = false;
    positionTooltip(x, y);
  }

  function positionTooltip(x, y) {
    if (els.tooltip.hidden) return;
    const pad = 12;
    const offset = 16;
    const rect = els.tooltip.getBoundingClientRect();
    let left = x + offset;
    let top = y + offset;
    if (left + rect.width > window.innerWidth - pad) left = x - rect.width - offset;
    if (top + rect.height > window.innerHeight - pad) top = y - rect.height - offset;
    els.tooltip.style.left = `${Math.max(pad, left)}px`;
    els.tooltip.style.top = `${Math.max(pad, top)}px`;
  }

  function hideTooltip() {
    els.tooltip.hidden = true;
  }

  function renderCatalog() {
    els.catalog.innerHTML = '';
    for (const group of DATA.groups) {
      const details = document.createElement('details');
      details.className = 'catalog-group';
      const groupItems = group.items.map(raw => byId.get(raw.id));
      const covered = groupItems.filter(item => statusOf(item) !== 'future').length;
      details.innerHTML = `
        <summary>
          <span><b>${group.code}</b> · ${escapeHtml(group.title)}</span>
          <small>${covered} / ${groupItems.length}</small>
        </summary>
        <p class="catalog-description">${escapeHtml(group.description)}</p>
        <div class="catalog-items"></div>
      `;
      const itemsRoot = $('.catalog-items', details);
      for (const item of groupItems) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `catalog-item status-${statusOf(item)}${matchesFilter(item) && matchesQuery(item) ? '' : ' is-muted'}`;
        button.dataset.id = item.id;
        button.innerHTML = `<i aria-hidden="true"></i><span>${escapeHtml(item.title)}</span><small>${state.levels[item.id]}/4</small>`;
        button.addEventListener('click', () => openTopic(item.id));
        itemsRoot.append(button);
      }
      els.catalog.append(details);
    }
    const visible = allItems.filter(item => matchesFilter(item) && matchesQuery(item)).length;
    els.catalogMeta.textContent = state.query || state.filter !== 'all' ? `${visible} совпадений из ${allItems.length}` : `${DATA.groups.length} разделов · ${allItems.length} тем`;
  }

  function renderStats() {
    const covered = allItems.filter(item => statusOf(item) === 'covered').length;
    const repeat = allItems.filter(item => statusOf(item) === 'repeat').length;
    const touched = new Set(allItems.filter(item => (state.levels[item.id] || 0) > 0 || state.repeat.has(item.id)).map(item => item.id)).size;
    const coverage = Math.round(touched / allItems.length * 100);

    els.statCovered.textContent = covered;
    els.statCoverage.textContent = `${coverage}%`;
    els.statRepeat.textContent = repeat;
    els.statTotal.textContent = allItems.length;
    els.centerCoverage.textContent = `${coverage}%`;
    els.centerMeta.textContent = `${touched} из ${allItems.length} тем затронуто`;
  }

  function renderNextFocus() {
    const repeat = allItems.find(item => state.repeat.has(item.id));
    const future = allItems.find(item => statusOf(item) === 'future');
    const support = allItems.find(item => statusOf(item) === 'covered' && state.levels[item.id] <= 1);
    const diagnostic = allItems.find(item => statusOf(item) === 'covered' && state.levels[item.id] === 2);
    const item = repeat || future || support || diagnostic || allItems[0];

    let reason = 'Провести короткую контрольную диагностику и уточнить уровень.';
    if (repeat) reason = 'Тема уже отмечена для повторения — начните с короткого восстановления алгоритма и 2–3 задач.';
    else if (future) reason = 'Это ближайшая подтверждённая лакуна в карте: полезно закрыть её перед систематическим курсом 6 класса.';
    else if (support) reason = 'Навык знаком, но пока требует опоры — нужна короткая самостоятельная тренировка.';

    els.nextFocus.innerHTML = `
      <div>
        <p class="eyebrow">Следующий фокус</p>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.groupTitle)} · ${escapeHtml(reason)}</p>
      </div>
      <div class="focus-actions">
        <button type="button" class="primary-action" data-open-topic="${item.id}">Открыть карточку</button>
        ${item.evidence?.href ? `<a class="secondary-action" href="${item.evidence.href}">Связанный материал</a>` : ''}
      </div>`;
    $('[data-open-topic]', els.nextFocus).addEventListener('click', () => openTopic(item.id));
  }

  function openTopic(id) {
    if (!byId.has(id)) return;
    state.activeId = id;
    refreshDialog();
    renderMap();
    if (typeof els.dialog.showModal === 'function') els.dialog.showModal();
    else els.dialog.setAttribute('open', '');
  }

  function refreshDialog() {
    if (!state.activeId || !byId.has(state.activeId)) return;
    const item = byId.get(state.activeId);
    const level = state.levels[item.id] || 0;
    els.dialogGroup.textContent = `${item.groupCode} · ${item.groupTitle}`;
    els.dialogTitle.textContent = item.title;
    els.dialogLevel.textContent = `${level} / 4 · ${levelText(level)}`;
    els.dialogDescription.textContent = item.description;
    els.dialogDiagnosis.textContent = item.diagnosis;
    els.dialogHistory.textContent = item.evidence
      ? `Тема встречалась в материале ${item.evidence.date}. ${item.evidence.text}`
      : 'Диагностических данных пока нет. Базовый подтверждённый уровень не выставлен.';
    if (item.evidence?.href) {
      els.dialogMaterial.hidden = false;
      els.dialogMaterial.href = item.evidence.href;
    } else {
      els.dialogMaterial.hidden = true;
      els.dialogMaterial.removeAttribute('href');
    }
    els.repeatButton.textContent = state.repeat.has(item.id) ? 'Убрать из повторения' : 'Добавить в повторение';
    els.repeatButton.setAttribute('aria-pressed', String(state.repeat.has(item.id)));
    for (const button of els.levelButtons) {
      button.setAttribute('aria-pressed', String(Number(button.dataset.level) === level));
    }
  }

  function bindControls() {
    $$('.filter-button').forEach(button => {
      button.addEventListener('click', () => {
        state.filter = button.dataset.filter;
        $$('.filter-button').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
        renderMap();
        renderCatalog();
      });
    });

    els.search.addEventListener('input', () => {
      state.query = els.search.value.trim().toLocaleLowerCase('ru-RU');
      renderMap();
      renderCatalog();
    });

    $('#closeDialog').addEventListener('click', () => els.dialog.close());
    els.dialog.addEventListener('click', event => {
      if (event.target === els.dialog) els.dialog.close();
    });

    els.levelButtons.forEach(button => {
      button.addEventListener('click', () => {
        if (!state.activeId) return;
        state.levels[state.activeId] = clampLevel(Number(button.dataset.level));
        saveState();
        renderAll();
      });
    });

    els.repeatButton.addEventListener('click', () => {
      if (!state.activeId) return;
      if (state.repeat.has(state.activeId)) state.repeat.delete(state.activeId);
      else state.repeat.add(state.activeId);
      saveState();
      renderAll();
    });

    els.resetButton.addEventListener('click', () => {
      if (!confirm('Вернуть уровни и список повторения к подтверждённому состоянию по материалам ученицы? Ручные изменения будут удалены.')) return;
      state.levels = baselineLevels();
      state.repeat = new Set(Array.isArray(DATA.repeatTopics) ? DATA.repeatTopics : []);
      localStorage.removeItem(LEVELS_KEY);
      localStorage.removeItem(REPEAT_KEY);
      renderAll();
    });

    [els.themeToggle, els.themeToggleMobile].filter(Boolean).forEach(button => {
      button.addEventListener('click', toggleTheme);
    });
  }

  function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = state.theme;
    localStorage.setItem(THEME_KEY, state.theme);
    syncThemeButtons();
  }

  function syncThemeButtons() {
    const text = state.theme === 'dark' ? 'Светлая тема' : 'Тёмная тема';
    [els.themeToggle, els.themeToggleMobile].filter(Boolean).forEach(button => {
      button.setAttribute('aria-label', text);
      button.title = text;
    });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[char]));
  }
})();
