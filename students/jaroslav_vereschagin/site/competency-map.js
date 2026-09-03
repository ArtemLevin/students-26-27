// Интерактивная логика персонального учебного навигатора Ярослава.
(function () {
  'use strict';

  const DATA = window.JAROSLAV_OGE_PROGRAM;
  if (!DATA || !Array.isArray(DATA.groups)) {
    throw new Error('Каталог программы Ярослава не найден');
  }

  const LEVEL_LABELS = [
    'Ещё впереди',
    'Нужна помощь',
    'Пройдена с опорой',
    'Почти уверенно',
    'Освоено'
  ];
  const LEVEL_EXPLANATIONS = [
    'Тема ещё не проходилась или пока не диагностировалась.',
    'Задание решается только с существенной подсказкой.',
    'Алгоритм знаком, решение пока требует опоры на образец или вопросы преподавателя.',
    'Типовые задачи решаются самостоятельно, остаётся проверить устойчивость навыка.',
    'Навык устойчиво применяется в типовых и смешанных задачах.'
  ];
  const STATUS_LABELS = {
    upcoming: 'Ещё впереди',
    covered: 'Тема проходилась',
    repeat: 'Пора повторить'
  };

  const keyBase = `${DATA.student}-${DATA.programId}`;
  const LEVELS_KEY = `${keyBase}-competency-map`;
  const REPEAT_KEY = `${keyBase}-repeat`;
  const THEME_KEY = `${keyBase}-theme`;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const svgNamespace = 'http://www.w3.org/2000/svg';

  const storage = {
    get(key) {
      try {
        return localStorage.getItem(key);
      } catch (_) {
        return null;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (_) {
        // Карта остаётся полностью рабочей в памяти текущей вкладки.
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch (_) {
        // Локальное состояние уже восстановлено в памяти.
      }
    }
  };

  function clampLevel(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(0, Math.min(4, Math.round(numeric))) : 0;
  }

  const lessonEvidence = new Map();
  for (const lesson of DATA.confirmedLessons || []) {
    for (const id of lesson.topicIds || []) {
      if (!lessonEvidence.has(id)) lessonEvidence.set(id, []);
      lessonEvidence.get(id).push({
        date: lesson.date,
        title: lesson.title,
        href: lesson.href || null,
        note: lesson.note || null
      });
    }
  }

  const groups = DATA.groups.map((group) => ({
    ...group,
    items: group.items.map((item, ringIndex) => ({
      ...item,
      ringIndex,
      groupId: group.id,
      groupShort: group.short,
      groupTitle: group.title
    }))
  }));
  const allItems = groups.flatMap((group) => group.items);
  const itemById = new Map(allItems.map((item) => [item.id, item]));

  function itemEvidence(item) {
    return [...(item.evidence || []), ...(lessonEvidence.get(item.id) || [])];
  }

  function validateCatalog() {
    const ids = new Set();
    if (!groups.length || !allItems.length) throw new Error('Каталог программы пуст');
    for (const group of groups) {
      if (!group.id || !group.title || !group.items.length) {
        throw new Error(`Некорректный раздел программы: ${group.id || 'без id'}`);
      }
      for (const item of group.items) {
        if (!item.id || !item.title) throw new Error(`Некорректная тема в разделе ${group.id}`);
        if (ids.has(item.id)) throw new Error(`Повторяющийся id темы: ${item.id}`);
        ids.add(item.id);
      }
    }
  }
  validateCatalog();

  const baselineLevels = Object.fromEntries(allItems.map((item) => {
    const evidenceLevel = itemEvidence(item).length ? 2 : 0;
    return [item.id, Math.max(clampLevel(item.baseLevel), evidenceLevel)];
  }));
  const baselineRepeat = new Set((DATA.baselineRepeatTopics || []).filter((id) => itemById.has(id)));

  function readSavedLevels() {
    try {
      const parsed = JSON.parse(storage.get(LEVELS_KEY) || '{}');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
      return Object.fromEntries(
        Object.entries(parsed)
          .filter(([id]) => itemById.has(id))
          .map(([id, value]) => [id, clampLevel(value)])
      );
    } catch (_) {
      return {};
    }
  }

  function readSavedRepeat() {
    try {
      const parsed = JSON.parse(storage.get(REPEAT_KEY) || '[]');
      if (!Array.isArray(parsed)) return new Set();
      return new Set(parsed.filter((id) => itemById.has(id)));
    } catch (_) {
      return new Set();
    }
  }

  let levels = { ...baselineLevels, ...readSavedLevels() };
  let repeatTopics = new Set([...baselineRepeat, ...readSavedRepeat()]);
  let activeFilter = 'all';
  let searchQuery = '';
  let activeItemId = null;
  let lastDialogTrigger = null;

  function persistProgress() {
    storage.set(LEVELS_KEY, JSON.stringify(levels));
    storage.set(REPEAT_KEY, JSON.stringify([...repeatTopics]));
  }

  function statusOf(item) {
    if (repeatTopics.has(item.id)) return 'repeat';
    if (clampLevel(levels[item.id]) > 0) return 'covered';
    return 'upcoming';
  }

  function filterMatches(item) {
    return activeFilter === 'all' || statusOf(item) === activeFilter;
  }

  function searchMatches(item) {
    if (!searchQuery) return true;
    const haystack = `${item.title} ${item.groupTitle}`.toLocaleLowerCase('ru-RU');
    return haystack.includes(searchQuery);
  }

  function itemMatches(item) {
    return filterMatches(item) && searchMatches(item);
  }

  function polar(radius, angle) {
    const radians = (angle - 90) * Math.PI / 180;
    return {
      x: 400 + radius * Math.cos(radians),
      y: 400 + radius * Math.sin(radians)
    };
  }

  function arcPath(innerRadius, outerRadius, startAngle, endAngle) {
    const outerStart = polar(outerRadius, startAngle);
    const outerEnd = polar(outerRadius, endAngle);
    const innerEnd = polar(innerRadius, endAngle);
    const innerStart = polar(innerRadius, startAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return [
      `M ${outerStart.x} ${outerStart.y}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
      `L ${innerEnd.x} ${innerEnd.y}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
      'Z'
    ].join(' ');
  }

  const tooltip = $('#mapTooltip');

  function positionTooltip(clientX, clientY) {
    if (!tooltip) return;
    const viewportPadding = 12;
    const gap = 14;
    const width = tooltip.offsetWidth || 340;
    const height = tooltip.offsetHeight || 92;
    const maxLeft = window.innerWidth - width - viewportPadding;
    const maxTop = window.innerHeight - height - viewportPadding;
    const preferredLeft = clientX + gap;
    const preferredTop = clientY + gap;
    tooltip.style.left = `${Math.max(viewportPadding, Math.min(maxLeft, preferredLeft))}px`;
    tooltip.style.top = `${Math.max(viewportPadding, Math.min(maxTop, preferredTop))}px`;
  }

  function showTooltip(item, clientX, clientY) {
    if (!tooltip) return;
    const title = document.createElement('strong');
    title.textContent = item.title;
    const section = document.createElement('span');
    section.textContent = `${item.groupShort} · ${item.groupTitle}`;
    const status = document.createElement('span');
    status.className = 'tooltip-status';
    status.textContent = `${STATUS_LABELS[statusOf(item)]} · уровень ${clampLevel(levels[item.id])}/4`;
    tooltip.replaceChildren(title, section, status);
    tooltip.classList.add('is-visible');
    tooltip.setAttribute('aria-hidden', 'false');
    positionTooltip(clientX, clientY);
  }

  function hideTooltip() {
    if (!tooltip) return;
    tooltip.classList.remove('is-visible');
    tooltip.setAttribute('aria-hidden', 'true');
  }

  function focusAdjacentCell(currentId, key) {
    const cells = $$('.radial-cell', $('#radialMap'));
    const currentIndex = cells.findIndex((cell) => cell.dataset.id === currentId);
    if (currentIndex < 0 || !cells.length) return;
    let nextIndex = currentIndex;
    if (key === 'Home') nextIndex = 0;
    if (key === 'End') nextIndex = cells.length - 1;
    if (key === 'ArrowRight' || key === 'ArrowDown') nextIndex = (currentIndex + 1) % cells.length;
    if (key === 'ArrowLeft' || key === 'ArrowUp') nextIndex = (currentIndex - 1 + cells.length) % cells.length;
    cells[nextIndex].focus();
  }

  function bindMapCell(path, item) {
    path.addEventListener('mouseenter', (event) => showTooltip(item, event.clientX, event.clientY));
    path.addEventListener('mousemove', (event) => positionTooltip(event.clientX, event.clientY));
    path.addEventListener('mouseleave', hideTooltip);
    path.addEventListener('focus', () => {
      const rect = path.getBoundingClientRect();
      showTooltip(item, rect.left + rect.width / 2, rect.top + rect.height / 2);
    });
    path.addEventListener('blur', hideTooltip);
    path.addEventListener('click', () => openTopic(item.id, path));
    path.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openTopic(item.id, path);
        return;
      }
      if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        focusAdjacentCell(item.id, event.key);
      }
    });
  }

  function renderMap() {
    const svg = $('#radialMap');
    if (!svg) return;
    svg.replaceChildren();

    const title = document.createElementNS(svgNamespace, 'title');
    title.id = 'radialTitle';
    title.textContent = 'Круговая тепловая карта подготовки Анны Трапезниковой к ОГЭ по математике';
    const description = document.createElementNS(svgNamespace, 'desc');
    description.id = 'radialDescription';
    description.textContent = `${groups.length} тематических секторов и ${allItems.length} отдельных навыков. Используйте Tab или стрелки для перемещения, Enter или пробел для открытия карточки.`;
    svg.append(title, description);

    const sectorSize = 360 / groups.length;
    const innerRadius = 145;
    const outerRadius = 380;
    const maxRings = Math.max(...groups.map((group) => group.items.length));
    const ringWidth = (outerRadius - innerRadius) / maxRings;
    const ringGap = Math.max(1.5, ringWidth * .14);
    const sectorGap = 1.25;

    groups.forEach((group, groupIndex) => {
      const startAngle = groupIndex * sectorSize + sectorGap;
      const endAngle = (groupIndex + 1) * sectorSize - sectorGap;
      const groupHasMatch = group.items.some(itemMatches);

      const groupArc = document.createElementNS(svgNamespace, 'path');
      groupArc.setAttribute('class', `radial-group-arc${groupHasMatch ? ' has-match' : ''}`);
      groupArc.setAttribute('d', arcPath(112, 137, startAngle, endAngle));
      groupArc.setAttribute('aria-hidden', 'true');
      const groupTitle = document.createElementNS(svgNamespace, 'title');
      groupTitle.textContent = `${group.short} · ${group.title}`;
      groupArc.appendChild(groupTitle);
      svg.appendChild(groupArc);

      group.items.forEach((item, itemIndex) => {
        const ringInner = innerRadius + itemIndex * ringWidth;
        const ringOuter = ringInner + ringWidth - ringGap;
        const status = statusOf(item);
        const level = clampLevel(levels[item.id]);
        const match = itemMatches(item);
        const path = document.createElementNS(svgNamespace, 'path');
        path.setAttribute('d', arcPath(ringInner, ringOuter, startAngle, endAngle));
        path.setAttribute('class', `radial-cell status-${status}${match ? '' : ' is-muted'}${searchQuery && searchMatches(item) ? ' search-match' : ''}`);
        path.setAttribute('data-id', item.id);
        path.setAttribute('data-level', String(level));
        path.setAttribute('tabindex', '0');
        path.setAttribute('role', 'button');
        path.setAttribute('aria-label', `${item.title}. Раздел ${group.title}. ${STATUS_LABELS[status]}. Уровень ${level} из 4. Кольцо ${itemIndex + 1}.`);
        const nativeTitle = document.createElementNS(svgNamespace, 'title');
        nativeTitle.textContent = `${item.title} · ${group.title} · ${STATUS_LABELS[status]} · уровень ${level}/4`;
        path.appendChild(nativeTitle);
        bindMapCell(path, item);
        svg.appendChild(path);
      });

      const labelPoint = polar(392, startAngle + (endAngle - startAngle) / 2);
      const label = document.createElementNS(svgNamespace, 'text');
      label.setAttribute('class', 'radial-group-label');
      label.setAttribute('x', String(labelPoint.x));
      label.setAttribute('y', String(labelPoint.y));
      label.setAttribute('dy', '.35em');
      label.textContent = group.short;
      svg.appendChild(label);
    });
  }

  function createTopicRow(item) {
    const status = statusOf(item);
    const level = clampLevel(levels[item.id]);
    const matches = itemMatches(item);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `topic-row${matches ? '' : ' is-muted'}${searchQuery && searchMatches(item) ? ' search-match' : ''}`;
    button.dataset.id = item.id;
    button.setAttribute('aria-label', `${item.title}. ${STATUS_LABELS[status]}. Уровень ${level} из 4.`);

    const dot = document.createElement('i');
    dot.className = 'topic-dot';
    dot.setAttribute('aria-hidden', 'true');
    dot.style.background = `var(--cell-${status})`;
    const title = document.createElement('span');
    title.className = 'topic-title';
    title.textContent = item.title;
    const badge = document.createElement('span');
    badge.className = 'topic-level';
    badge.textContent = status === 'repeat' ? `↻ ${level}/4` : `${level}/4`;
    button.append(dot, title, badge);
    button.addEventListener('click', () => openTopic(item.id, button));
    return button;
  }

  function renderCatalog() {
    const host = $('#topicIndex');
    if (!host) return;
    host.replaceChildren();

    groups.forEach((group, groupIndex) => {
      const details = document.createElement('details');
      details.className = 'topic-group';
      const matchingItems = group.items.filter(itemMatches);
      if ((searchQuery && matchingItems.length) || (!searchQuery && activeFilter === 'all' && groupIndex === 0)) {
        details.open = true;
      }

      const touched = group.items.filter((item) => clampLevel(levels[item.id]) > 0 || repeatTopics.has(item.id)).length;
      const repeats = group.items.filter((item) => repeatTopics.has(item.id)).length;
      const summary = document.createElement('summary');
      const name = document.createElement('span');
      name.textContent = `${group.short} · ${group.title}`;
      const count = document.createElement('small');
      count.textContent = `${touched} / ${group.items.length}${repeats ? ` · ↻ ${repeats}` : ''}`;
      summary.append(name, count);
      details.appendChild(summary);

      const list = document.createElement('div');
      list.className = 'topic-list';
      group.items.forEach((item) => list.appendChild(createTopicRow(item)));
      details.appendChild(list);
      host.appendChild(details);
    });
  }

  function getSummary() {
    const covered = allItems.filter((item) => clampLevel(levels[item.id]) > 0).length;
    const repeat = allItems.filter((item) => repeatTopics.has(item.id)).length;
    const touched = allItems.filter((item) => clampLevel(levels[item.id]) > 0 || repeatTopics.has(item.id)).length;
    const coverage = allItems.length ? Math.round(touched / allItems.length * 100) : 0;
    const visible = allItems.filter(itemMatches).length;
    return { covered, repeat, touched, coverage, visible, total: allItems.length };
  }

  function chooseNextFocus() {
    return allItems.find((item) => repeatTopics.has(item.id))
      || allItems.find((item) => statusOf(item) === 'upcoming')
      || allItems.find((item) => clampLevel(levels[item.id]) === 1)
      || allItems.find((item) => clampLevel(levels[item.id]) === 2)
      || allItems.find((item) => clampLevel(levels[item.id]) === 3)
      || allItems[0];
  }

  function relatedMaterial(item) {
    return item.material || itemEvidence(item).map((entry) => entry.href).filter(Boolean).at(-1) || null;
  }

  function updateSummary() {
    const summary = getSummary();
    $('#coveredCount').textContent = String(summary.covered);
    $('#coveragePercent').textContent = `${summary.coverage}%`;
    $('#repeatCount').textContent = String(summary.repeat);
    $('#totalCount').textContent = String(summary.total);
    $('#sectorCount').textContent = `${groups.length} секторов`;
    $('#radialPercent').textContent = `${summary.coverage}%`;
    $('#radialTopicCount').textContent = `${summary.total} тем`;
    $('#catalogMatchCount').textContent = searchQuery || activeFilter !== 'all'
      ? `${summary.visible} совпадений`
      : `${summary.total} тем`;
    $('#mapStatus').textContent = searchQuery || activeFilter !== 'all'
      ? `Подходит под текущие условия: ${summary.visible} из ${summary.total} тем. Структура круга сохранена полностью.`
      : `Карта готова: ${groups.length} разделов, ${summary.total} тем, подтверждено материалами ${allItems.filter((item) => itemEvidence(item).length).length}.`;

    const next = chooseNextFocus();
    if (!next) return;
    const nextStatus = statusOf(next);
    $('#focusHeading').textContent = next.title;
    $('#focusSection').textContent = `${next.groupShort} · ${next.groupTitle}`;
    $('#focusDescription').textContent = nextStatus === 'repeat'
      ? 'Тема находится в очереди повторения. Начните с короткой диагностики и разберите первую устойчивую ошибку.'
      : nextStatus === 'upcoming'
        ? 'Это ближайшая ещё не затронутая тема в маршруте. Начните с короткой входной диагностики.'
        : 'Навык уже знаком, но его уровень стоит подтвердить самостоятельной задачей без подсказок.';
    $('#focusOpen').dataset.id = next.id;
    const focusMaterial = $('#focusMaterial');
    const nextMaterial = relatedMaterial(next);
    focusMaterial.hidden = !nextMaterial;
    if (nextMaterial) focusMaterial.href = nextMaterial;
    else focusMaterial.removeAttribute('href');
  }

  function renderAll() {
    renderMap();
    renderCatalog();
    updateSummary();
  }

  const dialog = $('#topicDialog');

  function fillHistory(item) {
    const historyHost = $('#dialogHistory');
    historyHost.replaceChildren();
    const evidence = itemEvidence(item);
    if (!evidence.length) {
      const paragraph = document.createElement('p');
      paragraph.textContent = repeatTopics.has(item.id)
        ? 'Тема вручную добавлена в повторение. Диагностических материалов пока нет.'
        : 'Диагностических данных пока нет.';
      historyHost.appendChild(paragraph);
      return;
    }
    const list = document.createElement('ul');
    list.className = 'history-list';
    evidence.forEach((entry) => {
      const row = document.createElement('li');
      const label = [entry.date, entry.title].filter(Boolean).join(' · ') || entry.note || 'Подтверждено учебным материалом';
      if (entry.href) {
        const link = document.createElement('a');
        link.href = entry.href;
        link.textContent = label;
        row.appendChild(link);
      } else {
        row.textContent = label;
      }
      if (entry.note && label !== entry.note) row.append(` — ${entry.note}`);
      list.appendChild(row);
    });
    historyHost.appendChild(list);
  }

  function refreshDialog() {
    const item = itemById.get(activeItemId);
    if (!item) return;
    const level = clampLevel(levels[item.id]);
    const status = statusOf(item);
    $('#dialogGroup').textContent = `${item.groupShort} · ${item.groupTitle}`;
    $('#dialogTitle').textContent = item.title;
    $('#dialogDescription').textContent = item.description;
    $('#dialogDiagnostic').textContent = item.diagnostic;
    const statusBadge = $('#dialogStatus');
    statusBadge.className = `status-${status}`;
    statusBadge.textContent = STATUS_LABELS[status];
    $('#dialogLevel').textContent = `${level} / 4 · ${LEVEL_LABELS[level]}`;
    $('#levelExplanation').textContent = LEVEL_EXPLANATIONS[level];
    $$('.level-button', dialog).forEach((button) => {
      const buttonLevel = clampLevel(button.dataset.level);
      button.setAttribute('aria-pressed', String(buttonLevel === level));
      button.setAttribute('aria-label', `Уровень ${buttonLevel}: ${LEVEL_LABELS[buttonLevel]}. ${LEVEL_EXPLANATIONS[buttonLevel]}`);
    });
    const repeatButton = $('#repeatToggle');
    const inRepeat = repeatTopics.has(item.id);
    repeatButton.textContent = inRepeat ? 'Убрать из повторения' : 'Добавить в повторение';
    repeatButton.setAttribute('aria-pressed', String(inRepeat));
    const material = $('#dialogMaterial');
    const materialHref = relatedMaterial(item);
    material.hidden = !materialHref;
    if (materialHref) material.href = materialHref;
    else material.removeAttribute('href');
    fillHistory(item);
  }

  function openTopic(id, trigger = document.activeElement) {
    const item = itemById.get(id);
    if (!item || !dialog) return;
    activeItemId = id;
    lastDialogTrigger = trigger && trigger !== document.body ? trigger : null;
    refreshDialog();
    if (!dialog.open) dialog.showModal();
    $('#dialogClose').focus();
  }

  function closeDialog() {
    if (dialog && dialog.open) dialog.close();
  }

  function restoreDialogFocus() {
    if (lastDialogTrigger && lastDialogTrigger.isConnected) {
      lastDialogTrigger.focus();
      lastDialogTrigger = null;
      return;
    }
    const replacement = $(`.radial-cell[data-id="${activeItemId}"]`) || $(`.topic-row[data-id="${activeItemId}"]`);
    if (replacement) replacement.focus();
    lastDialogTrigger = null;
  }

  function applyTheme(theme) {
    const resolved = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = resolved;
    storage.set(THEME_KEY, resolved);
    const button = $('#themeToggle');
    button.setAttribute('aria-label', resolved === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему');
    button.title = button.getAttribute('aria-label');
  }

  $$('.filter-button').forEach((button) => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.filter || 'all';
      $$('.filter-button').forEach((candidate) => candidate.setAttribute('aria-pressed', String(candidate === button)));
      renderAll();
    });
  });

  $('#topicSearch').addEventListener('input', (event) => {
    searchQuery = event.target.value.trim().toLocaleLowerCase('ru-RU');
    $('#clearSearch').hidden = !searchQuery;
    renderAll();
  });

  $('#clearSearch').addEventListener('click', () => {
    searchQuery = '';
    $('#topicSearch').value = '';
    $('#clearSearch').hidden = true;
    renderAll();
    $('#topicSearch').focus();
  });

  $('#resetMap').addEventListener('click', () => {
    const approved = window.confirm('Удалить ручные уровни и список повторения, затем вернуть статусы, подтверждённые материалами занятий?');
    if (!approved) return;
    storage.remove(LEVELS_KEY);
    storage.remove(REPEAT_KEY);
    levels = { ...baselineLevels };
    repeatTopics = new Set(baselineRepeat);
    activeFilter = 'all';
    searchQuery = '';
    $('#topicSearch').value = '';
    $('#clearSearch').hidden = true;
    $$('.filter-button').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.filter === 'all')));
    renderAll();
  });

  $$('.level-button', dialog).forEach((button) => {
    button.addEventListener('click', () => {
      if (!activeItemId) return;
      levels[activeItemId] = clampLevel(button.dataset.level);
      persistProgress();
      renderAll();
      refreshDialog();
    });
  });

  $('#repeatToggle').addEventListener('click', () => {
    if (!activeItemId) return;
    if (repeatTopics.has(activeItemId)) repeatTopics.delete(activeItemId);
    else repeatTopics.add(activeItemId);
    persistProgress();
    renderAll();
    refreshDialog();
  });

  $('#dialogClose').addEventListener('click', closeDialog);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeDialog();
  });
  dialog.addEventListener('close', restoreDialogFocus);

  $('#focusOpen').addEventListener('click', (event) => {
    const id = event.currentTarget.dataset.id;
    if (id) openTopic(id, event.currentTarget);
  });

  $('#themeToggle').addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  });

  const savedTheme = storage.get(THEME_KEY);
  const preferredTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  applyTheme(savedTheme || preferredTheme);
  renderAll();
})();
