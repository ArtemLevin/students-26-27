import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const lesson=fs.readFileSync(path.join(root,'17.10.26.html'),'utf8');
const lab=fs.readFileSync(path.join(root,'17.10.26-lab.html'),'utf8');
const original=fs.readFileSync(path.resolve(root,'../tex_docs/17.10.26.tex'),'utf8');
const registry=fs.readFileSync(path.join(root,'lesson-registry.js'),'utf8');
const state=fs.readFileSync(path.join(root,'data/lessons/2026-10-17.lesson.json'),'utf8');
const intent=JSON.parse(fs.readFileSync(path.join(root,'data/publication-intents/2026-10-17.json'),'utf8'));
const practice=JSON.parse(fs.readFileSync(path.join(root,'data/practice-publications/2026-10-17.json'),'utf8'));

function staticQuality(html,label){
  assert.match(html,/lang="ru"/);
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
  assert.equal(ids.length,new Set(ids).size,label+' duplicate ids');
  assert.doesNotMatch(html,/href=""|href="#"|javascript:|console\.log|lorem ipsum|TODO/i);
  assert.doesNotMatch(html,/<(?:script|link)[^>]+(?:src|href)="https?:/i);
  for(const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(m[1],{filename:label+'.inline.js'});
}
staticQuality(lesson,'lesson');staticQuality(lab,'lab');
const taskSection=lesson.match(/<ol class="problems">([\s\S]*?)<\/ol>/)?.[1];
const answers=lesson.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1];
assert.ok(taskSection&&answers);
assert.equal((taskSection.match(/<li>/g)||[]).length,10);
assert.equal((answers.match(/<tr>/g)||[]).length,10);
assert.ok(original.includes('Тренировочный блок'));
assert.match(lesson,/17\.10\.26-lab\.html\?scenario=three/);
assert.doesNotMatch(lesson,/\.\.\/images\/17\.10\.26\.png/,'incorrect 17 October infographic must not be linked');
assert.ok((lesson.match(/<math xmlns="http:\/\/www.w3.org\/1998\/Math\/MathML"/g)||[]).length>=100);
assert.ok(lesson.includes('Трение скольжения'));
assert.ok((lab.slice(0,lab.indexOf('<script>')).match(/<math xmlns="http:\/\/www.w3.org\/1998\/Math\/MathML"/g)||[]).length>=40);
assert.doesNotMatch(lesson,/<(?:sub|sup)\b/i);
for(const body of [...taskSection.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(x=>x[1]))assert.match(body,/<math\b/,'exercise lacks MathML');
for(const body of [...answers.matchAll(/<tr><td>\d+<\/td><td>([\s\S]*?)<\/td><\/tr>/g)].map(x=>x[1]))assert.match(body,/<math\b/,'answer lacks MathML');
const allIds=[...lesson.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
const canonical=JSON.parse(state);
assert.equal(canonical.date,'2026-10-17');
assert.equal(canonical.outcomes.length,intent.outcomes.length);
assert.equal(intent.outcomes.length,practice.outcomes.length);
assert.ok(intent.outcomes.every(x=>allIds.includes(x.evidenceAnchor)&&x.masteryClaim===null));
assert.equal((registry.match(/"date": "2026-10-17"/g)||[]).length,1);
for(const p of ['../pdf_docs/17.10.26.pdf','../tex_docs/17.10.26.tex','../images/17.10.26.png','17.10.26-lab.html']){
  assert.ok(fs.existsSync(path.resolve(root,p)),p+' material missing');
}

const script=lab.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script?.length);
class Element{
  constructor(id=''){this.id=id;this.value='0';this.dataset={};this.attributes={};this.listeners={};this.children=[];this.style={};this.textContent='';}
  set innerHTML(value){this._innerHTML=value;this.textContent=value.replace(/<[^>]*>/g,'').replace(/&nbsp;|\u00a0/g,' ');}
  get innerHTML(){return this._innerHTML||'';}
  appendChild(child){this.children.push(child);return child;}
  replaceChildren(){this.children=[];}
  setAttribute(k,v){this.attributes[k]=String(v);}
  getAttribute(k){return this.attributes[k]||null;}
  addEventListener(k,f){this.listeners[k]=f;}
}
function load(search=''){
  const elements=new Map();
  function get(id){if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id);}
  const buttons=['perpendicular','opposite','three','equilibrium'].map(k=>{const x=new Element(k);x.dataset.preset=k;return x});
  const inputs={f1x:0,f1y:4,f2x:3,f2y:0,f3x:0,f3y:0,mass:2};
  Object.entries(inputs).forEach(([k,v])=>{get(k).value=String(v);});
  get('scene').createSVGPoint=()=>({x:0,y:0,matrixTransform(){return this;}});
  const document={
    documentElement:{dataset:{theme:'light'}},
    getElementById:get,
    querySelectorAll(q){if(q==='[data-preset]')return buttons;return [];},
    querySelector(q){const match=q.match(/^\[data-preset="([^"]+)"\]$/);return buttons.find(x=>x.dataset.preset===match?.[1])||null;},
    createElementNS(){return new Element();}
  };
  const sandbox={document,URLSearchParams,location:{search},localStorage:{getItem(){return null},setItem(){}},console};
  vm.runInNewContext(script,sandbox);
  return {get,buttons,change(k,v){get(k).value=String(v);get(k).listeners.input();},check(){get('check').listeners.click();return get('feedback').textContent;}};
}
const a=load('?scenario=perpendicular');
assert.match(a.get('force').textContent,/5 Н/);
assert.match(a.check(),/Первый эксперимент выполнен/);
a.change('f1x',5);a.change('f1y',0);a.change('f2x',0);
assert.doesNotMatch(a.check(),/Первый эксперимент выполнен/,'single nonzero force is not two perpendicular forces');
a.change('f1x',3);a.change('f2x',4); // parallel forces, resultant 7 N
assert.doesNotMatch(a.check(),/Первый эксперимент выполнен/);
const b=load('?scenario=equilibrium');
assert.equal(b.get('force').textContent,'0 Н');
assert.match(b.check(),/Равновесие достигнуто/);
const c=load('?scenario=three');
assert.equal(c.get('fx').textContent,'1 Н');
assert.equal(c.get('fy').textContent,'4 Н');
assert.match(c.get('force').textContent,/4,12 Н/);
c.change('f1x',-10);c.change('f2x',-10);c.change('f3x',-10);
assert.match(c.get('fx').innerHTML,/<mo>−<\/mo><mn>30<\/mn>/);
assert.match(c.get('scaleNote').textContent,/Масштаб/);
assert.match(c.get('explanation').innerHTML,/<msqrt>.*<msup>/);
assert.match(c.get('explanation').innerHTML,/<mo>−<\/mo><mn>30<\/mn>/);
c.get('reset').listeners.click();
assert.equal(c.get('force').textContent,'5 Н');
console.log('17.10.26 release-gate: lessons, MathML, lab physics and presets OK');
