import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const lesson=readFileSync(new URL('../16.10.26.html',import.meta.url),'utf8');
const lab=readFileSync(new URL('../16.10.26-lab.html',import.meta.url),'utf8');

function mathBlocks(html){
  return [...html.matchAll(/<math\\b[^>]*>[\\s\\S]*?<\\/math>/g)].map(match=>match[0]);
}
function validMathFragment(fragment){
  const stack=[];
  const elements=[...fragment.matchAll(/<\\/?([a-z][a-z0-9]*)\\b[^>]*>/gi)].map(x=>x[0]);
  for(const element of elements){
    const name=element.match(/^<\\/?([a-z][a-z0-9]*)/i)[1];
    if(element.startsWith('</'))assert.equal(stack.pop(),name,'MathML nesting');
    else stack.push(name);
  }
  assert.equal(stack.length,0,'all MathML elements must close');
  assert.match(fragment,/xmlns="http:\/\/www\\.w3\\.org\/1998\/Math\/MathML"/);
  assert.match(fragment,/aria-label="[^"]+"/);
}

test('lesson renders native, semantic MathML throughout the explanatory content',()=>{
  const blocks=mathBlocks(lesson);
  assert.ok(blocks.length>=100,'expected MathML for formulae and word problem quantities');
  blocks.forEach(validMathFragment);
  assert.doesNotMatch(lesson,/<(?:sup|sub)>/);
  assert.match(lesson,/math\\[display="block"\\]/);
  const visible=lesson.replace(/<style>[\\s\\S]*?<\\/style>/g,'')
    .replace(/<script>[\\s\\S]*?<\\/script>/g,'')
    .replace(/<math\\b[^>]*>[\\s\\S]*?<\\/math>/g,'');
  assert.doesNotMatch(visible,/(?:sin|cos|tg|ctg)²|\\bcos 4x = 0|\\bSp\\/n/);
});

test('all ten problems and all ten solutions use MathML',()=>{
  const problems=[...lesson.matchAll(/<div class="problem"><b>\\d{2}<\\/b><p>([\\s\\S]*?)<\\/p><\\/div>/g)];
  assert.equal(problems.length,10);
  problems.forEach(([,body])=>assert.match(body,/<math\\b/));
  const answers=lesson.match(/<details class="answers">([\\s\\S]*?)<\\/details>/)?.[1];
  assert.ok(answers);
  const entries=[...answers.matchAll(/<li>([\\s\\S]*?)<\\/li>/g)];
  assert.equal(entries.length,10);
  entries.forEach(([,body])=>assert.match(body,/<math\\b/));
});

test('finance laboratory math stays native during parameter updates',()=>{
  const blocks=mathBlocks(lab);
  assert.ok(blocks.length>=10);
  blocks.forEach(validMathFragment);
  assert.match(lab,/function mathNumber\\(value\\)/);
  assert.match(lab,/createElementNS\\('[^']+Math\\/MathML','math'\\)/);
  assert.match(lab,/replaceChildren\\(mathNumber\\(v\\)\\)/);
  assert.match(lab,/td\\.append\\(mathNumber\\(fmt\\(v\\)\\)\\)/);
  assert.match(lab,/id="schedule"/);
  assert.doesNotMatch(lab,/<(?:sup|sub)>/);
});
