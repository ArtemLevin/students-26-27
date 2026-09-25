import {
  LIMITS, SCENARIOS, clamp, snap, routeValues, graphValues, graphDomain,
  routePoint, arcPath, progressFromCircle, routeChallenge, graphChallenge
} from './25.09.26-lab.model.mjs';

const $ = id => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const state = {
  mode: new URLSearchParams(location.search).get('mode') === 'graph' ? 'graph' : 'route',
  route: { radius: 5, turns: 1, progress: 0 },
  graph: { x0: 4, velocity: 5, time: 0 },
  scenario: { route: 'full', graph: 'first' },
  playing: false,
  speed: { route: 1, graph: 1 },
  comparison: { route: null, graph: null },
  prediction: { route: null, graph: null },
  challenge: { route: false, graph: false },
  highlight: { route: 'all', graph: 'all' }
};
let renderRequested = false;
let animationFrame = 0;
let previousTime = null;
let drag = null;
let routePlotKey = '';
let graphGridKey = '';

function fmt(value, digits = 2) {
  const normalized = Math.abs(value) < 1e-9 ? 0 : value;
  return normalized.toLocaleString('ru-RU', { maximumFractionDigits: digits }).replace(/^-/, '−');
}
const length = value => fmt(value) + ' м';
const safeGet = key => { try { return localStorage.getItem(key); } catch { return null; } };
const safeSet = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
function svgElement(tag, attrs, content = null) {
  const el = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  if (content !== null) el.textContent = content;
  return el;
}
function attr(el, values) {
  for (const [key, value] of Object.entries(values)) el.setAttribute(key, value);
}
function requestRender() {
  if (renderRequested) return;
  renderRequested = true;
  requestAnimationFrame(() => {
    renderRequested = false;
    render();
  });
}
function pause() {
  state.playing = false;
  previousTime = null;
  if (animationFrame) cancelAnimationFrame(animationFrame);
  animationFrame = 0;
  requestRender();
}
function activeMax() { return state.mode === 'route' ? 1 : LIMITS.time[1]; }
function activePosition() { return state.mode === 'route' ? state.route.progress : state.graph.time; }
function setPosition(value) {
  if (state.mode === 'route') state.route.progress = clamp(value, 0, 1);
  else state.graph.time = clamp(value, ...LIMITS.time);
  requestRender();
}
function tick(timestamp) {
  if (!state.playing) return;
  if (previousTime === null) previousTime = timestamp;
  const delta = Math.min(80, timestamp - previousTime);
  previousTime = timestamp;
  if (state.mode === 'route') {
    // One full turn takes six seconds at 1×.
    setPosition(state.route.progress + delta * state.speed.route / (6000 * state.route.turns));
  } else {
    // One simulated second per wall second at 1×.
    setPosition(state.graph.time + delta * state.speed.graph / 1000);
  }
  if (activePosition() >= activeMax() - 1e-8) { pause(); return; }
  animationFrame = requestAnimationFrame(tick);
}
function play() {
  if (state.playing) { pause(); return; }
  if (activePosition() >= activeMax() - 1e-8) setPosition(0);
  if (reducedMotion.matches) {
    setPosition(activeMax());
    return;
  }
  state.playing = true;
  previousTime = null;
  animationFrame = requestAnimationFrame(tick);
  requestRender();
}
function replay() { pause(); setPosition(0); play(); }
function setMode(mode) {
  pause();
  state.mode = mode;
  $('route').hidden = mode !== 'route';
  $('graph').hidden = mode !== 'graph';
  for (const target of ['route', 'graph']) {
    const tab = $('tab-' + target);
    const selected = target === mode;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
  }
  try { history.replaceState(null, '', location.pathname + '?mode=' + mode); } catch {}
  requestRender();
}
function selectScenario(mode, key) {
  pause();
  if (key === 'free') {
    state.scenario[mode] = 'free';
    $(mode === 'route' ? 'routeAdvanced' : 'graphAdvanced').open = true;
  } else {
    state.scenario[mode] = key;
    Object.assign(state[mode], SCENARIOS[mode][key]);
  }
  requestRender();
}
function editParameter(mode, key, value) {
  pause();
  state.scenario[mode] = 'free';
  state[mode][key] = value;
  requestRender();
}
function clearPrediction(mode) {
  state.prediction[mode] = null;
  const group = $(mode + 'Predict');
  group.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', 'false'));
  $(mode + 'Reveal').disabled = true;
  $(mode + 'PredictionFeedback').textContent = '';
  $(mode + 'PredictionFeedback').removeAttribute('data-result');
}
function choosePrediction(mode, value) {
  state.prediction[mode] = value;
  $(mode + 'Predict').querySelectorAll('button').forEach(button =>
    button.setAttribute('aria-pressed', String(button.dataset.prediction === value)));
  $(mode + 'Reveal').disabled = false;
}
function reveal(mode) {
  const predicted = state.prediction[mode];
  if (!predicted) return;
  pause();
  state.challenge[mode] = false;
  if (mode === 'route') {
    state.scenario.route = 'full';
    Object.assign(state.route, SCENARIOS.route.full, { progress: 1 });
  } else {
    state.scenario.graph = 'second';
    Object.assign(state.graph, SCENARIOS.graph.second, { time: 5 });
  }
  const correct = predicted === 'zero';
  const feedback = $(mode + 'PredictionFeedback');
  feedback.dataset.result = correct ? 'success' : 'retry';
  feedback.textContent = mode === 'route'
    ? (correct ? 'Верно. ' : 'Получилось 0 м. ') + 'Начало и конец совпали, а путь равен 10π м.'
    : (correct ? 'Верно. ' : 'Получилось 0 м. ') + 'x = −10 + 2 · 5 = 0 м.';
  requestRender();
}
function startChallenge(mode) {
  pause();
  clearPrediction(mode);
  state.challenge[mode] = true;
  if (mode === 'route') {
    state.scenario.route = 'full';
    Object.assign(state.route, SCENARIOS.route.full);
  } else {
    state.scenario.graph = 'second';
    Object.assign(state.graph, SCENARIOS.graph.second);
  }
  const feedback = $(mode + 'ChallengeFeedback');
  feedback.dataset.result = '';
  feedback.textContent = 'Измените состояние самостоятельно. Шкала, рисунок и график связаны.';
  requestRender();
}
function updateChallenge(mode, values) {
  if (!state.challenge[mode]) return;
  const success = mode === 'route' ? routeChallenge(values) : graphChallenge(values);
  const feedback = $(mode + 'ChallengeFeedback');
  if (success) {
    state.challenge[mode] = false;
    feedback.dataset.result = 'success';
    feedback.textContent = mode === 'route'
      ? 'Цель достигнута: S = 10π м, |s⃗| = 0. Точка снова в A.'
      : 'Цель достигнута: при t = 5 с координата x = 0 м.';
  }
}
function setText(id, value) {
  const element = $(id);
  if (element.textContent !== value) element.textContent = value;
}
function makeRoutePlot(radius, turns) {
  const maxPath = 2 * Math.PI * turns * radius;
  const pathPoints = [];
  const displacementPoints = [];
  for (let index = 0; index <= 160; index++) {
    const fraction = index / 160;
    const values = routeValues({ radius, turns, progress: fraction });
    const x = 53 + 512 * fraction;
    pathPoints.push((index ? 'L' : 'M') + x.toFixed(2) + ' ' + (222 - 198 * values.path / maxPath).toFixed(2));
    displacementPoints.push((index ? 'L' : 'M') + x.toFixed(2) + ' ' + (222 - 198 * values.displacement / maxPath).toFixed(2));
  }
  attr($('routePathPlot'), { d: pathPoints.join(' ') });
  attr($('routeDisplacementPlot'), { d: displacementPoints.join(' ') });
  const grid = $('routePlotGrid');
  grid.replaceChildren();
  for (let fraction = 0; fraction <= 1.001; fraction += .25) {
    const x = 53 + fraction * 512;
    grid.append(svgElement('line', { x1:x, y1:24, x2:x, y2:222, class:'svg-grid' }));
    grid.append(svgElement('text', { x:x - (fraction === 1 ? 33 : 6), y:245, class:'svg-label' }, fraction === 1 ? '100%' : fmt(fraction * 100, 0) + '%'));
  }
  for (const fraction of [0, .5, 1]) {
    const y = 222 - fraction * 198;
    grid.append(svgElement('line', { x1:53, y1:y, x2:565, y2:y, class:'svg-grid' }));
    grid.append(svgElement('text', { x:5, y:y + 5, class:'svg-label' }, fmt(maxPath * fraction, 0)));
  }
}
function renderRoute() {
  const value = routeValues(state.route);
  const snapshot = state.comparison.route && routeValues(state.comparison.route);
  const zoom = clamp(170 / (Math.max(value.radius, snapshot?.radius ?? 0) * 8), 1, 3);
  const radiusPx = value.radius * 8 * zoom;
  const start = routePoint(radiusPx, 0);
  const end = routePoint(radiusPx, value.theta);
  const arrowVisible = Math.hypot(end.x - start.x, end.y - start.y) > 20;
  attr($('routeBase'), { r:radiusPx });
  attr($('routeHalfRadius'), { r:radiusPx / 2 });
  attr($('routeRadius'), { y2:start.y });
  attr($('routeStart'), { cy:start.y });
  attr($('routeArc'), { d:arcPath(radiusPx, value.theta) });
  attr($('routeChord'), { x1:start.x, y1:start.y, x2:end.x, y2:end.y, visibility:arrowVisible ? 'visible' : 'hidden' });
  attr($('routeDot'), { cx:end.x, cy:end.y });
  attr($('routeDrag'), { cx:end.x, cy:end.y });
  const samePoint = Math.hypot(end.x - start.x, end.y - start.y) < 12;
  $('routeStartLabel').hidden = samePoint;
  setText('routeEndLabel', samePoint ? 'A = B' : 'B');
  attr($('routeStartLabel'), { x:start.x + 16, y:start.y - 14 });
  attr($('routeEndLabel'), {
    x:clamp(end.x + (end.x > 350 ? -62 : 17), 12, 535),
    y:clamp(end.y + (end.y < 252 ? 28 : -18), 26, 480)
  });
  setText('routeScaleLabel', `R = ${fmt(value.radius,0)} м · масштаб ×${fmt(zoom,1)} · пройдено ${fmt(value.turns * value.progress)} оборота`);
  $('routeGhost').hidden = !snapshot;
  $('routeGhostLegend').hidden = !snapshot;
  if (snapshot) {
    const oldRadius = snapshot.radius * 8 * zoom, a = routePoint(oldRadius, 0), b = routePoint(oldRadius, snapshot.theta);
    attr($('ghostBase'), { cx:300, cy:252, r:oldRadius });
    attr($('ghostArc'), { d:arcPath(oldRadius, snapshot.theta) });
    attr($('ghostChord'), { x1:a.x, y1:a.y, x2:b.x, y2:b.y });
    attr($('ghostDot'), { cx:b.x, cy:b.y });
  }
  const key = value.radius + '/' + value.turns;
  if (routePlotKey !== key) { makeRoutePlot(value.radius, value.turns); routePlotKey = key; }
  const x = 53 + 512 * value.progress;
  const yPath = 222 - 198 * value.path / value.totalPath;
  const yVector = 222 - 198 * value.displacement / value.totalPath;
  attr($('routePlotGuide'), { x1:x, x2:x });
  attr($('routePlotPathDot'), { cx:x, cy:yPath });
  attr($('routePlotVectorDot'), { cx:x, cy:yVector });
  $('routeScene').dataset.highlight = state.highlight.route;
  $('routePlot').dataset.highlight = state.highlight.route;
  setText('radiusValue', length(value.radius));
  setText('turnsValue', fmt(value.turns) + (value.turns === 1 ? ' оборот' : ' оборота'));
  $('radius').value = String(value.radius);
  $('turns').value = String(value.turns);
  $('routeProgress').value = String(Math.round(value.progress * 1000));
  setText('routeProgressValue', fmt(value.progress * 100, 1) + '%');
  setText('angleValue', fmt(value.theta * 180 / Math.PI, 1) + '°');
  setText('pathValue', length(value.path));
  setText('displacementValue', length(value.displacement));
  setText('routeFormula', `S = R·θ = ${fmt(value.radius)} · ${fmt(value.theta,3)} ≈ ${length(value.path)}; |s⃗| = 2R|sin(θ/2)| ≈ ${length(value.displacement)}.`);
  const scale = Math.max(value.path, value.displacement, snapshot?.path ?? 0, snapshot?.displacement ?? 0, 1e-9);
  $('routePathBar').style.width = (100 * value.path / scale) + '%';
  $('routeVectorBar').style.width = (100 * value.displacement / scale) + '%';
  setText('routePathBarLabel', length(value.path));
  setText('routeVectorBarLabel', length(value.displacement));
  let insight = 'В начале движения путь и модуль перемещения равны нулю.';
  const thetaMod = value.theta % (2 * Math.PI);
  if (value.returnToStart) insight = value.theta > 2 * Math.PI + 1e-8
    ? 'Ещё один круг: положение повторилось, а путь вырос. Та же точка не означает тот же путь.'
    : 'Вернулись в A: перемещение равно нулю, хотя путь уже пройден.';
  else if (value.theta > 2 * Math.PI + 1e-8) insight = 'Второй круг идёт по той же линии; общий путь продолжает расти.';
  else if (Math.abs(thetaMod - Math.PI) < .07) insight = 'Напротив A: хорда равна диаметру 2R, путь равен полуокружности πR.';
  else if (thetaMod > Math.PI) insight = 'После половины оборота хорда укорачивается, а путь продолжает расти.';
  else if (value.theta > .01) insight = 'Удлиняйте дугу: путь складывается из всего маршрута, вектор соединяет только A и B.';
  if (snapshot && snapshot.displacement < 1e-8 && value.displacement < 1e-8 && Math.abs(snapshot.path - value.path) > .01)
    insight = 'Обе конечные точки совпали с A, но пройденные пути различны. Сравните числа ниже.';
  setText('routeInsight', insight);
  $('routeComparison').hidden = !snapshot;
  $('routeClear').hidden = !snapshot;
  if (snapshot) {
    setText('routeOldRadius', length(snapshot.radius)); setText('routeNewRadius', length(value.radius));
    setText('routeOldPath', length(snapshot.path)); setText('routeNewPath', length(value.path));
    setText('routeOldVector', length(snapshot.displacement)); setText('routeNewVector', length(value.displacement));
  }
  for (const button of document.querySelectorAll('[data-route-scenario]'))
    button.setAttribute('aria-pressed', String(button.dataset.routeScenario === state.scenario.route));
  for (const button of document.querySelectorAll('[data-legend]'))
    button.setAttribute('aria-pressed', String(button.dataset.legend === state.highlight.route));
  $('routePlay').textContent = state.playing ? 'Пауза' : 'Запустить';
  $('routePrev').disabled = value.progress <= 1e-8;
  $('routeNext').disabled = value.completed;
  $('routeSpeed').value = String(state.speed.route);
  updateChallenge('route', value);
}
function graphX(time) { return 58 + 506 * time / 10; }
function graphY(coordinate, domain) { return 272 - 250 * (coordinate - domain.min) / (domain.max - domain.min); }
function axisX(coordinate, domain) { return 53 + 507 * (coordinate - domain.min) / (domain.max - domain.min); }
function drawGraphGrid(domain) {
  const key = domain.min + '/' + domain.max;
  if (graphGridKey === key) return;
  graphGridKey = key;
  const grid = $('graphGrid'), ticks = $('axisTicks');
  grid.replaceChildren();
  ticks.replaceChildren();
  for (let index = 0; index <= 5; index++) {
    const t = index * 2, x = graphX(t);
    grid.append(svgElement('line', { x1:x, y1:22, x2:x, y2:272, class:'svg-grid' }));
    grid.append(svgElement('text', { x:x - (t === 10 ? 15 : 5), y:301, class:'svg-label' }, String(t)));
  }
  const span = domain.max - domain.min;
  const step = Math.max(5, 5 * Math.ceil(span / 25));
  for (let value = Math.ceil(domain.min / step) * step; value <= domain.max + 1e-7; value += step) {
    const y = graphY(value, domain), x = axisX(value, domain);
    grid.append(svgElement('line', { x1:58, y1:y, x2:564, y2:y, class:'svg-grid' }));
    grid.append(svgElement('text', { x:5, y:y + 5, class:'svg-label' }, String(value)));
    ticks.append(svgElement('line', { x1:x, y1:114, x2:x, y2:129, class:'svg-grid' }));
    ticks.append(svgElement('text', { x:x - (value < 0 ? 13 : 7), y:196, class:'svg-label' }, String(value)));
  }
  grid.append(svgElement('text', { x:548, y:311, class:'svg-label' }, 't, с'));
  grid.append(svgElement('text', { x:12, y:18, class:'svg-label' }, 'x, м'));
  ticks.append(svgElement('text', { x:553, y:143, class:'svg-label' }, 'x, м'));
}
function renderGraph() {
  const value = graphValues(state.graph);
  const snapshot = state.comparison.graph && graphValues(state.comparison.graph);
  const domain = graphDomain(value, snapshot);
  drawGraphGrid(domain);
  const startX = axisX(value.x0, domain), currentX = axisX(value.coordinate, domain);
  attr($('axisStart'), { cx:startX });
  attr($('axisDot'), { cx:currentX });
  attr($('axisDrag'), { cx:currentX });
  attr($('axisVector'), {
    x1:startX, x2:currentX,
    visibility:Math.abs(currentX - startX) > 20 ? 'visible' : 'hidden'
  });
  attr($('axisStartLabel'), { x:clamp(startX - 13, 8, 565) });
  attr($('axisDotLabel'), { x:clamp(currentX - 5, 8, 565) });
  setText('axisDotLabel', Math.abs(currentX - startX) < 20 ? 'x₀ = x' : 'x');
  const line = `M ${graphX(0)} ${graphY(value.x0, domain)} L ${graphX(10)} ${graphY(value.endpoint, domain)}`;
  attr($('graphLine'), { d:line });
  const dotX = graphX(value.time), dotY = graphY(value.coordinate, domain);
  attr($('graphDot'), { cx:dotX, cy:dotY });
  attr($('graphGuideVertical'), { x1:dotX, y1:dotY, x2:dotX, y2:272 });
  attr($('graphGuideHorizontal'), { x1:58, y1:dotY, x2:dotX, y2:dotY });
  $('graphGhost').hidden = !snapshot;
  $('graphPlotGhost').hidden = !snapshot;
  $('graphGhostLegend').hidden = !snapshot;
  if (snapshot) {
    attr($('ghostAxisVector'), { x1:axisX(snapshot.x0, domain), y1:71, x2:axisX(snapshot.coordinate, domain), y2:71 });
    attr($('ghostAxisDot'), { cx:axisX(snapshot.coordinate, domain), cy:121 });
    attr($('ghostGraphLine'), {
      d:`M ${graphX(0)} ${graphY(snapshot.x0, domain)} L ${graphX(10)} ${graphY(snapshot.endpoint, domain)}`
    });
    attr($('ghostGraphDot'), { cx:graphX(snapshot.time), cy:graphY(snapshot.coordinate, domain) });
  }
  $('graphScene').dataset.highlight = state.highlight.graph;
  $('graphPlot').dataset.highlight = state.highlight.graph;
  $('initial').value = String(value.x0); $('velocity').value = String(value.velocity);
  $('time').value = String(value.time);
  setText('initialValue', length(value.x0));
  setText('velocityValue', fmt(value.velocity) + ' м/с');
  setText('timeValue', fmt(value.time, 2) + ' с');
  setText('graphTimeValue', fmt(value.time, 2) + ' с');
  setText('coordinateValue', length(value.coordinate));
  setText('deltaValue', length(value.delta));
  const velocityTerm = value.velocity < 0 ? '− ' + fmt(-value.velocity) : '+ ' + fmt(value.velocity);
  setText('graphFormula', `x = x₀ + vₓt = ${fmt(value.x0)} ${velocityTerm} · ${fmt(value.time,2)} = ${length(value.coordinate)}.`);
  let insight = value.time === 0 ? 'При t = 0 текущее положение совпадает с x₀.' :
    value.velocity === 0 ? 'Покой: время идёт, положение и график остаются на одном уровне.' :
    value.velocity < 0 ? 'Отрицательная проекция скорости: координата уменьшается, прямая идёт вниз.' :
    'Положительная проекция скорости: координата растёт, прямая идёт вверх.';
  if (Math.abs(value.coordinate) < 1e-8 && value.time > 0) insight = 'Точка пересекла начало координат: x = 0, но пройденное перемещение sₓ может быть ненулевым.';
  if (snapshot && Math.abs(snapshot.velocity - value.velocity) < 1e-9 && snapshot.x0 !== value.x0)
    insight = 'Наклон одинаков: изменение x₀ сдвинуло прямую, скорость сохранилась.';
  if (snapshot && snapshot.x0 === value.x0 && snapshot.velocity !== value.velocity)
    insight = 'Начальная точка одинаковая, но другой vₓ изменил наклон прямой.';
  setText('graphInsight', insight);
  $('graphComparison').hidden = !snapshot;
  $('graphClear').hidden = !snapshot;
  if (snapshot) {
    setText('graphOldInitial', length(snapshot.x0)); setText('graphNewInitial', length(value.x0));
    setText('graphOldVelocity', fmt(snapshot.velocity) + ' м/с'); setText('graphNewVelocity', fmt(value.velocity) + ' м/с');
    setText('graphOldCoordinate', length(snapshot.coordinate)); setText('graphNewCoordinate', length(value.coordinate));
  }
  for (const button of document.querySelectorAll('[data-graph-scenario]'))
    button.setAttribute('aria-pressed', String(button.dataset.graphScenario === state.scenario.graph));
  for (const button of document.querySelectorAll('[data-graph-legend]'))
    button.setAttribute('aria-pressed', String(button.dataset.graphLegend === state.highlight.graph));
  $('graphPlay').textContent = state.playing ? 'Пауза' : 'Запустить';
  $('graphPrev').disabled = value.time <= 1e-8;
  $('graphNext').disabled = value.time >= LIMITS.time[1] - 1e-8;
  $('graphSpeed').value = String(state.speed.graph);
  updateChallenge('graph', value);
}
function render() { if (state.mode === 'route') renderRoute(); else renderGraph(); }
function stepRoute(direction) {
  pause();
  const quarterTurn = .25 / state.route.turns;
  const index = state.route.progress / quarterTurn;
  setPosition(clamp((direction > 0 ? Math.floor(index + 1e-8) + 1 : Math.ceil(index - 1e-8) - 1) * quarterTurn, 0, 1));
}
function stepGraph(direction) {
  pause();
  setPosition(clamp(direction > 0 ? Math.floor(state.graph.time + 1e-8) + 1 : Math.ceil(state.graph.time - 1e-8) - 1, ...LIMITS.time));
}
function svgCoords(svg, event) {
  const point = svg.createSVGPoint();
  point.x = event.clientX; point.y = event.clientY;
  return point.matrixTransform(svg.getScreenCTM().inverse());
}
function updateDrag(event) {
  if (!drag) return;
  const svg = drag.svg;
  const point = svgCoords(svg, event);
  if (drag.type === 'routeCircle') {
    state.route.progress = progressFromCircle(point.x, point.y, state.route.progress, state.route.turns);
  } else if (drag.type === 'routePlot') {
    state.route.progress = clamp((point.x - 53) / 512, 0, 1);
  } else if (drag.type === 'graphPlot') {
    state.graph.time = snap(clamp((point.x - 58) / 506 * 10, ...LIMITS.time), .01);
  } else if (drag.type === 'graphAxis') {
    const current = graphValues(state.graph);
    if (current.velocity !== 0) {
      const domain = graphDomain(current, state.comparison.graph && graphValues(state.comparison.graph));
      const coordinate = domain.min + (point.x - 53) / 507 * (domain.max - domain.min);
      state.graph.time = snap(clamp((coordinate - current.x0) / current.velocity, ...LIMITS.time), .01);
    }
  }
  requestRender();
}
function attachDrag(svg, type, accept) {
  svg.addEventListener('pointerdown', event => {
    if (!accept(event)) return;
    pause();
    drag = { svg, type, pointerId:event.pointerId };
    svg.setPointerCapture(event.pointerId);
    updateDrag(event);
    event.preventDefault();
  });
  svg.addEventListener('pointermove', event => { if (drag?.svg === svg && drag.pointerId === event.pointerId) updateDrag(event); });
  const stop = event => { if (drag?.svg === svg && drag.pointerId === event.pointerId) drag = null; };
  svg.addEventListener('pointerup', stop);
  svg.addEventListener('pointercancel', stop);
  svg.addEventListener('lostpointercapture', stop);
}

$('theme').textContent = safeGet('ivan-lesson-theme') === 'dark' ? 'Светлая тема' : 'Тёмная тема';
document.documentElement.dataset.theme = safeGet('ivan-lesson-theme') === 'dark' ? 'dark' : 'light';
$('theme').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  $('theme').textContent = next === 'dark' ? 'Светлая тема' : 'Тёмная тема';
  safeSet('ivan-lesson-theme', next);
});
for (const mode of ['route', 'graph']) {
  const tab = $('tab-' + mode);
  tab.addEventListener('click', () => setMode(mode));
  tab.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const next = event.key === 'ArrowLeft' || event.key === 'Home' ? 'route' : 'graph';
      setMode(next);
      $('tab-' + next).focus();
    }
  });
  $(mode + 'Play').addEventListener('click', play);
  $(mode + 'Replay').addEventListener('click', replay);
  $(mode + 'Reset').addEventListener('click', () => { pause(); setPosition(0); });
  $(mode + 'Speed').addEventListener('change', event => { state.speed[mode] = Number(event.target.value); requestRender(); });
  $(mode + 'Save').addEventListener('click', () => {
    state.comparison[mode] = { ...state[mode] };
    requestRender();
  });
  $(mode + 'Clear').addEventListener('click', () => {
    state.comparison[mode] = null;
    if (mode === 'graph') graphGridKey = '';
    requestRender();
  });
  $(mode + 'Predict').querySelectorAll('button').forEach(button =>
    button.addEventListener('click', () => choosePrediction(mode, button.dataset.prediction)));
  $(mode + 'Reveal').addEventListener('click', () => reveal(mode));
  $(mode + 'ChallengeStart').addEventListener('click', () => startChallenge(mode));
}
document.querySelectorAll('[data-route-scenario]').forEach(button =>
  button.addEventListener('click', () => selectScenario('route', button.dataset.routeScenario)));
document.querySelectorAll('[data-graph-scenario]').forEach(button =>
  button.addEventListener('click', () => selectScenario('graph', button.dataset.graphScenario)));
$('radius').addEventListener('input', event => editParameter('route', 'radius', Number(event.target.value)));
$('turns').addEventListener('input', event => editParameter('route', 'turns', Number(event.target.value)));
$('initial').addEventListener('input', event => editParameter('graph', 'x0', Number(event.target.value)));
$('velocity').addEventListener('input', event => editParameter('graph', 'velocity', Number(event.target.value)));
$('routeProgress').addEventListener('input', event => { pause(); setPosition(Number(event.target.value) / 1000); });
$('time').addEventListener('input', event => { pause(); setPosition(Number(event.target.value)); });
$('routePrev').addEventListener('click', () => stepRoute(-1));
$('routeNext').addEventListener('click', () => stepRoute(1));
$('graphPrev').addEventListener('click', () => stepGraph(-1));
$('graphNext').addEventListener('click', () => stepGraph(1));
document.querySelectorAll('[data-legend]').forEach(button => button.addEventListener('click', () => {
  state.highlight.route = button.dataset.legend;
  requestRender();
}));
document.querySelectorAll('[data-graph-legend]').forEach(button => button.addEventListener('click', () => {
  state.highlight.graph = button.dataset.graphLegend;
  requestRender();
}));
attachDrag($('routeScene'), 'routeCircle', event => {
  const point = svgCoords($('routeScene'), event);
  const radius = state.route.radius * 8;
  const oldRadius = state.comparison.route?.radius ?? 0;
  const zoom = clamp(170 / (Math.max(state.route.radius, oldRadius) * 8), 1, 3);
  return Math.abs(Math.hypot(point.x - 300, point.y - 252) - radius * zoom) < 46;
});
attachDrag($('routePlot'), 'routePlot', event => event.target.id === 'routePlotHit');
attachDrag($('graphPlot'), 'graphPlot', event => event.target.id === 'graphHit');
attachDrag($('graphScene'), 'graphAxis', event => {
  const point = svgCoords($('graphScene'), event);
  const current = graphValues(state.graph);
  const domain = graphDomain(current, state.comparison.graph && graphValues(state.comparison.graph));
  return current.velocity !== 0 && Math.abs(point.x - axisX(current.coordinate, domain)) < 46 && Math.abs(point.y - 121) < 50;
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
reducedMotion.addEventListener?.('change', () => { if (reducedMotion.matches && state.playing) pause(); });
setMode(state.mode);
