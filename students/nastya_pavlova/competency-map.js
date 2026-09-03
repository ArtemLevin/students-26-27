(() => {
  "use strict";

  const currentScript = document.currentScript;
  const scriptUrl = currentScript?.src || new URL("competency-map.js", document.baseURI).href;
  const sharedUrl = new URL("../../shared/student-dashboard/ege-profile-2027.js?v=20260903-nastya-1", scriptUrl).href;
  const legacyUrl = new URL("competency-map-legacy.js?v=20260903-nastya-1", scriptUrl).href;

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

  function updateVisibleExamMetadata() {
    document.querySelectorAll(".hero-lead, .hero-meta .chip").forEach(node => {
      if (node.textContent?.includes("19 экзаменационных линий")) {
        node.textContent = node.textContent.replace("19 экзаменационных линий", "20 экзаменационных линий");
      }
    });
  }

  (async () => {
    const source = window.COMPETENCY_MAP_DATA;
    if (!source || !Array.isArray(source.groups)) throw new Error("COMPETENCY_MAP_DATA is unavailable");

    const { transformEgeProfile2027Catalog, EGE_PROFILE_2027_CATALOG_VERSION } = await import(sharedUrl);
    const transformed = transformEgeProfile2027Catalog(normalizeOrderedLegacyGroups(source.groups));
    window.COMPETENCY_MAP_DATA = {
      ...source,
      groups: adaptForNastya(transformed),
      egeCatalogVersion: EGE_PROFILE_2027_CATALOG_VERSION
    };

    updateVisibleExamMetadata();
    await import(legacyUrl);
  })().catch(error => {
    console.error("Failed to migrate Nastya competency map to EGE-2027", error);
    const status = document.querySelector("#mapStatus");
    if (status) status.textContent = "Не удалось загрузить актуальную структуру ЕГЭ-2027.";
  });
})();
