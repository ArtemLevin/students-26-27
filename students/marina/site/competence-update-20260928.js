(() => {
  'use strict';
  const data = window.MARINA_OGE_MAP;
  if (!data || !Array.isArray(data.groups)) return;

  const evidence = 'Тема подтверждена материалом занятия 28.09.26 «Векторы: правило треугольника, вычитание, умножение на число, правило многоугольника и выражение через заданные векторы».';
  const href = '28.09.26.html';
  const covered = new Set([
    'oge_18_10',
    'oge_25_11'
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

  data.updated = '28.09.2026';
  data.latestLesson = {
    date: '28.09.26',
    title: 'Векторы: действия и правила построения',
    href,
    coveredCount: count
  };
})();