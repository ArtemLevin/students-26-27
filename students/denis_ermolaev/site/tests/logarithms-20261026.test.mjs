import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const site=path.dirname(fileURLToPath(import.meta.url)).replace(/\/tests$/, '');
const html=fs.readFileSync(path.join(site,'26.10.26.html'),'utf8');
const metadata=JSON.parse(fs.readFileSync(path.join(site,'data/lessons/2026-10-26.lesson.json'),'utf8'));
const registry=fs.readFileSync(path.join(site,'lesson-registry.js'),'utf8');

test('2026-10-26 lesson has valid MathML wrappers and no TeX delimiters',()=>{
  const open=(html.match(/<math\\b/g)||[]).length;
  const close=(html.match(/<\\/math>/g)||[]).length;
  assert.ok(open>=40,'expected math-rich lesson');
  assert.equal(open,close);
  assert.doesNotMatch(html,/\\\\\\(|\\\\\\[|\\$\\$/);
});

test('Pуть A has exactly ten exercises with ten answer disclosures',()=>{
  assert.equal((html.match(/class="task" id="task-\\d+"/g)||[]).length,10);
  assert.equal((html.match(/class="solution"/g)||[]).length,10);
});

test('page IDs and internal navigation targets are valid',()=>{
  const ids=[...html.matchAll(/\\bid="([^"]+)"/g)].map(x=>x[1]);
  assert.equal(new Set(ids).size,ids.length,'duplicate DOM id');
  for(const x of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(x[1]),'missing '+x[1]);
});

test('all lesson evidence anchors correspond to actual DOM IDs',()=>{
  for(const outcome of metadata.outcomes){
    assert.match(html,new RegExp('\\\\bid="'+outcome.evidenceAnchor+'"'));
    assert.equal(outcome.masteryClaim,null);
    assert.ok(['touched','practiced'].includes(outcome.relation));
  }
  assert.equal(metadata.date,'2026-10-26');
  assert.match(registry,/2026-10-26/);
});

test('published source assets and no speculative laboratory',()=>{
  for(const link of ['../pdf_docs/26.10.26.pdf','../tex_docs/26.10.26.tex','../images/26.10.26.png']){
    assert.ok(fs.existsSync(path.resolve(site,link)),'missing '+link);
  }
  assert.doesNotMatch(html,/26\\.10\\.26-lab\\.html/);
});

test('accessible interactivity and responsive light and dark themes',()=>{
  assert.match(html,/aria-pressed="true"/);
  assert.match(html,/aria-live="polite"/);
  assert.match(html,/prefers-reduced-motion/);
  assert.match(html,/data-theme="dark"/);
  assert.match(html,/@media\\(max-width:800px\\)/);
});
