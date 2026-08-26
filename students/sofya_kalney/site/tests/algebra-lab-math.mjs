import assert from 'node:assert/strict';

const factor = ({a,b,c,d}) => ({
  left: a*b+a*c-d*b-d*c,
  right: (b+c)*(a-d),
});

const intervalValue = (x,{roots:[r1,r2,r3],middleKind='simple'}) => {
  if (middleKind === 'hole') {
    if (Math.abs(x-r2) < 1e-9) return null;
    return ((x-r1)*(x-r3))/(x-r2);
  }
  const middle = middleKind === 'double' ? (x-r2)**2 : (x-r2);
  return (x-r1)*middle*(x-r3);
};

const holes = m => {
  const x=m+4;
  const excluded=Math.abs(x-1)<1e-9 || Math.abs(x+2)<1e-9;
  return {x,intersections:excluded?0:1};
};

const motion = x => {
  const tThere=180/x;
  const tBack=180/(x+6);
  return {tThere,tBack,diff:tThere-tBack};
};

for (const data of [
  {a:5,b:3,c:2,d:1},
  {a:4,b:3,c:2,d:4},
  {a:-2,b:5,c:-1,d:3},
]) {
  const v=factor(data);
  assert.equal(v.left,v.right,'Факторизация должна сохранять значение выражения');
}

assert.equal(intervalValue(0,{roots:[-3,2,3],middleKind:'simple'}),18);
const left=intervalValue(0.5,{roots:[-3,1,3],middleKind:'double'});
const right=intervalValue(1.5,{roots:[-3,1,3],middleKind:'double'});
assert.equal(Math.sign(left),Math.sign(right),'Двойной корень не должен менять знак');
assert.equal(intervalValue(1,{roots:[-3,1,3],middleKind:'hole'}),null,'Ноль знаменателя должен быть исключён');

assert.equal(holes(-3).intersections,0,'m=-3 должно попадать в выколотую точку x=1');
assert.equal(holes(-6).intersections,0,'m=-6 должно попадать в выколотую точку x=-2');
assert.equal(holes(0).intersections,1);

const m30=motion(30);
assert.equal(m30.tThere,6);
assert.equal(m30.tBack,5);
assert.equal(m30.diff,1);
assert.ok(motion(40).diff < m30.diff,'При росте скорости разность времён должна уменьшаться');

console.log('algebra-lab-math: 10 invariants passed');
