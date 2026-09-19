(() => {
  'use strict';
  const data = window.MARINA_OGE_MAP;
  if (!data || !Array.isArray(data.groups)) return;

  const evidence = 'Тема подтверждена материалом занятия 19.09.26 «Рациональные функции, выколотые точки и параметры y=m, y=kx».';
  const href = '19.09.26.html';
  const covered = new Set([
    'oge_08_08',
    'oge_08_09',
    'oge_08_10',
    'oge_09_05',
    'oge_11_07',
    'oge_11_10',
    'oge_11_12',
    'oge_11_13',
    'oge_22_02',
    'oge_22_03',
    'oge_22_04',
    'oge_22_09',
    'oge_22_10',
    'oge_22_11',
    'oge_22_12',
    'oge_22_13',
    'oge_22_15'
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

  data.updated = '19.09.2026';
  data.latestLesson = {
    date: '19.09.26',
    title: 'Рациональные функции, выколотые точки и параметры',
    href,
    labHref: '19.09.26-lab.html',
    coveredCount: count
  };
})();