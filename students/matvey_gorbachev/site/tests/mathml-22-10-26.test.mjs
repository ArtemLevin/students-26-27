import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const lesson=fs.readFileSync(path.join(root,'22.10.26.html'),'utf8');
const lab=fs.readFileSync(path.join(root,'22.10.26-lab.html'),'utf8');
const main=lesson.split('<section id="models"')[1]?.split('</main>')[0]||'';
const labMain=lab.split('<main class="wrap"')[1]?.split('</main>')[0]||'';
const all=[...main.matchAll(/<math\b[^>]*>[\s\S]*?<\/math>/g)].map(x=>x[0]);
const allowed=new Set(['math','mrow','mfrac','msub','msup','mi','mo','mn','mtext','mspace']);

test('Finance lesson contains semantic MathML throughout model, tables, exercises and answers',()=>{
 assert.ok(all.length>=100,'MathML must cover prose examples and all 10 exercises');
 assert.equal((main.match(/<math\b[^>]*display="block"/g)||[]).length,10,'every displayed formula must be MathML');
 assert.ok((main.match(/<mfrac>/g)||[]).length>=5,'fractions need mfrac');
 assert.ok((main.match(/<msub>/g)||[]).length>=10,'indexed debt entries need msub');
 assert.ok((main.match(/<msup>/g)||[]).length>=5,'powers need msup');
 const table=main.match(/<table class="ledger">[\s\S]*?<\/table>/)?.[0]||'';
 assert.ok((table.match(/<math\b/g)||[]).length>=18,'numeric table cells must be MathML');
 const practice=main.split('<ol class="tasks">')[1]?.split('</ol>')[0]||'';
 const answer=main.split('<details class="answers">')[1]?.split('</details>')[0]||'';
 assert.equal((practice.match(/<li>/g)||[]).length,10);
 assert.ok((practice.match(/<math\b/g)||[]).length>=30,'exercise numbers and parameters are MathML');
 assert.equal((answer.match(/<li>/g)||[]).length,10);
 assert.ok((answer.match(/<math\b/g)||[]).length>=10);
 const nonMath=main.replace(/<math\b[^>]*>[\s\S]*?<\/math>/g,'').replace(/<[^>]+>/g,' ');
 assert.doesNotMatch(nonMath,/\d+(?:[,.]\d+)?%|\d+\s*(?:тыс\.|млн)|\b[SPxrnq]\b/,'no unconverted quantities or variables');
 assert.doesNotMatch(main,/<(?:sub|sup)\b|MATHPLACEHOLDER|MathJax|KaTeX/);
});

test('Each static MathML block uses native, properly nested presentation markup',()=>{
 for(const [index,fragment] of all.entries()){
  assert.match(fragment,/^<math xmlns="http:\/\/www\.w3\.org\/1998\/Math\/MathML" display="(?:inline|block)">/);
  const stack=[];
  for(const m of fragment.matchAll(/<(\/?)([a-z][a-z0-9]*)\b[^>]*?(\/?)>/g)){
   const [,close,tag,self]=m;
   assert.ok(allowed.has(tag),'unknown MathML element '+index+': '+tag);
   if(close)assert.equal(stack.pop(),tag,'bad close '+index);
   else if(!self)stack.push(tag);
  }
  assert.equal(stack.length,0,'unclosed MathML element '+index);
 }
});

test('Laboratory keeps static equation and uses namespace-aware MathML for all dynamic values',()=>{
 assert.ok((labMain.match(/<math\b/g)||[]).length>=6,'static lab values must use MathML');
 assert.match(lab,/createElementNS\(NS,tag\)/);
 assert.match(lab,/const NS='http:\/\/www\.w3\.org\/1998\/Math\/MathML'/);
 assert.match(lab,/convertOutputs\(\);/);
 assert.match(lab,/for\(const node of document\.querySelectorAll\('#graph \.amount,#graph \.graph-row>span:first-child,#rows td'\)\)/);
 assert.doesNotMatch(lab,/(?:MathJax|KaTeX|cdn\.jsdelivr)/i);
 const script=lab.match(/<script>([\s\S]*?)<\/script>/)?.[1]||'';
 assert.doesNotThrow(()=>new Function(script),'interactive calculation must remain valid JavaScript');
});
