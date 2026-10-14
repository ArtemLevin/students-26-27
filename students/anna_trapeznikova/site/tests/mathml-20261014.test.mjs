import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ROOT='students/anna_trapeznikova/site';
const lesson=fs.readFileSync(ROOT+'/13.10.26.html','utf8');
const lab=fs.readFileSync(ROOT+'/13.10.26-lab.html','utf8');
const scriptSource=fs.readFileSync(ROOT+'/anna-mathml.js','utf8');
const ns='http://www.w3.org/1998/Math/MathML';

function assertMathML(source,minimum,minimumFractions) {
  const body=source.split('</style>')[1].split('<script src="anna-mathml.js')[0];
  assert.ok(body,'MathML appears in the lesson HTML body');
  const roots=[...body.matchAll(/<math\b[^>]*>[\s\S]*?<\/math>/g)].map(m=>m[0]);
  assert.ok(roots.length>=minimum,'Expected native MathML in all mathematical fragments');
  assert.equal((body.match(/<math\b/g)||[]).length,roots.length,'Math roots are balanced');
  assert.ok((body.match(/<mfrac>/g)||[]).length>=minimumFractions,'Real MathML fractions are required');
  assert.match(body,/<msup>/,'Exponentiation must use msup');
  assert.doesNotMatch(body,/aria-label="[^"]*<math/,'No nested markup in an aria-label');
  for(const root of roots){
    assert.ok(root.includes('xmlns="'+ns+'"'));
    const nodes=[...root.matchAll(/<\/?(?:math|mrow|mfrac|msup|msqrt|mi|mn|mo|mtext)\b[^>]*>/g)].map(m=>m[0]);
    const stack=[];
    for(const node of nodes) {
      const name=node.match(/^<\/?([A-Za-z]+)/)[1];
      if(node.startsWith('</'))assert.equal(stack.pop(),name,'Malformed MathML nesting');
      else if(!node.endsWith('/>'))stack.push(name);
    }
    assert.deepEqual(stack,[],'MathML must have balanced semantic elements');
  }
}

test('13 October lesson and lab use well-formed native MathML',()=>{
  assertMathML(lesson,65,20);
  assertMathML(lab,30,7);
  assert.match(lesson,/<msqrt>/);
  assert.match(lesson,/aria-label="x³ − x² − 8x \+ 12 = 0"/);
  assert.match(lab,/aria-label="F\(x\) =/);
  assert.match(lesson,/<script src="anna-mathml\.js\?v=20261014-1"><\/script>/);
  assert.match(lab,/<script src="anna-mathml\.js\?v=20261014-1"><\/script>/);
});

function engine(){
  const context={window:{}};
  vm.runInNewContext(scriptSource,context,{timeout:1000});
  return context.window.AnnaMathML;
}

test('MathML builder preserves powers, fractions, radicals and escapes markup',()=>{
  const m=engine();
  assert.match(m.markup('(x + 1)²'),/<msup>/);
  assert.match(m.markup('1/(t + 1) < 1/6'),/<mfrac>/);
  assert.match(m.markup('√5'),/<msqrt>/);
  assert.match(m.markup('t > 2'),/<mo>&gt;<\/mo>/);
  assert.doesNotMatch(m.markup('<img onerror=alert(1)>'),/<img\b/);
  const node={innerHTML:''};
  m.set(node,'x³ − 1');
  assert.match(node.innerHTML,/<math\b/);
  assert.match(node.innerHTML,/<msup>/);
});

function control(value=''){
  const listeners={};
  return {
    value,innerHTML:'',textContent:'',className:'',disabled:false,hidden:false,
    dataset:{theme:'light'},listeners,
    addEventListener(type,listener){listeners[type]=listener;},
    setAttribute(name,v){this[name]=v;},
    getAttribute(name){return this[name];},
    click(){this.listeners.click?.();}
  };
}
function runInline(source,query){
  const script=source.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script,'Inline interactive script is present');
  new vm.Script(script);
  const byId=new Map();
  const get=id=>{if(!byId.has(id))byId.set(id,control(id==='xSign'?'1':id==='xSub'?'-1':''));return byId.get(id);};
  const sandbox={
    document:{
      documentElement:{dataset:{theme:'light'}},
      getElementById:get,
      querySelectorAll(){return [];}
    },
    window:{AnnaMathML:engine()},
    localStorage:{getItem(){return null;},setItem(){}},
    location:{search:query||''},
    URLSearchParams,Math
  };
  vm.runInNewContext(script,sandbox,{timeout:1000});
  return {get};
}

test('Horner table remains MathML after stepping forward and backward',()=>{
  const {get}=runInline(lesson);
  for(let i=0;i<4;i++)get('next').click();
  assert.match(get('h3').innerHTML,/<math\b/);
  assert.match(get('hResult').innerHTML,/<msup>/);
  assert.match(get('stepText').innerHTML,/<math\b/);
  get('prev').click();
  assert.match(get('hResult').innerHTML,/<math\b/);
});

test('laboratory sliders and their conclusions remain MathML after interaction',()=>{
  const {get}=runInline(lab,'?mode=sign');
  assert.match(get('xSignOut').innerHTML,/<math\b/);
  assert.match(get('signResult').innerHTML,/<math\b/);
  get('xSign').value='0';
  get('xSign').listeners.input();
  assert.match(get('signResult').innerHTML,/знаменатель равен нулю/);
  assert.match(get('signResult').innerHTML,/<math\b/);
  get('xSub').value='-2';
  get('xSub').listeners.input();
  for(const id of ['xSubOut','tValue','leftValue','subResult','subExplanation']) {
    assert.match(get(id).innerHTML,/<math\b/,'Dynamic value '+id+' should use MathML');
  }
});
