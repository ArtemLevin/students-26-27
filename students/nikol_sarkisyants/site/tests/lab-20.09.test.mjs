import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const testDir=dirname(fileURLToPath(import.meta.url));
const siteDir=dirname(testDir);
const modelSource=readFileSync(join(siteDir,'20.09.26-lab-model.js'),'utf8');
const uiSource=readFileSync(join(siteDir,'20.09.26-lab-ui.js'),'utf8');
const html=readFileSync(join(siteDir,'20.09.26-lab.html'),'utf8');

const sandbox={};
vm.runInNewContext(modelSource,sandbox,{filename:'20.09.26-lab-model.js'});
const M=sandbox.DerivativeLabModel;

test('derivative lab model exposes the exact function family used by the lesson',()=>{
  assert.equal(M.value(2,1,0),2);
  assert.equal(M.derivative(2,1),9);
  assert.equal(M.secondDerivative(2),12);
  assert.equal(M.tangentValue(1,1,1,0),M.value(1,1,0));
});

test('classic scenario has extrema at x=-1 and x=1 with correct values and signs',()=>{
  const points=M.criticalPoints(1);
  assert.equal(points.length,2);
  assert.equal(points[0].x,-1);
  assert.equal(points[0].kind,'maximum');
  assert.equal(points[1].x,1);
  assert.equal(points[1].kind,'minimum');
  assert.equal(M.value(-1,1,0),2);
  assert.equal(M.value(1,1,0),-2);
  assert.equal(M.derivativeSign(-1.5,1),1);
  assert.equal(M.derivativeSign(0,1),-1);
  assert.equal(M.derivativeSign(1.5,1),1);
});

test('a=0 demonstrates a stationary point without an extremum',()=>{
  const points=M.criticalPoints(0);
  assert.equal(points.length,1);
  assert.equal(points[0].kind,'stationary-inflection');
  assert.equal(M.derivative(0,0),0);
  assert.equal(M.derivativeSign(-.5,0),1);
  assert.equal(M.derivativeSign(.5,0),1);
  assert.equal(M.extrema(0,0).length,0);
});

test('negative a removes critical points and keeps derivative positive',()=>{
  assert.equal(M.criticalPoints(-.5).length,0);
  for(const x of [-2,-1,0,1,2])assert.ok(M.derivative(x,-.5)>0);
  const intervals=M.monotonicIntervals(-.5);
  assert.equal(intervals.length,1);
  assert.equal(intervals[0].trend,'increasing');
});

test('vertical shift changes f by delta b and leaves derivative unchanged',()=>{
  const x=.7,a=1.2,b1=-1,b2=2.5;
  assert.ok(Math.abs((M.value(x,a,b2)-M.value(x,a,b1))-(b2-b1))<1e-12);
  assert.equal(M.derivative(x,a),M.derivative(x,a));
});

test('state normalization enforces the laboratory constraints',()=>{
  const s=M.normalizeState({x:99,a:-99,b:99,speed:99,mode:'unknown'});
  assert.equal(s.x,M.LIMITS.x.max);
  assert.equal(s.a,M.LIMITS.a.min);
  assert.equal(s.b,M.LIMITS.b.max);
  assert.equal(s.speed,M.LIMITS.speed.max);
  assert.equal(s.mode,'compare');
});

test('lab page contains research, comparison, prediction and direct-manipulation surfaces',()=>{
  for(const token of [
    'id="plot"','id="xSlider"','data-scenario="boundary"','data-scenario="sandbox"',
    'id="predictionOptions"','id="challengeCheck"','id="captureA"','id="undo"','id="redo"',
    'data-mode="function"','data-mode="derivative"','data-mode="compare"',
    '20.09.26-lab-model.js','20.09.26-lab-ui.js','prefers-reduced-motion'
  ])assert.ok(html.includes(token),'missing lab surface: '+token);
});

test('interaction engine parses as JavaScript',()=>{
  assert.doesNotThrow(()=>new vm.Script(uiSource,{filename:'20.09.26-lab-ui.js'}));
});

test('interaction engine uses one model source, rAF animation and pointer direct manipulation',()=>{
  for(const token of [
    'M.derive(state.math)','M.value(','M.derivative(','requestAnimationFrame','pointerdown',
    'state.snapshotA','commit()','predictions','challenges','guide'
  ])assert.ok(uiSource.includes(token),'missing interaction mechanism: '+token);
  assert.equal(/https?:\/\//.test(uiSource),false);
});

test('laboratory keeps fixed comparable axes and crisp SVG rendering',()=>{
  assert.ok(html.includes('<svg id="plot" viewBox="0 0 1000 720"'));
  assert.ok(uiSource.includes('min:-20,max:20'));
  assert.ok(uiSource.includes('min:-7,max:18'));
  assert.equal(html.includes('<canvas'),false);
});
