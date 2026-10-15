import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const site=resolve(fileURLToPath(new URL('..',import.meta.url)));
const read=name=>readFileSync(resolve(site,name),'utf8');
const lesson=read('14.10.26.html');
const laboratory=read('14.10.26-lab.html');
const matchMath=html=>[...html.matchAll(/<math\b[^>]*>[\s\S]*?<\/math>/g)].map(m=>m[0]);

function validateMathML(fragment){
 const tags=[...fragment.matchAll(/<\/?([a-z][a-z0-9]*)\b[^>]*>/g)];
 const stack=[];
 for(const match of tags){
  const complete=match[0],name=match[1];
  if(complete.startsWith('</')){
   assert.equal(stack.pop(),name,'MathML elements must be properly nested');
  }else if(!complete.endsWith('/>')){
   stack.push(name);
  }
 }
 assert.deepEqual(stack,[]);
 assert.match(fragment,/^<math xmlns="http:\/\/www\.w3\.org\/1998\/Math\/MathML"/);
 assert.match(fragment,/<(?:mi|mn|mo|mrow|mfrac|msup|msub|msqrt)\b/);
}

test('the lesson has native semantic MathML for every formula and all ten exercises',()=>{
 const expressions=matchMath(lesson);
 assert.ok(expressions.length>=110);
 for(const fragment of expressions)validateMathML(fragment);
 for(const structuralTag of ['mfrac','msup','msub','msqrt']){
  assert.ok(expressions.some(x=>x.includes('<'+structuralTag+'>')),structuralTag);
 }
 const exerciseBlocks=[...lesson.matchAll(/<article class="problem">([\s\S]*?)<\/article>/g)].map(x=>x[1]);
 assert.equal(exerciseBlocks.length,10);
 for(const exercise of exerciseBlocks){
  assert.match(exercise,/<math xmlns=/);
  assert.match(exercise,/<p class="answer"><math xmlns=/);
 }
 const visible=lesson.replace(/<math\b[^>]*>[\s\S]*?<\/math>/g,'[math]').replace(/<style>[\s\S]*?<\/style>/g,'').replace(/<script>[\s\S]*?<\/script>/g,'');
 assert.doesNotMatch(visible,/\b(?:sin|cos|arctg)\s+[a-z]/);
 assert.doesNotMatch(visible,/Δt\s*=|log[₂ₐ_]|sin[⁴²]|cos[⁴²]/);
});

function runLab(){
 const elements=new Map();
 const listeners=new Map();
 const mock=(id)=>{
  if(!elements.has(id))elements.set(id,{
   id,innerHTML:'',textContent:'',value:'0',min:0,max:1,step:1,dataset:{},
   firstElementChild:{innerHTML:''}, children:[],attrs:{},
   setAttribute(key,value){this.attrs[key]=String(value)},
   addEventListener(name,callback){listeners.set(id+':'+name,callback)},
   replaceChildren(...children){this.children=children}
  });
  return elements.get(id);
 };
 const modes=['trig','bound','motion'].map(mode=>({
  dataset:{mode},attrs:{},
  addEventListener(){},
  setAttribute(key,value){this.attrs[key]=value}
 }));
 const document={
  documentElement:{dataset:{theme:'light'}},
  getElementById:mock,
  querySelectorAll(selector){return selector==='[data-mode]'?modes:[]},
  createElement(){return {innerHTML:'',type:'button',addEventListener(){}}}
 };
 const ctx=vm.createContext({
  document,Math,URL,URLSearchParams,
  location:{href:'https://example.test/14.10.26-lab.html?mode=trig',search:'?mode=trig'},
  history:{replaceState(){}},localStorage:{getItem(){return null},setItem(){}}
 });
 const js=laboratory.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert.ok(js,'lab inline JS must exist');
 new vm.Script(js,{filename:'nikol-14.10.26-lab.js'}).runInContext(ctx);
 return {ctx,elements,mock};
}

test('laboratory renders native MathML on every mode switch and numeric update',()=>{
 const {ctx,mock}=runLab();
 for(const mode of ['trig','bound','motion']){
  vm.runInContext('choose('+JSON.stringify(mode)+')',ctx);
  for(const id of ['modelTitle','formula','parameterName','parameterOut','valueOut','targetOut','deltaOut','challenge','insight']){
   assert.match(mock(id).innerHTML,/<math xmlns="http:\/\/www\.w3\.org\/1998\/Math\/MathML"/,mode+' '+id);
  }
  for(const id of ['axisMin','axisMax','axisUpper','axisLower']){
   assert.match(mock(id).firstElementChild.innerHTML,/<math xmlns=/,mode+' '+id);
  }
  assert.equal(mock('presets').children.length,vm.runInContext('modes[mode].marks.length',ctx));
  for(const preset of mock('presets').children)assert.match(preset.innerHTML,/<math xmlns=/);
  mock('parameter').value=mode==='trig'?'0.644':mode==='bound'?'1':'0.2';
  vm.runInContext('paint()',ctx);
  assert.match(mock('valueOut').innerHTML,/<mn>/,mode+' numeric readout');
  assert.match(mock('deltaOut').innerHTML,/<mn>/,mode+' signed readout');
  vm.runInContext('saved={x:0};paint()',ctx);
  assert.match(mock('compareOut').innerHTML,/<math xmlns=/);
 }
});

test('native lab number rendering handles decimals, units and signed values',()=>{
 const {ctx}=runLab();
 for(const value of ['0','−5,5','+1,25','4,5']){
  const markup=vm.runInContext('numberMath('+JSON.stringify(value)+'," м")',ctx);
  validateMathML(markup);
  assert.match(markup,/<mn>/);
  assert.match(markup,/<mtext> м<\/mtext>/);
 }
 assert.throws(()=>vm.runInContext('numberMath("not-a-number")',ctx),/Non-numeric display value/);
});
