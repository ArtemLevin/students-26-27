(() => {
  'use strict';

  const data = window.COMPETENCY_MAP_DATA;
  if (!data || !Array.isArray(data.groups)) return;

  for (const group of data.groups) {
    for (const item of group.items || []) {
      item.baselineLevel = 0;
    }
  }
  data.repeatTopics = [];

  const slug = value => String(value).toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-z0-9а-я]+/gi, '-')
    .replace(/^-+|-+$/g, '');

  const markerKey = `${data.meta.student}-competency-map-reset-20260904`;
  try {
    if (!localStorage.getItem(markerKey)) {
      const baseKey = `${data.meta.student}-${slug(data.meta.program)}`;
      localStorage.removeItem(`${baseKey}-competency-map`);
      localStorage.removeItem(`${baseKey}-repeat`);
      localStorage.setItem(markerKey, '1');
    }
  } catch (_) {}
})();