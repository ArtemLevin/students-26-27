(() => {
  'use strict';
  const data = window.MARINA_OGE_MAP;
  if (!data || !Array.isArray(data.groups)) return;

  const evidenceById = new Map([
    ['oge_18_10', {
      text: 'На занятии 28.09.26 отрабатывались направление вектора, сложение, вычитание и построения по клеткам. Навык закреплялся с подсказками: минимальный подтверждённый уровень — «2 · пройдена с опорой»; более высокий ранее установленный уровень сохраняется.',
      href: '28.09.26.html#operations'
    }],
    ['oge_25_11', {
      text: 'На занятии 28.09.26 в параллелограмме выражался вектор BD через заданные AB и AD с использованием правила треугольника. Минимальный подтверждённый уровень — «2 · пройдена с опорой»; более высокий ранее установленный уровень сохраняется.',
      href: '28.09.26.html#express'
    }]
  ]);

  let count = 0;
  for (const group of data.groups) {
    for (const item of group.items) {
      const evidence = evidenceById.get(item.id);
      if (!evidence) continue;
      item.baseLevel = Math.max(Number(item.baseLevel || 0), 2);
      item.evidence = evidence;
      count += 1;
    }
  }

  data.updated = '28.09.2026';
  data.latestLesson = {
    date: '28.09.26',
    title: 'Векторы: действия и правила построения',
    href: '28.09.26.html',
    coveredCount: count
  };
})();