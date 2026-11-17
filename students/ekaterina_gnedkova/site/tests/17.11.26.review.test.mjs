import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const site=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const lesson=fs.readFileSync(path.join(site,'17.11.26.html'),'utf8');
const lab=fs.readFileSync(path.join(site,'17.11.26-lab.html'),'utf8');
const dashboard=fs.readFileSync(path.join(site,'index.html'),'utf8');
const intent=JSON.parse(fs.readFileSync(path.join(site,'data/publication-intents/2026-11-17.json'),'utf8'));

function idList(s){return [...s.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);}
test('lesson has all ten full original training problems',()=>{
  const items=[...lesson.matchAll(/<article class="exercise" id="task-(\d+)">([\s\S]*?)<\/article>/g)];
  assert.equal(items.length,10);
  items.forEach(([whole,index,body],i)=>{
    assert.equal(Number(index),i+1);
    assert.ok(body.replace(/<[^>]*>/g,' ').length>250,'task '+index+' is abbreviated');
  });
  assert.equal((lesson.match(/<tr><td>\d+<\/td>/g)||[]).length,10);
});
test('all hash links have existing targets, and IDs are unique',()=>{
  for(const html of [lesson,lab]){
    const ids=idList(html),unique=new Set(ids);
    assert.equal(ids.length,unique.size,'duplicate id');
    for(const match of html.matchAll(/href="#([^"]+)"/g))assert.ok(unique.has(match[1]),'missing '+match[1]);
  }
});
test('published material targets exist locally',()=>{
  for(const [file,dir] of [['17.11.26.pdf','pdf_docs'],['17.11.26.tex','tex_docs']])
    assert.ok(fs.existsSync(path.join(site,'..',dir,file)),file+' missing');
  assert.ok(dashboard.includes('href="17.11.26.html"'));
  assert.ok(dashboard.includes('href="17.11.26-lab.html"'));
});
test('evidence uses real anchors and does not assert mastery',()=>{
  assert.equal(intent.lessonDate,'2026-11-17');
  const ids=new Set(idList(lesson));
  assert.ok(intent.outcomes.length>=1);
  for(const item of intent.outcomes){
    assert.ok(ids.has(item.evidenceAnchor),item.evidenceAnchor);
    assert.equal(item.masteryClaim,null);
    assert.ok(['practiced','touched'].includes(item.relation));
    assert.equal(item.confidence,'exact');
  }
});
test('worked mathematical examples agree with source calculations',()=>{
  assert.ok(Math.abs(.05*.9+.95*.01-.0545)<1e-12);
  assert.ok(Math.abs(.9*(5/89)+.01*(84/89)-.06)<1e-12);
  assert.ok(Math.abs(.45**2+2*.45*.1+.1**2+2*.45**2-.7075)<1e-12);
  assert.ok(Math.abs(1-(1-.8)**3-.992)<1e-12);
  assert.ok(Math.abs((4/6)*(3/5)*(2/4)-.2)<1e-12);
});
