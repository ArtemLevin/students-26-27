import assert from 'node:assert/strict';

const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

const motion = ({ S, v1, dv, delay }) => {
  const v2 = v1 + dv;
  const t1 = S / v1;
  const t2 = S / v2;
  return { v2, t1, t2, diff: t1 - t2, arrival: t1 - (delay + t2) };
};

const work = ({ W, p1, dp }) => {
  const p2 = p1 + dp;
  const t1 = W / p1;
  const t2 = W / p2;
  return { p2, t1, t2, diff: t1 - t2 };
};

const mix = ({ m1, c1, m2, c2, add, cA, cB }) => {
  const q = m1 * c1 + m2 * c2;
  const m = m1 + m2;
  const total = m + add;
  return { q, c0: q / m, cA: (q + add * cA) / total, cB: (q + add * cB) / total };
};

let m = motion({ S: 323, v1: 17, dv: 2, delay: 2 });
assert(near(m.t1, 19) && near(m.t2, 17) && near(m.diff, 2) && near(m.arrival, 0));

m = motion({ S: 1326, v1: 34, dv: 5, delay: 2 });
assert(near(m.t1, 39) && near(m.t2, 34) && near(m.diff, 5) && near(m.arrival, 3));

let w = work({ W: 180, p1: 12, dp: 6 });
assert(near(w.diff, 5));
w = work({ W: 336, p1: 16, dp: 8 });
assert(near(w.diff, 7));

let r = mix({ m1: 15, c1: 0.45, m2: 25, c2: 0.97, add: 10, cA: 0, cB: 0.5 });
assert(near(r.q, 31) && near(r.cA, 0.62) && near(r.cB, 0.72));
r = mix({ m1: 20, c1: 0.3, m2: 30, c2: 0.7, add: 10, cA: 0, cB: 0.6 });
assert(near(r.cA, 0.45) && near(r.cB, 0.55));

assert.equal(36 ** 2, 1296);
assert.equal(73 ** 2, 5329);
assert.equal(72 ** 2, 5184);
assert.equal(4998 ** 2, 24980004);

const d1 = 323 * 2 / (17 * 19);
const d2 = 323 * 2 / (22 * 24);
assert(d2 < d1, 'При фиксированной разнице скоростей разность времён должна уменьшаться при росте скоростей.');

const lessWater = mix({ m1: 15, c1: 0.45, m2: 25, c2: 0.97, add: 10, cA: 0, cB: 0.5 }).cA;
const moreWater = mix({ m1: 15, c1: 0.45, m2: 25, c2: 0.97, add: 20, cA: 0, cB: 0.5 }).cA;
assert(moreWater < lessWater, 'Добавление чистой воды должно снижать концентрацию.');

console.log('28.08.26 simulator math tests: OK');
