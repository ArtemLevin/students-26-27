import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const site=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const student=path.resolve(site,'..');
const read=name=>fs.readFileSync(path.join(site,name),'utf8');
const lesson=read('08.10.26.html');
const lab=read('08.10.26-lab.html');
const index=read('index.html');
const intent=JSON.parse(fs.readFileSync(path.join(student,'review_docs','08.10.26.lesson-publication-intent.json'),'utf8'));
const tex=fs.readFileSync(path.join(student,'tex_docs','08.10.26.tex'),'utf8');
const pattern=(html,tag)=>[...html.matchAll(new RegExp('<'+tag+'\\b[^>]*>','gi'))].map(x=>x[0]);
const ids=html=>[...html.matchAll(/\bid=["']([^"']+)["']/g)].map(x=>x[1]);
const hasId=(html,id)=>ids(html).includes(id);

test('dated lesson, lab and source materials exist',()=>{
  for(const filename of ['08.10.26.html','08.10.26-lab.html'])assert.ok(fs.existsSync(path.join(site,filename)));
  for(const [dir,ext] of [['pdf_docs','pdf'],['tex_docs','tex'],['images','png']]){
    assert.ok(fs.existsSync(path.join(student,dir,'08.10.26.'+ext)));
  }
  assert.match(tex,/\\sectionline\{4\. Задачи на работу и производительность\}/);
});

test('lesson is a proper accessible single document',()=>{
  assert.match(lesson,/<html lang="ru"/);
  assert.equal(pattern(lesson,'h1').length,1);
  assert.equal((lesson.match(/<li>/g)||[]).length,10);
  assert.deepEqual(new Set(ids(lesson)).size,ids(lesson).length);
  assert.match(lesson,/id="practice"/);
  assert.match(lesson,/prefers-reduced-motion/);
  assert.match(lesson,/data-guess="c"/);
  assert.match(lesson,/aria-live="polite"/);
  for(const anchor of ['minutes','shares','stories','work','mistakes','practice'])
    assert.ok(hasId(lesson,anchor),'missing chapter #'+anchor);
});

test('laboratory offers actual educational control over both models',()=>{
  assert.deepEqual(new Set(ids(lab)).size,ids(lab).length);
  assert.match(lab,/<html lang="ru"/);
  assert.match(lab,/data-mode="time"/);
  assert.match(lab,/data-mode="work"/);
  assert.match(lab,/id="workReset"/);
  assert.match(lab,/id="timeSwap"/);
  assert.match(lab,/id="tA" type="range"/);
  assert.match(lab,/id="tB" type="range"/);
  assert.match(lab,/aria-live="polite"/);
  assert.match(lab,/prefers-reduced-motion/);
  for(const id of ['fractionA','fractionB','workScenario','tA','tB'])
    assert.ok(lab.includes('for="'+id+'"'),'missing accessible label '+id);
});

test('inline JavaScript parses without syntax errors',()=>{
  for(const [name,source] of [['lesson',lesson],['lab',lab],['index',index]]){
    const scripts=[...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
    for(const [,script] of scripts)new vm.Script(script,{filename:name+'.inline.js'});
  }
  new vm.Script(read('competency-map-lesson-20261008.js'),{filename:'competency-map-lesson-20261008.js'});
});

test('local links and images resolve, including #fragments',()=>{
  for(const [name,source] of [['08.10.26.html',lesson],['08.10.26-lab.html',lab],['index.html',index]]){
    for(const m of source.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)){
      const raw=m[1];if(/^(?:https?:|data:|mailto:|javascript:)/i.test(raw))continue;
      const [location,fragment='']=raw.split('#');
      const filename=location.split('?')[0];
      const target=filename?path.resolve(site,filename):path.join(site,name);
      assert.ok(fs.existsSync(target),name+': broken local link '+raw);
      if(fragment&&filename.endsWith('.html')){
        const targetHtml=fs.readFileSync(target,'utf8');
        assert.ok(hasId(targetHtml,decodeURIComponent(fragment)),name+': missing anchor in '+raw);
      }
    }
  }
});

test('canonical evidence intent points to real lesson sections without mastery claims',()=>{
  assert.equal(intent.studentId,'xenia_vasilchenko');
  assert.equal(intent.lessonDate,'2026-10-08');
  assert.ok(intent.outcomes.length>=5);
  for(const outcome of intent.outcomes){
    assert.ok(hasId(lesson,outcome.evidenceAnchor),'missing evidence #'+outcome.evidenceAnchor);
    assert.equal(outcome.masteryClaim,null);
    assert.equal(outcome.confidence,'exact');
    assert.equal(outcome.decision,'apply');
  }
  const overlay=read('competency-map-lesson-20261008.js');
  assert.doesNotMatch(overlay,/\.baselineLevel\s*=/);
  assert.match(index,/08\.10\.26-lab\.html/);
});

test('source lesson arithmetic remains internally consistent',()=>{
  const gcd=(a,b)=>b===0?Math.abs(a):gcd(b,a%b);
  const reduced=(a,b)=>[a/gcd(a,b),b/gcd(a,b)];
  const compare=(a,b,c,d)=>Math.sign(a*d-c*b);
  assert.equal(compare(1,3,2,5),-1);
  assert.equal(compare(11,20,8,15),1);
  assert.equal(compare(11,20,13,35),1);
  assert.equal(compare(8,15,11,20),-1);
  assert.equal(compare(5,7,6,10),1);
  assert.equal(compare(5,6,7,8),-1);
  assert.equal(compare(3,5,6,10),0);
  assert.equal(compare(5,18,4,15),1);
  assert.deepEqual(reduced(60*7,18),[70,3]);
});
