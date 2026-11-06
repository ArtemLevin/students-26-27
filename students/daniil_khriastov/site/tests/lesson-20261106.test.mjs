import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const student=path.resolve(ROOT,'..');
const lesson=fs.readFileSync(path.join(ROOT,'06.11.26.html'),'utf8');
const lab=fs.readFileSync(path.join(ROOT,'06.11.26-lab.html'),'utf8');
const intent=JSON.parse(fs.readFileSync(path.join(ROOT,'data/publication-intents/2026-11-06.json'),'utf8'));
const match=lesson.match(/const DATA=(\[[\s\S]*?\]);\s*const FORM=/);
assert.ok(match,'training data must be embedded in lesson');
const tasks=JSON.parse(match[1]);

function value(t,x){
  if(t.type==='e')return t.a**x+t.b;
  if(t.type==='p')return t.a**x;
  if(t.type==='s')return t.a**(x+t.b);
  if(t.type==='l')return t.a*x+t.b;
  return t.a*x*x+t.b*x+t.c;
}
function expected(t){
  if(typeof t.target==='number')return value(t,t.target);
  const y=Number(t.target.split(':')[1]);
  if(t.type==='e')return Math.log(y-t.b)/Math.log(t.a);
  if(t.type==='l')return (y-t.b)/t.a;
  throw new Error('Unsupported inverse task type');
}
function number(answer){return answer==='1/4'?.25:Number(answer.replace('−','-'))}

test('all 10 graphs have exact support points and checked answers',()=>{
  assert.equal(tasks.length,10);
  for(const [index,t] of tasks.entries()){
    assert.equal(t.points.length,2,'task '+(index+1));
    for(const [x,y] of t.points){
      assert.ok(Math.abs(value(t,x)-y)<1e-8,'point mismatch task '+(index+1));
    }
    assert.ok(Math.abs(expected(t)-number(t.answer))<1e-8,'answer mismatch task '+(index+1));
  }
});
test('all lesson materials exist and expected MathML anchors are present',()=>{
  assert.match(lesson,/<math xmlns="http:\/\/www\.w3\.org\/1998\/Math\/MathML"/);
  assert.match(lesson,/id="practice"/);
  assert.match(lesson,/id="algorithm"/);
  for(const [dir,name] of [['pdf_docs','06.11.26.pdf'],['tex_docs','06.11.26.tex'],['images','06.11.26.png']]){
    assert.ok(fs.existsSync(path.join(student,dir,name)),dir+'/'+name+' must exist');
  }
});
test('publication intent outcomes match canonical catalog and page anchors',()=>{
  assert.equal(intent.studentId,'daniil_khriastov');
  assert.equal(intent.lessonDate,'2026-11-06');
  const catalog=fs.readFileSync(path.join(ROOT,'competency-map-data.js'),'utf8');
  for(const o of intent.outcomes){
    assert.ok(catalog.includes('"id": "'+o.competencyId+'"'));
    assert.ok(lesson.includes('id="'+o.evidenceAnchor+'"'));
    assert.equal(o.masteryClaim,null);
  }
});
test('lab is available and has interactive graph controls',()=>{
  for(const id of ['chart','mode','aValue','bValue','xValue','measure','formula','reset']){
    assert.ok(lab.includes('id="'+id+'"'),'missing '+id);
  }
  assert.match(lab,/addEventListener\("input"/);
  assert.match(lab,/return '<svg|<svg id="chart"/);
  assert.ok(!/https?:\/\/[^"']+\.js/i.test(lab),'avoid external JS');
});
