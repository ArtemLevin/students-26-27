(() => {
  "use strict";

  const data = window.COMPETENCY_MAP_DATA;
  if (!data || !Array.isArray(data.groups)) {
    console.error("COMPETENCY_MAP_DATA is missing");
    return;
  }

  const PROGRAM_KEY = "math6-mathvertical";
  const KEYS = {
    levels: `${data.student}-${PROGRAM_KEY}-competency-map`,
    repeat: `${data.student}-${PROGRAM_KEY}-repeat`,
    theme: `${data.student}-${PROGRAM_KEY}-theme`
  };

  const levelLabels = [
    "0 / 4 · Ещё впереди",
    "1 / 4 · Нужна помощь",
    "2 / 4 · Пройдена с опорой",
    "3 / 4 · Почти уверенно",
    "4 / 4 · Освоено"
  ];

  const allItems = data.groups.flatMap(group =>
    group.items.map(item => ({ ...item, groupId: group.id, groupTitle: group.title, groupNumber: group.number }))
  );
  const byId = new Map(allItems.map(item => [item.id, item]));
  const baseLevels = Object.fromEntries(allItems.map(item => [item.id, Number(item.baseLevel || 0)]));
  const baseRepeat = new Set(allItems.filter(item => item.baseRepeat).map(item => item.id));

  let levels = { ...baseLevels, ...readObject(KEYS.levels) };
  let repeatTopics = new Set([...baseRepeat, ...readArray(KEYS.repeat)]);
  let activeFilter = "all";
  let searchQuery = "";
  let activeTopicId = null;

  const svg = document.getElementById("radialMap");
  const tooltip = document.getElementById("mapTooltip");
  const catalog = document.getElementById("topicCatalog");
  const dialog = document.getElementById("topicDialog");

  function readObject(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "{}");
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function readArray(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function saveState() {
    localStorage.setItem(KEYS.levels, JSON.stringify(levels));
    localStorage.setItem(KEYS.repeat, JSON.stringify([...repeatTopics]));
  }

  function stateFor(id) {
    if (repeatTopics.has(id)) return "repeat";
    return Number(levels[id] || 0) > 0 ? "covered" : "future";
  }

  function statusText(id) {
    if (repeatTopics.has(id)) return "Пора повторить";
    return Number(levels[id] || 0) > 0 ? "Пройдено" : "Ещё впереди";
  }

  function filterMatches(id) {
    return activeFilter === "all" || stateFor(id) === activeFilter;
  }

  function searchMatches(item) {
    if (!searchQuery) return true;
    const haystack = `${item.title} ${item.groupTitle}`.toLocaleLowerCase("ru");
    return haystack.includes(searchQuery);
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
      "Z"
    ].join(" ");
  }

  function svgEl(name, attrs = {}) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", name);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
    return el;
  }

  function buildMap() {
    while (svg.lastChild && !["title", "desc"].includes(svg.lastChild.tagName?.toLowerCase())) {
      svg.removeChild(svg.lastChild);
    }

    const innerRadius = 148;
    const outerRadius = 382;
    const maxRings = Math.max(...data.groups.map(group => group.items.length));
    const ringWidth = (outerRadius - innerRadius) / maxRings;
    const ringGap = 1.5;
    const sectorSize = 360 / data.groups.length;
    const angularGap = 0.8;

    const guide = svgEl("circle", { cx: 400, cy: 400, r: outerRadius, class: "group-guide" });
    svg.appendChild(guide);

    data.groups.forEach((group, groupIndex) => {
      const sectorStart = groupIndex * sectorSize + angularGap / 2;
      const sectorEnd = (groupIndex + 1) * sectorSize - angularGap / 2;

      group.items.forEach((item, itemIndex) => {
        const ringInner = innerRadius + itemIndex * ringWidth;
        const ringOuter = ringInner + ringWidth - ringGap;
        const path = svgEl("path", {
          d: arcPath(ringInner, ringOuter, sectorStart, sectorEnd),
          class: "radial-cell",
          tabindex: "0",
          role: "button",
          "data-id": item.id,
          "aria-label": `${item.title}. ${group.title}. ${statusText(item.id)}`
        });
        const title = svgEl("title");
        title.textContent = `${item.title} · ${group.title} · ${statusText(item.id)}`;
        path.appendChild(title);
        bindCell(path, { ...item, groupTitle: group.title, groupNumber: group.number });
        svg.appendChild(path);
      });

      const labelAngle = groupIndex * sectorSize + sectorSize / 2;
      const labelPoint = polar(391, labelAngle);
      const label = svgEl("text", {
        x: labelPoint.x,
        y: labelPoint.y,
        class: "group-label"
      });
      label.textContent = group.number;
      svg.appendChild(label);
    });

    const center = svgEl("circle", { cx: 400, cy: 400, r: innerRadius - 7, class: "center-ring" });
    svg.appendChild(center);

    updateVisualState();
  }

  function bindCell(cell, item) {
    cell.addEventListener("mouseenter", event => showTooltip(item, event.clientX, event.clientY));
    cell.addEventListener("mousemove", event => positionTooltip(event.clientX, event.clientY));
    cell.addEventListener("mouseleave", hideTooltip);
    cell.addEventListener("focus", () => {
      const rect = cell.getBoundingClientRect();
      showTooltip(item, rect.left + rect.width / 2, rect.top + rect.height / 2);
    });
    cell.addEventListener("blur", hideTooltip);
    cell.addEventListener("click", () => openTopic(item.id));
    cell.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openTopic(item.id);
      }
    });
  }

  function showTooltip(item, x, y) {
    tooltip.replaceChildren();
    const title = document.createElement("strong");
    title.textContent = item.title;
    const group = document.createElement("span");
    group.textContent = item.groupTitle;
    const status = document.createElement("small");
    status.textContent = statusText(item.id);
    tooltip.append(title, group, status);
    tooltip.hidden = false;
    positionTooltip(x, y);
  }

  function positionTooltip(x, y) {
    if (tooltip.hidden) return;
    const pad = 12;
    const offset = 16;
    const rect = tooltip.getBoundingClientRect();
    let left = x + offset;
    let top = y + offset;
    if (left + rect.width > window.innerWidth - pad) left = x - rect.width - offset;
    if (top + rect.height > window.innerHeight - pad) top = y - rect.height - offset;
    tooltip.style.left = `${Math.max(pad, left)}px`;
    tooltip.style.top = `${Math.max(pad, top)}px`;
  }

  function hideTooltip() {
    tooltip.hidden = true;
  }

  function buildCatalog() {
    catalog.replaceChildren();

    data.groups.forEach(group => {
      const details = document.createElement("details");
      details.className = "topic-group";
      if (group.items.some(item => Number(baseLevels[item.id] || 0) > 0)) details.open = true;

      const summary = document.createElement("summary");
      const label = document.createElement("span");
      label.textContent = `${group.number} · ${group.title}`;
      const count = document.createElement("span");
      count.className = "group-count";
      count.dataset.groupCount = group.id;
      summary.append(label, count);
      details.appendChild(summary);

      const list = document.createElement("div");
      list.className = "topic-list";
      group.items.forEach(item => {
        const row = document.createElement("button");
        row.type = "button";
        row.className = "topic-row";
        row.dataset.id = item.id;

        const dot = document.createElement("i");
        dot.className = "topic-dot";
        const text = document.createElement("span");
        text.textContent = item.title;
        const level = document.createElement("span");
        level.className = "topic-level";
        level.dataset.levelFor = item.id;

        row.append(dot, text, level);
        row.addEventListener("click", () => openTopic(item.id));
        list.appendChild(row);
      });

      details.appendChild(list);
      catalog.appendChild(details);
    });
    updateVisualState();
  }

  function updateVisualState() {
    let visibleMatches = 0;

    document.querySelectorAll(".radial-cell").forEach(cell => {
      const item = byId.get(cell.dataset.id);
      const level = Number(levels[item.id] || 0);
      const state = stateFor(item.id);
      const matchesFilter = filterMatches(item.id);
      const matchesSearch = searchMatches(item);

      cell.dataset.state = state;
      cell.dataset.level = String(level);
      cell.classList.toggle("is-muted", !matchesFilter || !matchesSearch);
      cell.classList.toggle("is-search-match", Boolean(searchQuery) && matchesSearch);
      cell.setAttribute("aria-label", `${item.title}. ${item.groupTitle}. ${statusText(item.id)}. Уровень ${level} из 4`);
      const title = cell.querySelector("title");
      if (title) title.textContent = `${item.title} · ${item.groupTitle} · ${statusText(item.id)}`;
      if (matchesFilter && matchesSearch) visibleMatches += 1;
    });

    document.querySelectorAll(".topic-row").forEach(row => {
      const item = byId.get(row.dataset.id);
      const matchesFilter = filterMatches(item.id);
      const matchesSearch = searchMatches(item);
      row.dataset.state = stateFor(item.id);
      row.classList.toggle("is-muted", !matchesFilter || !matchesSearch);
      row.classList.toggle("is-search-match", Boolean(searchQuery) && matchesSearch);
      const levelNode = row.querySelector("[data-level-for]");
      if (levelNode) levelNode.textContent = repeatTopics.has(item.id) ? "повтор" : `${Number(levels[item.id] || 0)}/4`;
    });

    data.groups.forEach(group => {
      const node = document.querySelector(`[data-group-count="${group.id}"]`);
      if (!node) return;
      const touched = group.items.filter(item => Number(levels[item.id] || 0) > 0 || repeatTopics.has(item.id)).length;
      node.textContent = `${touched} / ${group.items.length}`;
    });

    document.getElementById("catalogMatchCount").textContent =
      activeFilter === "all" && !searchQuery ? "" : `${visibleMatches} совп.`;

    updateStats();
    updateNextFocus();
    if (activeTopicId && dialog.open) populateDialog(activeTopicId);
  }

  function updateStats() {
    const covered = allItems.filter(item => Number(levels[item.id] || 0) > 0).length;
    const repeated = repeatTopics.size;
    const touched = allItems.filter(item => Number(levels[item.id] || 0) > 0 || repeatTopics.has(item.id)).length;
    const coverage = Math.round(touched / allItems.length * 100);

    document.getElementById("coveredCount").textContent = covered;
    document.getElementById("coveragePercentTop").textContent = `${coverage}%`;
    document.getElementById("repeatCount").textContent = repeated;
    document.getElementById("totalCount").textContent = allItems.length;
    document.getElementById("coveragePercent").textContent = `${coverage}%`;
    document.getElementById("centerTopicCount").textContent = `${allItems.length} тем`;
  }

  function openTopic(id) {
    activeTopicId = id;
    populateDialog(id);
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function populateDialog(id) {
    const item = byId.get(id);
    if (!item) return;
    const level = Number(levels[id] || 0);

    document.getElementById("dialogGroup").textContent = `${item.groupNumber} · ${item.groupTitle}`;
    document.getElementById("dialogTitle").textContent = item.title;
    document.getElementById("dialogLevel").textContent = repeatTopics.has(id)
      ? `${levelLabels[level]} · Пора повторить`
      : levelLabels[level];
    document.getElementById("dialogDescription").textContent = item.description;
    document.getElementById("dialogDiagnostic").textContent = item.diagnostic;

    const history = document.getElementById("dialogHistory");
    history.replaceChildren();
    if (item.evidence?.length) {
      item.evidence.forEach(entry => {
        const block = document.createElement("div");
        block.className = "history-entry";
        const text = document.createElement("span");
        text.textContent = `${entry.date}: ${entry.text} `;
        const link = document.createElement("a");
        link.href = entry.href;
        link.textContent = "Материал занятия";
        block.append(text, link);
        history.appendChild(block);
      });
    } else {
      const block = document.createElement("div");
      block.className = "history-entry";
      block.textContent = "Диагностических данных пока нет.";
      history.appendChild(block);
    }

    document.querySelectorAll("#levelButtons button").forEach(button => {
      const isActive = Number(button.dataset.level) === level;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    const repeatButton = document.getElementById("toggleRepeat");
    repeatButton.textContent = repeatTopics.has(id) ? "Убрать из повторения" : "Добавить в повторение";

    const material = document.getElementById("dialogMaterial");
    if (item.evidence?.[0]?.href) {
      material.href = item.evidence[0].href;
      material.hidden = false;
    } else {
      material.hidden = true;
    }
  }

  function updateNextFocus() {
    let item = allItems.find(candidate => repeatTopics.has(candidate.id));
    let reason = "Сначала закрепить тему, отмеченную для повторения.";

    if (!item) {
      item = allItems.find(candidate => Number(levels[candidate.id] || 0) === 0);
      reason = "Следующая ещё не затронутая тема по порядку каталога.";
    }

    if (!item) {
      item = allItems
        .filter(candidate => Number(levels[candidate.id] || 0) < 3)
        .sort((a, b) => Number(levels[a.id] || 0) - Number(levels[b.id] || 0))[0];
      reason = "Тема уже встречалась, требуется контрольная диагностика для повышения уверенности.";
    }

    const focus = document.getElementById("nextFocus");
    focus.replaceChildren();
    if (!item) {
      focus.textContent = "Все темы имеют высокий диагностический уровень.";
      return;
    }

    const meta = document.createElement("div");
    meta.className = "focus-meta";
    meta.textContent = item.groupTitle;
    const title = document.createElement("h3");
    title.textContent = item.title;
    const note = document.createElement("p");
    note.textContent = reason;
    const diagnostic = document.createElement("p");
    diagnostic.textContent = `Мини-диагностика: ${item.diagnostic}`;
    focus.append(meta, title, note, diagnostic);

    if (item.evidence?.[0]?.href) {
      const link = document.createElement("a");
      link.href = item.evidence[0].href;
      link.textContent = "Связанный учебный материал";
      focus.appendChild(link);
    } else {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "reset-button";
      button.textContent = "Открыть карточку темы";
      button.addEventListener("click", () => openTopic(item.id));
      focus.appendChild(button);
    }
  }

  document.querySelectorAll(".filter").forEach(button => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      document.querySelectorAll(".filter").forEach(peer => {
        const active = peer === button;
        peer.classList.toggle("is-active", active);
        peer.setAttribute("aria-pressed", String(active));
      });
      updateVisualState();
    });
  });

  document.getElementById("topicSearch").addEventListener("input", event => {
    searchQuery = event.target.value.trim().toLocaleLowerCase("ru");
    updateVisualState();
  });

  document.getElementById("levelButtons").addEventListener("click", event => {
    const button = event.target.closest("button[data-level]");
    if (!button || !activeTopicId) return;
    levels[activeTopicId] = Number(button.dataset.level);
    saveState();
    updateVisualState();
  });

  document.getElementById("toggleRepeat").addEventListener("click", () => {
    if (!activeTopicId) return;
    if (repeatTopics.has(activeTopicId)) repeatTopics.delete(activeTopicId);
    else repeatTopics.add(activeTopicId);
    saveState();
    updateVisualState();
  });

  document.getElementById("restoreBaseline").addEventListener("click", () => {
    const confirmed = window.confirm("Вернуть статусы, подтверждённые реальными материалами ученика? Ручные уровни и ручной список повторения будут очищены.");
    if (!confirmed) return;
    localStorage.removeItem(KEYS.levels);
    localStorage.removeItem(KEYS.repeat);
    levels = { ...baseLevels };
    repeatTopics = new Set(baseRepeat);
    updateVisualState();
  });

  document.getElementById("dialogClose").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });

  function applyTheme(theme) {
    document.body.dataset.theme = theme;
    localStorage.setItem(KEYS.theme, theme);
  }

  function toggleTheme() {
    applyTheme(document.body.dataset.theme === "dark" ? "light" : "dark");
  }

  const storedTheme = localStorage.getItem(KEYS.theme);
  const initialTheme = storedTheme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  applyTheme(initialTheme);
  document.getElementById("themeToggle").addEventListener("click", toggleTheme);
  document.getElementById("mobileThemeToggle").addEventListener("click", toggleTheme);

  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("sidebarBackdrop");
  const menuButton = document.getElementById("menuButton");
  function setMenu(open) {
    sidebar.classList.toggle("is-open", open);
    backdrop.hidden = !open;
    menuButton.setAttribute("aria-expanded", String(open));
  }
  menuButton.addEventListener("click", () => setMenu(!sidebar.classList.contains("is-open")));
  document.getElementById("sidebarClose").addEventListener("click", () => setMenu(false));
  backdrop.addEventListener("click", () => setMenu(false));
  sidebar.querySelectorAll("a").forEach(link => link.addEventListener("click", () => setMenu(false)));

  buildCatalog();
  buildMap();
})();
