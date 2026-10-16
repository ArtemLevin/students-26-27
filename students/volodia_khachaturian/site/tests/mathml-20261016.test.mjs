import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const files=['16.10.26.html','16.10.26-lab.html'];
const sources=Object.fromEntries(files.map(name=>[name,fs.readFileSync(path.join(root,name),'utf8')]));
const staticPart=source=>source.slice(0,source.indexOf('<script>'));
const expressions=source=>[...staticPart(source).matchAll(/<math\b[^>]*>[\s\S]*?<\/math>/g)].map(m=>m[0]);

const allowed=new Set(['math','mrow','mn','mi','mo','mtext','mfrac','mspace','msup','msub','msubsup','mover']);

test('all visible formulas and quantities are native, balanced, semantic MathML',()=>{
  const thresholds={'16.10.26.html':100,'16.10.26-lab.html':35};
  for(const [name,source] of Object.entries(sources)){
    const math=expressions(source);
    assert.ok(math.length>=thresholds[name],name+': lost MathML coverage ('+math.length+')');
    for(const fragment of math){
      assert.match(fragment,/^<math xmlns="http:\/\/www\.w3\.org\/1998\/Math\/MathML"/,name+' lacks native namespace');
      const stack=[];
      for(const tag of fragment.matchAll(/<(\/)?([a-z]+)\b([^>]*)>/g)){
        const [,close,key]=tag;
        assert.ok(allowed.has(key),name+': unsupported MathML element '+key);
        if(close){
          const node=stack.pop();
          assert.ok(node,name+': unexpected closing '+key);
          assert.equal(node.key,key,name+': nesting mismatch');
          if(['mfrac','msub','msup','mover','msubsup'].includes(key)){
            assert.equal(node.children,key==='msubsup'?3:2,key+' expects its own structural children');
          }
        }else{
          if(stack.length)stack.at(-1).children++;
          if(!tag[0].endsWith('/>'))stack.push({key,children:0});
        }
      }
      assert.equal(stack.length,0,name+': unclosed MathML structure');
    }
    const raw=staticPart(source).replace(/<math\b[^>]*>[\s\S]*?<\/math>/g,' ');
    assert.doesNotMatch(raw,/(?:F[₀₁₂ₓ]|v[₀₁₂ₓ]|a[₀₁₂ₓ]|ω\s*=|ν\s*=|F\s*=\s*ma)/,'Unconverted symbolic physics text in '+name);
    assert.doesNotMatch(raw,/(\d+(?:,\d+)?)\s*(?:м\/с²|м\/с|кг|см|Н)(?=[\s.,;:]|$)/,'Unconverted numerical physics units in '+name);
  }
});

test('all 10 questions and 10 solutions are MathML formatted',()=>{
  const page=sources['16.10.26.html'];
  const taskSection=page.match(/<ol class="problems">([\s\S]*?)<\/ol>/)?.[1]||'';
  const answerSection=page.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1]||'';
  const tasks=[...taskSection.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(m=>m[1]);
  const answers=[...answerSection.matchAll(/<tr><td>\d+<\/td><td>([\s\S]*?)<\/td><\/tr>/g)].map(m=>m[1]);
  assert.equal(tasks.length,10);
  assert.equal(answers.length,10);
  for(const task of tasks)assert.match(task,/<math xmlns=/);
  for(const answer of answers)assert.match(answer,/<math xmlns=/);
  assert.match(taskSection,/<mfrac>/,'Word problems must carry real MathML fractions where appropriate');
  assert.match(answerSection,/<msup>/,'Answer with π squared must use semantic superscript');
});

test('laboratory updates live data as MathML, including graph labels, feedback and zero-force case',()=>{
  const lab=sources['16.10.26-lab.html'];
  const script=lab.match(/<script>([\s\S]*?)<\/script>/)?.[1]||'';
  assert.ok(script.length);
  new vm.Script(script,{filename:'16.10.26-lab.inline.js'});
  for(const key of ['massOut','forceOut','initialOut','timeOut','aValue','vValue','xValue','m1','m2','f1','f2','ac1','ac2']){
    assert.ok(script.includes("setMath('"+key+"'"),'Missing live MathML for '+key);
  }
  for(const key of ['ratio','explanation','feedback'])assert.ok(script.includes("$('"+key+"').innerHTML"),'Missing MathML feedback for '+key);
  for(const key of ['startLabel','finishLabel'])assert.match(script,new RegExp("\\$\\('"+key+"'\\)\\.firstElementChild\\.innerHTML=math"),'Graph label must be MathML: '+key);
  assert.ok(script.includes('if(first===0)'),'Ratio must guard division by zero');
  assert.ok(script.includes('if(data.force===0)'),'Zero resultant must have a special explanation');
  assert.ok(script.includes('frac(f2,f1),mo('),'Comparison must preserve the F2/F1 relation');
  assert.ok(script.includes("qty(dx,'м')"),'Displacement units must be native MathML');
});
