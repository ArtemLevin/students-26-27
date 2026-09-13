(() => {
  "use strict";

  const DATA = window.COMPETENCY_MAP_DATA;
  if (!DATA || !Array.isArray(DATA.groups)) {
    console.error("Competency map data is missing.");
    return;
  }

  const LEVEL_LABELS = [
    "Ещё впереди",
    "Нужна помощь",
    "Пройдена с опорой",
    "Почти уверенно",
    "Освоено"
  ];

  const STORAGE = {
    levels: `${DATA.storagePrefix}-competency-map`,
    repeat: `${DATA.storagePrefix}-repeat`,
    theme: `${DATA.storagePrefix}-theme`
  };

  const els = {
    svg: document.getElementById("competencyMap"),
    catalog: document.getElementById("catalog"),
    search: document.getElementById("searchInput"),
    tooltip: document.getElementById("tooltip"),
    tooltipTitle: document.getElementById("tooltipTitle"),
    tooltipGroup: document.getElementById("tooltipGroup"),
    tooltipStatus: document.getElementById("tooltipStatus"),
    coveredCount: document.getElementById("coveredCount"),
    coveragePercent: document.getElementById("coveragePercent"),
    repeatCount: document.getElementById("repeatCount"),
    totalCount: document.getElementById("totalCount"),
    centerPercent: document.getElementById("centerPercent"),
    centerTotal: document.getElementById("centerTotal"),
    catalogCounter: document.getElementById("catalogCounter"),
    focusCard: document.getElementById("focusCard"),
    materialsGrid: document.getElementById("materialsGrid"),
    restoreButton: document.getElementById("restoreButton"),
    themeToggle: document.getElementById("themeToggle"),
    dialog: document.getElementById("topicDialog"),
    dialogClose: document.getElementById("dialogClose"),
    dialogGroup: document.getElementById("dialogGroup"),
    dialogTitle: document.getElementById("dialogTitle"),
    dialogLevel: document.getElementById("dialogLevel"),
    dialogExam: document.getElementById("dialogExam"),
    dialogDescription: document.getElementById("dialogDescription"),
    dialogDiagnostic: document.getElementById("dialogDiagnostic"),
    dialogHistory: document.getElementById("dialogHistory"),
    levelPicker: document.getElementById("levelPicker"),
    repeatToggle: document.getElementById("repeatToggle"),
    dialogMaterial: document.getElementById("dialogMaterial")
  };

  const allItems = DATA.groups.flatMap((group, groupIndex) =>
    group.items.map((item, itemIndex) => ({
      ...item,
      groupId: group.id,
      groupTitle: group.title,
      groupShort: group.short,
      groupIndex,
      itemIndex
    }))
  );
  const itemById = new Map(allItems.map(item => [item.id, item]));
  const groupById = new Map(DATA.groups.map(group => [group.id, group]));

  function validateData() {
    const ids = new Set();
    for (const item of allItems) {
      if (!item.id || ids.has(item.id)) {
        throw new Error(`Некорректный или повторяющийся ID: ${item.id}`);
      }
      ids.add(item.id);
    }
    return { groups: DATA.groups.length, items: allItems.length };
  }

  const validation = validateData();
  console.info(`[competency-map] catalog validated: ${validation.groups} sectors, ${validation.items} cells`);

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {
      // The page remains usable when storage is restricted.
    }
  }

  const baselineLevels = Object.fromEntries(allItems.map(item => [item.id, clampLevel(item.level)]));
  const savedLevels = readJSON(STORAGE.levels, {});
  const savedRepeat = readJSON(STORAGE.repeat, DATA.repeatTopics || []);

  const state = {
    levels: { ...baselineLevels, ...(savedLevels && typeof savedLevels === "object" ? savedLevels : {}) },
    repeat: new Set(Array.isArray(savedRepeat) ? savedRepeat.filter(id => itemById.has(id)) : []),
    filter: "all",
    query: "",
    activeId: null,
    lastDialogTrigger: null
  };

  function clampLevel(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(0, Math.min(4, Math.round(number)));
  }

  function saveState() {
    writeJSON(STORAGE.levels, state.levels);
    writeJSON(STORAGE.repeat, [...state.repeat]);
  }

  function levelOf(item) {
    return clampLevel(state.levels[item.id] ?? item.level ?? 0);
  }

  function statusOf(item) {
    if (state.repeat.has(item.id)) return "repeat";
    return levelOf(item) > 0 ? "covered" : "future";
  }

  function statusLabel(item) {
    if (state.repeat.has(item.id)) return "Пора повторить";
    const level = levelOf(item);
    return level > 0 ? `${LEVEL_LABELS[level]} · уровень ${level}/4` : "Ещё впереди";
  }

  function filterMatches(item) {
    const status = statusOf(item);
    if (state.filter === "covered") return levelOf(item) > 0;
    if (state.filter === "repeat") return status === "repeat";
    if (state.filter === "future") return levelOf(item) === 0 && status !== "repeat";
    return true;
  }

  function searchMatches(item) {
    if (!state.query) return true;
    const haystack = `${item.title} ${item.groupTitle}`.toLocaleLowerCase("ru");
    return haystack.includes(state.query);
  }

  function computeSummary() {
    const covered = allItems.filter(item => levelOf(item) > 0).length;
    const repeat = state.repeat.size;
    const touched = allItems.filter(item => levelOf(item) > 0 || state.repeat.has(item.id)).length;
    return {
      total: allItems.length,
      covered,
      repeat,
      touched,
      coverage: allItems.length ? Math.round((touched / allItems.length) * 100) : 0
    };
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
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
      `M ${outerStart.x.toFixed(3)} ${outerStart.y.toFixed(3)}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x.toFixed(3)} ${outerEnd.y.toFixed(3)}`,
      `L ${innerEnd.x.toFixed(3)} ${innerEnd.y.toFixed(3)}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x.toFixed(3)} ${innerStart.y.toFixed(3)}`,
      "Z"
    ].join(" ");
  }

  function renderMap() {
    const sectorSize = 360 / DATA.groups.length;
    const innerRadius = 148;
    const outerRadius = 382;
    const maxRings = Math.max(...DATA.groups.map(group => group.items.length));
    const ringWidth = (outerRadius - innerRadius) / maxRings;
    const ringGap = Math.max(1.15, ringWidth * 0.12);
    const sectorGap = Math.min(1.15, sectorSize * 0.075);

    const parts = [
      `<title id="mapSvgTitle">Круговая тепловая карта программы ЕГЭ по профильной математике</title>`,
      `<desc id="mapSvgDesc">${DATA.groups.length} тематических секторов, ${allItems.length} конкретных навыка. Каждая ячейка доступна с клавиатуры.</desc>`
    ];

    DATA.groups.forEach((group, groupIndex) => {
      const startAngle = groupIndex * sectorSize + sectorGap;
      const endAngle = (groupIndex + 1) * sectorSize - sectorGap;
      const labelAngle = (startAngle + endAngle) / 2;

      parts.push(
        `<path class="radial-group-arc" d="${arcPath(116, 140, startAngle, endAngle)}" aria-hidden="true"></path>`
      );

      group.items.forEach((rawItem, itemIndex) => {
        const item = itemById.get(rawItem.id);
        const inner = innerRadius + itemIndex * ringWidth;
        const outer = inner + ringWidth - ringGap;
        const level = levelOf(item);
        const status = statusOf(item);
        const filterMuted = !filterMatches(item);
        const queryMatched = searchMatches(item);
        const searchMuted = Boolean(state.query) && !queryMatched;
        const classes = [
          "radial-cell",
          filterMuted ? "filter-muted" : "",
          searchMuted ? "search-muted" : "",
          state.query && queryMatched ? "search-match" : ""
        ].filter(Boolean).join(" ");
        const title = `${item.title} · ${group.title} · ${statusLabel(item)}`;

        parts.push(
          `<path class="${classes}" data-id="${escapeHTML(item.id)}" data-status="${status}" data-level="${level}" ` +
          `d="${arcPath(inner, outer, startAngle, endAngle)}" tabindex="0" role="button" ` +
          `aria-label="${escapeHTML(title)}"><title>${escapeHTML(title)}</title></path>`
        );
      });

      const labelPoint = polar(392, labelAngle);
      const groupTouched = group.items.filter(item => {
        const full = itemById.get(item.id);
        return levelOf(full) > 0 || state.repeat.has(full.id);
      }).length;
      const groupTitle = `${group.short} · ${group.title} · ${groupTouched} из ${group.items.length} тем затронуто`;
      parts.push(
        `<g class="radial-sector-label" data-group="${escapeHTML(group.id)}" tabindex="0" role="button" aria-label="${escapeHTML(groupTitle)}">` +
        `<title>${escapeHTML(groupTitle)}</title>` +
        `<text class="radial-group-label" x="${labelPoint.x.toFixed(2)}" y="${labelPoint.y.toFixed(2)}">${escapeHTML(group.short)}</text>` +
        `</g>`
      );
    });

    els.svg.innerHTML = parts.join("");
    bindMapInteractions();
  }

  function renderCatalog() {
    els.catalog.innerHTML = DATA.groups.map(group => {
      const fullItems = group.items.map(item => itemById.get(item.id));
      const touched = fullItems.filter(item => levelOf(item) > 0 || state.repeat.has(item.id)).length;
      const rows = fullItems.map(item => {
        const level = levelOf(item);
        const status = statusOf(item);
        const filterMuted = !filterMatches(item);
        const queryMatched = searchMatches(item);
        const searchMuted = Boolean(state.query) && !queryMatched;
        const classes = [
          "topic-button",
          filterMuted ? "filter-muted" : "",
          searchMuted ? "search-muted" : "",
          state.query && queryMatched ? "search-match" : ""
        ].filter(Boolean).join(" ");
        return `<button type="button" class="${classes}" data-id="${escapeHTML(item.id)}" data-status="${status}" data-level="${level}">` +
          `<i class="topic-dot" aria-hidden="true"></i>` +
          `<span>${escapeHTML(item.title)}</span>` +
          `<em>${state.repeat.has(item.id) ? "↻ " : ""}${level}/4</em>` +
          `</button>`;
      }).join("");

      const shouldOpen = Boolean(state.query) && fullItems.some(searchMatches);
      return `<details data-group-details="${escapeHTML(group.id)}" ${shouldOpen ? "open" : ""}>` +
        `<summary>` +
        `<span class="catalog-summary-title"><b>${escapeHTML(group.short)}</b><span>${escapeHTML(group.title)}</span></span>` +
        `<small>${touched} / ${group.items.length}</small>` +
        `</summary><div class="topic-list">${rows}</div></details>`;
    }).join("");

    els.catalog.querySelectorAll(".topic-button").forEach(button => {
      button.addEventListener("click", () => openTopic(button.dataset.id, button));
    });

    const visible = allItems.filter(item => filterMatches(item) && searchMatches(item)).length;
    els.catalogCounter.textContent = state.filter === "all" && !state.query
      ? `${allItems.length} тем`
      : `${visible} совпад. / ${allItems.length}`;
  }

  function renderStats() {
    const summary = computeSummary();
    els.coveredCount.textContent = summary.covered;
    els.coveragePercent.textContent = `${summary.coverage}%`;
    els.repeatCount.textContent = summary.repeat;
    els.totalCount.textContent = summary.total;
    els.centerPercent.textContent = `${summary.coverage}%`;
    els.centerTotal.textContent = `${summary.total} тем`;
  }

  function findNextFocus() {
    const repeatItem = allItems.find(item => state.repeat.has(item.id));
    if (repeatItem) {
      return {
        item: repeatItem,
        badge: "Приоритет · повторение",
        text: "Тема находится в очереди повторения. Начните с короткой диагностики, затем закрепите метод на двух разнотипных задачах."
      };
    }

    const seeded = itemById.get(DATA.nextAfterBaseline);
    if (seeded && levelOf(seeded) === 0) {
      return {
        item: seeded,
        badge: "Следующий новый блок",
        text: "После преобразований степеней логично перейти к свойствам логарифма: это продолжает работу с показателями и готовит базу для логарифмических уравнений и неравенств."
      };
    }

    const futureItem = allItems.find(item => levelOf(item) === 0);
    if (futureItem) {
      return {
        item: futureItem,
        badge: "Следующая новая тема",
        text: "Тема ещё впереди. Проведите короткое объяснение метода, затем решите базовый и усложнённый прототип."
      };
    }

    const lowItem = allItems.find(item => levelOf(item) === 1);
    if (lowItem) {
      return {
        item: lowItem,
        badge: "Нужна поддержка",
        text: "Навык уже диагностирован на уровне 1. Полезно восстановить алгоритм и сразу проверить его самостоятельным решением."
      };
    }

    const controlItem = allItems.find(item => levelOf(item) === 2);
    return controlItem ? {
      item: controlItem,
      badge: "Контрольная диагностика",
      text: "Навык проходился с опорой. Следующий шаг — самостоятельная задача без подсказок, чтобы подтвердить уровень 3."
    } : null;
  }

  function renderFocus() {
    const focus = findNextFocus();
    if (!focus) {
      els.focusCard.innerHTML = `<div class="focus-main"><span class="focus-badge">Программа закрыта</span><h3>Все темы имеют высокий уровень</h3><p>Поддерживайте форму смешанными вариантами и интервальным повторением.</p></div>`;
      return;
    }
    const item = focus.item;
    els.focusCard.innerHTML =
      `<div class="focus-main">` +
      `<span class="focus-badge">${escapeHTML(focus.badge)}</span>` +
      `<h3>${escapeHTML(item.title)}</h3>` +
      `<p><b>${escapeHTML(item.groupTitle)}</b> · ${escapeHTML(focus.text)}</p>` +
      `</div>` +
      `<button class="primary-button" type="button" data-focus-id="${escapeHTML(item.id)}">Открыть тему</button>`;
    els.focusCard.querySelector("button")?.addEventListener("click", event => openTopic(item.id, event.currentTarget));
  }

  function renderMaterials() {
    els.materialsGrid.innerHTML = (DATA.materials || []).map(material =>
      `<article>` +
      `<div class="material-date">${escapeHTML(material.date)}</div>` +
      `<div><h3>${escapeHTML(material.title)}</h3><p>Подтверждающий материал текущей карты компетенций.</p></div>` +
      `<div class="material-links">` +
      (material.pdf ? `<a href="${escapeHTML(material.pdf)}" target="_blank">PDF</a>` : "") +
      (material.tex ? `<a href="${escapeHTML(material.tex)}" target="_blank">TeX</a>` : "") +
      `</div></article>`
    ).join("");
  }

  function renderAll() {
    renderMap();
    renderCatalog();
    renderStats();
    renderFocus();
    if (state.activeId && els.dialog.open) populateDialog(state.activeId);
  }

  function bindMapInteractions() {
    els.svg.querySelectorAll(".radial-cell").forEach(cell => {
      const id = cell.dataset.id;
      const item = itemById.get(id);
      if (!item) return;

      cell.addEventListener("mouseenter", event => showTopicTooltip(item, event.clientX, event.clientY));
      cell.addEventListener("mousemove", event => moveTooltip(event.clientX, event.clientY));
      cell.addEventListener("mouseleave", hideTooltip);
      cell.addEventListener("focus", () => showTooltipAtElement(item, cell));
      cell.addEventListener("blur", hideTooltip);
      cell.addEventListener("click", () => openTopic(id, cell));
      cell.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openTopic(id, cell);
        }
      });
    });

    els.svg.querySelectorAll(".radial-sector-label").forEach(label => {
      const group = groupById.get(label.dataset.group);
      if (!group) return;
      const showGroup = () => {
        const rect = label.getBoundingClientRect();
        const touched = group.items.filter(raw => {
          const item = itemById.get(raw.id);
          return levelOf(item) > 0 || state.repeat.has(item.id);
        }).length;
        showTooltipContent(
          group.title,
          `${group.items.length} тем`,
          `Затронуто ${touched} из ${group.items.length}`,
          rect.left + rect.width / 2,
          rect.top + rect.height / 2
        );
      };
      label.addEventListener("mouseenter", showGroup);
      label.addEventListener("mouseleave", hideTooltip);
      label.addEventListener("focus", showGroup);
      label.addEventListener("blur", hideTooltip);
      label.addEventListener("click", () => openCatalogGroup(group.id));
      label.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openCatalogGroup(group.id);
        }
      });
    });
  }

  function showTopicTooltip(item, x, y) {
    showTooltipContent(item.title, item.groupTitle, statusLabel(item), x, y);
  }

  function showTooltipAtElement(item, element) {
    const rect = element.getBoundingClientRect();
    showTopicTooltip(item, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  function showTooltipContent(title, group, status, x, y) {
    els.tooltipTitle.textContent = title;
    els.tooltipGroup.textContent = group;
    els.tooltipStatus.textContent = status;
    els.tooltip.hidden = false;
    moveTooltip(x, y);
  }

  function moveTooltip(x, y) {
    if (els.tooltip.hidden) return;
    const padding = 12;
    const offset = 16;
    const rect = els.tooltip.getBoundingClientRect();
    let left = x + offset;
    let top = y + offset;
    if (left + rect.width > window.innerWidth - padding) left = x - rect.width - offset;
    if (top + rect.height > window.innerHeight - padding) top = y - rect.height - offset;
    left = Math.max(padding, Math.min(left, window.innerWidth - rect.width - padding));
    top = Math.max(padding, Math.min(top, window.innerHeight - rect.height - padding));
    els.tooltip.style.left = `${left}px`;
    els.tooltip.style.top = `${top}px`;
  }

  function hideTooltip() {
    els.tooltip.hidden = true;
  }

  function openCatalogGroup(groupId) {
    const details = els.catalog.querySelector(`[data-group-details="${CSS.escape(groupId)}"]`);
    if (!details) return;
    details.open = true;
    details.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
    details.querySelector(".topic-button")?.focus({ preventScroll: true });
  }

  function openTopic(id, trigger) {
    if (!itemById.has(id)) return;
    state.activeId = id;
    state.lastDialogTrigger = trigger || document.activeElement;
    populateDialog(id);
    if (typeof els.dialog.showModal === "function") {
      els.dialog.showModal();
    } else {
      els.dialog.setAttribute("open", "");
    }
  }

  function populateDialog(id) {
    const item = itemById.get(id);
    if (!item) return;
    const level = levelOf(item);
    const evidence = Array.isArray(item.evidence) ? item.evidence : [];

    els.dialogGroup.textContent = `${item.groupShort} · ${item.groupTitle}`;
    els.dialogTitle.textContent = item.title;
    els.dialogLevel.textContent = `${level} / 4 · ${LEVEL_LABELS[level]}`;
    els.dialogExam.textContent = item.exam || "ЕГЭ профиль";
    els.dialogDescription.textContent = item.description;
    els.dialogDiagnostic.textContent = item.diagnostic;

    if (evidence.length) {
      els.dialogHistory.innerHTML = evidence.map(entry =>
        `<div class="history-entry"><b>${escapeHTML(entry.date || "Материал")}</b><br>${escapeHTML(entry.text || "Тема встречалась в материале.")}` +
        (entry.href ? `<br><a href="${escapeHTML(entry.href)}" target="_blank">Открыть подтверждающий материал →</a>` : "") +
        `</div>`
      ).join("");
    } else {
      els.dialogHistory.innerHTML = `<p>Диагностических данных пока нет.</p>`;
    }

    els.levelPicker.querySelectorAll("[data-level]").forEach(button => {
      const selected = Number(button.dataset.level) === level;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    const firstMaterial = evidence.find(entry => entry.href);
    if (firstMaterial) {
      els.dialogMaterial.href = firstMaterial.href;
      els.dialogMaterial.hidden = false;
    } else {
      els.dialogMaterial.hidden = true;
    }

    els.repeatToggle.textContent = state.repeat.has(id) ? "Убрать из повторения" : "Добавить в повторение";
  }

  function closeDialog() {
    if (typeof els.dialog.close === "function") {
      els.dialog.close();
    } else {
      els.dialog.removeAttribute("open");
    }
    if (state.lastDialogTrigger && typeof state.lastDialogTrigger.focus === "function") {
      state.lastDialogTrigger.focus({ preventScroll: true });
    }
  }

  function setTheme(theme, persist = true) {
    const safeTheme = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = safeTheme;
    els.themeToggle.setAttribute("aria-label", safeTheme === "dark" ? "Включить светлую тему" : "Включить тёмную тему");
    els.themeToggle.title = safeTheme === "dark" ? "Светлая тема" : "Тёмная тема";
    if (persist) {
      try {
        localStorage.setItem(STORAGE.theme, safeTheme);
      } catch (_) {}
    }
  }

  function initTheme() {
    let saved = null;
    try {
      saved = localStorage.getItem(STORAGE.theme);
    } catch (_) {}
    if (saved === "light" || saved === "dark") {
      setTheme(saved, false);
      return;
    }
    setTheme(matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light", false);
  }

  document.querySelectorAll(".filter").forEach(button => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter || "all";
      document.querySelectorAll(".filter").forEach(candidate => {
        const active = candidate === button;
        candidate.classList.toggle("active", active);
        candidate.setAttribute("aria-pressed", String(active));
      });
      renderMap();
      renderCatalog();
    });
  });

  els.search.addEventListener("input", () => {
    state.query = els.search.value.trim().toLocaleLowerCase("ru");
    renderMap();
    renderCatalog();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "/" && document.activeElement !== els.search && !/input|textarea|select/i.test(document.activeElement?.tagName || "")) {
      event.preventDefault();
      els.search.focus();
    }
  });

  els.levelPicker.addEventListener("click", event => {
    const button = event.target.closest("[data-level]");
    if (!button || !state.activeId) return;
    state.levels[state.activeId] = clampLevel(button.dataset.level);
    saveState();
    renderAll();
  });

  els.repeatToggle.addEventListener("click", () => {
    if (!state.activeId) return;
    if (state.repeat.has(state.activeId)) {
      state.repeat.delete(state.activeId);
    } else {
      state.repeat.add(state.activeId);
    }
    saveState();
    renderAll();
  });

  els.dialogClose.addEventListener("click", closeDialog);
  els.dialog.addEventListener("click", event => {
    if (event.target === els.dialog) closeDialog();
  });
  els.dialog.addEventListener("cancel", event => {
    event.preventDefault();
    closeDialog();
  });

  els.restoreButton.addEventListener("click", () => {
    const accepted = window.confirm(
      "Вернуть подтверждённые статусы из материалов ученика? Ручные изменения уровней и список повторения будут очищены."
    );
    if (!accepted) return;
    state.levels = { ...baselineLevels };
    state.repeat = new Set(DATA.repeatTopics || []);
    try {
      localStorage.removeItem(STORAGE.levels);
      localStorage.removeItem(STORAGE.repeat);
    } catch (_) {}
    saveState();
    renderAll();
  });

  els.themeToggle.addEventListener("click", () => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  });

  initTheme();
  renderMaterials();
  renderAll();
})();
