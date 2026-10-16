import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const site=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const lesson=fs.readFileSync(path.join(site,'16.10.26.html'),'utf8');
const lab=fs.readFileSync(path.join(site,'16.10.26-lab.html'),'utf8');
const MATHML_NS='http://www.w3.org/1998/Math/MathML';

function checkRoots(html,minRoots,label) {
  const source=html.replace(/<script>[\s\S]*?<\/script>/g,'')
    .replace(/<style>[\s\S]*?<\/style>/g,'');
  const roots=[...source.matchAll(/<math\b[^>]*>[\s\S]*?<\/math>/g)].map(m=>m[0]);
  assert.ok(roots.length>=minRoots,label+' has too few MathML roots');
  assert.equal((source.match(/<math\b/g)||[]).length,roots.length,label+' has unclosed <math>');
  for (const root of roots) {
    assert.match(root,new RegExp('^<math\\b[^>]*xmlns="'+MATHML_NS+'"'),
      label+' must use the native MathML namespace');
    const tags=[...root.matchAll(/<\/?(?:math|mrow|mfrac|msup|msub|msqrt|mroot|mi|mn|mo|mtext)\b[^>]*>/g)]
      .map(match=>match[0]);
    const stack=[];
    for (const tag of tags) {
      const name=tag.match(/^<\/?([A-Za-z]+)/)[1];
      if(tag.startsWith('</'))assert.equal(stack.pop(),name,'Mismatched '+label+' MathML tags');
      else if(!tag.endsWith('/>'))stack.push(name);
    }
    assert.deepEqual(stack,[],'Unclosed '+label+' MathML tokens');
  }
  return source;
}

test('lesson displays all mathematics, coordinates, and task answers in native MathML',()=>{
  const source=checkRoots(lesson,60,'lesson');
  assert.equal((source.match(/class="exercise"/g)||[]).length,10);
  const answers=[...source.matchAll(/<p><strong>Ответ:<\/strong>([\s\S]*?)<\/p>/g)];
  assert.equal(answers.length,10);
  for(const answer of answers)assert.match(answer[1],/<math\b/,'Every task answer must be MathML');
  assert.match(source,/<mroot>/,'Nth roots use mroot');
  assert.match(source,/<msqrt>/,'Square roots use msqrt');
  assert.match(source,/<mfrac>/,'Fractions use mfrac');
  assert.match(source,/<msup>/,'Powers use msup');
  const outsideMath=source.replace(/<math\b[^>]*>[\s\S]*?<\/math>/g,'[MATH]');
  assert.doesNotMatch(outsideMath,/\([−-]?\d+\s*;\s*[−-]?\d+\)|\b[fg]\(\s*[−-]?\d+\s*\)|\b[abαy]\s*=\s*[−-]?\d+/,
    'No raw mathematical expressions in prose outside MathML');
  assert.doesNotMatch(source,/<mn>−\d/,'Negative numerals use an explicit operator');
});

test('laboratory initial mathematical data use native MathML',()=>{
  const source=checkRoots(lab,15,'lab');
  for (const id of ['base','shift','A','B','asymptote','target','answer']){
    const container=source.match(new RegExp('id="'+id+'"[^>]*>([\\s\\S]*?)<\\/([A-Za-z0-9]+)>'));
    assert.ok(container,'Missing dynamic data '+id);
    assert.match(container[1],/<math\b/,'Initial '+id+' must use MathML');
  }
  for (const id of ['a-value','b-abs','shift-sign','function-symbol']){
    assert.match(source,new RegExp('id="'+id+'"'),'Missing semantic math token '+id);
  }
});

test('runtime creates MathML in its namespace for every lab mode and labels',()=>{
  const script=lab.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script,'Lab should have an executable script');
  new vm.Script(script);
  assert.match(script,/document\.createElementNS\(mathNS,name\)/);
  assert.match(script,/function\s+coordinate\(/);
  assert.match(script,/function\s+valueAt\(/);
  assert.match(script,/function\s+mathLabel\(/);
  assert.match(script,/foreignObject/);
  assert.match(script,/into\("base",number\(o\.a\)\)/);
  assert.match(script,/into\("asymptote",equality\("y",o\.b\)\)/);
  assert.match(script,/replaceChildren\("Найдите ",valueAt\(o\.fn,o\.x\)/);
  assert.match(script,/replaceChildren\("Ответ: ",number\(o\.fx\)\)/);
  assert.doesNotMatch(script,/\.innerHTML\s*=/,'User-facing MathML is built with safe DOM APIs');
});
