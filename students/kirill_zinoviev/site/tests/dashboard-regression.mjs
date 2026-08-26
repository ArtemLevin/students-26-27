import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {runDashboardTests} from '../../../../shared/student-dashboard/test-dashboard.mjs';

await runDashboardTests({student:'kirill_zinoviev',expectedLessons:6,stateKey:'kirill-competence-state-v2',storageKey:'kirill-competence-map-v2',catalog:{kind:'window-script',path:'students/kirill_zinoviev/site/competency-map-data.js',global:'KIRILL_GRADE7_GROUPS'}});

const lessonPath='students/kirill_zinoviev/site/26.08.26.html';
const html=readFileSync(lessonPath,'utf8');
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
]) assert.ok(html.includes(marker),`26.08 lab is missing ${marker}`);

const contractMatch=html.match(/<script type="application\/json" id="model-contract">([\s\S]*?)<\/script>/);
assert.ok(contractMatch,'percentage model contract is missing');
const contract=JSON.parse(contractMatch[1]);
assert.ok(contract.scenarios.length>=5,'expected at least five educational scenarios');
for(const scenario of contract.scenarios){
  const calculated=scenario.base*scenario.rate/100;
  assert.ok(Math.abs(calculated-scenario.value)<1e-9,`inconsistent percentage scenario ${scenario.id}`);
  assert.ok(scenario.rate>=0&&scenario.rate<=100,`scenario ${scenario.id} leaves lesson percentage range`);
}
const expected={part:[500,20,100],base:[800,75,600],ratio:[80,12.5,10],decimal:[10,2,0.2],whole:[500,100,500]};
for(const [id,[base,rate,value]] of Object.entries(expected)){
  const scenario=contract.scenarios.find(item=>item.id===id);
  assert.ok(scenario,`missing scenario ${id}`);
  assert.deepEqual([scenario.base,scenario.rate,scenario.value],[base,rate,value]);
}

const executableScripts=[...html.matchAll(/<script(?![^>]*application\/json)[^>]*>([\s\S]*?)<\/script>/g)].map(match=>match[1]).filter(Boolean);
assert.ok(executableScripts.length>=1,'inline lesson script is missing');
for(const [index,script] of executableScripts.entries()) assert.doesNotThrow(()=>new vm.Script(script,{filename:`26.08.26-inline-${index}.js`}));

for(const runtimeMarker of [
  "$('#challengeLoad').addEventListener('click',loadChallenge)",
  "$('#challengeCheck').addEventListener('click',checkChallenge)",
  "renderTicks();pushHistory();progress();render();",
  "if(state.rate===0&&state.mode!=='base')",
  'Деление на 0 не используется.'
]) assert.ok(html.includes(runtimeMarker),`percentage lab runtime guard is missing: ${runtimeMarker}`);
assert.ok(!html.includes("forEach(btn=>btn.onclick"),'lab initialization must not depend on a prediction click');
assert.ok(!html.includes('/ 0 = 0 / 0'),'zero-percent state must never display a 0/0 proportion');
assert.ok(!/<script[^>]+src=["']https?:/i.test(html),'lesson must remain autonomous without remote scripts');
assert.ok(!/<link[^>]+href=["']https?:/i.test(html),'lesson must remain autonomous without remote styles');
