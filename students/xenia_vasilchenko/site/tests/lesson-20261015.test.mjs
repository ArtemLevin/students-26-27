import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const site=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const student=path.resolve(site,'..');
const lesson=fs.readFileSync(path.join(site,'15.10.26.html'),'utf8');
const index=fs.readFileSync(path.join(site,'index.html'),'utf8');
const registry=fs.readFileSync(path.join(site,'lesson-registry.js'),'utf8');
const meta=JSON.parse(fs.readFileSync(path.join(site,'data/lessons/2026-10-15.lesson.json'),'utf8'));
const intent=JSON.parse(fs.readFileSync(path.join(site,'data/publication-intents/2026-10-15.json'),'utf8'));
const ids=html=>[...html.matchAll(/\bid=["']([^"']+)["']/g)].map(x=>x[1]);

test('lesson route, 4 study steps and 10 practice tasks are accessible',()=>{
  assert.match(lesson,/<html lang="ru"/);
  assert.equal((lesson.match(/<h1>/g)||[]).length,1);
  assert.equal((lesson.match(/<li class="task">/g)||[]).length,10);
  assert.equal((lesson.match(/<details>/g)||[]).length,10);
  assert.equal((lesson.match(/class="lab-state"/g)||[]).length,4);
  assert.equal(ids(lesson).length,new Set(ids(lesson)).size);
  for(const anchor of ['smart','decimal','factors','equations','language','stories','practice','materials'])assert.ok(ids(lesson).includes(anchor));
  assert.match(lesson,/prefers-reduced-motion/);
  assert.match(lesson,/aria-live="polite"/);
  assert.match(lesson,/id="nextStep"/);
  assert.match(lesson,/id="themeButton"/);
});
test('canonical v2 lesson publication matches metadata and source evidence',()=>{
  assert.match(registry,/"date": "2026-10-15"/);
  assert.equal((registry.match(/"date": "2026-10-15"/g)||[]).length,1);
  assert.match(index,/href="archive\.html"/);
  assert.match(fs.readFileSync(path.join(site,"atlas-editorial.js"),"utf8"), /getLatestLesson\(LESSONS\)/);
  assert.match(index,/competency-map-lesson-20261015\.js/);
  assert.equal(meta.date,'2026-10-15');
  assert.equal(intent.lessonDate,meta.date);
  assert.deepEqual(meta.topics,intent.topics);
  assert.equal(meta.outcomes.length,intent.outcomes.length);
  for(const outcome of intent.outcomes){
    assert.ok(ids(lesson).includes(outcome.evidenceAnchor),'missing '+outcome.evidenceAnchor);
    assert.equal(outcome.masteryClaim,null);
    assert.ok(['practiced','touched'].includes(outcome.relation));
  }
});
test('all local page links resolve and inline scripts parse',()=>{
  for(const [name,source] of [['15.10.26.html',lesson],['index.html',index]]){
    for(const hit of source.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)){
      const uri=hit[1];
      if(/^(?:https?:|data:|mailto:)/i.test(uri))continue;
      const [location,hash='']=uri.split('#');
      const file=path.resolve(site,location.split('?')[0]||name);
      assert.ok(fs.existsSync(file),name+': '+uri);
      if(hash&&file.endsWith('.html'))assert.ok(ids(fs.readFileSync(file,'utf8')).includes(hash),name+': '+uri);
    }
  }
  for(const match of lesson.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))new vm.Script(match[1]);
  const source=fs.readFileSync(path.join(site,'competency-map-lesson-20261015.js'),'utf8');
  new vm.Script(source);
  assert.doesNotMatch(source,/\.baselineLevel\s*=/);
  assert.doesNotMatch(source,/\.level\s*=/);
  for(const ext of [['pdf_docs','pdf'],['tex_docs','tex'],['images','png']])assert.ok(fs.existsSync(path.join(student,ext[0],'15.10.26.'+ext[1])));
});
test('independent arithmetic spot checks of lesson and tasks',()=>{
  const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,a+' != '+b);
  near(2+4/15+1+7/20+3+11/15,7+7/20);
  near(2+3/15-1.9+1+7/20,1+13/20);
  near(1200%6,0);near(1200%16,0);near(1200%50,0);
  near(4+1/3-(1+5/6),2+1/2);
  near(1052/25-1463/30,-(6+103/150));
  near(1+2/9+2+5/12+3+7/9,7+5/12);
  near(6+3/8-(2+1/8+1+5/8),2+5/8);
  near(3+3/10-1.84+2+1/4,3+71/100);
  near(5+1/6-(2+3/4),2+5/12);
  near(2+1/3+1+1/4-(1+5/6),1+3/4);
  near(4+1/6+5+3/8+3+1/4,12+19/24);
  near(635/15-754/18,4/9);
  near(1500/8+7+3/4,195+1/4);
  near(1500/8-(7+3/4),179+3/4);
  near(4+1/8+1+3/4-(2+1/6),3+17/24);
});
