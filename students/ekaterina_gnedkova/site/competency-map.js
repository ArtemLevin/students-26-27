(() => {
  'use strict';

  const DATA = window.COMPETENCY_MAP_DATA;
  if (!DATA || !Array.isArray(DATA.groups)) {
    throw new Error('competency-map-data.js не загружен или повреждён');
  }

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const LEVEL_LABELS = [
    'Ещё впереди',
    'Нужна помощь',
    'Пройдена с опорой',
    'Почти уверенно',
    'Освоено'
  ];

  const items = DATA.groups.flatMap((group, groupIndex) =>
    group.items.map((item, itemIndex) => ({
      ...item,
      groupId: group.id,
      groupTitle: group.title,
      groupShort: group.short,
      groupIndex,
      itemIndex
    }))
  );
  const itemById = new Map(items.map(item => [item.id, item]));
  const ids = new Set();
  for (const item of items) {
    if (!item.id || ids.has(item.id)) throw new Error(`Некорректный или повторяющийся ID: ${item.id}`);
    ids.add(item.id);
  }

  const baselineLevels = Object.fromEntries(items.map(item => [item.id, clampLevel(item.level)]));
  const baselineRepeat = new Set((DATA.repeatTopics || []).filter(id => itemById.has(id)));

  let levelOverrides = readJson(DATA.storage.levels, {});
  if (!levelOverrides || typeof levelOverrides !== 'object' || Array.isArray(levelOverrides)) levelOverrides = {};

  let repeatTopics = new Set(readJson(DATA.storage.repeat, [...baselineRepeat]));
  repeatTopics = new Set([...repeatTopics].filter(id => itemById.has(id)));

  let activeFilter = 'all';
  let query = '';
  let activeItemId = null;
  let lastDialogTrigger = null;

  const svg = $('#radialMap');
  const tooltip = $('#mapTooltip');
  const catalog = $('#topicCatalog');
  const dialog = $('#competencyDialog');
  const searchInput = $('#topicSearch');

  function clampLevel(value) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.min(4, Math.round(n))) : 0;
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {
      // localStorage может быть недоступен в приватном режиме; интерфейс продолжает работать.
    }
  }

  function levelOf(id) {
    if (Object.prototype.hasOwnProperty.call(levelOverrides, id)) return clampLevel(levelOverrides[id]);
    return baselineLevels[id] ?? 0;
  }

  function isRepeat(id) {
    return repeatTopics.has(id);
  }

  function statusOf(id) {
    if (isRepeat(id)) return 'repeat';
    return levelOf(id) > 0 ? 'covered' : 'upcoming';
  }

  function statusLabel(id) {
    if (isRepeat(id)) return 'Пора повторить';
    return levelOf(id) > 0 ? 'Пройдено' : 'Ещё впереди';
  }

  function itemMatches(item) {
    const status = statusOf(item.id);
    const filterMatch =
      activeFilter === 'all' ||
      (activeFilter === 'covered' && status === 'covered') ||
      (activeFilter === 'repeat' && status === 'repeat') ||
      (activeFilter === 'upcoming' && status === 'upcoming');

    if (!filterMatch) return false;
    if (!query) return true;
    const haystack = `${item.title} ${item.groupTitle}`.toLocaleLowerCase('ru');
    return haystack.includes(query);
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

  function svgEl(tag, attrs = {}) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
    return node;
  }

  function renderMap() {
    const title = svgEl('title', { id: 'radialTitle' });
    title.textContent = `Круговая карта подготовки к ЕГЭ по профильной математике — ${DATA.meta.studentName}`;

    const desc = svgEl('desc', { id: 'radialDescription' });
    desc.textContent = `${DATA.groups.length} тематических секторов и ${items.length} конкретных навыков. Каждая ячейка доступна с клавиатуры; Enter или пробел открывает подробную карточку.`;

    svg.replaceChildren(title, desc);

    const sectorSize = 360 / DATA.groups.length;
    const sectorGap = 1.25;
    const innerRadius = 146;
    const outerRadius = 382;
    const maxRings = Math.max(...DATA.groups.map(group => group.items.length));
    const ringWidth = (outerRadius - innerRadius) / maxRings;
    const ringGap = Math.max(1.15, ringWidth * 0.16);

    DATA.groups.forEach((group, groupIndex) => {
      const startAngle = groupIndex * sectorSize + sectorGap;
      const endAngle = (groupIndex + 1) * sectorSize - sectorGap;
      const middleAngle = (startAngle + endAngle) / 2;

      const band = svgEl('path', {
        d: arcPath(114, 138, startAngle, endAngle),
        class: 'sector-band',
        'aria-hidden': 'true'
      });
      const bandTitle = svgEl('title');
      bandTitle.textContent = `${group.short} · ${group.title}`;
      band.appendChild(bandTitle);
      svg.appendChild(band);

      group.items.forEach((rawItem, itemIndex) => {
        const item = itemById.get(rawItem.id);
        const ringInner = innerRadius + itemIndex * ringWidth;
        const ringOuter = ringInner + ringWidth - ringGap;
        const status = statusOf(item.id);
        const level = levelOf(item.id);
        const matches = itemMatches(item);

        const cell = svgEl('path', {
          d: arcPath(ringInner, ringOuter, startAngle, endAngle),
          class: `radial-cell status-${status}${matches ? '' : ' is-muted'}`,
          'data-id': item.id,
          'data-level': level,
          role: 'button',
          tabindex: '0',
          'aria-label': `${item.title}. Раздел: ${item.groupTitle}. ${statusLabel(item.id)}. Уровень ${level} из 4: ${LEVEL_LABELS[level]}.`
        });
        const cellTitle = svgEl('title');
        cellTitle.textContent = `${item.title} · ${item.groupTitle} · ${statusLabel(item.id)}`;
        cell.appendChild(cellTitle);
        bindCellInteractions(cell, item);
        svg.appendChild(cell);
      });

      const labelPoint = polar(394, middleAngle);
      const label = svgEl('text', {
        x: labelPoint.x.toFixed(2),
        y: labelPoint.y.toFixed(2),
        dy: '.35em',
        class: 'sector-label',
        'aria-hidden': 'true'
      });
      label.textContent = group.short;
      svg.appendChild(label);
    });
  }

  function bindCellInteractions(node, item) {
    node.addEventListener('mouseenter', event => showTooltip(item, event.clientX, event.clientY));
    node.addEventListener('mousemove', event => moveTooltip(event.clientX, event.clientY));
    node.addEventListener('mouseleave', hideTooltip);
    node.addEventListener('focus', () => {
      const rect = node.getBoundingClientRect();
      showTooltip(item, rect.left + rect.width / 2, rect.top + rect.height / 2);
    });
    node.addEventListener('blur', hideTooltip);
    node.addEventListener('click', () => openDialog(item.id, node));
    node.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openDialog(item.id, node);
      }
    });
  }

  function showTooltip(item, x, y) {
    $('#tooltipTitle').textContent = item.title;
    $('#tooltipGroup').textContent = item.groupTitle;
    $('#tooltipStatus').textContent = statusLabel(item.id);
    tooltip.hidden = false;
    tooltip.setAttribute('aria-hidden', 'false');
    moveTooltip(x, y);
  }

  function moveTooltip(x, y) {
    if (tooltip.hidden) return;
    const pad = 14;
    const offset = 16;
    const rect = tooltip.getBoundingClientRect();
    let left = x + offset;
    let top = y + offset;
    if (left + rect.width + pad > window.innerWidth) left = x - rect.width - offset;
    if (top + rect.height + pad > window.innerHeight) top = y - rect.height - offset;
    left = Math.max(pad, Math.min(left, window.innerWidth - rect.width - pad));
    top = Math.max(pad, Math.min(top, window.innerHeight - rect.height - pad));
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  function hideTooltip() {
    tooltip.hidden = true;
    tooltip.setAttribute('aria-hidden', 'true');
  }

  function renderCatalog() {
    catalog.replaceChildren();

    DATA.groups.forEach(group => {
      const details = document.createElement('details');
      details.className = 'catalog-group';

      const summary = document.createElement('summary');
      const label = document.createElement('span');
      label.textContent = `${group.short} · ${group.title}`;

      const count = document.createElement('small');
      const covered = group.items.filter(item => levelOf(item.id) > 0 || isRepeat(item.id)).length;
      count.textContent = `${covered} / ${group.items.length}`;
      summary.append(label, count);
      details.appendChild(summary);

      const list = document.createElement('div');
      list.className = 'catalog-list';

      group.items.forEach(rawItem => {
        const item = itemById.get(rawItem.id);
        const row = document.createElement('button');
        row.type = 'button';
        row.className = `catalog-row status-${statusOf(item.id)}${itemMatches(item) ? '' : ' is-muted'}`;
        row.dataset.id = item.id;
        row.setAttribute('aria-label', `${item.title}. ${statusLabel(item.id)}. Уровень ${levelOf(item.id)} из 4.`);

        const dot = document.createElement('span');
        dot.className = 'catalog-dot';
        dot.setAttribute('aria-hidden', 'true');

        const text = document.createElement('span');
        text.className = 'catalog-text';
        const strong = document.createElement('strong');
        strong.textContent = item.title;
        const small = document.createElement('small');
        small.textContent = `${statusLabel(item.id)} · ${levelOf(item.id)}/4`;
        text.append(strong, small);

        row.append(dot, text);
        row.addEventListener('click', () => openDialog(item.id, row));
        list.appendChild(row);
      });

      details.appendChild(list);
      catalog.appendChild(details);
    });
  }

  function stats() {
    const covered = items.filter(item => levelOf(item.id) > 0).length;
    const touched = items.filter(item => levelOf(item.id) > 0 || isRepeat(item.id)).length;
    const repeat = items.filter(item => isRepeat(item.id)).length;
    const coverage = items.length ? Math.round(touched / items.length * 100) : 0;
    return { covered, touched, repeat, coverage, total: items.length };
  }

  function renderStats() {
    const summary = stats();
    $('#coveredCount').textContent = summary.covered;
    $('#coveragePercent').textContent = `${summary.coverage}%`;
    $('#repeatCount').textContent = summary.repeat;
    $('#totalCount').textContent = summary.total;

    $('#radialPercent').textContent = `${summary.coverage}%`;
    $('#radialCaption').textContent = 'программы затронуто';
    $('#radialTotal').textContent = `${summary.total} тем`;

    $('#sidebarCovered').textContent = summary.covered;
    $('#sidebarRepeat').textContent = summary.repeat;
    $('#sidebarTotal').textContent = summary.total;
  }

  function chooseNextFocus() {
    const repeat = items.find(item => isRepeat(item.id));
    if (repeat) {
      return {
        item: repeat,
        reason: 'Тема отмечена для повторения и имеет наивысший приоритет.',
        action: 'Вернуться к краткой диагностике и проверить, восстановился ли алгоритм решения.'
      };
    }

    const upcoming = items.find(item => levelOf(item.id) === 0);
    if (upcoming) {
      return {
        item: upcoming,
        reason: 'Следующая ещё не затронутая тема по каталогу программы.',
        action: 'Разобрать базовый прототип и после занятия выставить диагностический уровень.'
      };
    }

    const lowCovered = items.find(item => levelOf(item.id) > 0 && levelOf(item.id) <= 2);
    if (lowCovered) {
      return {
        item: lowCovered,
        reason: 'Тема уже проходилась, но уровень пока требует контрольной диагностики.',
        action: 'Решить задачу без опоры на конспект и обновить уровень по результату.'
      };
    }

    return {
      item: items[0],
      reason: 'Каталог полностью затронут.',
      action: 'Провести смешанную диагностику и выбрать ближайшую тему для углубления.'
    };
  }

  function renderNextFocus() {
    const focus = chooseNextFocus();
    if (!focus?.item) return;
    $('#focusTitle').textContent = focus.item.title;
    $('#focusGroup').textContent = focus.item.groupTitle;
    $('#focusReason').textContent = focus.reason;
    $('#focusAction').textContent = focus.action;

    const material = focus.item.evidence?.[0];
    const link = $('#focusMaterial');
    if (material?.pdf) {
      link.href = material.pdf;
      link.hidden = false;
    } else {
      link.hidden = true;
      link.removeAttribute('href');
    }

    $('#focusOpen').onclick = event => {
      event.preventDefault();
      openDialog(focus.item.id, $('#focusOpen'));
    };
  }

  function openDialog(id, trigger) {
    const item = itemById.get(id);
    if (!item) return;
    activeItemId = id;
    lastDialogTrigger = trigger || document.activeElement;

    $('#dialogTitle').textContent = item.title;
    $('#dialogGroup').textContent = `${item.groupShort} · ${item.groupTitle}`;
    $('#dialogLevel').textContent = `${levelOf(id)} / 4 · ${LEVEL_LABELS[levelOf(id)]}`;
    $('#dialogDescription').textContent = item.description;
    $('#dialogDiagnostic').textContent = item.diagnostic;

    const history = $('#dialogHistory');
    history.replaceChildren();
    if (item.evidence?.length) {
      item.evidence.forEach(entry => {
        const p = document.createElement('p');
        p.textContent = `${entry.date}: ${entry.text}`;
        history.appendChild(p);
        const links = document.createElement('div');
        links.className = 'evidence-links';
        if (entry.pdf) links.appendChild(makeLink(entry.pdf, 'PDF материала'));
        if (entry.tex) links.appendChild(makeLink(entry.tex, 'TeX материала'));
        history.appendChild(links);
      });
    } else {
      const p = document.createElement('p');
      p.textContent = 'Диагностических данных пока нет.';
      history.appendChild(p);
    }

    $$('.level-button', dialog).forEach(button => {
      const selected = Number(button.dataset.level) === levelOf(id);
      button.setAttribute('aria-pressed', String(selected));
    });

    const repeatButton = $('#repeatToggle');
    repeatButton.textContent = isRepeat(id) ? 'Убрать из повторения' : 'Добавить в повторение';
    repeatButton.setAttribute('aria-pressed', String(isRepeat(id)));

    const wasOpen = dialog.open || dialog.hasAttribute('open');
    if (!wasOpen) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      $('#closeDialog').focus();
    }
  }

  function makeLink(href, label) {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = label;
    a.target = '_blank';
    a.rel = 'noopener';
    return a;
  }

  function closeDialog() {
    if (dialog.open) dialog.close();
    else dialog.removeAttribute('open');
  }

  function setLevel(level) {
    if (!activeItemId) return;
    levelOverrides[activeItemId] = clampLevel(level);
    writeJson(DATA.storage.levels, levelOverrides);
    refresh();
    openDialog(activeItemId, lastDialogTrigger);
  }

  function toggleRepeat() {
    if (!activeItemId) return;
    if (repeatTopics.has(activeItemId)) repeatTopics.delete(activeItemId);
    else repeatTopics.add(activeItemId);
    writeJson(DATA.storage.repeat, [...repeatTopics]);
    refresh();
    openDialog(activeItemId, lastDialogTrigger);
  }

  function refresh() {
    renderMap();
    renderCatalog();
    renderStats();
    renderNextFocus();
    updateFilterCounts();
  }

  function updateFilterCounts() {
    const counts = {
      all: items.length,
      covered: items.filter(item => statusOf(item.id) === 'covered').length,
      repeat: items.filter(item => statusOf(item.id) === 'repeat').length,
      upcoming: items.filter(item => statusOf(item.id) === 'upcoming').length
    };
    $$('[data-filter]').forEach(button => {
      const key = button.dataset.filter;
      const base = button.dataset.label || button.textContent.split('·')[0].trim();
      button.dataset.label = base;
      button.textContent = `${base} · ${counts[key]}`;
    });
  }

  function restoreBaseline() {
    if (!confirm('Вернуть подтверждённые статусы из материалов ученика и удалить ручные изменения уровней и повторения?')) return;
    levelOverrides = {};
    repeatTopics = new Set(baselineRepeat);
    try {
      localStorage.removeItem(DATA.storage.levels);
      localStorage.removeItem(DATA.storage.repeat);
    } catch (_) {}
    refresh();
  }

  function applyTheme(theme) {
    const resolved = theme === 'dark' ? 'dark' : 'light';
    document.body.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
    $('#themeToggle').setAttribute('aria-label', resolved === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему');
    $('#mobileThemeToggle').setAttribute('aria-label', resolved === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему');
    $('#themeToggle').querySelector('span:last-child').textContent = resolved === 'dark' ? 'Светлая тема' : 'Тёмная тема';
  }

  function initTheme() {
    let theme = 'light';
    try {
      const saved = localStorage.getItem(DATA.storage.theme);
      if (saved === 'dark' || saved === 'light') theme = saved;
    } catch (_) {}
    applyTheme(theme);
  }

  function toggleTheme() {
    const next = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem(DATA.storage.theme, next); } catch (_) {}
  }

  function initSidebar() {
    const sidebar = $('#sidebar');
    const backdrop = $('#sidebarBackdrop');
    const open = () => {
      sidebar.classList.add('open');
      backdrop.hidden = false;
      $('#menuButton').setAttribute('aria-expanded', 'true');
    };
    const close = () => {
      sidebar.classList.remove('open');
      backdrop.hidden = true;
      $('#menuButton').setAttribute('aria-expanded', 'false');
    };
    $('#menuButton').addEventListener('click', open);
    $('#sidebarClose').addEventListener('click', close);
    backdrop.addEventListener('click', close);
    $$('.nav-row', sidebar).forEach(link => link.addEventListener('click', close));
  }

  function bindControls() {
    $$('[data-filter]').forEach(button => {
      button.addEventListener('click', () => {
        activeFilter = button.dataset.filter;
        $$('[data-filter]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
        refresh();
      });
    });

    searchInput.addEventListener('input', () => {
      query = searchInput.value.trim().toLocaleLowerCase('ru');
      refresh();
    });

    $('#resetMap').addEventListener('click', restoreBaseline);
    $('#themeToggle').addEventListener('click', toggleTheme);
    $('#mobileThemeToggle').addEventListener('click', toggleTheme);
    $('#closeDialog').addEventListener('click', closeDialog);
    $('#repeatToggle').addEventListener('click', toggleRepeat);

    $$('.level-button', dialog).forEach(button => {
      button.addEventListener('click', () => setLevel(Number(button.dataset.level)));
    });

    dialog.addEventListener('click', event => {
      if (event.target === dialog) closeDialog();
    });
    dialog.addEventListener('close', () => {
      activeItemId = null;
      if (lastDialogTrigger && typeof lastDialogTrigger.focus === 'function') lastDialogTrigger.focus();
      lastDialogTrigger = null;
    });
  }

  function populateStaticMeta() {
    $('#studentName').textContent = DATA.meta.studentName;
    $('#heroTitle').textContent = `ЕГЭ по профильной математике · ${DATA.meta.studentName}`;
    $('#teacherName').textContent = DATA.meta.teacher;
    $('#programVersion').textContent = DATA.meta.examVersion;
    $('#updatedDate').textContent = `Обновлено ${DATA.meta.updated}`;

    const lesson = DATA.materials?.[0];
    if (lesson) {
      $('#latestLessonTitle').textContent = lesson.title;
      $('#latestLessonLead').textContent = lesson.summary;
      $('#latestPdf').href = lesson.pdf;
      $('#latestTex').href = lesson.tex;
    }
  }

  initTheme();
  initSidebar();
  bindControls();
  populateStaticMeta();
  refresh();
})();
