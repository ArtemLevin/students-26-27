import assert from 'node:assert/strict';

const EPS=1e-9;
const near=(a,b)=>Math.abs(a-b)<EPS;
const derive=(x0,v0,a,t)=>({
  x0,v0,a,t,
  v:v0+a*t,
  s:v0*t+a*t*t/2,
  x:x0+v0*t+a*t*t/2,
  sVelocity:a===0?null:((v0+a*t)**2-v0**2)/(2*a),
  sAverage:(v0+(v0+a*t))*t/2
});

for (const sample of [
  [-10,1,1,10],
  [0,10,-2,5],
  [3,-4,2,4],
  [5,6,0,7],
  [-2,0,3,6]
]) {
  const q=derive(...sample);
  assert.ok(near(q.x,q.x0+q.s),'x must equal x0+s');
  assert.ok(near(q.s,q.sAverage),'average-velocity formula must agree');
  if(q.a!==0) assert.ok(near(q.s,q.sVelocity),'velocity-only formula must agree');
}

const stop=derive(0,10,-2,5);
assert.ok(near(stop.v,0),'stopping scenario must reach v=0');
const reverse=derive(0,6,-2,5);
assert.ok(reverse.v<0,'reverse scenario must cross into negative velocity');
const rest=derive(-4,0,2,3);
assert.ok(rest.s>0 && rest.v>0,'rest-start scenario must accelerate forward');

console.log('16.09.26 lab model invariants: OK');
