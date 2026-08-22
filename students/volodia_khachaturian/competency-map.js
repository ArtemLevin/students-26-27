(() => {
  'use strict';

  const DATA = window.COMPETENCY_MAP_DATA;
  if (!DATA || !Array.isArray(DATA.groups)) {
    throw new Error('COMPETENCY_MAP_DATA is unavailable or invalid.');
  }

  function respectfulDiagnosticLead(value) {
    return String(value)
      .replace(/^Объясни\b/, 'Объясните')
      .replace(/^Реши\b/, 'Решите')
      .replace(/^Определи\b/, 'Определите')
      .replace(/^Собери\b/, 'Составьте')
      .replace(/^Построй\b/, 'Постройте')
      .replace(/^Составь\b/, 'Составьте')
      .replace(/^Выполни\b/, 'Выполните')
      .replace(/\bвыполни\b/g, 'выполните')
      .replace(/\bпоясни\b/g, 'поясните')
      .replace(/\bзапиши\b/g, 'запишите')
      .replace(/\bобъясни\b/g, 'объясните')
      .replace(/\bсвяжи\b/g, 'свяжите')
      .replace(/\bвыбери\b/g, 'выберите')
      .replace(/\bпримени\b/g, 'примените')
      .replace(/\bполучи вывод\b/g, 'сформулируйте вывод')
      .replace('направление/причину', 'направление или причину')
      .replace('график/формулу', 'график или формулу');
  }

  const NS = DATA.storageNamespace;
  const LEVELS_KEY = `${NS}-competency-map`;
  const REPEAT_KEY = `${NS}-repeat`;
  const THEME_KEY = `${NS}-theme`;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const center = 400;
  const innerRadius = 145;
  const outerRadius = 380;
  const sectorGap = 1.35;
  const ringGap = 1.2;
  const maxRings = Math.max(...DATA.groups.map(group => group.items.length));
  const ringWidth = (outerRadius - innerRadius) / maxRings;
  const sectorSize = 360 / DATA.groups.length;

  const allTopics = [];
  const topicById = new Map();
  const groupByTopic = new Map();

  DATA.groups.forEach(group => {
    group.items.forEach(item => {
      if (topicById.has(item.id)) throw new Error(`Duplicate topic id: ${item.id}`);
      topicById.set(item.id, item);
      groupByTopic.set(item.id, group);
      allTopics.push(item);
    });
  });

  const baseLevels = Object.fromEntries(allTopics.map(topic => [topic.id, Number(DATA.baselineLevels?.[topic.id]) || 0]));
  const baseRepeat = new Set(DATA.repeatTopics || []);
  let levels = { ...baseLevels, ...readJSON(LEVELS_KEY, {}) };
  let repeatTopics = new Set(readJSON(REPEAT_KEY, [...baseRepeat]).filter(id => topicById.has(id)));
  let activeFilter = 'all';
  let searchQuery = '';
  let activeTopicId = null;

  const map = document.getElementById('radialMap');
  const index = document.getElementById('topicIndex');
  const tooltip = document.getElementById('mapTooltip');
  const dialog = document.getElementById('competencyDialog');
  const search = document.getElementById('topicSearch');

  function readJSON(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }

  function polar(radius, angle) {
    const radians = (angle - 90) * Math.PI / 180;
    return { x: center + radius * Math.cos(radians), y: center + radius * Math.sin(radians) };
  }

  function arcPath(r1, r2, startAngle, endAngle) {
    const p1 = polar(r2, startAngle);
    const p2 = polar(r2, endAngle);
    const p3 = polar(r1, endAngle);
    const p4 = polar(r1, startAngle);
    const large = endAngle - startAngle > 180 ? 1 : 0;
    return [
      `M ${p1.x.toFixed(3)} ${p1.y.toFixed(3)}`,
      `A ${r2} ${r2} 0 ${large} 1 ${p2.x.toFixed(3)} ${p2.y.toFixed(3)}`,
      `L ${p3.x.toFixed(3)} ${p3.y.toFixed(3)}`,
      `A ${r1} ${r1} 0 ${large} 0 ${p4.x.toFixed(3)} ${p4.y.toFixed(3)}`,
      'Z'
    ].join(' ');
  }

  function levelOf(id) {
    return Math.max(0, Math.min(4, Number(levels[id] ?? baseLevels[id] ?? 0)));
  }

  function statusOf(id) {
    if (repeatTopics.has(id)) return 'repeat';
    return levelOf(id) > 0 ? 'covered' : 'ahead';
  }

  function statusLabel(id) {
    if (repeatTopics.has(id)) return 'Пора повторить';
    const level = levelOf(id);
    if (level === 0) return 'Ещё впереди';
    if (level === 1) return 'Нужна помощь';
    if (level === 2) return 'Пройдена с опорой';
    if (level === 3) return 'Почти уверенно';
    return 'Освоено';
  }

  function topicMatches(topic, group) {
    if (!searchQuery) return true;
    const haystack = `${topic.title} ${group.title}`.toLocaleLowerCase('ru');
    return haystack.includes(searchQuery);
  }

  function filterMatches(id) {
    const status = statusOf(id);
    if (activeFilter === 'all') return true;
    return status === activeFilter;
  }

  function svgEl(name, attrs = {}) {
    const element = document.createElementNS(SVG_NS, name);
    Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
    return element;
  }

  function renderMap() {
    map.querySelectorAll('[data-generated="true"]').forEach(node => node.remove());

    DATA.groups.forEach((group, groupIndex) => {
      const sectorStart = groupIndex * sectorSize + sectorGap / 2;
      const sectorEnd = (groupIndex + 1) * sectorSize - sectorGap / 2;

      const guideInner = innerRadius - 12;
      const guideOuter = outerRadius + 2;
      const groupArc = svgEl('path', {
        d: arcPath(guideInner, guideOuter, sectorStart, sectorEnd),
        class: 'radial-group-arc',
        opacity: '0.035',
        'data-generated': 'true',
        'aria-hidden': 'true'
      });
      map.appendChild(groupArc);

      group.items.forEach((topic, itemIndex) => {
        const ringInner = innerRadius + itemIndex * ringWidth;
        const ringOuter = Math.min(outerRadius, ringInner + ringWidth - ringGap);
        const path = svgEl('path', {
          d: arcPath(ringInner, ringOuter, sectorStart, sectorEnd),
          class: 'radial-cell',
          tabindex: '0',
          role: 'button',
          'data-generated': 'true',
          'data-id': topic.id,
          'data-level': String(levelOf(topic.id)),
          'data-status': statusOf(topic.id),
          'aria-label': `${topic.title}. Раздел: ${group.title}. ${statusLabel(topic.id)}. Уровень ${levelOf(topic.id)} из 4.`
        });
        const title = svgEl('title');
        title.textContent = `${topic.title} · ${group.title} · ${statusLabel(topic.id)}`;
        path.appendChild(title);
        path.addEventListener('mouseenter', event => showTooltip(topic.id, event.clientX, event.clientY));
        path.addEventListener('mousemove', event => positionTooltip(event.clientX, event.clientY));
        path.addEventListener('mouseleave', hideTooltip);
        path.addEventListener('focus', () => showTooltipForElement(topic.id, path));
        path.addEventListener('blur', hideTooltip);
        path.addEventListener('click', () => openTopic(topic.id));
        path.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openTopic(topic.id);
          }
        });
        map.appendChild(path);
      });

      const labelPos = polar(outerRadius + 13, groupIndex * sectorSize + sectorSize / 2);
      const label = svgEl('text', {
        x: labelPos.x.toFixed(2), y: labelPos.y.toFixed(2),
        class: 'radial-group-label', 'data-generated': 'true', 'aria-hidden': 'true'
      });
      label.textContent = group.code;
      map.appendChild(label);
    });

    applyVisualFilters();
  }

  function renderIndex() {
    index.innerHTML = '';
    DATA.groups.forEach(group => {
      const details = document.createElement('details');
      details.className = 'topic-group';
      const summary = document.createElement('summary');
      const covered = group.items.filter(item => levelOf(item.id) > 0).length;
      summary.innerHTML = `<span>${group.code} · ${escapeHTML(group.title)}</span><small>${covered} / ${group.items.length}</small>`;
      details.appendChild(summary);

      const list = document.createElement('div');
      list.className = 'topic-list';
      group.items.forEach(topic => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'topic-row';
        button.dataset.id = topic.id;
        button.dataset.status = statusOf(topic.id);
        button.dataset.level = String(levelOf(topic.id));
        button.innerHTML = `<span class="topic-dot" aria-hidden="true"></span><span>${escapeHTML(topic.title)}</span><span class="topic-level">${levelOf(topic.id)}/4</span>`;
        button.addEventListener('click', () => openTopic(topic.id));
        list.appendChild(button);
      });
      details.appendChild(list);
      index.appendChild(details);
    });
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }

  function applyVisualFilters() {
    document.querySelectorAll('.radial-cell').forEach(cell => {
      const id = cell.dataset.id;
      const topic = topicById.get(id);
      const group = groupByTopic.get(id);
      const passesFilter = filterMatches(id);
      const passesSearch = topicMatches(topic, group);
      cell.classList.toggle('is-muted', !passesFilter || !passesSearch);
      cell.classList.toggle('is-search-hit', Boolean(searchQuery) && passesSearch);
      cell.dataset.status = statusOf(id);
      cell.dataset.level = String(levelOf(id));
    });

    document.querySelectorAll('.topic-row').forEach(row => {
      const id = row.dataset.id;
      const topic = topicById.get(id);
      const group = groupByTopic.get(id);
      row.dataset.status = statusOf(id);
      row.dataset.level = String(levelOf(id));
      row.querySelector('.topic-level').textContent = `${levelOf(id)}/4`;
      row.hidden = !(filterMatches(id) && topicMatches(topic, group));
    });
  }

  function tooltipHTML(id) {
    const topic = topicById.get(id);
    const group = groupByTopic.get(id);
    return `<b>${escapeHTML(topic.title)}</b><span>${escapeHTML(group.title)}</span><span class="tooltip-status">${escapeHTML(statusLabel(id))} · ${levelOf(id)}/4</span>`;
  }

  function showTooltip(id, x, y) {
    tooltip.innerHTML = tooltipHTML(id);
    tooltip.hidden = false;
    positionTooltip(x, y);
  }

  function showTooltipForElement(id, element) {
    const rect = element.getBoundingClientRect();
    showTooltip(id, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  function positionTooltip(x, y) {
    if (tooltip.hidden) return;
    const margin = 12;
    const rect = tooltip.getBoundingClientRect();
    let left = x + 16;
    let top = y + 16;
    if (left + rect.width > window.innerWidth - margin) left = x - rect.width - 16;
    if (top + rect.height > window.innerHeight - margin) top = y - rect.height - 16;
    left = Math.max(margin, Math.min(left, window.innerWidth - rect.width - margin));
    top = Math.max(margin, Math.min(top, window.innerHeight - rect.height - margin));
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  function hideTooltip() {
    tooltip.hidden = true;
  }

  const levelLabels = ['Ещё впереди','Нужна помощь','Пройдена с опорой','Почти уверенно','Освоено'];

  function openTopic(id) {
    activeTopicId = id;
    const topic = topicById.get(id);
    const group = groupByTopic.get(id);
    document.getElementById('dialogGroup').textContent = `${group.code} · ${group.title}`;
    document.getElementById('dialogTitle').textContent = topic.title;
    document.getElementById('dialogLevel').textContent = `${levelOf(id)} / 4 · ${levelLabels[levelOf(id)]}`;
    document.getElementById('dialogDescription').textContent = `${group.description} Тема: ${topic.title}.`;
    document.getElementById('dialogDiagnostic').textContent = `${respectfulDiagnosticLead(group.diagnosticLead)} «${topic.title}».`;

    const history = document.getElementById('dialogHistory');
    const material = document.getElementById('dialogMaterial');
    const evidence = DATA.evidence?.[topic.id] || [];
    const topicMaterial = DATA.topicMaterials?.[topic.id] || null;
    if (evidence.length) {
      history.textContent = evidence.join(' ');
    } else {
      history.textContent = 'По этой теме пока нет результатов диагностики.';
    }
    if (topicMaterial && topicMaterial.href) {
      material.href = topicMaterial.href;
      material.textContent = topicMaterial.label || 'Открыть материал →';
      material.hidden = false;
    } else {
      material.hidden = true;
      material.removeAttribute('href');
    }

    renderLevelButtons();
    updateRepeatButton();
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  function renderLevelButtons() {
    const holder = document.getElementById('levelButtons');
    holder.innerHTML = '';
    for (let level = 0; level <= 4; level += 1) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'level-btn';
      button.textContent = String(level);
      button.title = levelLabels[level];
      button.setAttribute('aria-label', `Уровень ${level}: ${levelLabels[level]}`);
      button.setAttribute('aria-pressed', String(levelOf(activeTopicId) === level));
      button.addEventListener('click', () => setLevel(activeTopicId, level));
      holder.appendChild(button);
    }
  }

  function setLevel(id, level) {
    levels[id] = level;
    writeJSON(LEVELS_KEY, levels);
    refresh();
    if (activeTopicId === id) {
      document.getElementById('dialogLevel').textContent = `${levelOf(id)} / 4 · ${levelLabels[levelOf(id)]}`;
      renderLevelButtons();
    }
  }

  function updateRepeatButton() {
    const button = document.getElementById('repeatToggle');
    const repeated = repeatTopics.has(activeTopicId);
    button.textContent = repeated ? 'Убрать из повторения' : 'Добавить в повторение';
    button.classList.toggle('is-active', repeated);
  }

  document.getElementById('repeatToggle').addEventListener('click', () => {
    if (!activeTopicId) return;
    if (repeatTopics.has(activeTopicId)) repeatTopics.delete(activeTopicId);
    else repeatTopics.add(activeTopicId);
    writeJSON(REPEAT_KEY, [...repeatTopics]);
    refresh();
    updateRepeatButton();
  });

  function updateStats() {
    const covered = allTopics.filter(topic => levelOf(topic.id) > 0).length;
    const repeated = allTopics.filter(topic => repeatTopics.has(topic.id)).length;
    const touched = allTopics.filter(topic => levelOf(topic.id) > 0 || repeatTopics.has(topic.id)).length;
    const coverage = allTopics.length ? Math.round(touched / allTopics.length * 100) : 0;
    document.getElementById('statCovered').textContent = String(covered);
    document.getElementById('statCoverage').textContent = `${coverage}%`;
    document.getElementById('statRepeat').textContent = String(repeated);
    document.getElementById('statTotal').textContent = String(allTopics.length);
    document.getElementById('centerCoverage').textContent = `${coverage}%`;
    document.getElementById('centerCount').textContent = `${allTopics.length} тем`;
  }

  function pickNextFocus() {
    const repeated = allTopics.find(topic => repeatTopics.has(topic.id));
    if (repeated) return { topic: repeated, reason: 'Эту тему стоит повторить в первую очередь. Вернитесь к ней и выполните короткую контрольную диагностику.' };

    const ahead = allTopics.find(topic => levelOf(topic.id) === 0);
    if (ahead) return { topic: ahead, reason: 'Эта тема ещё не изучалась. Проверьте базовое понимание и определите текущий уровень освоения.' };

    const low = allTopics.find(topic => levelOf(topic.id) <= 2);
    if (low) return { topic: low, reason: 'Тема уже встречалась на занятиях. Полезно закрепить её с дополнительной опорой или выполнить контрольную диагностику.' };

    const check = allTopics.find(topic => levelOf(topic.id) === 3);
    if (check) return { topic: check, reason: 'Тема почти освоена. Короткая самостоятельная проверка поможет подтвердить результат.' };

    return { topic: allTopics[0], reason: 'Все темы отмечены как хорошо освоенные. Используйте смешанную контрольную диагностику для поддержания результата.' };
  }

  function renderFocus() {
    const focus = pickNextFocus();
    const topic = focus.topic;
    const group = groupByTopic.get(topic.id);
    const card = document.getElementById('focusCard');
    const topicMaterial = DATA.topicMaterials?.[topic.id] || null;
    const materialLink = topicMaterial?.href ? `<a class="btn" href="${escapeHTML(topicMaterial.href)}">${escapeHTML(topicMaterial.label || 'Материал')}</a>` : '';
    card.innerHTML = `
      <div>
        <p class="eyebrow">${escapeHTML(group.code)} · ${escapeHTML(group.title)}</p>
        <h3>${escapeHTML(topic.title)}</h3>
        <p>${escapeHTML(focus.reason)}</p>
        <div class="focus-meta"><span class="chip">${escapeHTML(statusLabel(topic.id))}</span><span class="chip">уровень ${levelOf(topic.id)}/4</span></div>
      </div>
      <div class="focus-actions"><button class="btn primary" type="button" data-focus-id="${escapeHTML(topic.id)}">Открыть тему</button>${materialLink}</div>`;
    card.querySelector('[data-focus-id]').addEventListener('click', () => openTopic(topic.id));
    document.getElementById('heroNext').textContent = `${group.title}: ${topic.title}. ${focus.reason}`;
  }

  function refresh() {
    renderMap();
    renderIndex();
    updateStats();
    renderFocus();
  }

  document.querySelectorAll('.filter').forEach(button => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.filter;
      document.querySelectorAll('.filter').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      applyVisualFilters();
    });
  });

  search.addEventListener('input', () => {
    searchQuery = search.value.trim().toLocaleLowerCase('ru');
    applyVisualFilters();
    if (searchQuery) {
      document.querySelectorAll('.topic-group').forEach(details => { details.open = true; });
    }
  });

  function preferredTheme() {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch (_) {}
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    document.body.dataset.theme = theme;
    document.getElementById('themeToggle').setAttribute('aria-label', `Переключить тему. Сейчас: ${theme === 'dark' ? 'тёмная' : 'светлая'}`);
    try { localStorage.setItem(THEME_KEY, theme); } catch (_) {}
  }

  document.getElementById('themeToggle').addEventListener('click', () => {
    applyTheme(document.body.dataset.theme === 'dark' ? 'light' : 'dark');
  });

  applyTheme(preferredTheme());
  refresh();
})();
