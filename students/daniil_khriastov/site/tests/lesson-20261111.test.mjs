import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const site=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const student=path.resolve(site,'..');
const html=fs.readFileSync(path.join(site,'11.11.26.html'),'utf8');
const intent=JSON.parse(fs.readFileSync(path.join(site,'data/publication-intents/2026-11-11.json'),'utf8'));
const catalog=fs.readFileSync(path.join(site,'competency-map-data.js'),'utf8');
const close=(actual,expected,why)=>assert.ok(Math.abs(actual-expected)<1e-8,why+' : '+actual);

test('11 November lesson has 10 answers and MathML throughout',()=>{
  assert.equal((html.match(/id="exercise-\\d+"/g)||[]).length,10);
  assert.ok((html.match(/<math xmlns="http:\/\/www\\.w3\\.org\/1998\/Math\/MathML"/g)||[]).length>=30);
  for(const id of ['power-bridge','domain','properties','change-base','algorithm','worked','practice','exercise-10']){
    assert.ok(html.includes('id="'+id+'"'),'missing '+id);
  }
  for(const id of ['theme-toggle','step-prev','step-next','step-reset','domain-result']){
    assert.ok(html.includes('id="'+id+'"'),'missing control '+id);
  }
  assert.match(html,/prefers-reduced-motion/);
});
test('material links point to files actually present',()=>{
  for(const [dir,ext] of [['pdf_docs','pdf'],['tex_docs','tex'],['images','png']]){
    assert.ok(fs.existsSync(path.join(student,dir,'11.11.26.'+ext)));
    assert.ok(html.includes('../'+dir+'/11.11.26.'+ext));
  }
});
test('publication intent has canonical IDs and stable HTML anchors; no unsupported mastery',()=>{
  assert.equal(intent.studentId,'daniil_khriastov');
  assert.equal(intent.lessonDate,'2026-11-11');
  assert.deepEqual(intent.ktpMatches,[]);
  for(const outcome of intent.outcomes){
    assert.ok(catalog.includes('"id": "'+outcome.competencyId+'"'));
    assert.ok(html.includes('id="'+outcome.evidenceAnchor+'"'));
    assert.equal(outcome.masteryClaim,null);
  }
});
test('all ten training answers are mathematically consistent',()=>{
  const log=(a,b)=>Math.log(b)/Math.log(a);
  close(log(2,64),6,'1');
  close(log(5,1/Math.sqrt(25)),-1,'2');
  close(log(3**(2/3),9),3,'3');
  for(const x of [2,8]){
    close(log(7,(x-3)**2),2*log(7,Math.abs(x-3)),'4 at x='+x);
  }
  close(3-log(2,5),log(2,8/5),'5');
  close(log(4,7)+log(2,3),log(2,3*Math.sqrt(7)),'6');
  close(log(5,7)*log(7,125),3,'7');
  close(8**log(4,9),27,'8');
  close(11**log(5,75)/11**log(5,3),121,'9');
  close((1-log(3,15))*(1-log(5,15)),1,'10');
});
