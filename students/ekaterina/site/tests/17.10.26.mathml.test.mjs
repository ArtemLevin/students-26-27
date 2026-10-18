import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const site=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(site,'17.10.26.html'),'utf8');
const namespace='http://www.w3.org/1998/Math/MathML';
const main=source.slice(source.indexOf('<main'),source.lastIndexOf('<script>'));

test('all 17 October lesson mathematics uses native semantic MathML',()=>{
  const roots=[...main.matchAll(/<math xmlns="([^"]+)"[^>]*>/g)];
  assert.ok(roots.length>=170,'Too few MathML roots: '+roots.length);
  assert.ok(roots.every(r=>r[1]===namespace),'Unexpected MathML namespace');
  assert.equal((main.match(/<math /g)||[]).length,(main.match(/<\/math>/g)||[]).length,'Unbalanced MathML roots');
  assert.ok((main.match(/<msub>/g)||[]).length>=25,'Base notation must use msub');
  assert.ok((main.match(/<mfrac>/g)||[]).length>=3,'Fraction structure missing');
  assert.ok((main.match(/<msup>/g)||[]).length>=1,'Exponent structure missing');
  assert.ok((main.match(/<mtable>/g)||[]).length>=5,'Multiline examples must use mtable');
  assert.equal((main.match(/<sub>/g)||[]).length,0,'HTML sub is forbidden');
  assert.ok(!main.includes('class="math"'),'Old text-based math remains');
  assert.ok(!main.includes('<mtext>&lt;</mtext>'),'Broken markup inside MathML');
});

test('no free-text mathematical operators outside MathML or diagram labels',()=>{
  let visible=main.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/g,'')
    .replace(/<math\b[^>]*>[\s\S]*?<\/math>/g,'')
    .replace(/<[^>]+>/g,' ');
  assert.doesNotMatch(visible,/[∠∥⟂↔→=°]/,'Unwrapped mathematical operators in lesson text');
  assert.ok(source.includes('Исходник · TeX'),'Navigation labels must be preserved');
  assert.ok(source.includes('Открыть TeX'),'Material links must be preserved');
});

test('preserves all original homework, proofs and interactive hooks',()=>{
  const ids=[...main.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size,'Duplicate ids');
  assert.equal((main.match(/class="task"/g)||[]).length,10);
  assert.equal((main.match(/data-task="\d+"/g)||[]).length,10);
  assert.ok(main.includes('geo')===false||main.includes('id="geometry"'));
  assert.ok(main.includes('id="proofs"'));
  assert.ok(main.includes('id="numerals"'));
  assert.ok(main.includes('id="conversions"'));
  assert.ok(main.includes('id="practice"'));
  assert.ok(main.includes('msub'),'Radix notation was lost');
  assert.ok(source.includes("ekaterina-2026-10-17-checks"),'Progress persistence lost');
});
