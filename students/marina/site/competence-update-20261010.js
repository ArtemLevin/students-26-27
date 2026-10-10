(() => {
  'use strict';
  const data = window.MARINA_OGE_MAP;
  if (!data || !Array.isArray(data.groups)) return;

  // Evidence is an update of the learning history, not a mastery claim.
  // Preserve every existing baseLevel, including higher teacher-assessed levels.
  const evidenceById = new Map([
    ['oge_22_08', {text:'10.10.26: Марина разбирала отражение участков графика ниже Ox при построении y=|f(x)| и выполняла упражнения с опорой.',href:'10.10.26.html#rule'}],
    ['oge_22_02', {text:'10.10.26: строилась парабола до и после применения модуля по вершине и опорным точкам.',href:'10.10.26.html#parabola'}],
    ['oge_22_03', {text:'10.10.26: проверялось вычисление координат вершины с учётом знака коэффициента b; ошибки исправлялись с помощью преподавателя.',href:'10.10.26.html#parabola'}],
    ['oge_22_04', {text:'10.10.26: нули квадратичной функции использовались для определения отражаемого участка.',href:'10.10.26.html#parabola'}],
    ['oge_22_05', {text:'10.10.26: составлялась таблица значений гиперболы −2/x и строился график после применения модуля.',href:'10.10.26.html#hyperbola'}],
    ['oge_22_06', {text:'10.10.26: отрабатывалось отражение относительно Ox и действие внешнего минуса перед модулем.',href:'10.10.26.html#minus'}],
    ['oge_22_11', {text:'10.10.26: исследовалось положение горизонтальной прямой y=m относительно графика с модулем.',href:'10.10.26.html#ym'}],
    ['oge_22_12', {text:'10.10.26: определялось максимальное число пересечений графика y=|x²+4x−5| с горизонтальной прямой; результат — четыре.',href:'10.10.26.html#ym'}]
  ]);

  let count = 0;
  for (const group of data.groups) {
    for (const item of group.items) {
      const evidence = evidenceById.get(item.id);
      if (!evidence) continue;
      item.evidence = evidence;
      count++;
    }
  }
  data.updated = '10.10.2026';
  data.latestLesson = {
    date: '10.10.26',
    title: 'Графики функций с модулем',
    href: '10.10.26.html',
    labHref: '10.10.26-lab.html',
    coveredCount: count
  };
})();
