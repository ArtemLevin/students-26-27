(() => {
  "use strict";

  const data = window.COMPETENCY_MAP_DATA;
  if (!data || !Array.isArray(data.groups)) {
    throw new Error("COMPETENCY_MAP_DATA is unavailable");
  }

  const SVG_NS = "http://www.w3.org/2000/svg";
  const LEVEL_LABELS = [
    "Ещё впереди",
    "Нужна помощь",
    "Пройдена с опорой",
    "Почти уверенно",
    "Освоено"
  ];
  const STUDENT = data.student.id;
  const PROGRAM = data.program.id;
  const STORAGE = {
    levels: `${STUDENT}-${PROGRAM}-competency-map`,
    repeat: `${STUDENT}-${PROGRAM}-repeat`,
    theme: `${STUDENT}-${PROGRAM}-theme`
  };

  const state = {
    filter: "all",
    query: "",
    activeId: null,
    levels: readObject(STORAGE.levels),
    repeat: new Set(localStorage.getItem(STORAGE.repeat) === null ? (data.repeatTopics || []) : readArray(STORAGE.repeat))
  };

  const groups = data.groups;
  const items = groups.flatMap((group, groupIndex) =>
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
  const baselineLevels = Object.fromEntries(items.map(item => [item.id, clampLevel(item.level)]));

  const els = {
    svg: document.querySelector("#radialMap"),
    tooltip: document.querySelector("#mapTooltip"),
    catalog: document.querySelector("#topicCatalog"),
    search: document.querySelector("#topicSearch"),
    filters: [...document.querySelectorAll("[data-filter]")],
    reset: document.querySelector("#resetStatuses"),
    theme: document.querySelector("#themeToggle"),
    dialog: document.querySelector("#topicDialog"),
    closeDialog: document.querySelector("#closeDialog"),
    dialogTitle: document.querySelector("#dialogTitle"),
    dialogGroup: document.querySelector("#dialogGroup"),
    dialogLevel: document.querySelector("#dialogLevel"),
    dialogDescription: document.querySelector("#dialogDescription"),
    dialogDiagnostic: document.querySelector("#dialogDiagnostic"),
    dialogHistory: document.querySelector("#dialogHistory"),
    dialogMaterial: document.querySelector("#dialogMaterial"),
    levelButtons: [...document.querySelectorAll("[data-level]")],
    repeatButton: document.querySelector("#repeatToggle"),
    coveredCount: document.querySelector("#coveredCount"),
    coveragePercent: document.querySelector("#coveragePercent"),
    repeatCount: document.querySelector("#repeatCount"),
    totalCount: document.querySelector("#totalCount"),
    centerPercent: document.querySelector("#centerPercent"),
    centerMeta: document.querySelector("#centerMeta"),
    focusTitle: document.querySelector("#focusTitle"),
    focusGroup: document.querySelector("#focusGroup"),
    focusAdvice: document.querySelector("#focusAdvice"),
    focusLink: document.querySelector("#focusLink"),
    lessonCovered: document.querySelector("#lessonCovered"),
    footerMeta: document.querySelector("#footerMeta"),
    mapStatus: document.querySelector("#mapStatus")
  };

  function readObject(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "{}");
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  function readArray(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function clampLevel(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, Math.min(4, Math.round(numeric)));
  }

  function getLevel(item) {
    return Object.prototype.hasOwnProperty.call(state.levels, item.id)
      ? clampLevel(state.levels[item.id])
      : baselineLevels[item.id];
  }

  function isRepeat(item) {
    return state.repeat.has(item.id);
  }

  function getStatus(item) {
    if (isRepeat(item)) return "repeat";
    return getLevel(item) > 0 ? "covered" : "future";
  }

  function statusLabel(item) {
    const status = getStatus(item);
    if (status === "repeat") return "Пора повторить";
    if (status === "covered") return "Пройдено";
    return "Ещё впереди";
  }

  function saveLevels() {
    localStorage.setItem(STORAGE.levels, JSON.stringify(state.levels));
  }

  function saveRepeat() {
    localStorage.setItem(STORAGE.repeat, JSON.stringify([...state.repeat]));
  }

  function polar(radius, angle) {
    const radians = (angle - 90) * Math.PI / 180;
    return {
      x: 400 + radius * Math.cos(radians),
      y: 400 + radius * Math.sin(radians)
    };
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
      "Z"
    ].join(" ");
  }

  function matches(item) {
    const status = getStatus(item);
    const filterMatch =
      state.filter === "all" ||
      (state.filter === "covered" && status === "covered") ||
      (state.filter === "repeat" && status === "repeat") ||
      (state.filter === "future" && status === "future");

    const q = state.query.trim().toLocaleLowerCase("ru");
    const queryMatch = !q ||
      item.title.toLocaleLowerCase("ru").includes(q) ||
      item.groupTitle.toLocaleLowerCase("ru").includes(q);

    return filterMatch && queryMatch;
  }

  function makeSvg(tag, attrs = {}) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
    return node;
  }

  function renderMap() {
    const svg = els.svg;
    svg.replaceChildren();

    const title = makeSvg("title", { id: "radialTitle" });
    title.textContent = `Круговая тепловая карта: ${data.program.title}`;
    const desc = makeSvg("desc", { id: "radialDesc" });
    desc.textContent = `${groups.length} тематических секторов и ${items.length} конкретных компетенций. Каждая ячейка открывается клавишами Enter или Пробел.`;
    svg.append(title, desc);
    svg.setAttribute("aria-labelledby", "radialTitle radialDesc");

    const sectorSize = 360 / groups.length;
    const innerRadius = 145;
    const outerRadius = 380;
    const maxRings = Math.max(...groups.map(group => group.items.length));
    const ringWidth = (outerRadius - innerRadius) / maxRings;
    const ringGap = Math.min(1.55, Math.max(0.9, ringWidth * 0.15));
    const sectorGap = 1.15;

    groups.forEach((group, groupIndex) => {
      const startAngle = groupIndex * sectorSize + sectorGap;
      const endAngle = (groupIndex + 1) * sectorSize - sectorGap;

      const innerBand = makeSvg("path", {
        d: arcPath(112, 136, startAngle, endAngle),
        class: "group-band",
        "aria-hidden": "true"
      });
      const bandTitle = makeSvg("title");
      bandTitle.textContent = `${group.short} · ${group.title}`;
      innerBand.appendChild(bandTitle);
      svg.appendChild(innerBand);

      group.items.forEach((sourceItem, itemIndex) => {
        const item = itemById.get(sourceItem.id);
        const ringInner = innerRadius + itemIndex * ringWidth;
        const ringOuter = ringInner + ringWidth - ringGap;
        const path = makeSvg("path", {
          d: arcPath(ringInner, ringOuter, startAngle, endAngle),
          class: `radial-cell status-${getStatus(item)}${matches(item) ? "" : " is-muted"}`,
          "data-id": item.id,
          tabindex: "0",
          role: "button",
          "aria-label": `${item.title}. Раздел ${group.short}: ${group.title}. Статус: ${statusLabel(item)}. Уровень ${getLevel(item)} из 4: ${LEVEL_LABELS[getLevel(item)]}.`
        });

        if (state.query && matches(item)) path.classList.add("is-search-match");

        const cellTitle = makeSvg("title");
        cellTitle.textContent = `${item.title} · ${group.title} · ${statusLabel(item)}`;
        path.appendChild(cellTitle);

        path.addEventListener("mouseenter", event => showPointerTooltip(event, item));
        path.addEventListener("mousemove", event => showPointerTooltip(event, item));
        path.addEventListener("mouseleave", hideTooltip);
        path.addEventListener("focus", () => showFocusTooltip(path, item));
        path.addEventListener("blur", hideTooltip);
        path.addEventListener("click", () => openDialog(item.id, path));
        path.addEventListener("keydown", event => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openDialog(item.id, path);
          }
        });
        svg.appendChild(path);
      });

      const labelPoint = polar(392, (startAngle + endAngle) / 2);
      const label = makeSvg("text", {
        x: labelPoint.x.toFixed(2),
        y: labelPoint.y.toFixed(2),
        class: "group-label",
        "text-anchor": "middle",
        "dominant-baseline": "middle",
        "aria-hidden": "true"
      });
      label.textContent = group.short;
      svg.appendChild(label);
    });
  }

  function showPointerTooltip(event, item) {
    showTooltip(item, event.clientX + 16, event.clientY + 16);
  }

  function showFocusTooltip(element, item) {
    const rect = element.getBoundingClientRect();
    showTooltip(item, rect.left + rect.width / 2 + 12, rect.top + rect.height / 2 + 12);
  }

  function showTooltip(item, x, y) {
    const tooltip = els.tooltip;
    tooltip.innerHTML = "";
    const title = document.createElement("strong");
    title.textContent = item.title;
    const group = document.createElement("span");
    group.textContent = `${item.groupShort} · ${item.groupTitle}`;
    const status = document.createElement("span");
    status.textContent = statusLabel(item);
    status.className = `tooltip-status status-${getStatus(item)}`;
    tooltip.append(title, group, status);
    tooltip.hidden = false;

    const margin = 12;
    const rect = tooltip.getBoundingClientRect();
    const left = Math.min(Math.max(margin, x), window.innerWidth - rect.width - margin);
    const top = Math.min(Math.max(margin, y), window.innerHeight - rect.height - margin);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  function hideTooltip() {
    els.tooltip.hidden = true;
  }

  function renderCatalog() {
    els.catalog.replaceChildren();

    groups.forEach(group => {
      const details = document.createElement("details");
      details.className = "catalog-group";

      const summary = document.createElement("summary");
      const label = document.createElement("span");
      label.textContent = `${group.short} · ${group.title}`;
      const count = document.createElement("small");
      const touched = group.items.filter(source => {
        const item = itemById.get(source.id);
        return getLevel(item) > 0 || isRepeat(item);
      }).length;
      count.textContent = `${touched} / ${group.items.length}`;
      summary.append(label, count);
      details.appendChild(summary);

      const list = document.createElement("div");
      list.className = "catalog-list";

      group.items.forEach(sourceItem => {
        const item = itemById.get(sourceItem.id);
        const button = document.createElement("button");
        button.type = "button";
        button.className = `catalog-item${matches(item) ? "" : " is-muted"}`;
        button.dataset.id = item.id;
        button.setAttribute("aria-label", `${item.title}. ${statusLabel(item)}. Уровень ${getLevel(item)} из 4.`);

        const dot = document.createElement("i");
        dot.className = `catalog-dot status-${getStatus(item)}`;
        dot.setAttribute("aria-hidden", "true");

        const copy = document.createElement("span");
        const name = document.createElement("span");
        name.textContent = item.title;
        const meta = document.createElement("small");
        meta.textContent = `${statusLabel(item)} · ${getLevel(item)}/4`;
        copy.append(name, meta);

        button.append(dot, copy);
        if (state.query && matches(item)) button.classList.add("is-search-match");
        button.addEventListener("click", () => openDialog(item.id, button));
        list.appendChild(button);
      });

      details.appendChild(list);
      els.catalog.appendChild(details);
    });
  }

  function stats() {
    const covered = items.filter(item => getLevel(item) > 0).length;
    const repeat = items.filter(isRepeat).length;
    const touched = items.filter(item => getLevel(item) > 0 || isRepeat(item)).length;
    const coverage = items.length ? Math.round(touched / items.length * 100) : 0;
    return { covered, repeat, touched, coverage, total: items.length };
  }

  function renderStats() {
    const summary = stats();
    els.coveredCount.textContent = summary.covered;
    els.coveragePercent.textContent = `${summary.coverage}%`;
    els.repeatCount.textContent = summary.repeat;
    els.totalCount.textContent = summary.total;
    els.centerPercent.textContent = `${summary.coverage}%`;
    els.centerMeta.textContent = `${summary.touched} из ${summary.total} тем затронуто`;
    els.lessonCovered.textContent = `${items.filter(item => item.evidence).length} компетенций подтверждено материалом 26.08.26`;
    els.footerMeta.textContent = `${groups.length} секторов · ${summary.total} компетенций`;
    const visible = items.filter(matches).length;
    els.mapStatus.textContent = state.filter === "all" && !state.query
      ? `Карта готова: ${summary.total} компетенций.`
      : `Соответствует фильтру и поиску: ${visible} из ${summary.total}.`;
  }

  function chooseNextFocus() {
    const repeat = items.find(isRepeat);
    if (repeat) return { item: repeat, advice: "Сначала вернитесь к теме из списка повторения и проверьте её короткой диагностикой." };

    const future = items.find(item => getStatus(item) === "future");
    if (future) return { item: future, advice: "Следующий логичный шаг — познакомиться с этой ещё не затронутой компетенцией." };

    const help = items.find(item => getLevel(item) === 1);
    if (help) return { item: help, advice: "Тема уже встречалась, но пока требует помощи: полезно разобрать один типовой пример и повторить алгоритм." };

    const support = items.find(item => getLevel(item) === 2);
    if (support) return { item: support, advice: "Проведите контрольную диагностику без подсказок, чтобы подтвердить переход к уровню 3." };

    return { item: items.find(item => getLevel(item) === 3) || items[0], advice: "Проведите смешанную диагностику и закрепите устойчивость навыка." };
  }

  function renderNextFocus() {
    const result = chooseNextFocus();
    if (!result?.item) return;
    const { item, advice } = result;
    els.focusTitle.textContent = item.title;
    els.focusGroup.textContent = `${item.groupShort} · ${item.groupTitle}`;
    els.focusAdvice.textContent = advice;

    if (item.evidence?.href) {
      els.focusLink.href = item.evidence.href;
      els.focusLink.hidden = false;
    } else {
      els.focusLink.hidden = true;
    }
  }

  function renderAll() {
    renderMap();
    renderCatalog();
    renderStats();
    renderNextFocus();
    updateFilterButtons();
    if (state.activeId && els.dialog.open) populateDialog(itemById.get(state.activeId));
  }

  function updateFilterButtons() {
    els.filters.forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.filter === state.filter));
    });
  }

  function openDialog(id, trigger) {
    const item = itemById.get(id);
    if (!item) return;
    state.activeId = id;
    els.dialog.dataset.triggerId = id;
    populateDialog(item);
    if (!els.dialog.open) els.dialog.showModal();
    els.dialog._trigger = trigger;
    requestAnimationFrame(() => els.closeDialog.focus());
  }

  function populateDialog(item) {
    const level = getLevel(item);
    els.dialogTitle.textContent = item.title;
    els.dialogGroup.textContent = `${item.groupShort} · ${item.groupTitle}`;
    els.dialogLevel.textContent = `${level} / 4 · ${LEVEL_LABELS[level]}`;
    els.dialogDescription.textContent = item.description;
    els.dialogDiagnostic.textContent = item.diagnostic;

    if (item.evidence) {
      els.dialogHistory.textContent = item.evidence.text;
      els.dialogMaterial.replaceChildren();

      const pdf = document.createElement("a");
      pdf.href = item.evidence.href;
      pdf.textContent = "Открыть PDF";
      pdf.target = "_blank";
      pdf.rel = "noopener";

      const tex = document.createElement("a");
      tex.href = item.evidence.texHref;
      tex.textContent = "Открыть TeX";
      tex.target = "_blank";
      tex.rel = "noopener";

      els.dialogMaterial.append(pdf, tex);
      els.dialogMaterial.hidden = false;
    } else {
      els.dialogHistory.textContent = "Диагностических данных пока нет.";
      els.dialogMaterial.hidden = true;
    }

    els.levelButtons.forEach(button => {
      button.setAttribute("aria-pressed", String(Number(button.dataset.level) === level));
    });

    els.repeatButton.textContent = isRepeat(item) ? "Убрать из повторения" : "Добавить в повторение";
    els.repeatButton.classList.toggle("is-active", isRepeat(item));
  }

  function setLevel(level) {
    const item = itemById.get(state.activeId);
    if (!item) return;
    state.levels[item.id] = clampLevel(level);
    saveLevels();
    renderAll();
  }

  function toggleRepeat() {
    const item = itemById.get(state.activeId);
    if (!item) return;
    if (state.repeat.has(item.id)) state.repeat.delete(item.id);
    else state.repeat.add(item.id);
    saveRepeat();
    renderAll();
  }

  function resetStatuses() {
    const confirmed = window.confirm("Вернуть подтверждённые материалами статусы и удалить ручные уровни и ручной список повторения?");
    if (!confirmed) return;
    state.levels = {};
    state.repeat = new Set(data.repeatTopics || []);
    localStorage.removeItem(STORAGE.levels);
    saveRepeat();
    renderAll();
  }

  function applyTheme(theme, persist = true) {
    const safe = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = safe;
    els.theme.setAttribute("aria-pressed", String(safe === "dark"));
    els.theme.querySelector("[data-theme-label]").textContent = safe === "dark" ? "Светлая тема" : "Тёмная тема";
    if (persist) localStorage.setItem(STORAGE.theme, safe);
  }

  function initTheme() {
    const saved = localStorage.getItem(STORAGE.theme);
    applyTheme(saved === "dark" ? "dark" : "light", false);
  }

  els.filters.forEach(button => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      renderAll();
    });
  });

  els.search.addEventListener("input", event => {
    state.query = event.target.value;
    renderAll();
  });

  els.levelButtons.forEach(button => {
    button.addEventListener("click", () => setLevel(button.dataset.level));
  });

  els.repeatButton.addEventListener("click", toggleRepeat);
  els.reset.addEventListener("click", resetStatuses);

  els.theme.addEventListener("click", () => {
    applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  });

  els.closeDialog.addEventListener("click", () => els.dialog.close());
  els.dialog.addEventListener("cancel", () => els.dialog.close());
  els.dialog.addEventListener("click", event => {
    if (event.target === els.dialog) els.dialog.close();
  });
  els.dialog.addEventListener("close", () => {
    const trigger = els.dialog._trigger;
    state.activeId = null;
    if (trigger && document.contains(trigger)) trigger.focus();
  });

  window.addEventListener("resize", hideTooltip);
  window.addEventListener("scroll", hideTooltip, { passive: true });

  initTheme();
  renderAll();
})();
