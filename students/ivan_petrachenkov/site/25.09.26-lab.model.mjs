/**
 * Kinematics laboratory. All dimensions in physical units (m, s);
 * SVG coordinates are derived only in the view layer.
 *
 * Learning outcomes:
 * 1. Path is arc length Rθ; displacement is the chord 2R|sin(θ/2)|.
 * 2. Returning to the start may leave a nonzero path.
 * 3. Equal endpoints may result from routes of different lengths.
 * 4. x(t)=x₀+vₓt: x₀ shifts the line; vₓ changes its slope and direction.
 * 5. A graph point, position on an axis and formula refer to the same instant.
 */
export const LIMITS = Object.freeze({
  radius: [5, 24], turns: [0.25, 2],
  x0: [-10, 10], velocity: [-5, 5], time: [0, 10]
});
export const SCENARIOS = Object.freeze({
  route: {
    full: { radius: 5, turns: 1, progress: 0, title: 'Полный оборот · R = 5 м' },
    half: { radius: 20, turns: 0.5, progress: 0, title: 'Полуокружность · R = 20 м' },
    twice: { radius: 5, turns: 2, progress: 0, title: 'Два оборота · R = 5 м' }
  },
  graph: {
    first: { x0: 4, velocity: 5, time: 0, title: 'x = 4 + 5t' },
    second: { x0: -10, velocity: 2, time: 0, title: 'x = −10 + 2t' },
    reverse: { x0: 4, velocity: -5, time: 0, title: 'Движение против Ox' },
    rest: { x0: 4, velocity: 0, time: 0, title: 'Покой' }
  }
});
export const clamp = (value, lower, upper) => Math.min(upper, Math.max(lower, Number.isFinite(value) ? value : lower));
export const snap = (value, increment) => Math.round(value / increment) * increment;
export function routeValues({ radius, turns, progress }) {
  const R = clamp(Number(radius), ...LIMITS.radius);
  const n = clamp(Number(turns), ...LIMITS.turns);
  const fraction = clamp(Number(progress), 0, 1);
  const theta = 2 * Math.PI * n * fraction;
  const path = R * theta;
  const dx = R * Math.sin(theta);
  const dy = R * (1 - Math.cos(theta));
  const displacement = Math.hypot(dx, dy);
  return { radius: R, turns: n, progress: fraction, theta, path, dx, dy,
    displacement, totalPath: 2 * Math.PI * n * R,
    completed: fraction >= 1 - 1e-9,
    returnToStart: theta > 1e-9 && displacement < 1e-8 };
}
export function graphValues({ x0, velocity, time }) {
  const start = clamp(Number(x0), ...LIMITS.x0);
  const speed = clamp(Number(velocity), ...LIMITS.velocity);
  const t = clamp(Number(time), ...LIMITS.time);
  return { x0: start, velocity: speed, time: t, coordinate: start + speed * t,
    delta: speed * t, endpoint: start + speed * LIMITS.time[1] };
}
export function graphDomain(current, reference = null) {
  const values = [0, current.x0, current.endpoint, current.coordinate];
  if (reference) values.push(reference.x0, reference.endpoint, reference.coordinate);
  return {
    min: 5 * Math.floor((Math.min(...values) - 5) / 5),
    max: 5 * Math.ceil((Math.max(...values) + 5) / 5)
  };
}
export function routePoint(radiusPx, theta, cx = 300, cy = 252) {
  return { x: cx + radiusPx * Math.sin(theta), y: cy - radiusPx * Math.cos(theta) };
}
export function arcPath(radiusPx, angle, cx = 300, cy = 252) {
  const theta = clamp(angle, 0, 4 * Math.PI);
  const start = routePoint(radiusPx, 0, cx, cy);
  if (theta < 1e-8) return `M ${start.x} ${start.y}`;
  const segments = Math.ceil(theta / (Math.PI / 2));
  let result = `M ${start.x} ${start.y}`;
  for (let index = 1; index <= segments; index++) {
    const point = routePoint(radiusPx, theta * index / segments, cx, cy);
    result += ` A ${radiusPx} ${radiusPx} 0 0 1 ${point.x.toFixed(4)} ${point.y.toFixed(4)}`;
  }
  return result;
}
/** A point on the circle is ambiguous after a lap; choose the closest lap to current time. */
export function progressFromCircle(x, y, currentProgress, turns, cx = 300, cy = 252) {
  const total = 2 * Math.PI * turns;
  const clockwise = (Math.atan2(x - cx, cy - y) + 2 * Math.PI) % (2 * Math.PI);
  const candidates = [];
  for (let lap = 0; lap <= 2; lap++) {
    const angle = clockwise + lap * 2 * Math.PI;
    if (angle <= total + 1e-9) candidates.push(angle);
  }
  // Just before the top marker, the drag can remain at the start of lap one.
  if (clockwise > 2 * Math.PI - .08) candidates.push(0);
  if (!candidates.length) return clamp(clockwise / total, 0, 1);
  const currentAngle = clamp(currentProgress, 0, 1) * total;
  const closest = candidates.reduce((a, b) => Math.abs(a - currentAngle) <= Math.abs(b - currentAngle) ? a : b);
  return clamp(closest / total, 0, 1);
}
export function routeChallenge(values) {
  return values.radius === 5 && values.turns === 1 && values.completed && values.returnToStart;
}
export function graphChallenge(values) {
  return values.x0 === -10 && values.velocity === 2 && Math.abs(values.coordinate) < 1e-8;
}
