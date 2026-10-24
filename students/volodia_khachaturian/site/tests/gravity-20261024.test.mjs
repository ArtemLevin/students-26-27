import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const lesson=fs.readFileSync(path.join(dir,'24.10.26.html'),'utf8');
const lab=fs.readFileSync(path.join(dir,'24.10.26-lab.html'),'utf8');
const tex=fs.readFileSync(path.resolve(dir,'../tex_docs/24.10.26.tex'),'utf8');
const meta=JSON.parse(fs.readFileSync(path.join(dir,'data/lessons/2026-10-24.lesson.json'),'utf8'));
const intent=JSON.parse(fs.readFileSync(path.join(dir,'data/publication-intents/2026-10-24.json'),'utf8'));
const practice=JSON.parse(fs.readFileSync(path.join(dir,'data/practice-publications/2026-10-24.json'),'utf8'));
const registry=fs.readFileSync(path.join(dir,'lesson-registry.js'),'utf8');

test('release gate: HTML structure, math, materials and accessibly named graphics',()=>{
  for(const [name,html] of [['lesson',lesson],['lab',lab]]){
    assert.match(html,/lang="ru"/,name);
    assert.match(html,/<main\b/);
    assert.match(html,/<h1\b/);
    assert.match(html,/<a class="skip" href="#/);
    assert.match(html,/prefers-reduced-motion/);
    assert.match(html,/html\[data-theme=dark\]/);
    const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
    assert.equal(ids.length,new Set(ids).size,name+' contains duplicate IDs');
    assert.doesNotMatch(html,/href="#"|href=""|javascript:|lorem ipsum|\bTODO\b|\bFIXME\b/i,name);
    for(const link of html.matchAll(/(?:href|src)="([^"]+)"/g)){
      const url=link[1].split(/[?#]/,1)[0];
      if(!url)continue;
      assert.ok(fs.existsSync(path.resolve(dir,url)),name+': broken resource '+url);
    }
    for(const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g))
      new vm.Script(match[1],{filename:name+'.inline.js'});
  }
  assert.match(lesson,/<svg\b[^>]*role="img"[^>]*aria-labelledby/);
  assert.match(lab,/<svg\b[^>]*role="img"[^>]*aria-labelledby/);
  assert.match(lesson,/F ∝ 1\/r²/);
  assert.match(lesson,/сферически-симметрична/);
  assert.match(tex,/\\boxed\{2\\ \\text\{Н\}\}/);
  const exercises=lesson.match(/<ol class="exercise">([\s\S]*?)<\/ol>/)?.[1]||'';
  const answerTable=lesson.match(/<table>([\s\S]*?)<\/table>/)?.[1]||'';
  assert.equal([...exercises.matchAll(/<li>/g)].length,10);
  assert.equal([...answerTable.matchAll(/<tr><td>/g)].length,10);
  for(const marker of ['2,5 Н','30 Н','0,2','32','16','3R'])
    assert.ok(answerTable.includes(marker),'missing answer '+marker);
});

test('legacy lesson-progress script parses as standalone JavaScript',()=>{
  new vm.Script(fs.readFileSync(path.join(dir,'lesson-progress.js'),'utf8'));
});

test('navigator loads the refreshed 24 October registry version',()=>{
  const dashboard=fs.readFileSync(path.join(dir,'dashboard.js'),'utf8');
  const home=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  assert.match(dashboard,/lesson-registry\.js\?v=20261024/);
  assert.match(home,/dashboard\.js\?v=20261024/);
});

test('release gate: publication metadata and evidence parity',()=>{
  assert.equal(meta.date,'2026-10-24');
  assert.equal(meta.outcomes.length,7);
  assert.equal(intent.outcomes.length,7);
  assert.equal(practice.outcomes.length,7);
  assert.deepEqual(meta.ktpRefs,[]);
  assert.equal((registry.match(/"date": "2026-10-24"/g)||[]).length,1);
  const ids=new Set([...lesson.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
  for(const outcome of meta.outcomes){
    assert.ok(ids.has(outcome.evidenceAnchor),outcome.evidenceAnchor);
    assert.equal(outcome.masteryClaim,null);
    assert.ok(intent.outcomes.some(i=>i.competencyId===outcome.competencyId&&i.evidenceAnchor===outcome.evidenceAnchor));
    assert.ok(practice.outcomes.some(p=>p.competencyId===outcome.competencyId&&p.evidenceAnchor===outcome.evidenceAnchor));
  }
});

const script=lab.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script,'lab inline script missing');
class FakeElement{
  constructor(id=''){this.id=id;this.dataset={};this.attributes={};this.listeners={};this.style={};this.value='';this.min='0';this.max='10';this.textContent='';this.hidden=false;}
  setAttribute(k,v){this.attributes[k]=String(v)}
  getAttribute(k){return this.attributes[k]??null}
  addEventListener(k,f){this.listeners[k]=f}
  fire(k){assert.ok(this.listeners[k],this.id+' missing '+k);this.listeners[k].call(this)}
}
function boot(search='?mode=satellites'){
  const elements=new Map();
  const get=id=>{if(!elements.has(id))elements.set(id,new FakeElement(id));return elements.get(id)};
  const modeButtons=['satellites','compare','height'].map(id=>{const b=new FakeElement(id);b.dataset.mode=id;return b});
  const answerButtons=['2','4','8'].map(id=>{const b=new FakeElement(id);b.dataset.answer=id;return b});
  for(const id of ['orbitalRatio','massRatio','distanceRatio','height']){
    const match=lab.match(new RegExp('<input id="'+id+'"[^>]*>'));
    assert.ok(match,'input '+id+' missing');
    const text=match[0];
    const e=get(id);
    for(const key of ['min','max','value']){const v=text.match(new RegExp('\\b'+key+'="([^"]+)"'));assert.ok(v);e[key]=v[1]}
  }
  const env={
    document:{documentElement:{dataset:{}},getElementById:get,querySelectorAll(q){if(q==='[data-mode]')return modeButtons;if(q==='[data-answer]')return answerButtons;return []}},
    URL,location:{href:'https://example.invalid/students/volodia_khachaturian/site/24.10.26-lab.html'+search},
    history:{replaceState(_a,_b,url){this.last=url}},
    localStorage:{getItem(){return null},setItem(){}}
  };
  vm.runInNewContext(script,env,{timeout:2000});
  return {get,modes:modeButtons,answers:answerButtons,env,set(id,n){const x=get(id);x.value=String(n);x.fire('input')},select(id){modeButtons.find(b=>b.dataset.mode===id).fire('click')}};
}
test('research lab: source formulas, preset, geometric scale and height',()=>{
  const x=boot();
  assert.equal(x.get('metricValue').textContent,'9');
  assert.equal(Number(x.get('orbiter').getAttribute('cx')),300);
  assert.match(lab,/id="referenceOrbit" cx="160"/);
  x.set('orbitalRatio',1);
  assert.equal(x.get('metricValue').textContent,'1');
  assert.match(x.get('explain').textContent,/силы равны/);
  assert.equal(x.get('referenceOrbit').getAttribute('visibility'),'hidden');
  x.set('orbitalRatio',5);
  assert.equal(x.get('metricValue').textContent,'25');
  assert.ok(Number(x.get('forceArrow').getAttribute('x1'))>Number(x.get('forceArrow').getAttribute('x2')),'force must point toward planet');
  x.get('reset').fire('click');assert.equal(x.get('metricValue').textContent,'9');
  x.select('height');
  assert.equal(x.get('metricValue').textContent,'80 Н');
  x.set('height',0);
  assert.equal(x.get('metricValue').textContent,'180 Н');
  assert.equal(Number(x.get('orbiter').getAttribute('cx')),147);
  x.set('height',3);
  assert.equal(x.get('metricValue').textContent,'11,25 Н');
  assert.equal(Number(x.get('orbiter').getAttribute('cx')),318);
  x.get('reset').fire('click');assert.equal(x.get('metricValue').textContent,'80 Н');
  assert.equal(x.get('height').value,'0.5');
});
test('research lab: non-monotone mass comparison, predictions, snapshots and deep-links',()=>{
  const x=boot('?mode=compare');
  assert.equal(x.get('metricValue').textContent,'22,5');
  x.set('distanceRatio',1);x.set('massRatio',2);
  assert.equal(x.get('metricValue').textContent,'0,5');
  assert.match(x.get('explain').textContent,/второе притягивается сильнее/);
  x.set('massRatio',1);
  assert.match(x.get('explain').textContent,/Силы притяжения равны/);
  x.set('massRatio',0.1);x.set('distanceRatio',1.5);
  x.get('mark').fire('click');
  assert.match(x.get('saved').textContent,/22,5/);
  x.set('distanceRatio',2);
  assert.match(x.get('saved').textContent,/изменение/);
  x.answers[0].fire('click');
  assert.equal(x.answers[0].getAttribute('aria-pressed'),'true');
  assert.equal(x.answers[2].getAttribute('aria-pressed'),'false');
  x.answers[1].fire('click');
  assert.equal(x.answers[1].getAttribute('aria-pressed'),'true');
  assert.equal(x.answers[0].getAttribute('aria-pressed'),'false');
  assert.match(x.get('feedback').textContent,/Верно/);
  x.select('height');assert.match(x.env.history.last,/mode=height/);
  const invalid=boot('?mode=bogus');
  assert.equal(invalid.get('metricValue').textContent,'9');
});
