(() => {
  'use strict';

  const DATA = window.MARINA_OGE_MAP;
  if (!DATA || !Array.isArray(DATA.groups)) {
    console.error('Competency map data is unavailable.');
    return;
  }

  const LEVEL_LABELS = [
    '0 / 4 · Ещё впереди',
    '1 / 4 · Нужна помощь',
    '2 / 4 · Пройдена с опорой',
    '3 / 4 · Почти уверенно',
    '4 / 4 · Освоено'
  ];
  const STORAGE = {
    levels: 'marina-oge-math-competency-map',
    repeat: 'marina-oge-math-repeat',
    theme: 'marina-oge-math-theme'
  };

  const svg = document.getElementById('radialMap');
  const catalog = document.getElementById('topicCatalog');
  const tooltip = document.getElementById('mapTooltip');
  const searchInput = document.getElementById('topicSearch');
  const dialog = document.getElementById('topicDialog');
  const dialogTitle = document.getElementById('dialogTitle');
  const dialogGroup = document.getElementById('dialogGroup');
  const dialogLevel = document.getElementById('dialogLevel');
  const dialogDescription = document.getElementById('dialogDescription');
  const dialogDiagnostic = document.getElementById('dialogDiagnostic');
  const dialogHistory = document.getElementById('dialogHistory');
  const dialogLink = document.getElementById('dialogLink');
  const repeatButton = document.getElementById('repeatButton');

  const allItems = DATA.groups.flatMap(group =>
    group.items.map(item => ({ ...item, groupId: group.id, groupTitle: group.title, groupShort: group.short }))
  );
  const byId = new Map(allItems.map(item => [item.id, item]));
  const pathById = new Map();
  const rowById = new Map();

  let levelOverrides = loadObject(STORAGE.levels);
  let repeatOverrides = loadObject(STORAGE.repeat);
  let activeFilter = 'all';
  let activeItemId = null;
  let lastTrigger = null;

  function loadObject(key) {
    try {
      const raw = localStorage.getItem(key);
      const value = raw ? JSON.parse(raw) : {};
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch (_) {
      return {};
    }
  }

  function saveObject(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('Unable to save state', error);
    }
  }

  function currentLevel(item) {
    const raw = Object.prototype.hasOwnProperty.call(levelOverrides, item.id)
      ? Number(levelOverrides[item.id])
      : Number(item.baseLevel || 0);
    return Number.isFinite(raw) ? Math.max(0, Math.min(4, raw)) : 0;
  }

  function currentRepeat(item) {
    return Object.prototype.hasOwnProperty.call(repeatOverrides, item.id)
      ? Boolean(repeatOverrides[item.id])
      : Boolean(item.baseRepeat);
  }

  function statusOf(item) {
    if (currentRepeat(item)) return 'repeat';
    return currentLevel(item) > 0 ? 'covered' : 'ahead';
  }

  function statusLabel(item) {
    if (currentRepeat(item)) return 'Пора повторить';
    const level = currentLevel(item);
    return level === 0 ? 'Ещё впереди' : LEVEL_LABELS[level].replace(/^\d \/ 4 · /, '');
  }

  function polar(radius, angle) {
    const radians = (angle - 90) * Math.PI / 180;
    return { x: 400 + radius * Math.cos(radians), y: 400 + radius * Math.sin(radians) };
  }

  function arcPath(innerRadius, outerRadius, startAngle, endAngle) {
    const a = polar(outerRadius, startAngle);
    const b = polar(outerRadius, endAngle);
    const c = polar(innerRadius, endAngle);
    const d = polar(innerRadius, startAngle);
    const large = endAngle - startAngle > 180 ? 1 : 0;
    return [
      `M ${a.x.toFixed(3)} ${a.y.toFixed(3)}`,
      `A ${outerRadius} ${outerRadius} 0 ${large} 1 ${b.x.toFixed(3)} ${b.y.toFixed(3)}`,
      `L ${c.x.toFixed(3)} ${c.y.toFixed(3)}`,
      `A ${innerRadius} ${innerRadius} 0 ${large} 0 ${d.x.toFixed(3)} ${d.y.toFixed(3)}`,
      'Z'
    ].join(' ');
  }

  function svgEl(tag, attrs = {}) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, String(value)));
    return el;
  }

  function renderMap() {
    svg.replaceChildren();
    pathById.clear();

    const title = svgEl('title', { id: 'mapSvgTitle' });
    title.textContent = 'Круговая тепловая карта подготовки Марины к ОГЭ по математике';
    const desc = svgEl('desc', { id: 'mapSvgDesc' });
    desc.textContent = `25 секторов экзамена и ${allItems.length} конкретных навыков. Цвет показывает статус изучения темы.`;
    svg.append(title, desc);

    const groups = DATA.groups;
    const sectorSize = 360 / groups.length;
    const sectorGap = 1.05;
    const innerRadius = 145;
    const outerRadius = 378;
    const maxRings = Math.max(...groups.map(group => group.items.length));
    const ringWidth = (outerRadius - innerRadius) / maxRings;
    const ringGap = 1.8;

    groups.forEach((group, groupIndex) => {
      const sectorStart = groupIndex * sectorSize + sectorGap / 2;
      const sectorEnd = (groupIndex + 1) * sectorSize - sectorGap / 2;
      const centerAngle = (sectorStart + sectorEnd) / 2;

      const guide = svgEl('path', {
        d: arcPath(innerRadius - 5, outerRadius + 1, sectorStart, sectorEnd),
        class: 'sector-guide',
        'aria-hidden': 'true'
      });
      svg.appendChild(guide);

      group.items.forEach((item, itemIndex) => {
        const ringInner = innerRadius + itemIndex * ringWidth;
        const ringOuter = ringInner + ringWidth - ringGap;
        const path = svgEl('path', {
          d: arcPath(ringInner, ringOuter, sectorStart, sectorEnd),
          class: 'radial-cell',
          tabindex: '0',
          role: 'button',
          'data-id': item.id,
          'aria-label': `${item.title}. ${group.title}. ${statusLabel(item)}`
        });
        const nativeTitle = svgEl('title');
        nativeTitle.textContent = `${item.title} · ${group.title} · ${statusLabel(item)}`;
        path.appendChild(nativeTitle);

        path.addEventListener('mouseenter', event => showTooltip(item, event.clientX, event.clientY));
        path.addEventListener('mousemove', event => moveTooltip(event.clientX, event.clientY));
        path.addEventListener('mouseleave', hideTooltip);
        path.addEventListener('focus', () => {
          const rect = path.getBoundingClientRect();
          showTooltip(item, rect.left + rect.width / 2, rect.top + rect.height / 2);
        });
        path.addEventListener('blur', hideTooltip);
        path.addEventListener('click', () => openTopic(item, path));
        path.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openTopic(item, path);
          }
        });

        pathById.set(item.id, path);
        svg.appendChild(path);
      });

      const labelPoint = polar(390, centerAngle);
      const label = svgEl('text', {
        x: labelPoint.x.toFixed(2),
        y: labelPoint.y.toFixed(2),
        class: 'sector-label',
        'dominant-baseline': 'middle',
        'aria-hidden': 'true'
      });
      label.textContent = group.short;
      svg.appendChild(label);
    });

    updateVisualState();
  }

  function renderCatalog() {
    catalog.replaceChildren();
    rowById.clear();

    DATA.groups.forEach(group => {
      const details = document.createElement('details');
      details.className = 'catalog-group';

      const summary = document.createElement('summary');
      const titleWrap = document.createElement('span');
      titleWrap.className = 'group-title';
      const strong = document.createElement('strong');
      strong.textContent = `${group.short} · ${group.title}`;
      const meta = document.createElement('small');
      meta.dataset.groupMeta = group.id;
      titleWrap.append(strong, meta);
      summary.appendChild(titleWrap);

      const list = document.createElement('div');
      list.className = 'topic-list';

      group.items.forEach(item => {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'topic-row';
        row.dataset.id = item.id;

        const dot = document.createElement('span');
        dot.className = 'dot';
        dot.setAttribute('aria-hidden', 'true');

        const name = document.createElement('span');
        name.textContent = item.title;

        const level = document.createElement('span');
        level.className = 'level';

        row.append(dot, name, level);
        row.addEventListener('click', () => openTopic(byId.get(item.id), row));
        rowById.set(item.id, row);
        list.appendChild(row);
      });

      details.append(summary, list);
      catalog.appendChild(details);
    });

    updateCatalog();
  }

  function updateCatalog() {
    DATA.groups.forEach(group => {
      const covered = group.items.filter(item => currentLevel(item) > 0).length;
      const meta = catalog.querySelector(`[data-group-meta="${group.id}"]`);
      if (meta) meta.textContent = `${covered} / ${group.items.length} пройдено`;
    });

    allItems.forEach(item => {
      const row = rowById.get(item.id);
      if (!row) return;
      const dot = row.querySelector('.dot');
      const level = row.querySelector('.level');
      const status = statusOf(item);
      dot.style.background = `var(--${status})`;
      if (status === 'covered' && currentLevel(item) >= 4) dot.style.background = 'var(--covered-strong)';
      level.textContent = `ур. ${currentLevel(item)}`;
      row.setAttribute('aria-label', `${item.title}. ${item.groupTitle}. ${statusLabel(item)}.`);
    });
  }

  function showTooltip(item, x, y) {
    tooltip.replaceChildren();
    const title = document.createElement('b');
    title.textContent = item.title;
    const group = document.createElement('span');
    group.textContent = item.groupTitle;
    const status = document.createElement('span');
    status.textContent = `Статус: ${statusLabel(item)}`;
    tooltip.append(title, group, status);
    tooltip.classList.add('visible');
    tooltip.setAttribute('aria-hidden', 'false');
    moveTooltip(x, y);
  }

  function moveTooltip(x, y) {
    if (!tooltip.classList.contains('visible')) return;
    const pad = 12;
    const offset = 16;
    const rect = tooltip.getBoundingClientRect();
    let left = x + offset;
    let top = y + offset;
    if (left + rect.width > window.innerWidth - pad) left = x - rect.width - offset;
    if (top + rect.height > window.innerHeight - pad) top = y - rect.height - offset;
    left = Math.max(pad, Math.min(left, window.innerWidth - rect.width - pad));
    top = Math.max(pad, Math.min(top, window.innerHeight - rect.height - pad));
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  function hideTooltip() {
    tooltip.classList.remove('visible');
    tooltip.setAttribute('aria-hidden', 'true');
  }

  function applyPathClass(item, path) {
    const status = statusOf(item);
    path.classList.remove('status-ahead', 'status-covered', 'status-repeat', 'level-4');
    path.classList.add(`status-${status}`);
    if (status === 'covered' && currentLevel(item) >= 4) path.classList.add('level-4');
    path.setAttribute('aria-label', `${item.title}. ${item.groupTitle}. ${statusLabel(item)}`);
    const title = path.querySelector('title');
    if (title) title.textContent = `${item.title} · ${item.groupTitle} · ${statusLabel(item)}`;
  }

  function updateVisualState() {
    const query = searchInput.value.trim().toLocaleLowerCase('ru-RU');

    allItems.forEach(item => {
      const path = pathById.get(item.id);
      if (!path) return;
      applyPathClass(item, path);

      const status = statusOf(item);
      const filterMatch =
        activeFilter === 'all' ||
        (activeFilter === 'covered' && status === 'covered') ||
        (activeFilter === 'repeat' && status === 'repeat') ||
        (activeFilter === 'ahead' && status === 'ahead');

      const haystack = `${item.title} ${item.groupTitle}`.toLocaleLowerCase('ru-RU');
      const searchMatch = !query || haystack.includes(query);

      path.classList.toggle('is-muted', !filterMatch || !searchMatch);
      path.classList.toggle('is-match', Boolean(query) && searchMatch);

      const row = rowById.get(item.id);
      if (row) {
        row.style.opacity = filterMatch && searchMatch ? '1' : '.24';
        row.style.outline = query && searchMatch ? '2px solid var(--teal)' : '';
      }
    });

    if (query) {
      DATA.groups.forEach(group => {
        const hasMatch = group.items.some(item =>
          `${item.title} ${group.title}`.toLocaleLowerCase('ru-RU').includes(query)
        );
        const meta = catalog.querySelector(`[data-group-meta="${group.id}"]`);
        const details = meta && meta.closest('details');
        if (details && hasMatch) details.open = true;
      });
    }

    updateStats();
    updateCatalog();
    updateFocus();
  }

  function updateStats() {
    const covered = allItems.filter(item => currentLevel(item) > 0).length;
    const repeat = allItems.filter(currentRepeat).length;
    const touched = allItems.filter(item => currentLevel(item) > 0 || currentRepeat(item)).length;
    const coverage = Math.round(touched / allItems.length * 100);

    document.getElementById('statCovered').textContent = String(covered);
    document.getElementById('statCoverage').textContent = `${coverage}%`;
    document.getElementById('statRepeat').textContent = String(repeat);
    document.getElementById('statTotal').textContent = String(allItems.length);
    document.getElementById('centerPercent').textContent = `${coverage}%`;
    document.getElementById('centerCount').textContent = `${allItems.length} тем`;
  }

  function updateFocus() {
    const repeated = allItems.find(currentRepeat);
    const ahead = allItems.find(item => currentLevel(item) === 0 && !currentRepeat(item));
    const help = allItems.find(item => currentLevel(item) === 1 && !currentRepeat(item));
    const supported = allItems.find(item => currentLevel(item) === 2 && !currentRepeat(item));
    const item = repeated || ahead || help || supported || allItems[0];

    const box = document.getElementById('nextFocus');
    const title = box.querySelector('[data-focus-title]');
    const group = box.querySelector('[data-focus-group]');
    const recommendation = box.querySelector('[data-focus-recommendation]');
    const link = box.querySelector('[data-focus-link]');

    title.textContent = item.title;
    group.textContent = item.groupTitle;

    if (currentRepeat(item)) {
      recommendation.textContent = 'Приоритет — короткое повторение и контрольная задача без подсказок.';
    } else if (currentLevel(item) === 0) {
      recommendation.textContent = 'Следующий шаг — познакомиться с методом и решить 2–3 базовых прототипа.';
    } else if (currentLevel(item) <= 2) {
      recommendation.textContent = 'Нужна контрольная диагностика: одна типовая задача с самостоятельным объяснением решения.';
    } else {
      recommendation.textContent = 'Поддерживающая практика: смешанная задача для проверки устойчивости навыка.';
    }

    if (item.evidence && item.evidence.href) {
      link.href = item.evidence.href;
      link.hidden = false;
    } else {
      link.hidden = true;
      link.removeAttribute('href');
    }
  }

  function openTopic(item, trigger) {
    if (!item) return;
    activeItemId = item.id;
    lastTrigger = trigger || document.activeElement;
    hideTooltip();

    dialogGroup.textContent = `${item.groupShort} · ${item.groupTitle}`;
    dialogTitle.textContent = item.title;
    dialogLevel.textContent = LEVEL_LABELS[currentLevel(item)];
    dialogDescription.textContent = item.description;
    dialogDiagnostic.textContent = item.diagnostic;

    if (item.evidence && item.evidence.text) {
      dialogHistory.textContent = item.evidence.text;
      if (item.evidence.href) {
        dialogLink.href = item.evidence.href;
        dialogLink.hidden = false;
      } else {
        dialogLink.hidden = true;
      }
    } else {
      dialogHistory.textContent = 'Диагностических данных пока нет.';
      dialogLink.hidden = true;
      dialogLink.removeAttribute('href');
    }

    document.querySelectorAll('.level-btn').forEach(button => {
      const active = Number(button.dataset.level) === currentLevel(item);
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    repeatButton.textContent = currentRepeat(item) ? 'Убрать из повторения' : 'Добавить в повторение';
    repeatButton.setAttribute('aria-pressed', String(currentRepeat(item)));

    if (!dialog.open) dialog.showModal();
    requestAnimationFrame(() => document.getElementById('closeDialog').focus());
  }

  function refreshDialog() {
    if (!activeItemId || !dialog.open) return;
    openTopic(byId.get(activeItemId), lastTrigger);
  }

  function closeDialog() {
    if (dialog.open) dialog.close();
    if (lastTrigger && typeof lastTrigger.focus === 'function') lastTrigger.focus();
  }

  document.getElementById('closeDialog').addEventListener('click', closeDialog);
  dialog.addEventListener('click', event => {
    if (event.target === dialog) closeDialog();
  });

  document.querySelectorAll('.level-btn').forEach(button => {
    button.addEventListener('click', () => {
      const item = byId.get(activeItemId);
      if (!item) return;
      const level = Number(button.dataset.level);
      levelOverrides[item.id] = level;
      saveObject(STORAGE.levels, levelOverrides);
      updateVisualState();
      refreshDialog();
    });
  });

  repeatButton.addEventListener('click', () => {
    const item = byId.get(activeItemId);
    if (!item) return;
    repeatOverrides[item.id] = !currentRepeat(item);
    saveObject(STORAGE.repeat, repeatOverrides);
    updateVisualState();
    refreshDialog();
  });

  document.querySelectorAll('.filter').forEach(button => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.filter;
      document.querySelectorAll('.filter').forEach(candidate => {
        candidate.setAttribute('aria-pressed', String(candidate === button));
      });
      updateVisualState();
    });
  });

  searchInput.addEventListener('input', updateVisualState);

  document.getElementById('resetState').addEventListener('click', () => {
    const confirmed = window.confirm('Вернуть подтверждённые статусы из материалов ученика? Ручные изменения уровней и списка повторения будут удалены.');
    if (!confirmed) return;
    levelOverrides = {};
    repeatOverrides = {};
    localStorage.removeItem(STORAGE.levels);
    localStorage.removeItem(STORAGE.repeat);
    updateVisualState();
  });

  function setTheme(theme, persist = true) {
    const normalized = theme === 'dark' ? 'dark' : 'light';
    document.body.dataset.theme = normalized;
    document.getElementById('themeToggle').setAttribute(
      'aria-label',
      normalized === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'
    );
    if (persist) localStorage.setItem(STORAGE.theme, normalized);
  }

  document.getElementById('themeToggle').addEventListener('click', () => {
    setTheme(document.body.dataset.theme === 'dark' ? 'light' : 'dark');
  });

  const savedTheme = localStorage.getItem(STORAGE.theme);
  if (savedTheme === 'dark' || savedTheme === 'light') {
    setTheme(savedTheme, false);
  } else {
    setTheme(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light', false);
  }

  window.addEventListener('storage', event => {
    if (event.key === STORAGE.levels) levelOverrides = loadObject(STORAGE.levels);
    if (event.key === STORAGE.repeat) repeatOverrides = loadObject(STORAGE.repeat);
    if (event.key === STORAGE.theme && (event.newValue === 'dark' || event.newValue === 'light')) setTheme(event.newValue, false);
    updateVisualState();
  });

  renderCatalog();
  renderMap();
})();
