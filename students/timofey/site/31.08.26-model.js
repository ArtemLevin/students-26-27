(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root) root.GraphLabModel=api;
})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const EPS = 1e-9;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const snap = (v, step = 0.25) => Math.round(v / step) * step;
const near = (a, b, eps = 1e-7) => Math.abs(a - b) <= eps;
const deepClone = value => JSON.parse(JSON.stringify(value));

function solveQuadratic(a, b, c) {
  if (Math.abs(a) < EPS) {
    if (Math.abs(b) < EPS) return Math.abs(c) < EPS ? { kind: 'infinite', roots: [] } : { kind: 'none', roots: [] };
    return { kind: 'finite', roots: [-c / b], discriminant: null };
  }
  const d = b * b - 4 * a * c;
  if (d < -EPS) return { kind: 'finite', roots: [], discriminant: d };
  if (Math.abs(d) <= EPS) return { kind: 'finite', roots: [-b / (2 * a)], discriminant: 0 };
  const s = Math.sqrt(d);
  return { kind: 'finite', roots: [(-b - s) / (2 * a), (-b + s) / (2 * a)].sort((x, y) => x - y), discriminant: d };
}

function deriveLineFromPoints(p1, p2) {
  const dx = p2.x - p1.x;
  if (Math.abs(dx) < 0.25) return { valid: false, reason: 'Точки должны иметь разные абсциссы: вертикальная прямая не задаётся формулой y = kx + b.' };
  const dy = p2.y - p1.y;
  const k = dy / dx;
  const b = p1.y - k * p1.x;
  return { valid: true, k, b, dx, dy, eval: x => k * x + b };
}

function deriveQuadraticFixedA(a, p1, p2) {
  const dx = p2.x - p1.x;
  if (Math.abs(dx) < 0.25) return { valid: false, reason: 'Для двух независимых условий нужны разные абсциссы узловых точек.' };
  if (Math.abs(a) < 0.05) return { valid: false, reason: 'Коэффициент a должен отличаться от нуля, иначе парабола превращается в прямую.' };
  // y - ax² = bx + c
  const r1 = p1.y - a * p1.x * p1.x;
  const r2 = p2.y - a * p2.x * p2.x;
  const b = (r2 - r1) / dx;
  const c = r1 - b * p1.x;
  const vertexX = -b / (2 * a);
  const vertexY = a * vertexX * vertexX + b * vertexX + c;
  const roots = solveQuadratic(a, b, c);
  return { valid: true, a, b, c, vertexX, vertexY, roots, eval: x => a * x * x + b * x + c };
}

function deriveHyperbolaFromPoints(p1, p2) {
  if (Math.abs(p1.x) < 0.2 || Math.abs(p2.x) < 0.2) return { valid: false, reason: 'x = 0 запрещён: здесь находится вертикальная асимптота.' };
  const denom = 1 / p1.x - 1 / p2.x;
  if (Math.abs(denom) < EPS) return { valid: false, reason: 'Нужны узловые точки с разными абсциссами.' };
  const k = (p1.y - p2.y) / denom;
  const a = p1.y - k / p1.x;
  return { valid: true, k, a, horizontalAsymptote: a, eval: x => Math.abs(x) < EPS ? NaN : k / x + a };
}

function deriveIntersections(config) {
  const { family, line, other } = config;
  const f = x => line.k * x + line.b;
  if (family === 'line-line') {
    const g = x => other.k * x + other.b;
    const dk = line.k - other.k;
    const db = line.b - other.b;
    if (Math.abs(dk) < EPS) {
      return { f, g, kind: Math.abs(db) < EPS ? 'infinite' : 'none', points: [], difference: x => f(x) - g(x) };
    }
    const x = -db / dk;
    return { f, g, kind: 'finite', points: [{ x, y: f(x) }], difference: x => f(x) - g(x) };
  }
  if (family === 'line-parabola') {
    const g = x => other.a * x * x + other.b * x + other.c;
    const roots = solveQuadratic(other.a, other.b - line.k, other.c - line.b);
    return { f, g, kind: roots.kind, points: roots.roots.map(x => ({ x, y: f(x) })), discriminant: roots.discriminant, difference: x => f(x) - g(x) };
  }
  const g = x => Math.abs(x) < EPS ? NaN : other.k / x + other.a;
  // line.k*x + line.b = other.k/x + other.a
  // line.k*x² + (line.b-other.a)x - other.k = 0
  const roots = solveQuadratic(line.k, line.b - other.a, -other.k);
  return { f, g, kind: roots.kind, points: roots.roots.filter(x => Math.abs(x) > 1e-7).map(x => ({ x, y: f(x) })), discriminant: roots.discriminant, difference: x => f(x) - g(x) };
}

const BASE_FUNCTIONS = {
  line: { label: 'y = x', eval: x => x, domain: () => true },
  parabola: { label: 'y = x²', eval: x => x * x, domain: () => true },
  abs: { label: 'y = |x|', eval: x => Math.abs(x), domain: () => true },
  sqrt: { label: 'y = √x', eval: x => Math.sqrt(x), domain: x => x >= 0 },
  hyperbola: { label: 'y = 1/x', eval: x => 1 / x, domain: x => Math.abs(x) > EPS }
};

function deriveTransform(config) {
  const base = BASE_FUNCTIONS[config.base] || BASE_FUNCTIONS.abs;
  const signX = config.reflectY ? -1 : 1;
  const signY = config.reflectX ? -1 : 1;
  const sourceArg = x => signX * (x - config.h);
  const evalTransformed = x => {
    const u = sourceArg(x);
    if (!base.domain(u)) return NaN;
    return signY * base.eval(u) + config.v;
  };
  return { base, sourceArg, eval: evalTransformed };
}

const LAB_META = {
  line: {
    title: 'Лаборатория прямой',
    lead: 'Тяните узловые точки A и B. Формула, наклон и значение f(x₀) пересчитываются из их координат.',
    learning: ['две точки определяют k и b', 'k = Δy/Δx показывает наклон', 'b — значение при x = 0', 'вертикальная прямая не является графиком y = kx + b'],
    guide: [
      ['1 · Две точки', 'Положение A и B задаёт два независимых условия для k и b.'],
      ['2 · Наклон', 'Сравните Δy и Δx: их отношение равно k.'],
      ['3 · Свободный член', 'Посмотрите, где прямая пересекает Oy: это b = f(0).'],
      ['4 · Проверка', 'Подставьте x₀: точка-пробник должна лежать на той же прямой.']
    ],
    challenge: { text: 'Добейтесь k = 2 и b = 1.', check: d => d.valid && near(d.k, 2, 0.03) && near(d.b, 1, 0.05) }
  },
  quadratic: {
    title: 'Лаборатория параболы',
    lead: 'Коэффициент a задаётся отдельно, а две узловые точки определяют b и c. Вершина и корни обновляются автоматически.',
    learning: ['при известном a двух точек достаточно для b и c', 'точка с x = 0 мгновенно показывает c', 'знак a задаёт направление ветвей', 'вершина и корни следуют из коэффициентов'],
    guide: [
      ['1 · Известный a', 'В модели a уже задан, поэтому неизвестны только b и c.'],
      ['2 · Узловые точки', 'Каждая точка даёт уравнение y = ax² + bx + c.'],
      ['3 · Точка x = 0', 'Если один узел лежит на Oy, его ордината сразу равна c.'],
      ['4 · Свойства', 'Из найденных коэффициентов модель вычисляет вершину, дискриминант и корни.']
    ],
    challenge: { text: 'Сделайте так, чтобы c = 0 и парабола проходила через начало координат.', check: d => d.valid && near(d.c, 0, 0.05) }
  },
  hyperbola: {
    title: 'Лаборатория гиперболы',
    lead: 'Тяните две точки функции y = k/x + a. Наблюдайте, как меняются k, горизонтальная асимптота y = a и значение в точке x₀.',
    learning: ['x = 0 всегда исключён', 'две узловые точки определяют k и a', 'a задаёт горизонтальную асимптоту', 'знак k меняет расположение ветвей'],
    guide: [
      ['1 · ОДЗ', 'Вертикальная линия x = 0 остаётся недоступной для графика.'],
      ['2 · Два условия', 'Координаты A и B подставляются в y = k/x + a.'],
      ['3 · Асимптота', 'Найденный a одновременно является высотой горизонтальной асимптоты.'],
      ['4 · Проверка', 'Измените обе ординаты одинаково и проследите, что k сохраняется, а a сдвигается.']
    ],
    challenge: { text: 'Добейтесь горизонтальной асимптоты y = 2.', check: d => d.valid && near(d.a, 2, 0.05) }
  },
  intersections: {
    title: 'Лаборатория пересечений',
    lead: 'Меняйте параметры двух графиков. Точки пересечения и график разности h(x)=f(x)−g(x) пересчитываются синхронно.',
    learning: ['пересечение означает f(x)=g(x)', 'нули h(x)=f(x)−g(x) совпадают с абсциссами пересечений', 'у прямой и параболы бывает 0, 1 или 2 пересечения', 'параллельные прямые могут не пересекаться'],
    guide: [
      ['1 · Два графика', 'Одновременно видны f и g.'],
      ['2 · Разность', 'Модель строит h(x)=f(x)−g(x).'],
      ['3 · Нули h', 'Когда h(x)=0, значения f и g совпадают.'],
      ['4 · Число решений', 'Меняйте параметры и получите 0, 1 или 2 точки пересечения.']
    ],
    challenge: { text: 'В режиме «прямая + парабола» получите ровно одну точку пересечения.', check: d => d.kind === 'finite' && d.points.length === 1 }
  },
  transforms: {
    title: 'Лаборатория преобразований',
    lead: 'Сравнивайте исходный график-призрак и преобразованный график. Тяните опорную точку или меняйте h и v.',
    learning: ['f(x−h) сдвигает график вправо на h', 'f(x)+v сдвигает график вверх на v', '−f(x) отражает относительно Ox', 'f(−x) отражает относительно Oy'],
    guide: [
      ['1 · Исходник', 'Серый пунктир — базовый график f(x).'],
      ['2 · Горизонталь', 'Положительное h в f(x−h) перемещает график вправо.'],
      ['3 · Вертикаль', 'Добавление v меняет все ординаты на одно и то же число.'],
      ['4 · Отражения', 'Переключатели −f(x) и f(−x) меняют ориентацию графика относительно осей.']
    ],
    challenge: { text: 'Для y=|x| задайте h = 3 и v = 2.', check: d => d.config?.base === 'abs' && near(d.config.h, 3, 0.05) && near(d.config.v, 2, 0.05) }
  }
};

const SCENARIOS = {
  line: [
    ['base', 'Рост', { p1: { x: -2, y: 1 }, p2: { x: 2, y: 5 }, probeX: 6 }],
    ['fall', 'Убывание', { p1: { x: -3, y: 4 }, p2: { x: 1, y: -4 }, probeX: 0 }],
    ['horizontal', 'k = 0', { p1: { x: -3, y: 2 }, p2: { x: 3, y: 2 }, probeX: 1 }],
    ['origin', 'Через (0;0)', { p1: { x: -2, y: -4 }, p2: { x: 2, y: 4 }, probeX: 3 }],
    ['steep', 'Почти вертикальная', { p1: { x: -0.5, y: -5 }, p2: { x: 0.5, y: 5 }, probeX: 1 }]
  ],
  quadratic: [
    ['base', 'Базовый', { a: 1, p1: { x: 0, y: -3 }, p2: { x: 2, y: 3 }, probeX: -1 }],
    ['x0', 'x = 0 даёт c', { a: 2, p1: { x: 0, y: -4 }, p2: { x: 1, y: 1 }, probeX: 3 }],
    ['down', 'Ветви вниз', { a: -1, p1: { x: 0, y: 4 }, p2: { x: 2, y: 0 }, probeX: -2 }],
    ['double', 'Касание Ox', { a: 1, p1: { x: 0, y: 1 }, p2: { x: 2, y: 1 }, probeX: 1 }]
  ],
  hyperbola: [
    ['base', 'k > 0', { p1: { x: -2, y: -1 }, p2: { x: 1, y: 5 }, probeX: 4 }],
    ['negative', 'k < 0', { p1: { x: -2, y: 4 }, p2: { x: 2, y: 0 }, probeX: 4 }],
    ['shift', 'Сдвиг вверх', { p1: { x: -2, y: 0 }, p2: { x: 2, y: 4 }, probeX: 3 }],
    ['near', 'У асимптоты', { p1: { x: -0.5, y: -5 }, p2: { x: 1, y: 4 }, probeX: 0.5 }]
  ],
  intersections: [
    ['two-lines', 'Две прямые', { family: 'line-line', line: { k: 2, b: 4 }, other: { k: -2, b: 7 }, probeX: 0 }],
    ['parallel', 'Параллельные', { family: 'line-line', line: { k: 1, b: 1 }, other: { k: 1, b: -2 }, probeX: 0 }],
    ['two', '2 пересечения', { family: 'line-parabola', line: { k: 0, b: 2 }, other: { a: 1, b: 0, c: -2 }, probeX: 0 }],
    ['tangent', 'Касание', { family: 'line-parabola', line: { k: 0, b: 0 }, other: { a: 1, b: 0, c: 0 }, probeX: 0 }],
    ['hyper', 'Прямая + гипербола', { family: 'line-hyperbola', line: { k: 1, b: 1 }, other: { k: 2, a: 0 }, probeX: 2 }]
  ],
  transforms: [
    ['abs', '|x|', { base: 'abs', h: 0, v: 0, reflectX: false, reflectY: false, probeX: 2 }],
    ['right', 'Вправо 3', { base: 'abs', h: 3, v: 0, reflectX: false, reflectY: false, probeX: 3 }],
    ['up', 'Вверх 2', { base: 'parabola', h: 0, v: 2, reflectX: false, reflectY: false, probeX: 1 }],
    ['reflect', 'Отражение', { base: 'sqrt', h: 0, v: 0, reflectX: true, reflectY: false, probeX: 4 }],
    ['both', 'Два сдвига', { base: 'hyperbola', h: 2, v: -1, reflectX: false, reflectY: false, probeX: 4 }]
  ]
};

const TASKS = [
  { mode: 'line', label: '1', title: 'Задача 1', config: { p1: { x: -2, y: 1 }, p2: { x: 2, y: 5 }, probeX: 6 } },
  { mode: 'line', label: '2', title: 'Задача 2', config: { p1: { x: -3, y: 4 }, p2: { x: 1, y: -4 }, probeX: 0 } },
  { mode: 'quadratic', label: '3', title: 'Задача 3', config: { a: 1, p1: { x: 0, y: -3 }, p2: { x: 2, y: 3 }, probeX: -1 } },
  { mode: 'intersections', label: '4', title: 'Задача 4', config: { family: 'line-line', line: { k: 2, b: 4 }, other: { k: -2, b: 7 }, probeX: 0 } },
  { mode: 'hyperbola', label: '5', title: 'Задача 5', config: { p1: { x: -2, y: -1 }, p2: { x: 1, y: 5 }, probeX: 4 } },
  { mode: 'quadratic', label: '6', title: 'Задача 6', config: { a: 2, p1: { x: 0, y: 5 }, p2: { x: -2, y: 3 }, probeX: 3 } },
  { mode: 'line', label: '7', title: 'Задача 7', config: { p1: { x: -4, y: 3 }, p2: { x: 2, y: -6 }, probeX: -2 } },
  { mode: 'hyperbola', label: '8', title: 'Задача 8', config: { p1: { x: -4, y: 0 }, p2: { x: 2, y: 3 }, probeX: -5 } },
  { mode: 'intersections', label: '9', title: 'Задача 9', config: { family: 'line-parabola', line: { k: 2, b: 2 }, other: { a: 1, b: 3, c: -2 }, probeX: 0 } },
  { mode: 'intersections', label: '10', title: 'Задача 10', config: { family: 'line-hyperbola', line: { k: 1, b: 1 }, other: { k: 2, a: 0 }, probeX: 1 } }
];

function initialConfig(mode) {
  const row = SCENARIOS[mode]?.[0];
  return deepClone(row?.[2] || {});
}

function deriveMode(mode, config) {
  if (mode === 'line') {
    const d = deriveLineFromPoints(config.p1, config.p2);
    if (!d.valid) return d;
    const value = d.eval(config.probeX);
    const xIntercept = Math.abs(d.k) < EPS ? null : -d.b / d.k;
    return { ...d, probeX: config.probeX, probeY: value, xIntercept };
  }
  if (mode === 'quadratic') {
    const d = deriveQuadraticFixedA(config.a, config.p1, config.p2);
    if (!d.valid) return d;
    return { ...d, probeX: config.probeX, probeY: d.eval(config.probeX) };
  }
  if (mode === 'hyperbola') {
    const d = deriveHyperbolaFromPoints(config.p1, config.p2);
    if (!d.valid) return d;
    return { ...d, probeX: config.probeX, probeY: d.eval(config.probeX) };
  }
  if (mode === 'intersections') {
    const d = deriveIntersections(config);
    return { ...d, probeX: config.probeX, fProbe: d.f(config.probeX), gProbe: d.g(config.probeX), diffProbe: d.difference(config.probeX) };
  }
  const d = deriveTransform(config);
  return { ...d, config, probeX: config.probeX, baseY: d.base.domain(config.probeX) ? d.base.eval(config.probeX) : NaN, transformedY: d.eval(config.probeX) };
}

return {EPS,clamp,snap,near,deepClone,solveQuadratic,deriveLineFromPoints,deriveQuadraticFixedA,deriveHyperbolaFromPoints,deriveIntersections,BASE_FUNCTIONS,deriveTransform,LAB_META,SCENARIOS,TASKS,initialConfig,deriveMode};
});
