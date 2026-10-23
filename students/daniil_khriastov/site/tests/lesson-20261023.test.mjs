import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const dir=path.dirname(fileURLToPath(import.meta.url));
const site=path.resolve(dir,'..');
const repo=path.resolve(dir,'../../../..');
const html=fs.readFileSync(path.join(site,'23.10.26.html'),'utf8');
const intent=JSON.parse(fs.readFileSync(path.join(repo,'pipeline/publication-intents/daniil-khriastov-2026-10-23.json'),'utf8'));

test('MathML elements are balanced and JavaScript parses',()=>{
  const tags=[...html.matchAll(/<\/?(?:math|mrow|msup|msub|mfrac|msqrt|mroot|mi|mn|mo)\b[^>]*>/g)].map(m=>m[0]);
  const stack=[];
  for(const tag of tags){
    const type=tag.match(/^<\/?([a-z]+)/)[1];
    if(tag.startsWith('</'))assert.equal(stack.pop(),type,tag);
    else stack.push(type);
  }
  assert.deepEqual(stack,[]);
  const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
  assert.equal(scripts.length,1);
  new vm.Script(scripts[0],{filename:'23.10.26.html:inline'});
});

test('IDs and accessible controls remain unique and operational',()=>{
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size);
  for(const id of ['main','rules','common-base','roots','worked','equations','fractions','practice','base','powerM','powerN','resetExperiment','experimentInsight','choiceFeedback','themeToggle']){
    assert.ok(ids.includes(id),'missing '+id);
  }
  assert.match(html,/prefers-reduced-motion/);
  assert.match(html,/aria-live="polite"/);
  assert.match(html,/beforeprint/);
  assert.match(html,/afterprint/);
});

test('Ten practice problems and ten answers remain in a hidden answer key',()=>{
  const exercises=html.match(/<li><div><strong>(?:Вычислите|Решите уравнение|Разложите 108 на простые множители)/g)||[];
  const answers=html.match(/class="answer-row"/g)||[];
  assert.equal(exercises.length,10);
  assert.equal(answers.length,10);
  assert.match(html,/<details class="answer">/);
  assert.match(html,/<mn>0,25<\/mn>/);
});

test('All six lesson evidence anchors exist without invented mastery or KTP completion',()=>{
  assert.equal(intent.studentId,'daniil_khriastov');
  assert.equal(intent.lessonDate,'2026-10-23');
  assert.deepEqual(intent.ktpMatches,[]);
  assert.equal(intent.outcomes.length,6);
  const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
  for(const entry of intent.outcomes){
    assert.ok(ids.has(entry.evidenceAnchor),entry.evidenceAnchor);
    assert.equal(entry.decision,'apply');
    assert.equal(entry.confidence,'exact');
    assert.equal(entry.masteryClaim,null);
    assert.equal(entry.relation,'touched');
  }
});

test('All local links exist and hash fragments resolve',()=>{
  const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
  for(const [,href] of html.matchAll(/\bhref="([^"]+)"/g)){
    if(/^(?:https?:|data:|mailto:)/.test(href))continue;
    const [relative,hash]=href.split('#');
    const destination=relative?path.resolve(site,relative):path.join(site,'23.10.26.html');
    assert.ok(fs.existsSync(destination),'broken local link '+href);
    if(hash && (!relative||relative==='23.10.26.html')){
      assert.ok(ids.has(hash),'broken in-page anchor '+href);
    }
  }
});
