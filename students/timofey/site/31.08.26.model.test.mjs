import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const M = require('./31.08.26-model.js');

const near=(a,b,eps=1e-8)=>Math.abs(a-b)<=eps;
const sorted=a=>[...a].sort((x,y)=>x-y);

// Quadratic solver: 0 / 1 / 2 / degenerate solutions.
assert.deepEqual(M.solveQuadratic(1,0,1).roots, []);
assert.equal(M.solveQuadratic(1,0,0).roots.length,1);
assert(near(M.solveQuadratic(1,0,0).roots[0],0));
assert.deepEqual(M.solveQuadratic(1,-3,2).roots, [1,2]);
assert.equal(M.solveQuadratic(0,0,0).kind,'infinite');
assert.equal(M.solveQuadratic(0,0,3).kind,'none');

// Line from two nodal points.
let d=M.deriveLineFromPoints({x:-2,y:1},{x:2,y:5});
assert(d.valid && near(d.k,1) && near(d.b,3));
assert(near(d.eval(-2),1) && near(d.eval(2),5));
d=M.deriveLineFromPoints({x:-3,y:4},{x:1,y:-4});
assert(d.valid && near(d.k,-2) && near(d.b,-2));
assert.equal(M.deriveLineFromPoints({x:1,y:0},{x:1.1,y:5}).valid,false);

// Quadratic with known a: both points must remain on the derived parabola.
d=M.deriveQuadraticFixedA(1,{x:0,y:-3},{x:2,y:3});
assert(d.valid && near(d.b,1) && near(d.c,-3));
assert(near(d.eval(0),-3) && near(d.eval(2),3));
d=M.deriveQuadraticFixedA(2,{x:0,y:5},{x:-2,y:3});
assert(d.valid && near(d.b,5) && near(d.c,5));
assert.equal(M.deriveQuadraticFixedA(0,{x:0,y:0},{x:2,y:2}).valid,false);

// Hyperbola from two nodal points and its domain restriction.
d=M.deriveHyperbolaFromPoints({x:-2,y:-1},{x:1,y:5});
assert(d.valid && near(d.k,4) && near(d.a,1));
assert(near(d.eval(-2),-1) && near(d.eval(1),5) && Number.isNaN(d.eval(0)));
d=M.deriveHyperbolaFromPoints({x:-4,y:0},{x:2,y:3});
assert(d.valid && near(d.k,4) && near(d.a,1));
assert.equal(M.deriveHyperbolaFromPoints({x:0,y:1},{x:2,y:3}).valid,false);

// Intersections: finite, parallel, tangent and hyperbola cases.
d=M.deriveIntersections({family:'line-line',line:{k:2,b:4},other:{k:-2,b:7}});
assert.equal(d.kind,'finite'); assert.equal(d.points.length,1); assert(near(d.points[0].x,0.75));
assert(near(d.difference(d.points[0].x),0));
d=M.deriveIntersections({family:'line-line',line:{k:1,b:1},other:{k:1,b:-2}});
assert.equal(d.kind,'none'); assert.equal(d.points.length,0);
d=M.deriveIntersections({family:'line-parabola',line:{k:0,b:0},other:{a:1,b:0,c:0}});
assert.equal(d.points.length,1); assert(near(d.points[0].x,0));
d=M.deriveIntersections({family:'line-parabola',line:{k:2,b:2},other:{a:1,b:3,c:-2}});
const expected9=sorted([(-1-Math.sqrt(17))/2,(-1+Math.sqrt(17))/2]);
assert.deepEqual(d.points.map(p=>p.x).sort((a,b)=>a-b).map(x=>Number(x.toFixed(10))),expected9.map(x=>Number(x.toFixed(10))));
for(const p of d.points) assert(near(d.f(p.x),d.g(p.x)) && near(d.difference(p.x),0));
d=M.deriveIntersections({family:'line-hyperbola',line:{k:1,b:1},other:{k:2,a:0}});
assert.deepEqual(d.points.map(p=>Number(p.x.toFixed(10))),[-2,1]);
for(const p of d.points) assert(near(d.f(p.x),d.g(p.x)) && near(d.difference(p.x),0));

// Transformations: h and v have their intended mathematical meaning.
d=M.deriveTransform({base:'abs',h:3,v:2,reflectX:false,reflectY:false});
assert(near(d.eval(3),2) && near(d.eval(4),3));
d=M.deriveTransform({base:'sqrt',h:0,v:0,reflectX:true,reflectY:false});
assert(near(d.eval(4),-2) && Number.isNaN(d.eval(-1)));
d=M.deriveTransform({base:'line',h:0,v:0,reflectX:false,reflectY:true});
assert(near(d.eval(3),-3));

// All prepared scenarios and all ten lesson tasks must derive without exceptions.
let scenarioCount=0;
for(const [mode,rows] of Object.entries(M.SCENARIOS)){
  for(const [key,label,config] of rows){
    scenarioCount++;
    const r=M.deriveMode(mode,M.deepClone(config));
    assert(r,`${mode}/${key} should derive`);
    if(['line','quadratic','hyperbola'].includes(mode)) assert.notEqual(r.valid,false,`${mode}/${key} must be valid`);
    if(mode==='intersections') assert(Array.isArray(r.points),`${mode}/${key} must expose intersections`);
    if(mode==='transforms') assert.equal(typeof r.eval,'function',`${mode}/${key} must expose transformed evaluator`);
  }
}
assert.equal(scenarioCount,23);
for(const task of M.TASKS){
  const r=M.deriveMode(task.mode,M.deepClone(task.config));
  assert(r,`${task.title} should derive`);
}
assert.equal(M.TASKS.length,10);

// Micro-challenge validators are mathematically reachable.
assert(M.LAB_META.line.challenge.check(M.deriveMode('line',{p1:{x:-1,y:-1},p2:{x:2,y:5},probeX:0})));
assert(M.LAB_META.quadratic.challenge.check(M.deriveMode('quadratic',{a:1,p1:{x:0,y:0},p2:{x:2,y:4},probeX:0})));
assert(M.LAB_META.hyperbola.challenge.check(M.deriveMode('hyperbola',{p1:{x:-2,y:0},p2:{x:2,y:4},probeX:1})));
assert(M.LAB_META.intersections.challenge.check(M.deriveMode('intersections',{family:'line-parabola',line:{k:0,b:0},other:{a:1,b:0,c:0},probeX:0})));
assert(M.LAB_META.transforms.challenge.check(M.deriveMode('transforms',{base:'abs',h:3,v:2,reflectX:false,reflectY:false,probeX:3})));

console.log(`31.08.26 graph lab model tests: OK (${scenarioCount} scenarios, ${M.TASKS.length} lesson tasks)`);
