import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../10.10.26.html',import.meta.url),'utf8');
const headEnd=html.indexOf('<script>\n(()=>{');
assert.notEqual(headEnd,-1,'Lesson interaction script must be present');
const staticHtml=html.slice(0,headEnd);
const roots=[...staticHtml.matchAll(/<math\b[^>]*>/g)].map(x=>x[0]);

test('math expressions use native MathML and proper foreign namespace',()=>{
  assert.ok(roots.length>=50,'Expected MathML for full expressions and inline fractions');
  for(const root of roots){
    assert.match(root,/xmlns="http:\/\/www\.w3\.org\/1998\/Math\/MathML"/);
    assert.match(root,/display="(?:inline|block)"/);
  }
  assert.equal((staticHtml.match(/<math\b/g)||[]).length,(staticHtml.match(/<\/math>/g)||[]).length);
  assert.equal((staticHtml.match(/<mfrac>/g)||[]).length,(staticHtml.match(/<\/mfrac>/g)||[]).length);
  assert.doesNotMatch(staticHtml,/class="(?:fraction|mixed)"/);
  assert.doesNotMatch(staticHtml,/role="math"/);
  assert.doesNotMatch(staticHtml,/\$\{F\(/);
});

test('every formula block contains MathML',()=>{
  const formulaOpen=(staticHtml.match(/<div class="formula(?: [^"]*)?">/g)||[]).length;
  assert.equal(formulaOpen,17);
  const rootBlocks=(staticHtml.match(/<math\b[^>]*display="block"/g)||[]).length;
  assert.ok(rootBlocks>=formulaOpen);
});

test('training and answers remain complete and mathematical',()=>{
  assert.equal((staticHtml.match(/class="problem"/g)||[]).length,10);
  assert.equal((staticHtml.match(/class="answer-text"/g)||[]).length,10);
  assert.equal((staticHtml.match(/<p class="answer-text"><math\b/g)||[]).length,10);
  assert.equal((staticHtml.match(/<p class="problem"><math\b/g)||[]).length,9,
    'The final task is a word problem containing inline MathML quantities');
});

test('dynamic mathematical steps remain valid JavaScript and MathML',()=>{
  const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script);
  assert.doesNotThrow(()=>new vm.Script(script));
  const source=script.slice(script.indexOf('const steps=['),script.indexOf('];\nlet index=0;')+2);
  const steps=[...source.matchAll(/\{math:("(?:\\.|[^"\\])*"),why:("(?:\\.|[^"\\])*")\}/g)];
  assert.equal(steps.length,3);
  for(const item of steps){
    const math=JSON.parse(item[1]);
    assert.match(math,/^<math\b/);
    assert.match(math,/<mfrac>/);
    assert.match(math,/<\/math>$/);
    assert.doesNotMatch(math,/class="(?:fraction|mixed)"/);
  }
  assert.match(script,/steps\[index\]\.math/);
});
