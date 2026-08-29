import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {runDashboardTests} from '../../../../shared/student-dashboard/test-dashboard.mjs';

await runDashboardTests({student:'kirill_zinoviev',expectedLessons:7,stateKey:'kirill-competence-state-v2',storageKey:'kirill-competence-map-v2',catalog:{kind:'window-script',path:'students/kirill_zinoviev/site/competency-map-data.js',global:'KIRILL_GRADE7_GROUPS'}});

const percentLessonPath='students/kirill_zinoviev/site/26.08.26.html';
const percentHtml=readFileSync(percentLessonPath,'utf8');
for(const marker of [
  'id="percentLab"',
  'id="percentStage"',
  'id="dragHandle"',
  'id="percentGraph"',
  'id="predictionPanel"',
  'id="challengePanel"',
  'id="snapshotButton"',
  'data-scenario="free"',
  'prefers-reduced-motion'
]) assert.ok(percentHtml.includes(marker),`26.08 lab is missing ${marker}`);

const percentContractMatch=percentHtml.match(/<script type="application\/json" id="model-contract">([\s\S]*?)<\/script>/);
assert.ok(percentContractMatch,'percentage model contract is missing');
const percentContract=JSON.parse(percentContractMatch[1]);
assert.ok(percentContract.scenarios.length>=5,'expected at least five educational scenarios');
for(const scenario of percentContract.scenarios){
  const calculated=scenario.base*scenario.rate/100;
  assert.ok(Math.abs(calculated-scenario.value)<1e-9,`inconsistent percentage scenario ${scenario.id}`);
  assert.ok(scenario.rate>=0&&scenario.rate<=100,`scenario ${scenario.id} leaves lesson percentage range`);
}
const expectedPercent={part:[500,20,100],base:[800,75,600],ratio:[80,12.5,10],decimal:[10,2,0.2],whole:[500,100,500]};
for(const [id,[base,rate,value]] of Object.entries(expectedPercent)){
  const scenario=percentContract.scenarios.find(item=>item.id===id);
  assert.ok(scenario,`missing scenario ${id}`);
  assert.deepEqual([scenario.base,scenario.rate,scenario.value],[base,rate,value]);
}

const percentScripts=[...percentHtml.matchAll(/<script(?![^>]*application\/json)[^>]*>([\s\S]*?)<\/script>/g)].map(match=>match[1]).filter(Boolean);
assert.ok(percentScripts.length>=1,'inline percentage lesson script is missing');
for(const [index,script] of percentScripts.entries()) assert.doesNotThrow(()=>new vm.Script(script,{filename:`26.08.26-inline-${index}.js`}));

for(const runtimeMarker of [
  "$('#challengeLoad').addEventListener('click',loadChallenge)",
  "$('#challengeCheck').addEventListener('click',checkChallenge)",
  "renderTicks();pushHistory();progress();render();",
  "if(state.rate===0&&state.mode!=='base')",
  'Деление на 0 не используется.'
]) assert.ok(percentHtml.includes(runtimeMarker),`percentage lab runtime guard is missing: ${runtimeMarker}`);
assert.ok(!percentHtml.includes("forEach(btn=>btn.onclick"),'lab initialization must not depend on a prediction click');
assert.ok(!percentHtml.includes('/ 0 = 0 / 0'),'zero-percent state must never display a 0/0 proportion');
assert.ok(!/<script[^>]+src=["']https?:/i.test(percentHtml),'percentage lesson must remain autonomous without remote scripts');
assert.ok(!/<link[^>]+href=["']https?:/i.test(percentHtml),'percentage lesson must remain autonomous without remote styles');

const reviewLessonPath='students/kirill_zinoviev/site/29.08.26.html';
const reviewHtml=readFileSync(reviewLessonPath,'utf8');
for(const marker of [
  'id="model-contract"',
  'id="factorMatrix"',
  'id="fractionList"',
  'id="axisStage"',
  'id="axisSvg"',
  'id="axisSvgModal"',
  'id="sandboxToggle"',
  'id="snapshotButton"',
  'id="undoLab"',
  'id="redoLab"',
  'id="predictionPanel"',
  'id="challengePanel"',
  'id="discoveryNote"',
  'prefers-reduced-motion'
]) assert.ok(reviewHtml.includes(marker),`29.08 research lab is missing ${marker}`);

const reviewContractMatch=reviewHtml.match(/<script type="application\/json" id="model-contract">([\s\S]*?)<\/script>/);
assert.ok(reviewContractMatch,'29.08 model contract is missing');
const reviewContract=JSON.parse(reviewContractMatch[1]);
assert.equal(reviewContract.version,2,'29.08 model contract version');
assert.ok(reviewContract.learningOutcomes.length>=5,'29.08 model needs at least five learning outcomes');
assert.ok(reviewContract.factorScenarios.length>=4,'29.08 factor scenarios');
assert.ok(reviewContract.fractionScenarios.length>=4,'29.08 fraction scenarios');
assert.ok(reviewContract.axisScenarios.length>=3,'29.08 axis scenarios');

const gcd=(a,b)=>{a=Math.abs(a);b=Math.abs(b);while(b)[a,b]=[b,a%b];return a};
const gcdAll=xs=>xs.reduce(gcd),lcm=(a,b)=>Math.abs(a*b)/gcd(a,b),lcmAll=xs=>xs.reduce(lcm,1);
const expectedFactors={base:[72,2520],three:[1,120],training4:[6,360],training2:[210,1260]};
for(const scenario of reviewContract.factorScenarios){
  const expected=expectedFactors[scenario.id];
  assert.ok(expected,`unexpected factor scenario ${scenario.id}`);
  assert.deepEqual([gcdAll(scenario.numbers),lcmAll(scenario.numbers)],expected,`factor scenario ${scenario.id} is inconsistent`);
}
for(const scenario of reviewContract.fractionScenarios){
  const common=lcmAll(scenario.items.map(item=>item.d));
  assert.ok(Number.isInteger(common)&&common>0,`fraction scenario ${scenario.id} common denominator`);
  for(const item of scenario.items) assert.equal(common%item.d,0,`fraction scenario ${scenario.id}: denominator ${item.d} must divide LCM`);
}
const expectedAxis={base:[7,-1],practice3:[8,0.5],practice8:[8.8,-2.8]};
for(const scenario of reviewContract.axisScenarios){
  const expected=expectedAxis[scenario.id];
  assert.ok(expected,`unexpected axis scenario ${scenario.id}`);
  const distance=Math.abs(scenario.b-scenario.a),mid=(scenario.a+scenario.b)/2;
  assert.ok(Math.abs(distance-expected[0])<1e-9,`axis distance ${scenario.id}`);
  assert.ok(Math.abs(mid-expected[1])<1e-9,`axis midpoint ${scenario.id}`);
}

const reviewScripts=[...reviewHtml.matchAll(/<script(?![^>]*application\/json)[^>]*>([\s\S]*?)<\/script>/g)].map(match=>match[1]).filter(Boolean);
assert.equal(reviewScripts.length,1,'29.08 should have one executable inline script');
assert.doesNotThrow(()=>new vm.Script(reviewScripts[0],{filename:'29.08.26-inline.js'}));
for(const runtimeMarker of [
  'const state=',
  'function factorize(',
  'function axisDerived(',
  'function renderFactors(',
  'function renderFractions(',
  'function renderAxis(',
  "addEventListener('pointerdown'",
  'requestAnimationFrame(frame)',
  'state.snapshot=',
  'historyIndex'
]) assert.ok(reviewHtml.includes(runtimeMarker),`29.08 architecture marker is missing: ${runtimeMarker}`);
assert.ok(!/<script[^>]+src=["']https?:/i.test(reviewHtml),'29.08 lesson must remain autonomous without remote scripts');
assert.ok(!/<link[^>]+href=["']https?:/i.test(reviewHtml),'29.08 lesson must remain autonomous without remote styles');
