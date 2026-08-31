const {
  EPS, clamp, snap, near, deepClone, deriveLineFromPoints, deriveHyperbolaFromPoints,
  deriveMode, LAB_META, SCENARIOS, TASKS, BASE_FUNCTIONS, initialConfig
} = window.GraphLabModel;

const $ = id => document.getElementById(id);
const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];
const fmt = (v, digits = 2) => {
  if (!Number.isFinite(v)) return '—';
  const n = Math.abs(v) < 1e-10 ? 0 : v;
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits }).format(n);
};
const signed = (v, digits = 2) => `${v >= 0 ? '+' : '−'} ${fmt(Math.abs(v), digits)}`;
const clone = deepClone;
const configEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const VIEW_BASE = {
  line: { xmin: -7, xmax: 7, ymin: -8, ymax: 9 },
  quadratic: { xmin: -7, xmax: 7, ymin: -8, ymax: 10 },
  hyperbola: { xmin: -7, xmax: 7, ymin: -8, ymax: 8 },
  intersections: { xmin: -7, xmax: 7, ymin: -8, ymax: 10 },
  transforms: { xmin: -7, xmax: 7, ymin: -7, ymax: 9 }
};

const state = {
  mode: 'line', scenario: 'base', config: initialConfig('line'),
  view: { zoom: 1, panX: 0, panY: 0 }, guideStep: 0,
  snapshot: null, predictionChoice: null, predictionBackup: null, predictionResult: null,
  history: [], historyIndex: -1, status: '', statusTone: '', discoverySeen: new Set(),
  playing: false, autoT: 0, autoBase: null, speed: 1, raf: 0, lastTs: 0,
  modalOpen: false, drag: null, scheduled: false,
  achievements: loadAchievements()
};

const EXERCISE_COPY = [
  { note: 'Восстановите f(x)=kx+b и найдите f(6).', answer: 'f(x)=x+3; f(6)=9.', solution: ['Составьте два уравнения по точкам A и B.', 'Получите k=1 и b=3.', 'Запишите f(x)=x+3.', 'Подставьте x=6: f(6)=9.'] },
  { note: 'Восстановите формулу прямой и найдите f(0).', answer: 'f(x)=−2x−2; f(0)=−2.', solution: ['По двум точкам найдите k=−2.', 'Из любой точки получите b=−2.', 'При x=0 значение функции равно b.'] },
  { note: 'Для f(x)=x²+bx+c восстановите формулу и найдите f(−1).', answer: 'f(x)=x²+x−3; f(−1)=−3.', solution: ['Точка (0;−3) сразу даёт c=−3.', 'Вторая точка даёт b=1.', 'Подставьте x=−1.'] },
  { note: 'Восстановите две прямые и найдите абсциссу точки пересечения.', answer: 'f(x)=2x+4; g(x)=−2x+7; x=3/4.', solution: ['Восстановите обе формулы.', 'Приравняйте f(x)=g(x).', 'Решите 2x+4=−2x+7.'] },
  { note: 'Восстановите f(x)=k/x+a и найдите f(4).', answer: 'f(x)=4/x+1; f(4)=2.', solution: ['Подставьте обе точки.', 'Система даёт k=4 и a=1.', 'Подставьте x=4.'] },
  { note: 'Для f(x)=2x²+bx+c восстановите формулу и найдите f(3).', answer: 'f(x)=2x²+5x+5; f(3)=38.', solution: ['Из x=0 получите c=5.', 'По второй точке найдите b=5.', 'Подставьте x=3.'] },
  { note: 'Восстановите прямую и найдите пересечение с Ox.', answer: 'f(x)=−3x/2−3; x=−2.', solution: ['Найдите k и b.', 'На Ox выполняется f(x)=0.', 'Решите линейное уравнение.'] },
  { note: 'Восстановите гиперболу и найдите x, если f(x)=0,2.', answer: 'f(x)=4/x+1; x=−5.', solution: ['Найдите k=4 и a=1.', 'Решите 4/x+1=0,2.', 'Проверьте x≠0.'] },
  { note: 'Восстановите параболу и прямую, найдите все абсциссы пересечения.', answer: 'x₁,₂=(−1±√17)/2.', solution: ['Получите f=x²+3x−2 и g=2x+2.', 'Приравняйте функции.', 'Решите x²+x−4=0.'] },
  { note: 'Восстановите гиперболу и прямую, найдите точки пересечения.', answer: '(−2;−1) и (1;2).', solution: ['Получите f=2/x и g=x+1.', 'Решите 2/x=x+1 при x≠0.', 'Подставьте найденные x в любую функцию.'] }
];

const STEP_EXAMPLES = {
  'line-example': { mode: 'line', config: { p1: { x: -1, y: -3 }, p2: { x: 3, y: 4 }, probeX: -5 } },
  'parabola-example': { mode: 'quadratic', config: { a: 2, p1: { x: 0, y: -4 }, p2: { x: 1, y: 1 }, probeX: 3 } },
  'hyperbola-example': { mode: 'hyperbola', config: { p1: { x: -3, y: 0 }, p2: { x: 1, y: 4 }, probeX: 4 } },
  'intersection-example': { mode: 'intersections', config: { family: 'line-line', line: { k: 2, b: 4 }, other: { k: -2, b: 7 }, probeX: 0 } }
};

const els = {};
function cacheEls() {
  [
    'labTitle','labLead','labModeTabs','labScenarios','labStage','labStageNote','labKpis','labFormula','labInsight','labBars',
    'labControls','labSwitches','labGuideCopy','labStepPrev','labStepNext','labStepReset','labChallenge','labChallengeStatus','labChallengeProgress',
    'labPrediction','labPredictionPrompt','labPredictionOptions','labPredictionRun','labPredictionReset','labPredictionResult',
    'labSnapshot','labClearSnapshot','labCompare','labUndo','labRedo','labZoomIn','labZoomOut','labViewReset','labExpand','labStatus','labLegend','labAchievement',
    'labAutoPlay','labAutoReset','labAutoSlider','labAutoSpeed','labAutoValue',
    'labModal','closeLabModal','modalLabTitle','modalLabLead','modalLabStage','modalLabKpis','modalLabFormula','modalLabInsight','modalLabControls','modalLabSwitches','modalLabScenarios','modalLabLegend',
    'poster','imageModal','closeImageModal','detail','theme','printBtn','sectionIndicator','exerciseList','quizScore','quizReset','readyBar','readyText'
  ].forEach(id => els[id] = $(id));
}

function loadAchievements() {
  try { return JSON.parse(localStorage.getItem('timofey-310826-lab-achievements') || '{}') || {}; }
  catch (_) { return {}; }
}
function saveAchievements() {
  try { localStorage.setItem('timofey-310826-lab-achievements', JSON.stringify(state.achievements)); } catch (_) {}
}

function historySnapshot() {
  return { mode: state.mode, scenario: state.scenario, config: clone(state.config), view: clone(state.view) };
}
function commitHistory() {
  const snap = historySnapshot();
  const current = state.history[state.historyIndex];
  if (current && current.mode === snap.mode && current.scenario === snap.scenario && configEqual(current.config, snap.config) && configEqual(current.view, snap.view)) return;
  state.history = state.history.slice(0, state.historyIndex + 1);
  state.history.push(snap);
  if (state.history.length > 40) state.history.shift();
  state.historyIndex = state.history.length - 1;
}
function restoreHistory(index) {
  const snap = state.history[index]; if (!snap) return;
  stopAuto(); state.mode = snap.mode; state.scenario = snap.scenario; state.config = clone(snap.config); state.view = clone(snap.view);
  state.guideStep = 0; state.predictionChoice = null; state.predictionResult = null; state.historyIndex = index; scheduleRender();
}

function currentDerived() { return deriveMode(state.mode, state.config); }
function scenarioRows() { return SCENARIOS[state.mode] || []; }
function setStatus(text = '', tone = '') { state.status = text; state.statusTone = tone; scheduleRender(); }
function resetView() { state.view = { zoom: 1, panX: 0, panY: 0 }; }
function stopAuto() { state.playing = false; if (state.raf) cancelAnimationFrame(state.raf); state.raf = 0; state.lastTs = 0; }

function setMode(mode, { keepHistory = false } = {}) {
  if (!LAB_META[mode]) return;
  stopAuto(); state.mode = mode; state.scenario = scenarioRowsFor(mode)[0]?.[0] || 'custom'; state.config = initialConfig(mode);
  state.guideStep = 0; state.snapshot = null; state.predictionChoice = null; state.predictionBackup = null; state.predictionResult = null; state.autoT = 0; state.autoBase = null; resetView();
  if (!keepHistory) commitHistory(); scheduleRender();
}
function scenarioRowsFor(mode) { return SCENARIOS[mode] || []; }
function applyScenario(key) {
  if (key === 'custom') { state.scenario = 'custom'; setStatus('Свободный режим: меняйте объекты и параметры как хотите.'); return; }
  const row = scenarioRows().find(r => r[0] === key); if (!row) return;
  stopAuto(); state.scenario = key; state.config = clone(row[2]); state.guideStep = 0; state.snapshot = null; state.predictionChoice = null; state.predictionResult = null; state.autoT = 0; state.autoBase = null; resetView();
  commitHistory(); scheduleRender();
}
function markCustom() { state.scenario = 'custom'; state.predictionResult = null; }
function loadConfig(mode, config, label = 'Свободный режим', commit = true) {
  stopAuto(); state.mode = mode; state.scenario = 'custom'; state.config = clone(config); state.guideStep = 0; state.predictionChoice = null; state.predictionResult = null; state.autoT = 0; state.autoBase = null; resetView();
  setStatus(label); if (commit) commitHistory(); scheduleRender();
}

function scheduleRender() {
  if (state.scheduled) return; state.scheduled = true;
  requestAnimationFrame(() => { state.scheduled = false; render(); });
}

function getViewBounds() {
  const b = VIEW_BASE[state.mode]; const zx = (b.xmax - b.xmin) / state.view.zoom; const zy = (b.ymax - b.ymin) / state.view.zoom;
  const cx = (b.xmin + b.xmax) / 2 + state.view.panX; const cy = (b.ymin + b.ymax) / 2 + state.view.panY;
  return { xmin: cx - zx / 2, xmax: cx + zx / 2, ymin: cy - zy / 2, ymax: cy + zy / 2 };
}
const SVG_W = 700, SVG_H = 460;
const GRAPH_PAD = { l: 42, r: 18, t: 18, b: 34 };
function graphArea(inset = false) {
  if (inset) return { l: 470, r: 686, t: 325, b: 444 };
  return { l: GRAPH_PAD.l, r: SVG_W - GRAPH_PAD.r, t: GRAPH_PAD.t, b: SVG_H - GRAPH_PAD.b };
}
function mapFns(bounds, area = graphArea()) {
  return {
    X: x => area.l + (x - bounds.xmin) / (bounds.xmax - bounds.xmin) * (area.r - area.l),
    Y: y => area.b - (y - bounds.ymin) / (bounds.ymax - bounds.ymin) * (area.b - area.t),
    xFrom: px => bounds.xmin + (px - area.l) / (area.r - area.l) * (bounds.xmax - bounds.xmin),
    yFrom: py => bounds.ymax - (py - area.t) / (area.b - area.t) * (bounds.ymax - bounds.ymin)
  };
}

function pathFor(fn, bounds, area = graphArea(), domain = () => true, samples = 360) {
  const { X, Y } = mapFns(bounds, area); let d = '', started = false, lastPy = null;
  for (let i = 0; i <= samples; i++) {
    const x = bounds.xmin + (bounds.xmax - bounds.xmin) * i / samples;
    if (!domain(x)) { started = false; lastPy = null; continue; }
    const y = fn(x); if (!Number.isFinite(y) || y < bounds.ymin - 20 || y > bounds.ymax + 20) { started = false; lastPy = null; continue; }
    const px = X(x), py = Y(y); if (lastPy !== null && Math.abs(py - lastPy) > (area.b - area.t) * .55) started = false;
    d += `${started ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)} `; started = true; lastPy = py;
  }
  return d;
}
function gridSvg(bounds, area = graphArea()) {
  const { X, Y } = mapFns(bounds, area); const parts = [];
  const xStep = state.view.zoom > 1.65 ? .5 : state.view.zoom < .8 ? 2 : 1;
  const yStep = xStep;
  const xStart = Math.ceil(bounds.xmin / xStep) * xStep, yStart = Math.ceil(bounds.ymin / yStep) * yStep;
  const isMain = area.l === GRAPH_PAD.l && area.r === SVG_W - GRAPH_PAD.r;
  for (let x = xStart; x <= bounds.xmax + EPS; x += xStep) {
    const px = X(x); parts.push(`<line class="lab-grid-line" x1="${px}" y1="${area.t}" x2="${px}" y2="${area.b}"/>`);
    if (Math.abs(x) > EPS && Number.isInteger(x) && isMain) parts.push(`<text class="lab-tick-label" x="${px+3}" y="${Math.min(area.b-4, Y(0)+14)}">${fmt(x,0)}</text>`);
  }
  for (let y = yStart; y <= bounds.ymax + EPS; y += yStep) {
    const py = Y(y); parts.push(`<line class="lab-grid-line" x1="${area.l}" y1="${py}" x2="${area.r}" y2="${py}"/>`);
    if (Math.abs(y) > EPS && Number.isInteger(y) && isMain) parts.push(`<text class="lab-tick-label" x="${Math.max(area.l+2,X(0)+5)}" y="${py-4}">${fmt(y,0)}</text>`);
  }
  if (bounds.xmin <= 0 && bounds.xmax >= 0) parts.push(`<line class="lab-axis" x1="${X(0)}" y1="${area.t}" x2="${X(0)}" y2="${area.b}"/>`);
  if (bounds.ymin <= 0 && bounds.ymax >= 0) parts.push(`<line class="lab-axis" x1="${area.l}" y1="${Y(0)}" x2="${area.r}" y2="${Y(0)}"/>`);
  parts.push(`<text class="lab-axis-label" x="${area.r-9}" y="${Math.min(area.b-6,Math.max(area.t+14,Y(0)-6))}">x</text>`);
  parts.push(`<text class="lab-axis-label" x="${Math.min(area.r-15,Math.max(area.l+7,X(0)+7))}" y="${area.t+12}">y</text>`);
  return parts.join('');
}
function handleSvg(x, y, label, handle, cls = '', bounds = getViewBounds(), area = graphArea()) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < bounds.xmin - 1 || x > bounds.xmax + 1 || y < bounds.ymin - 1 || y > bounds.ymax + 1) return '';
  const { X, Y } = mapFns(bounds, area); const px = X(x), py = Y(y);
  const hit = handle === 'none' ? '' : `<circle class="lab-point-hit" data-handle="${handle}" cx="${px}" cy="${py}" r="15" tabindex="0" role="button" aria-label="${label}: ${fmt(x)}; ${fmt(y)}"/>`;
  return `<g data-handle-group="${handle}">${hit}<circle class="lab-point ${cls}" cx="${px}" cy="${py}" r="6"/><text class="lab-point-label" x="${px+9}" y="${py-9}">${label}</text></g>`;
}

