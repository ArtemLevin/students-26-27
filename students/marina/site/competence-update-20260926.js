(() => {
  'use strict';
  const data = window.MARINA_OGE_MAP;
  if (!data || !Array.isArray(data.groups)) return;

  const evidence = 'Тема подтверждена материалом занятия 26.09.26 «Рациональные функции и гипербола: ОДЗ, асимптоты, выколотые точки и прямая y=m».';
  const href = '26.09.26.html';
  const covered = new Set([
    'oge_04_04',
    'oge_08_09',
    'oge_08_10',
    'oge_09_08',
    'oge_09_09',
    'oge_11_03',
    'oge_11_09',
    'oge_11_11',
    'oge_11_12',
    'oge_12_10',
    'oge_12_11',
    'oge_22_05',
    'oge_22_06',
    'oge_22_09',
    'oge_22_10',
    'oge_22_11',
    'oge_22_12'
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

  data.updated = '26.09.2026';
  data.latestLesson = {
    date: '26.09.26',
    title: 'Рациональные функции и гипербола',
    href,
    labHref: '26.09.26-lab.html',
    coveredCount: count
  };
})();