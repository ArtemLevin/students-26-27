(() => {
  'use strict';
  const data = window.MARINA_OGE_MAP;
  if (!data || !Array.isArray(data.groups)) return;

  const evidence = 'Тема подтверждена материалом занятия 09.09.26 «Сложные функции, монотонность и линейная функция».';
  const href = '09.09.26.html';
  const covered = new Set([
    'oge_11_03',
    'oge_11_05',
    'oge_11_06',
    'oge_11_07',
    'oge_11_08',
    'oge_11_13'
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

  data.updated = '09.09.2026';
  data.latestLesson = {
    date: '09.09.26',
    title: 'Сложные функции, монотонность и линейная функция',
    href,
    labHref: '09.09.26-lab.html',
    coveredCount: count
  };
})();
