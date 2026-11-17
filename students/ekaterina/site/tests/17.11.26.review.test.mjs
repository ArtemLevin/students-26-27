import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const site=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const student=path.resolve(site,'..');
const read=(relative)=>fs.readFileSync(path.join(site,relative),'utf8');
const html=read('17.11.26.html');
const intent=JSON.parse(read('data/lessons/2026-11-17.intent.json'));
const metadata=JSON.parse(read('data/lessons/2026-11-17.lesson.json'));
const index=read('index.html');
const registry=read('lesson-registry.js');

const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
const anchors=new Set(ids);
test('lesson has an accessible page structure and stable evidence anchors',()=>{
  assert.match(html,/<html lang="ru"/);
  assert.match(html,/<main id="content"/);
  assert.match(html,/prefers-reduced-motion:reduce/);
  assert.match(html,/data-theme="light"/);
  assert.equal(ids.length,anchors.size,'duplicate ids');
  for(const link of html.matchAll(/\bhref="([^"]+)"/g)){
    if(link[1].startsWith('#')){
      assert.ok(anchors.has(link[1].slice(1)),link[1]);
      continue;
    }
    const relative=link[1].split(/[?#]/,1)[0];
    if(!relative||/^[a-z]+:/i.test(relative))continue;
    assert.ok(fs.existsSync(path.resolve(site,relative)),'missing local link '+relative);
  }
});
test('all ten workbook tasks, answers and controls are present',()=>{
  assert.equal((html.match(/class="exercise"/g)||[]).length,10);
  assert.equal((html.match(/class="answer"/g)||[]).length,10);
  assert.equal((html.match(/data-exercise="\d+"/g)||[]).length,10);
  assert.match(html,/aria-live="polite"/);
  assert.match(html,/id="themeButton"/);
  assert.match(html,/localStorage/);
  assert.equal(Math.sqrt(12.25)*Math.sqrt(.16),1.4000000000000001);
  assert.equal(.4*Math.sqrt(625)+1.5*Math.sqrt(4/9),11);
  assert.equal(Math.sqrt(14400),120);
  assert.equal(Math.sqrt(12)*Math.sqrt(75)/Math.sqrt(9),10);
  assert.equal(Math.sqrt(8*14*21*3),84);
});
test('source worksheet and lesson publication metadata agree',()=>{
  assert.ok(fs.existsSync(path.join(student,'pdf_docs/17.11.26.pdf')));
  const tex=fs.readFileSync(path.join(student,'tex_docs/17.11.26.tex'),'utf8');
  assert.ok(tex.startsWith('\\documentclass'));
  assert.ok(tex.includes('\\end{document}'));
  assert.equal(intent.studentId,'ekaterina');
  assert.equal(intent.lessonDate,'2026-11-17');
  assert.equal(metadata.date,intent.lessonDate);
  assert.equal(metadata.materials.html,'17.11.26.html');
  assert.equal(metadata.materials.pdf,'../pdf_docs/17.11.26.pdf');
  assert.equal(metadata.materials.tex,'../tex_docs/17.11.26.tex');
  assert.equal(metadata.outcomes.length,intent.outcomes.length);
  for(const entry of intent.outcomes){
    assert.ok(anchors.has(entry.evidenceAnchor),'missing competency anchor '+entry.evidenceAnchor);
    assert.equal(entry.masteryClaim,null);
    assert.ok(['touched','practiced'].includes(entry.relation));
  }
  assert.match(registry,/"date": "2026-11-17"/);
  assert.match(index,/lesson-registry.js\?v=20261117/);
});
test('interactive lesson JavaScript parses',()=>{
  const code=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(code,'script missing');
  assert.doesNotThrow(()=>new Function(code));
});
