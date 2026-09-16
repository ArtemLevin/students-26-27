(() => {
  'use strict';
  const data = window.MARINA_OGE_MAP;
  if (!data || !Array.isArray(data.groups)) return;

  const evidence = 'Тема подтверждена материалом занятия 16.09.26 «Парабола, y = m, ОДЗ и выколотая точка».';
  const href = '16.09.26.html';
  const covered = new Set([
    'oge_08_08',
    'oge_08_09',
    'oge_08_10',
    'oge_09_05',
    'oge_11_10',
    'oge_11_12'
  ]);

  let count = 0;
  for (const group of data.groups) {
    for (const item of group.items) {
      if (!covered.has(item.id)) continue;
      item.baseLevel = Math.max(Number(item.baseLevel || 0), 2);
      item.evidence = { text: evidence, href };
      count += 1;
    }
  }

  data.updated = '16.09.2026';
  data.latestLesson = {
    date: '16.09.26',
    title: 'Парабола, y = m, ОДЗ и выколотая точка',
    href,
    labHref: '16.09.26-lab.html',
    coveredCount: count
  };
})();
