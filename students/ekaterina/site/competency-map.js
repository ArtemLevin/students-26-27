(() => {
  'use strict';

  const data = window.EKATERINA_COMPETENCY_DATA;
  if (!data) throw new Error('EKATERINA_COMPETENCY_DATA is not loaded');

  const root = document.documentElement;
  const body = document.body;
  const svg = document.getElementById('radialMap');
  const catalog = document.getElementById('topicCatalog');
  const tooltip = document.getElementById('mapTooltip');
  const dialog = document.getElementById('topicDialog');
  const search = document.getElementById('topicSearch');
  const filterButtons = [...document.querySelectorAll('[data-filter]')];
  const levelButtons = [...dialog.querySelectorAll('[data-level]')];
  const repeatButton = document.getElementById('repeatToggle');
  const restoreButton = document.getElementById('restoreBaseline');
  const themeButtons = [...document.querySelectorAll('[data-theme-toggle]')];
  const mobileMenuButton = document.getElementById('mobileMenuButton');
  const sidebar = document.getElementById('sidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const sidebarClose = document.getElementById('sidebarClose');

  const programKey = 'grade8-math-2026';
  const levelsKey = `${data.student}-${programKey}-competency-map`;
  const repeatKey = `${data.student}-${programKey}-repeat`;
  const themeKey = `${data.student}-${programKey}-theme`;

  const itemById = new Map();
  const groupByItem = new Map();
  data.groups.forEach(group => group.items.forEach(item => {
    itemById.set(item.id, item);
    groupByItem.set(item.id, group);
  }));

  const baselineLevels = { ...data.baselineLevels };
  const baselineRepeat = new Set(data.baselineRepeat || []);
  let levels = loadObject(levelsKey, baselineLevels);
  let repeatTopics = new Set(loadArray(repeatKey, [...baselineRepeat]));
  let activeFilter = 'all';
  let query = '';
  let selectedId = null;

  function loadObject(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || 'null');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ...fallback };
      return { ...fallback, ...parsed };
    } catch (_) {
      return { ...fallback };
    }
  }

  function loadArray(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || 'null');
      return Array.isArray(parsed) ? parsed : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function saveState() {
    localStorage.setItem(levelsKey, JSON.stringify(levels));
    localStorage.setItem(repeatKey, JSON.stringify([...repeatTopics]));
  }

  function normalizeLevels() {
    for (const id of itemById.keys()) {
      const value = Number(levels[id]);
      levels[id] = Number.isInteger(value) && value >= 0 && value <= 4 ? value : baselineLevels[id] || 0;
    }
    repeatTopics = new Set([...repeatTopics].filter(id => itemById.has(id)));
  }
  normalizeLevels();

  function levelLabel(level) {
    return ['Ещё впереди', 'Нужна помощь', 'Пройдена с опорой', 'Почти уверенно', 'Освоено'][level] || 'Ещё впереди';
  }

  function statusFor(id) {
    if (repeatTopics.has(id)) return { key: 'repeat', label: 'Пора повторить' };
    const level = levels[id] || 0;
    if (level === 0) return { key: 'future', label: 'Ещё впереди' };
    return { key: 'covered', label: levelLabel(level) };
  }

  function polar(radius, angle) {
    const radians = (angle - 90) * Math.PI / 180;
    return { x: 400 + radius * Math.cos(radians), y: 400 + radius * Math.sin(radians) };
  }

  function arcPath(innerRadius, outerRadius, startAngle, endAngle) {
    const outerStart = polar(outerRadius, startAngle);
    const outerEnd = polar(outerRadius, endAngle);
    const innerEnd = polar(innerRadius, endAngle);
    const innerStart = polar(innerRadius, startAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return [
      `M ${outerStart.x.toFixed(3)} ${outerStart.y.toFixed(3)}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x.toFixed(3)} ${outerEnd.y.toFixed(3)}`,
      `L ${innerEnd.x.toFixed(3)} ${innerEnd.y.toFixed(3)}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x.toFixed(3)} ${innerStart.y.toFixed(3)}`,
      'Z'
    ].join(' ');
  }

  function svgEl(name, attrs = {}) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
    return el;
  }

  function renderMap() {
    svg.replaceChildren();
    const title = svgEl('title', { id: 'radialTitle' });
    title.textContent = 'Круговая карта программы 8 класса Екатерины';
    const desc = svgEl('desc', { id: 'radialDescription' });
    desc.textContent = `Интерактивная карта из ${data.groups.length} тематических секторов и ${itemById.size} конкретных навыков. Цвет показывает состояние прохождения.`;
    svg.append(title, desc);

    const guide = svgEl('circle', { cx: 400, cy: 400, r: 142, class: 'map-core-disc' });
    svg.append(guide);

    const innerRadius = 148;
    const outerRadius = 382;
    const maxRings = Math.max(...data.groups.map(group => group.items.length));
    const ringWidth = (outerRadius - innerRadius) / maxRings;
    const ringGap = 1.8;
    const sectorSize = 360 / data.groups.length;
    const sectorGap = Math.min(1.35, sectorSize * 0.12);

    data.groups.forEach((group, groupIndex) => {
      const startAngle = groupIndex * sectorSize + sectorGap / 2;
      const endAngle = (groupIndex + 1) * sectorSize - sectorGap / 2;
      const midAngle = (startAngle + endAngle) / 2;
      group.items.forEach((item, itemIndex) => {
        const ringInner = innerRadius + itemIndex * ringWidth;
        const ringOuter = ringInner + ringWidth - ringGap;
        const path = svgEl('path', {
          d: arcPath(ringInner, ringOuter, startAngle, endAngle),
          class: `radial-cell status-${statusFor(item.id).key} level-${levels[item.id] || 0}`,
          'data-id': item.id,
          tabindex: '0',
          role: 'button',
          'aria-label': `${item.title}. Раздел: ${group.title}. Статус: ${statusFor(item.id).label}`
        });
        const nativeTitle = svgEl('title');
        nativeTitle.textContent = `${item.title} — ${group.title} — ${statusFor(item.id).label}`;
        path.append(nativeTitle);
        bindCellEvents(path, item, group);
        svg.append(path);
      });

      const labelPoint = polar(394, midAngle);
      const label = svgEl('text', {
        x: labelPoint.x.toFixed(2), y: labelPoint.y.toFixed(2),
        class: 'sector-code',
        transform: `rotate(${midAngle > 90 && midAngle < 270 ? midAngle + 90 : midAngle - 90} ${labelPoint.x.toFixed(2)} ${labelPoint.y.toFixed(2)})`
      });
      label.textContent = group.code;
      const labelTitle = svgEl('title');
      labelTitle.textContent = group.title;
      label.append(labelTitle);
      svg.append(label);
    });

    applyVisibility();
  }

  function bindCellEvents(path, item, group) {
    path.addEventListener('mouseenter', event => showTooltip(item, group, event.clientX, event.clientY));
    path.addEventListener('mousemove', event => positionTooltip(event.clientX, event.clientY));
    path.addEventListener('mouseleave', hideTooltip);
    path.addEventListener('focus', () => {
      const rect = path.getBoundingClientRect();
      showTooltip(item, group, rect.left + rect.width / 2, rect.top + rect.height / 2);
    });
    path.addEventListener('blur', hideTooltip);
    path.addEventListener('click', () => openDialog(item.id));
    path.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openDialog(item.id);
      }
    });
  }

  function showTooltip(item, group, x, y) {
    tooltip.innerHTML = `<strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(group.title)}</span><em>${escapeHtml(statusFor(item.id).label)}</em>`;
    tooltip.hidden = false;
    positionTooltip(x, y);
  }

  function positionTooltip(x, y) {
    if (tooltip.hidden) return;
    const margin = 12;
    const offset = 16;
    const rect = tooltip.getBoundingClientRect();
    let left = x + offset;
    let top = y + offset;
    if (left + rect.width > window.innerWidth - margin) left = x - rect.width - offset;
    if (top + rect.height > window.innerHeight - margin) top = y - rect.height - offset;
    tooltip.style.left = `${Math.max(margin, left)}px`;
    tooltip.style.top = `${Math.max(margin, top)}px`;
  }

  function hideTooltip() {
    tooltip.hidden = true;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
  }

  function renderCatalog() {
    catalog.replaceChildren();
    data.groups.forEach((group, index) => {
      const details = document.createElement('details');
      details.className = 'catalog-group';
      if (index === 0) details.open = true;
      const summary = document.createElement('summary');
      const covered = group.items.filter(item => (levels[item.id] || 0) > 0 || repeatTopics.has(item.id)).length;
      summary.innerHTML = `<span><b>${group.code}</b> · ${escapeHtml(group.title)}</span><small>${covered} / ${group.items.length}</small>`;
      details.append(summary);
      const list = document.createElement('div');
      list.className = 'catalog-list';
      group.items.forEach(item => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'catalog-topic';
        button.dataset.id = item.id;
        button.innerHTML = `<i class="catalog-dot status-${statusFor(item.id).key}"></i><span>${escapeHtml(item.title)}</span><small>${levels[item.id] || 0}/4</small>`;
        button.addEventListener('click', () => openDialog(item.id));
        list.append(button);
      });
      details.append(list);
      catalog.append(details);
    });
    applyVisibility();
  }

  function matchesFilter(id) {
    const level = levels[id] || 0;
    if (activeFilter === 'covered') return level > 0 && !repeatTopics.has(id);
    if (activeFilter === 'repeat') return repeatTopics.has(id);
    if (activeFilter === 'future') return level === 0 && !repeatTopics.has(id);
    return true;
  }

  function matchesSearch(id) {
    if (!query) return true;
    const item = itemById.get(id);
    const group = groupByItem.get(id);
    const haystack = `${item.title} ${group.title} ${group.subject}`.toLocaleLowerCase('ru');
    return haystack.includes(query);
  }

  function applyVisibility() {
    document.querySelectorAll('[data-id]').forEach(el => {
      const id = el.dataset.id;
      const visible = matchesFilter(id) && matchesSearch(id);
      el.classList.toggle('is-muted', !visible);
      el.classList.toggle('is-match', Boolean(query) && visible);
    });
  }

  function renderStats() {
    const ids = [...itemById.keys()];
    const covered = ids.filter(id => (levels[id] || 0) >= 2).length;
    const touched = ids.filter(id => (levels[id] || 0) > 0 || repeatTopics.has(id)).length;
    const repeats = repeatTopics.size;
    const percent = ids.length ? Math.round(touched / ids.length * 100) : 0;
    setText('statCovered', covered);
    setText('statCoverage', `${percent}%`);
    setText('statRepeat', repeats);
    setText('statTotal', ids.length);
    setText('centerPercent', `${percent}%`);
    setText('centerLabel', 'программы затронуто');
    setText('centerCount', `${ids.length} тем`);
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function openDialog(id) {
    const item = itemById.get(id);
    const group = groupByItem.get(id);
    if (!item || !group) return;
    selectedId = id;
    setText('dialogGroup', `${group.code} · ${group.title}`);
    setText('dialogTitle', item.title);
    setText('dialogLevel', `${levels[id] || 0} / 4 · ${levelLabel(levels[id] || 0)}`);
    setText('dialogDescription', item.description);
    setText('dialogDiagnostic', item.diagnostic);
    const evidence = data.evidence[id];
    const history = document.getElementById('dialogHistory');
    const evidenceLink = document.getElementById('dialogEvidenceLink');
    if (evidence) {
      history.textContent = evidence.text;
      evidenceLink.href = evidence.href;
      evidenceLink.hidden = false;
    } else {
      history.textContent = 'Диагностических данных пока нет.';
      evidenceLink.hidden = true;
    }
    levelButtons.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.level) === (levels[id] || 0))));
    repeatButton.textContent = repeatTopics.has(id) ? 'Убрать из повторения' : 'Добавить в повторение';
    repeatButton.classList.toggle('is-repeat', repeatTopics.has(id));
    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
  }

  function refreshAfterChange() {
    saveState();
    renderMap();
    renderCatalog();
    renderStats();
    renderNextFocus();
    if (selectedId && dialog.open) openDialog(selectedId);
  }

  levelButtons.forEach(button => button.addEventListener('click', () => {
    if (!selectedId) return;
    levels[selectedId] = Number(button.dataset.level);
    refreshAfterChange();
  }));

  repeatButton.addEventListener('click', () => {
    if (!selectedId) return;
    if (repeatTopics.has(selectedId)) repeatTopics.delete(selectedId); else repeatTopics.add(selectedId);
    refreshAfterChange();
  });

  document.getElementById('dialogClose').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });

  filterButtons.forEach(button => button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach(candidate => candidate.setAttribute('aria-pressed', String(candidate === button)));
    applyVisibility();
  }));

  search.addEventListener('input', () => {
    query = search.value.trim().toLocaleLowerCase('ru');
    applyVisibility();
  });

  restoreButton.addEventListener('click', () => {
    const ok = window.confirm('Вернуть уровни и список повторения к подтверждённым данным из материалов Екатерины? Ручные изменения будут очищены.');
    if (!ok) return;
    levels = { ...baselineLevels };
    repeatTopics = new Set(baselineRepeat);
    refreshAfterChange();
  });

  function renderNextFocus() {
    const ids = [...itemById.keys()];
    const repeatId = ids.find(id => repeatTopics.has(id));
    const futureId = ids.find(id => (levels[id] || 0) === 0 && !repeatTopics.has(id));
    const lowId = ids.find(id => (levels[id] || 0) === 1);
    const diagnosticId = ids.find(id => (levels[id] || 0) === 2 && !data.evidence[id]);
    const id = repeatId || futureId || lowId || diagnosticId || ids[0];
    const item = itemById.get(id);
    const group = groupByItem.get(id);
    const recommendation = repeatId
      ? 'Вернуться к теме в ближайшем занятии и проверить устойчивость навыка.'
      : futureId
        ? 'Следующая логичная тема по программе: провести короткое введение и базовую практику.'
        : lowId
          ? 'Разобрать один образец пошагово и сразу повторить на близкой задаче.'
          : 'Провести контрольную мини-диагностику без подсказок.';
    setText('focusTitle', item.title);
    setText('focusGroup', group.title);
    setText('focusRecommendation', recommendation);
    const link = document.getElementById('focusMaterial');
    const evidence = data.evidence[id];
    if (evidence) {
      link.href = evidence.href;
      link.hidden = false;
    } else {
      link.hidden = true;
    }
    document.getElementById('focusOpen').onclick = () => openDialog(id);
  }

  function applyTheme(theme) {
    body.dataset.theme = theme;
    root.style.colorScheme = theme;
    localStorage.setItem(themeKey, theme);
    themeButtons.forEach(button => {
      button.setAttribute('aria-label', theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему');
      const label = button.querySelector('[data-theme-label]');
      if (label) label.textContent = theme === 'dark' ? 'Светлая тема' : 'Тёмная тема';
    });
  }

  const storedTheme = localStorage.getItem(themeKey);
  const initialTheme = storedTheme === 'light' || storedTheme === 'dark'
    ? storedTheme
    : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(initialTheme);
  themeButtons.forEach(button => button.addEventListener('click', () => applyTheme(body.dataset.theme === 'dark' ? 'light' : 'dark')));

  function setSidebar(open) {
    sidebar.classList.toggle('is-open', open);
    sidebarBackdrop.hidden = !open;
    mobileMenuButton.setAttribute('aria-expanded', String(open));
  }
  mobileMenuButton.addEventListener('click', () => setSidebar(true));
  sidebarClose.addEventListener('click', () => setSidebar(false));
  sidebarBackdrop.addEventListener('click', () => setSidebar(false));
  sidebar.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setSidebar(false)));

  document.getElementById('programSource').textContent = data.sourceLabel;
  document.getElementById('updatedDate').textContent = `Обновлено ${data.updated}`;
  document.getElementById('teacherName').textContent = data.teacher;

  renderMap();
  renderCatalog();
  renderStats();
  renderNextFocus();
})();
