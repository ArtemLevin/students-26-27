(() => {
  'use strict';
  const data = window.MARINA_OGE_MAP;
  if (!data || !Array.isArray(data.groups)) return;

  const evidence = 'Тема подтверждена материалом занятия 12.09.26 «Графики функций: прямая и парабола».';
  const href = '12.09.26.html';
  const covered = new Set([
    'oge_11_05',
    'oge_11_06',
    'oge_11_07',
    'oge_11_08',
    'oge_11_10',
    'oge_11_11',
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

  data.updated = '12.09.2026';
  data.latestLesson = {
    date: '12.09.26',
    title: 'Графики функций: прямая и парабола',
    href,
    labHref: '12.09.26-lab.html',
    coveredCount: count
  };
})();
