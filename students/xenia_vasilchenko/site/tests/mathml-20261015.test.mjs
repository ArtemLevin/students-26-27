import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const site=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(site,'15.10.26.html'),'utf8');
const expressions=[...html.matchAll(/<math\b[^>]*>[\s\S]*?<\/math>/g)].map(match=>match[0]);
const allowed=new Set(['math','mrow','mn','mi','mo','mtext','mfrac','mspace','msup','msub']);

test('every mathematical expression is a valid, balanced native MathML subtree',()=>{
  assert.ok(expressions.length>=100,'Unexpected loss of MathML coverage: '+expressions.length);
  for(const fragment of expressions){
    assert.match(fragment,/^<math xmlns="http:\/\/www\.w3\.org\/1998\/Math\/MathML"/);
    const nodes=[];
    for(const tag of fragment.matchAll(/<(\/)?([a-z]+)\b([^>]*)>/g)){
      const [,closing,name,attrs]=tag;
      assert.ok(allowed.has(name),'Unsupported MathML tag '+name);
      if(closing){
        assert.ok(nodes.length,'Unexpected closing '+name);
        const open=nodes.pop();
        assert.equal(open.name,name,'Malformed MathML nesting');
        if(['mfrac','msub','msup'].includes(name))assert.equal(open.children,2,name+' requires two children');
      }else{
        if(nodes.length)nodes.at(-1).children++;
        if(!tag[0].endsWith('/>'))nodes.push({name,children:0});
      }
    }
    assert.equal(nodes.length,0,'Unclosed MathML subtree');
    assert.doesNotMatch(fragment,/<mn>[a-zA-Z]+<\/mn>/,'Symbols should use mi, not mn');
  }
});

test('all ten exercises and all ten answers use MathML, including word problems',()=>{
  const tasks=[...html.matchAll(/<li class="task">([\s\S]*?)<\/li>/g)].map(m=>m[1]);
  assert.equal(tasks.length,10);
  for(const [index,task] of tasks.entries()){
    const beforeAnswer=task.split('<details>')[0];
    const answer=task.match(/<div class="answer">([\s\S]*?)<\/div>/)?.[1]||'';
    assert.match(beforeAnswer,/<math\b/,'Task '+(index+1)+' has unformatted mathematical data');
    assert.match(answer,/<math\b/,'Answer '+(index+1)+' has unformatted mathematical data');
    assert.doesNotMatch(answer,/<code>/,'Answers must not contain code-styled math');
  }
  assert.match(tasks[3],/<msup>/,'Prime factorization must use semantic exponent');
  assert.match(tasks[6],/<mtext>см<\/mtext>/,'Length units must be inside MathML');
  assert.match(tasks[7],/<mtext>га<\/mtext>/);
  assert.match(tasks[8],/<mtext>м\/мин<\/mtext>/);
});

test('no mathematical notation remains as ordinary text in lesson body',()=>{
  const visible=html.slice(html.indexOf('<body '),html.indexOf('</main>'))
    .replace(/<math\b[^>]*>[\s\S]*?<\/math>/g,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/\s+/g,' ');
  assert.doesNotMatch(visible,/\d+\s+\d+\/\d+|\b\d+\/\d+\b/,'Raw mixed/common fraction outside MathML');
  assert.doesNotMatch(visible,/\b[a-z]\s*(?:[+=−·:]|≠)\s*[a-z0-9]/i,'Raw symbolic equation outside MathML');
  assert.doesNotMatch(visible,/\d+[²³⁴⁵⁶⁷⁸⁹⁰¹]/,'Raw superscript outside MathML');
  assert.doesNotMatch(visible,/v[₀₁₂₃₄₅₆₇₈₉]/,'Raw subscript outside MathML');
  assert.doesNotMatch(html,/<code>\s*[a-z]\s*[:+·−=]/i,'Code tag must not contain mathematical formulas');
});

test('responsive and semantic presentation keeps formulas accessible',()=>{
  assert.match(html,/\.answer\{overflow-x:auto\}/);
  assert.match(html,/\.formula-grid \.math-formula\{[^}]*overflow-x:auto/);
  assert.match(html,/<msub><mi>v<\/mi><mn>0<\/mn><\/msub>/);
  assert.match(html,/<mfrac><mi>m<\/mi><mi>S<\/mi><\/mfrac>/);
  assert.match(html,/<mfrac><mi>s<\/mi><mi>t<\/mi><\/mfrac>/);
});
