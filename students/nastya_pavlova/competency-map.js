(() => {
  "use strict";

  const currentScript = document.currentScript;
  const scriptUrl = currentScript?.src || new URL("competency-map.js", document.baseURI).href;
  const sharedUrl = new URL("../../shared/student-dashboard/ege-profile-2027.js?v=20260905-stage04-1", scriptUrl).href;
  const legacyUrl = new URL("competency-map-legacy.js?v=20260905-stage04-1", scriptUrl).href;
  const masteryUrl = new URL("site/stage04-mastery.js?v=20260905-stage04-1", scriptUrl).href;

  function normalizeOrderedLegacyGroups(groups) {
    return groups.map((group, index) => ({ ...group, id: `task_${index + 1}` }));
  }

  function adaptForNastya(groups) {
    return groups.map(group => ({
      ...group,
      items: (group.items || []).map(item => {
        if (!String(item.id || "").startsWith("ege2027_")) return item;
        return {
          ...item,
          diagnostic: item.diagnostic || item.practice || "Решить одну типовую задачу без подсказки и объяснить используемую модель.",
          evidence: null
        };
      })
    }));
  }

  function applyStage04Mastery(groups, mastery = {}) {
    return groups.map(group => ({
      ...group,
      items: (group.items || []).map(item => {
        if (!Object.prototype.hasOwnProperty.call(mastery, item.id)) return item;
        const level = Math.max(0, Math.min(4, Math.round(Number(mastery[item.id]) || 0)));
        return { ...item, level, status: level > 0 ? "covered" : "future" };
      })
    }));
  }

  function updateVisibleExamMetadata() {
    document.querySelectorAll(".hero-lead, .hero-meta .chip").forEach(node => {
      if (node.textContent?.includes("19 экзаменационных линий")) {
        node.textContent = node.textContent.replace("19 экзаменационных линий", "20 экзаменационных линий");
      }
    });
  }

  function lockLocalMasteryControls() {
    document.querySelectorAll("[data-level]").forEach(button => {
      button.disabled = true;
      button.setAttribute("aria-disabled", "true");
      button.title = "Уровень обновляется по результатам занятия через Stage 04.";
    });
    const reset = document.querySelector("#resetStatuses");
    if (reset) {
      reset.hidden = true;
      reset.disabled = true;
    }
  }

  (async () => {
    const source = window.COMPETENCY_MAP_DATA;
    if (!source || !Array.isArray(source.groups)) throw new Error("COMPETENCY_MAP_DATA is unavailable");

    const [{ transformEgeProfile2027Catalog, EGE_PROFILE_2027_CATALOG_VERSION }, { STAGE04_MASTERY }] = await Promise.all([
      import(sharedUrl),
      import(masteryUrl)
    ]);
    const transformed = transformEgeProfile2027Catalog(normalizeOrderedLegacyGroups(source.groups));
    const adapted = adaptForNastya(transformed);
    window.COMPETENCY_MAP_DATA = {
      ...source,
      groups: applyStage04Mastery(adapted, STAGE04_MASTERY),
      egeCatalogVersion: EGE_PROFILE_2027_CATALOG_VERSION
    };

    try {
      const levelsKey = `${source.student.id}-${source.program.id}-competency-map`;
      localStorage.removeItem(levelsKey);
    } catch (_) {}

    updateVisibleExamMetadata();
    await import(legacyUrl);
    lockLocalMasteryControls();
  })().catch(error => {
    console.error("Failed to migrate Nastya competency map to EGE-2027", error);
    const status = document.querySelector("#mapStatus");
    if (status) status.textContent = "Не удалось загрузить актуальную структуру ЕГЭ-2027.";
  });
})();
