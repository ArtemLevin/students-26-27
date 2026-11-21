import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve, dirname} from 'node:path';

const folder=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const student=resolve(folder,'..');
const page=readFileSync(resolve(folder,'16.11.26.html'),'utf8');
const intent=JSON.parse(readFileSync(resolve(folder,'data/publication-intents/2026-11-16.json'),'utf8'));
const ids=[...page.matchAll(/\bid="([^"]+)"/g)].map((m)=>m[1]);

test('lesson has coherent MathML, 10 training tasks and stable anchors',()=>{
  assert.equal((page.match(/<math\b/g)||[]).length,(page.match(/<\/math>/g)||[]).length);
  assert.ok((page.match(/<math\b/g)||[]).length>=40);
  assert.equal(new Set(ids).size,ids.length);
  for(let i=1;i<=10;i++) assert.ok(ids.includes('task-'+i));
  for(const id of ['identity','circle','sum','double','reduction','pitfalls','practice','materials'])
    assert.ok(ids.includes(id),'Missing section '+id);
  assert.match(page,/<html lang="ru"/);
  assert.match(page,/data-atlas-composition="blueprint"/);
});
test('publication evidence anchors resolve locally and no mastery is inferred',()=>{
  assert.equal(intent.studentId,'denis_ermolaev');
  assert.equal(intent.lessonDate,'2026-11-16');
  assert.deepEqual(intent.ktpMatches,[]);
  assert.ok(intent.outcomes.length>0);
  for(const item of intent.outcomes){
    assert.ok(ids.includes(item.evidenceAnchor),item.evidenceAnchor);
    assert.equal(item.masteryClaim,null);
    assert.ok(['touched','practiced'].includes(item.relation));
    assert.equal(item.confidence,'exact');
  }
});
test('all publicly linked lesson artifacts already exist',()=>{
  for(const file of ['pdf_docs/16.11.26.pdf','tex_docs/16.11.26.tex','images/16.11.26.png'])
    assert.ok(existsSync(resolve(student,file)),file);
});
