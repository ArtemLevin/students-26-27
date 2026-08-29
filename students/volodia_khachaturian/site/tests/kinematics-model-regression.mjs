import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const here=path.dirname(fileURLToPath(import.meta.url));
const html=fs.readFileSync(path.join(here,'..','29.08.26.html'),'utf8');

const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(match=>match[1]);
assert.ok(scripts.length>0,'inline script must exist');
for(const source of scripts)new vm.Script(source,{filename:'29.08.26.inline.js'});

const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
assert.equal(new Set(ids).size,ids.length,'HTML ids must be unique');

const coreMatch=html.match(/\/\* MODEL_CORE_START \*\/([\s\S]*?)\/\* MODEL_CORE_END \*\//);
assert.ok(coreMatch,'kinematics model core marker must exist');
const sandbox={};
vm.createContext(sandbox);
vm.runInContext(`${coreMatch[1]}\nthis.api={clamp,motionAt,targetTime,screenDirection};`,sandbox);
const {motionAt,targetTime,screenDirection}=sandbox.api;

// x = 2 + 3t
{
  const m={mode:'uniform',x0:2,v1:3,duration:5};
  const s=motionAt(m,3);
  assert.equal(s.x,11);
  assert.equal(s.dx,9);
  assert.equal(s.absDx,9);
  assert.equal(s.s,9);
  assert.equal(s.v,3);
}

// x = 5: rest is a boundary case.
{
  const m={mode:'uniform',x0:5,v1:0,duration:5};
  const s=motionAt(m,4);
  assert.equal(s.x,5);
  assert.equal(s.s,0);
  assert.equal(s.absDx,0);
}

// Negative velocity reduces coordinate for +Ox to the right.
{
  const m={mode:'uniform',x0:-3,v1:-10,duration:2};
  const s=motionAt(m,1);
  assert.equal(s.x,-13);
  assert.equal(s.dx,-10);
  assert.equal(s.s,10);
  assert.equal(screenDirection(-10,1),-1);
  assert.equal(screenDirection(-10,-1),1);
}

// Lesson route A(-5) -> B(7) -> C(2): path 17 m, displacement modulus 7 m.
{
  const m={mode:'turn',x0:-5,v1:3,tTurn:4,v2:-1.25,duration:8};
  const turn=motionAt(m,4);
  const afterTurn=motionAt(m,5);
  const end=motionAt(m,8);
  assert.equal(turn.x,7);
  assert.equal(turn.s,12);
  assert.equal(end.x,2);
  assert.equal(end.dx,7);
  assert.equal(end.absDx,7);
  assert.equal(end.s,17);
  assert.ok(afterTurn.s>turn.s,'path must keep increasing after reversal');
  assert.ok(end.s>afterTurn.s,'path must remain monotonic');
  assert.ok(end.absDx<afterTurn.absDx,'displacement modulus must fall while returning toward start');
  assert.ok(end.s>end.absDx);
}

// Contradictory condition from the lesson: x0=20, target x=10, vx=+1 gives t=-10 s.
{
  const m={mode:'uniform',x0:20,v1:1,duration:8};
  assert.equal(targetTime(m,10),-10);
}

// Time is constrained to the experiment interval.
{
  const m={mode:'uniform',x0:1,v1:2,duration:3};
  assert.equal(motionAt(m,99).t,3);
  assert.equal(motionAt(m,-5).t,0);
}

// Active-learning and interaction contract.
for(const required of [
  'data-scenario="free"',
  'data-scenario="return"',
  'data-scenario="contradiction"',
  'id="motionGraph"',
  'id="snapshotBtn"',
  'class="predict-box"',
  'class="challenge-box"',
  'requestAnimationFrame',
  'pointerdown',
  'prefers-reduced-motion',
  'MODEL_CORE_START'
]) assert.ok(html.includes(required),`missing simulator capability: ${required}`);

assert.ok(!/<script\s+src=/i.test(html),'lesson page must remain autonomous without external scripts');
assert.ok(!/<link[^>]+href=["']https?:/i.test(html),'lesson page must remain autonomous without external styles');

console.log('Kinematics simulator regression: OK');
