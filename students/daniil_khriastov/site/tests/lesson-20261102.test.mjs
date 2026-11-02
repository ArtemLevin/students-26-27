import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const site=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const page=fs.readFileSync(path.join(site,'02.11.26.html'),'utf8');
const lab=fs.readFileSync(path.join(site,'02.11.26-lab.html'),'utf8');
const intent=JSON.parse(fs.readFileSync(path.join(site,'data/publication-intents/2026-11-02.json'),'utf8'));

function checkDocument(source,name){
  const ids=[...source.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(ids).size,ids.length,name+' IDs unique');
  const stack=[];
  for(const match of source.matchAll(/<\/?(math|mrow|msup|msub|msubsup|msqrt|mroot|mfrac|mi|mn|mo|mspace)\b[^>]*\/?\s*>/g)){
    const tag=match[0];
    if(tag.startsWith('</'))assert.equal(stack.pop(),match[1],name+' '+tag);
    else if(!/\/\s*>$/.test(tag))stack.push(match[1]);
  }
  assert.deepEqual(stack,[],name+' MathML balanced');
  const scripts=[...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
  assert.equal(scripts.length,1,name+' script');
  new vm.Script(scripts[0],{filename:name});
  for(const [,href] of source.matchAll(/href="([^"]+)"/g)){
    if(/^(?:https?:|data:|mailto:)/.test(href))continue;
    const [relative,hash]=href.split('#');
    const target=relative?path.resolve(site,relative):path.resolve(site,name);
    assert.ok(fs.existsSync(target),name+' broken link '+href);
    if(!relative&&hash)assert.ok(ids.includes(hash),name+' missing anchor '+hash);
  }
  return ids;
}

test('November lesson and lab contain valid MathML, scripts and material links',()=>{
  checkDocument(page,'02.11.26.html');
  checkDocument(lab,'02.11.26-lab.html');
  assert.match(page,/\.\.\/pdf_docs\/02\.11\.26\.pdf/);
  assert.match(page,/\.\.\/tex_docs\/02\.11\.26\.tex/);
  assert.match(page,/prefers-reduced-motion/);
  assert.match(lab,/prefers-reduced-motion/);
});

test('all ten exercise statements and answer rows are present',()=>{
  const tasks=page.match(/<li><h3>/g)||[];
  const answers=page.match(/<tr><td>\d+<\/td>/g)||[];
  assert.equal(tasks.length,10);
  assert.equal(answers.length,10);
  assert.match(page,/Масса радиоактивного изотопа/);
  assert.match(page,/Показатель степенного закона газа/);
});

test('publication intent anchors are real and do not claim mastery',()=>{
  const ids=new Set([...page.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]));
  assert.equal(intent.studentId,'daniil_khriastov');
  assert.equal(intent.lessonDate,'2026-11-02');
  assert.deepEqual(intent.ktpMatches,[]);
  for(const outcome of intent.outcomes){
    assert.ok(ids.has(outcome.evidenceAnchor),outcome.evidenceAnchor);
    assert.equal(outcome.masteryClaim,null);
    assert.equal(outcome.relation,'touched');
    assert.equal(outcome.decision,'apply');
  }
});

test('models reproduce physical calculations from the November checklist',()=>{
  assert.equal((2**5*2**(-3))/2**(-2),16);
  assert.equal(4e-7*2.5e9,1000);
  assert.equal(125**(2/3),25);
  assert.ok(Math.abs(Math.cbrt((2000+16*10)/(1000*10))-.6)<1e-12);
  assert.equal(48*2**(-21/7),6);
  assert.ok(Math.abs((8e6/(5e-8*10))**(1/4)-2000)<1e-10);
  assert.equal(12*Math.log2(80/5),48);
  assert.ok(Math.abs((80/2.5e5)**(3/5)-.008)<1e-12);
  assert.ok(Math.abs(Math.log(9)/Math.log(3)-2)<1e-12);
  assert.ok(Math.abs(.016/(32**(3/5))-.002)<1e-12);
});

test('interactive lab has keyboard tabs, reset controls, live outputs and anchors',()=>{
  for(const id of ['tab-decay','tab-gas','decay','gas','massInitial','halfTime','elapsed','compression','exponent','remaining','pressureRatio','resetGas','resetDecay'])
    assert.match(lab,new RegExp('id="'+id+'"'));
  assert.match(lab,/aria-live="polite"/);
  assert.match(lab,/ArrowRight/);
  assert.match(lab,/hashchange/);
  assert.match(lab,/drawDecay\(\);drawGas\(\)/);
});
