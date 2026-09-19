(() => {
  'use strict';

  const DATA = window.COMPETENCY_MAP_DATA;
  if (!DATA || !Array.isArray(DATA.groups)) {
    console.error('COMPETENCY_MAP_DATA is missing');
    return;
  }

  const { meta, groups } = DATA;
  const items = groups.flatMap((group, groupIndex) =>
    group.items.map((item, itemIndex) => ({ ...item, group, groupIndex, itemIndex }))
  );
  const itemById = new Map(items.map(item => [item.id, item]));
  const baselineLevels = Object.fromEntries(items.map(item => [item.id, Number(item.level || 0)]));
  const baselineRepeat = new Set(items.filter(item => item.repeat).map(item => item.id));

  const storageBase = `${meta.student}-${meta.programKey}`;
  const LEVELS_KEY = `${storageBase}-competency-map`;
  const REPEAT_KEY = `${storageBase}-repeat`;
  const THEME_KEY = `${storageBase}-theme`;

  const state = {
    levels: loadObject(LEVELS_KEY, baselineLevels),
    repeat: new Set(loadArray(REPEAT_KEY, [...baselineRepeat])),
    filter: 'all',
    query: '',
    activeId: null,
    dialogTrigger: null
  };

  const els = {
    svg: document.getElementById('radialMap'),
    catalog: document.getElementById('topicCatalog'),
    tooltip: document.getElementById('tooltip'),
    search: document.getElementById('topicSearch'),
    dialog: document.getElementById('topicDialog'),
    coveredStat: document.getElementById('coveredStat'),
    coverageStat: document.getElementById('coverageStat'),
    repeatStat: document.getElementById('repeatStat'),
    totalStat: document.getElementById('totalStat'),
    centerPercent: document.getElementById('centerPercent'),
    centerTotal: document.getElementById('centerTotal'),
    catalogCount: document.getElementById('catalogCount'),
    sourceNote: document.getElementById('sourceNote'),
    focusTitle: document.getElementById('focusTitle'),
    focusText: document.getElementById('focusText'),
    focusOpen: document.getElementById('focusOpen')
  };

  function loadObject(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || 'null');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ...fallback };
      const normalized = { ...fallback };
      for (const [id, value] of Object.entries(parsed)) {
        if (itemById.has(id)) normalized[id] = clampLevel(value);
      }
      return normalized;
    } catch (_) {
      return { ...fallback };
    }
  }

  function loadArray(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || 'null');
      return Array.isArray(parsed) ? parsed.filter(id => itemById.has(id)) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function saveState() {
    localStorage.setItem(LEVELS_KEY, JSON.stringify(state.levels));
    localStorage.setItem(REPEAT_KEY, JSON.stringify([...state.repeat]));
  }

  function clampLevel(value) {
    const num = Number(value);
    return Number.isFinite(num) ? Math.max(0, Math.min(4, Math.round(num))) : 0;
  }

  function levelOf(item) {
    return clampLevel(state.levels[item.id] ?? item.level ?? 0);
  }

  function statusOf(item) {
    if (state.repeat.has(item.id)) return 'repeat';
    return levelOf(item) > 0 ? 'covered' : 'future';
  }

  function statusLabel(status) {
    return status === 'repeat' ? 'Пора повторить' : status === 'covered' ? 'Пройдено' : 'Ещё впереди';
  }

  function levelLabel(level) {
    return ['Ещё впереди', 'Нужна помощь', 'Пройдена с опорой', 'Почти уверенно', 'Освоено'][clampLevel(level)];
  }

  function matchesFilter(item) {
    return state.filter === 'all' || statusOf(item) === state.filter;
  }

  function matchesSearch(item) {
    if (!state.query) return true;
    const haystack = `${item.title} ${item.group.title}`.toLocaleLowerCase('ru');
    return haystack.includes(state.query);
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
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return [
      `M ${a.x.toFixed(3)} ${a.y.toFixed(3)}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${b.x.toFixed(3)} ${b.y.toFixed(3)}`,
      `L ${c.x.toFixed(3)} ${c.y.toFixed(3)}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${d.x.toFixed(3)} ${d.y.toFixed(3)}`,
      'Z'
    ].join(' ');
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
  }

  function summary() {
    const total = items.length;
    const covered = items.filter(item => levelOf(item) > 0).length;
    const repeat = state.repeat.size;
    const touched = items.filter(item => levelOf(item) > 0 || state.repeat.has(item.id)).length;
    return { total, covered, repeat, touched, coverage: total ? Math.round(touched / total * 100) : 0 };
  }

  function render() {
    renderMap();
    renderCatalog();
    renderSummary();
    renderFocus();
  }

  function renderMap() {
    const sectorSize = 360 / groups.length;
    const innerRadius = 148;
    const outerRadius = 382;
    const maxRings = Math.max(...groups.map(group => group.items.length));
    const ringWidth = (outerRadius - innerRadius) / maxRings;
    const ringGap = Math.max(0.9, ringWidth * 0.12);
    let markup = '<title id="radialTitle">Круговая тепловая карта подготовки к ЕГЭ</title>';
    markup += `<desc id="radialDesc">${groups.length} секторов, ${items.length} тем. Каждая ячейка доступна с клавиатуры.</desc>`;

    groups.forEach((group, groupIndex) => {
      const sectorStart = groupIndex * sectorSize + 1.15;
      const sectorEnd = (groupIndex + 1) * sectorSize - 1.15;

      group.items.forEach((rawItem, itemIndex) => {
        const item = itemById.get(rawItem.id);
        const ringInner = innerRadius + itemIndex * ringWidth;
        const ringOuter = ringInner + ringWidth - ringGap;
        const status = statusOf(item);
        const matchFilter = matchesFilter(item);
        const matchSearch = matchesSearch(item);
        const dimmed = !matchFilter || (state.query && !matchSearch);
        const matchClass = state.query && matchSearch ? ' is-match' : '';
        const dimClass = dimmed ? ' is-dimmed' : '';
        const level = levelOf(item);
        markup += `<path class="radial-cell${dimClass}${matchClass}" data-id="${esc(item.id)}" data-status="${status}" d="${arcPath(ringInner, ringOuter, sectorStart, sectorEnd)}" tabindex="0" role="button" aria-label="${esc(item.title)}. Раздел ${esc(group.title)}. ${statusLabel(status)}. Уровень ${level} из 4."><title>${esc(item.title)} · ${esc(group.title)} · ${statusLabel(status)}</title></path>`;
      });

      const labelPoint = polar(394, sectorStart + (sectorEnd - sectorStart) / 2);
      markup += `<text class="radial-group-label" x="${labelPoint.x.toFixed(2)}" y="${labelPoint.y.toFixed(2)}" dy=".35em">${esc(group.short)}</text>`;
    });

    els.svg.innerHTML = markup;
    els.svg.querySelectorAll('.radial-cell').forEach(cell => {
      const item = itemById.get(cell.dataset.id);
      cell.addEventListener('mouseenter', event => showTooltip(item, event.clientX, event.clientY));
      cell.addEventListener('mousemove', event => moveTooltip(event.clientX, event.clientY));
      cell.addEventListener('mouseleave', hideTooltip);
      cell.addEventListener('focus', () => {
        const box = cell.getBoundingClientRect();
        showTooltip(item, box.left + box.width / 2, box.top + box.height / 2);
      });
      cell.addEventListener('blur', hideTooltip);
      cell.addEventListener('click', () => openDialog(item.id, cell));
      cell.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openDialog(item.id, cell);
        }
      });
    });
  }

  function renderCatalog() {
    els.catalog.innerHTML = groups.map(group => {
      const covered = group.items.filter(raw => levelOf(itemById.get(raw.id)) > 0).length;
      const visible = group.items.filter(raw => {
        const item = itemById.get(raw.id);
        return matchesFilter(item) && matchesSearch(item);
      }).length;
      const rows = group.items.map(raw => {
        const item = itemById.get(raw.id);
        const status = statusOf(item);
        const dimmed = !matchesFilter(item) || (state.query && !matchesSearch(item));
        return `<button type="button" class="topic-row${dimmed ? ' is-dimmed' : ''}" data-id="${esc(item.id)}"><i class="topic-dot ${status === 'future' ? '' : status}" aria-hidden="true"></i><span>${esc(item.title)}</span><span>${levelOf(item)}/4</span></button>`;
      }).join('');
      return `<details class="topic-group" ${visible ? '' : 'data-no-match="true"'}><summary><span>${esc(group.short)} · ${esc(group.title)}</span><small>${covered} / ${group.items.length}</small></summary><div class="topic-list">${rows}</div></details>`;
    }).join('');

    els.catalog.querySelectorAll('.topic-row').forEach(row => {
      row.addEventListener('click', () => openDialog(row.dataset.id, row));
    });

    if (state.query) {
      els.catalog.querySelectorAll('.topic-group').forEach(details => {
        const any = [...details.querySelectorAll('.topic-row')].some(row => !row.classList.contains('is-dimmed'));
        if (any) details.open = true;
      });
    }
    const visibleCount = items.filter(item => matchesFilter(item) && matchesSearch(item)).length;
    els.catalogCount.textContent = `${visibleCount} / ${items.length}`;
  }

  function renderSummary() {
    const s = summary();
    els.coveredStat.textContent = s.covered;
    els.coverageStat.textContent = `${s.coverage}%`;
    els.repeatStat.textContent = s.repeat;
    els.totalStat.textContent = s.total;
    els.centerPercent.textContent = `${s.coverage}%`;
    els.centerTotal.textContent = `${s.total} тем`;
    els.sourceNote.textContent = meta.sourceNote;
  }

  function chooseNextFocus() {
    const repeat = items.find(item => state.repeat.has(item.id));
    if (repeat) return { item: repeat, text: 'Тема уже помечена для повторения. Начните с короткой диагностики и затем решите 2–3 задачи этого типа.' };

    const future = items.find(item => levelOf(item) === 0);
    if (future) return { item: future, text: 'Это ближайшая ещё не затронутая микротема в каталоге. Подойдёт короткое объяснение, затем базовая диагностика.' };

    const low = items.find(item => levelOf(item) === 1 || levelOf(item) === 2);
    if (low) return { item: low, text: 'Тема уже проходилась, уровень пока низкий. Нужна контрольная диагностика с самостоятельным решением.' };

    const check = items.find(item => levelOf(item) === 3);
    if (check) return { item: check, text: 'Навык почти устойчив. Полезна смешанная задача без подсказок для подтверждения уровня 4.' };

    return { item: null, text: 'Все темы отмечены как освоенные. Следующий шаг — полный пробник и анализ устойчивости результатов.' };
  }

  function renderFocus() {
    const focus = chooseNextFocus();
    if (!focus.item) {
      els.focusTitle.textContent = 'Полный пробник ЕГЭ';
      els.focusText.textContent = focus.text;
      els.focusOpen.hidden = true;
      els.focusOpen.dataset.id = '';
      return;
    }
    els.focusTitle.textContent = focus.item.title;
    els.focusText.textContent = `${focus.item.group.short} · ${focus.item.group.title}. ${focus.text}`;
    els.focusOpen.hidden = false;
    els.focusOpen.dataset.id = focus.item.id;
  }

  function showTooltip(item, x, y) {
    const status = statusOf(item);
    els.tooltip.innerHTML = `<strong>${esc(item.title)}</strong><span>${esc(item.group.title)}</span><span>${statusLabel(status)} · уровень ${levelOf(item)}/4</span>`;
    els.tooltip.hidden = false;
    moveTooltip(x, y);
  }

  function moveTooltip(x, y) {
    if (els.tooltip.hidden) return;
    const margin = 14;
    const rect = els.tooltip.getBoundingClientRect();
    let left = x + 16;
    let top = y + 16;
    if (left + rect.width + margin > window.innerWidth) left = x - rect.width - 16;
    if (top + rect.height + margin > window.innerHeight) top = y - rect.height - 16;
    left = Math.max(margin, Math.min(left, window.innerWidth - rect.width - margin));
    top = Math.max(margin, Math.min(top, window.innerHeight - rect.height - margin));
    els.tooltip.style.left = `${left}px`;
    els.tooltip.style.top = `${top}px`;
  }

  function hideTooltip() {
    els.tooltip.hidden = true;
  }

  function openDialog(id, trigger) {
    const item = itemById.get(id);
    if (!item) return;
    state.activeId = id;
    state.dialogTrigger = trigger || document.activeElement;
    document.getElementById('dialogGroup').textContent = `${item.group.short} · ${item.group.title}`;
    document.getElementById('dialogTitle').textContent = item.title;
    document.getElementById('dialogDescription').textContent = item.description;
    document.getElementById('dialogDiagnostic').textContent = item.diagnostic;

    const evidence = Array.isArray(item.evidence) ? item.evidence : [];
    document.getElementById('dialogHistory').textContent = evidence.length
      ? evidence.map(entry => entry.text || entry).join(' ')
      : 'Диагностических данных пока нет. Тема ещё не подтверждена материалами ученицы.';

    const material = document.getElementById('dialogMaterial');
    if (item.material && item.material.href) {
      material.hidden = false;
      material.href = item.material.href;
      material.textContent = item.material.label || 'Открыть связанный материал →';
    } else {
      material.hidden = true;
      material.removeAttribute('href');
    }

    updateDialogState(item);
    if (typeof els.dialog.showModal === 'function') els.dialog.showModal();
  }

  function updateDialogState(item) {
    const level = levelOf(item);
    const status = statusOf(item);
    const statusEl = document.getElementById('dialogStatus');
    statusEl.textContent = statusLabel(status);
    statusEl.className = `status-pill ${status === 'future' ? '' : status}`;
    document.getElementById('dialogLevel').textContent = `${level} / 4 · ${levelLabel(level)}`;
    document.querySelectorAll('.level-picker [data-level]').forEach(button => {
      const selected = Number(button.dataset.level) === level;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    document.getElementById('repeatToggle').textContent = state.repeat.has(item.id)
      ? 'Убрать из повторения'
      : 'Добавить в повторение';
  }

  document.querySelectorAll('.filter-btn').forEach(button => {
    button.addEventListener('click', () => {
      state.filter = button.dataset.filter;
      document.querySelectorAll('.filter-btn').forEach(btn => {
        const active = btn === button;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', String(active));
      });
      render();
    });
  });

  els.search.addEventListener('input', () => {
    state.query = els.search.value.trim().toLocaleLowerCase('ru');
    render();
  });

  document.querySelectorAll('.level-picker [data-level]').forEach(button => {
    button.addEventListener('click', () => {
      const item = itemById.get(state.activeId);
      if (!item) return;
      state.levels[item.id] = clampLevel(button.dataset.level);
      saveState();
      updateDialogState(item);
      render();
    });
  });

  document.getElementById('repeatToggle').addEventListener('click', () => {
    const item = itemById.get(state.activeId);
    if (!item) return;
    if (state.repeat.has(item.id)) state.repeat.delete(item.id);
    else state.repeat.add(item.id);
    saveState();
    updateDialogState(item);
    render();
  });

  els.dialog.addEventListener('close', () => {
    state.dialogTrigger?.focus?.();
    state.dialogTrigger = null;
  });

  document.getElementById('focusOpen').addEventListener('click', event => {
    const id = event.currentTarget.dataset.id;
    if (id) openDialog(id, event.currentTarget);
  });

  document.getElementById('resetState').addEventListener('click', () => {
    if (!confirm('Вернуть уровни и повторение к подтверждённому состоянию из материалов ученицы? Ручные изменения будут удалены.')) return;
    state.levels = { ...baselineLevels };
    state.repeat = new Set(baselineRepeat);
    localStorage.removeItem(LEVELS_KEY);
    localStorage.removeItem(REPEAT_KEY);
    render();
  });

  const themeToggle = document.getElementById('themeToggle');
  function applyTheme(theme) {
    const resolved = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = resolved;
    themeToggle.setAttribute('aria-pressed', String(resolved === 'dark'));
    themeToggle.title = resolved === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему';
  }
  let theme = localStorage.getItem(THEME_KEY);
  if (!theme) theme = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  applyTheme(theme);
  themeToggle.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });

  render();
})();
