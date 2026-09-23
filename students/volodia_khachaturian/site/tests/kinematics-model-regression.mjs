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


// 23.09.26 — research simulator: one-state kinematics, n-th second and reversal.
{
  const lab=fs.readFileSync(path.join(here,'..','23.09.26-lab.html'),'utf8');
  const labScripts=[...lab.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(match=>match[1]);
  assert.ok(labScripts.length>0,'23.09 lab inline script must exist');
  for(const source of labScripts)new vm.Script(source,{filename:'23.09.26-lab.inline.js'});

  const labIds=[...lab.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(new Set(labIds).size,labIds.length,'23.09 lab ids must be unique');

  const labCore=lab.match(/\/\* MODEL_CORE_230926_START \*\/([\s\S]*?)\/\* MODEL_CORE_230926_END \*\//);
  assert.ok(labCore,'23.09 simulator core marker must exist');
  const ctx={};
  vm.createContext(ctx);
  vm.runInContext(labCore[1]+'\\nthis.api2309={positionAt,velocityAt,stopTime,pathBetween,motionAt,nthSecond,hasDirectionChange};',ctx);
  const api=ctx.api2309;

  // x = 12t - 2t²: stop at 3 s, then reversal makes path exceed |displacement|.
  {
    const m={x0:0,v0:12,a:-4,duration:5};
    assert.equal(api.stopTime(m),3);
    const at3=api.motionAt(m,3);
    assert.equal(at3.x,18);
    assert.equal(at3.v,0);
    assert.equal(at3.path,18);
    const at4=api.motionAt(m,4);
    assert.equal(at4.x,16);
    assert.equal(at4.v,-4);
    assert.equal(at4.dx,16);
    assert.equal(at4.path,20);
    assert.ok(at4.path>at4.absDx);
  }

  // Lesson example: v0=2 m/s, a=0.2 m/s² -> 2.7 m on 4th second, 3.3 m on 7th.
  {
    const m={x0:0,v0:2,a:.2,duration:7};
    const fourth=api.nthSecond(m,4);
    const seventh=api.nthSecond(m,7);
    assert.ok(Math.abs(fourth.dx-2.7)<1e-9);
    assert.ok(Math.abs(fourth.path-2.7)<1e-9);
    assert.ok(Math.abs(seventh.dx-3.3)<1e-9);
  }

  // x = 6 - 4t + t²: returns to x0 by t=4, but travels 8 m.
  {
    const m={x0:6,v0:-4,a:2,duration:5};
    assert.equal(api.stopTime(m),2);
    const at4=api.motionAt(m,4);
    assert.equal(at4.x,6);
    assert.equal(at4.dx,0);
    assert.equal(at4.path,8);
    assert.equal(api.hasDirectionChange(m,0,4),true);
  }

  // Boundary case a=0: no stop caused by acceleration, path equals |displacement|.
  {
    const m={x0:6,v0:-3,a:0,duration:5};
    assert.equal(api.stopTime(m),null);
    const at2=api.motionAt(m,2);
    assert.equal(at2.x,0);
    assert.equal(at2.path,6);
    assert.equal(at2.path,at2.absDx);
  }

  for(const required of [
    '<option value="free">Исследовать самому</option>',
    'id="snapshotABtn"',
    'id="snapshotBBtn"',
    'id="predictCheck"',
    'id="challengeStart"',
    'id="guidePrev"',
    'id="guideNext"',
    'id="compareXGraph"',
    'id="nthSvg"',
    'data-layer="velocity"',
    'requestAnimationFrame',
    'pointerdown',
    'prefers-reduced-motion',
    'MODEL_CORE_230926_START'
  ]) assert.ok(lab.includes(required),'23.09 simulator capability missing: '+required);

  assert.ok(!/<script\s+src=/i.test(lab),'23.09 lab must remain autonomous without external scripts');
  assert.ok(!/<link[^>]+href=["']https?:/i.test(lab),'23.09 lab must remain autonomous without external styles');
  assert.ok(!/console\.log\s*\(/.test(lab),'23.09 lab must not ship debug console output');
}

console.log('23.09 research simulator regression: OK');
