import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const source=readFileSync(fileURLToPath(new URL('../11.10.26.html',import.meta.url)),'utf8');
const lesson=source.split('<main class="wrap" id="main">')[1]?.split('</main>')[0];
const mathBlocks=[...(lesson||'').matchAll(/<math\b[^>]*>[\s\S]*?<\/math>/g)].map(m=>m[0]);
const validTags=new Set(['math','mrow','mi','mn','mo','mtext','mspace','mfrac','msub']);

test('MathML covers every formula, table and practice section',()=>{
  assert.ok(lesson);
  assert.ok(mathBlocks.length>=100,'expected MathML throughout the whole lesson');
  for(const block of [...lesson.matchAll(/<div class="model(?: math-pair)?">([\s\S]*?)<\/div>/g)]){
    assert.match(block[1],/<math\b/,'a formula block must use MathML');
  }
  const table=lesson.match(/<table>[\s\S]*?<\/table>/)?.[0]||'';
  assert.ok((table.match(/<math\b/g)||[]).length>=9,'math table cells must use MathML');
  const exercise=lesson.split('<ol class="exercise">')[1]?.split('</ol>')[0]||'';
  assert.ok((exercise.match(/<math\b/g)||[]).length>=25,'quantities in exercises must use MathML');
  assert.match(lesson,/<mfrac>/,'fractions must use semantic mfrac');
  assert.match(lesson,/<msub>/,'indexed quantities must use semantic msub');
  assert.doesNotMatch(lesson,/(?:MathJax|KaTeX)/i,'avoid external math renderers');
});

test('MathML is well-nested and uses recognized presentation elements',()=>{
 for(const [index,block] of mathBlocks.entries()){
  assert.match(block,/^<math xmlns="http:\/\/www\.w3\.org\/1998\/Math\/MathML" display="(?:block|inline)">/);
  const tags=[...block.matchAll(/<\/?([a-z][\w-]*)\b[^>]*>/g)].map(m=>({closing:m[0].startsWith('</'),tag:m[1],selfClosing:m[0].endsWith('/>')}));
  const stack=[];
  for(const item of tags){
   assert.ok(validTags.has(item.tag),'unsupported MathML element in expression '+index+': '+item.tag);
   if(item.closing)assert.equal(stack.pop(),item.tag,'invalid closing tag in math '+index);
   else if(!item.selfClosing)stack.push(item.tag);
  }
  assert.equal(stack.length,0,'unclosed MathML tag in expression '+index);
 }
});

test('No textual percentages, variables or calculations remain outside MathML',()=>{
 const visible=lesson
  .replace(/<math\b[^>]*>[\s\S]*?<\/math>/g,'')
  .replace(/<[^>]+>/g,' ');
 assert.doesNotMatch(visible,/(?:\d+(?:[,.]\d+)?|[A-Za-z])%/u);
 assert.doesNotMatch(visible,/\b\d+(?:[,.]\d+)?\s*(?:кг|руб(?:лей|ля|\.)?)\b/u);
 assert.doesNotMatch(visible,/\b[xyabkrp]\b/u);
 assert.doesNotMatch(visible,/\b[xy\d]\s*[=+·−]\s*[xy\d]\b/u);
});

test('Quiz script remains syntactically valid and MathML feedback is constructed safely',()=>{
 const script=source.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert.ok(script,'quiz script is required');
 assert.doesNotThrow(()=>new Function(script));
 assert.match(script,/createElementNS\('http:\/\/www\.w3\.org\/1998\/Math\/MathML','math'\)/);
 assert.match(script,/replaceChildren\(\)/);
});
