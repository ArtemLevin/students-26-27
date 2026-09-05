(() => {
  'use strict';
  const data = window.MARINA_OGE_MAP;
  if (!data || !Array.isArray(data.groups)) return;

  const evidence = 'Тема подтверждена материалом занятия 05.09.26 «Входная диагностика и линейная функция».';
  const href = '05.09.26.html';
  const covered = new Set([
    'oge_06_06','oge_06_07',
    'oge_08_06','oge_08_07','oge_08_10','oge_08_12',
    'oge_13_01','oge_13_03','oge_13_05','oge_13_10','oge_13_12',
    'oge_15_14',
    'oge_16_04','oge_16_05','oge_16_06','oge_16_12',
    'oge_19_02','oge_19_03',
    'oge_11_05','oge_11_06','oge_11_07','oge_11_08',
    'oge_22_01'
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
  data.updated = '05.09.2026';
  data.latestLesson = {
    date: '05.09.26',
    title: 'Входная диагностика и линейная функция',
    href,
    labHref: '05.09.26-lab.html',
    coveredCount: count
  };
})();