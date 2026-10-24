import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const lesson=readFileSync(new URL('../23.10.26.html',import.meta.url),'utf8');
const lab=readFileSync(new URL('../23.10.26-lab.html',import.meta.url),'utf8');
const getScript=html=>html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
const mathFragments=html=>[...html.matchAll(/<math\b[^>]*>[\s\S]*?<\/math>/g)].map(m=>m[0]);

test('trigonometry source, exercise/answer parity and link anchors stay intact',()=>{
  const required=['recognize','formulas','methods','errors','poster','practice','materials'];
  for(const id of required)assert.match(lesson,new RegExp('id="'+id+'"'));
  assert.match(lesson,/\.\.\/pdf_docs\/23\.10\.26\.pdf/);
  assert.match(lesson,/\.\.\/tex_docs\/23\.10\.26\.tex/);
  assert.match(lesson,/\.\.\/images\/23\.10\.26\.png/);
  assert.match(lesson,/23\.10\.26-lab\.html\?mode=identity/);
  const exercises=lesson.match(/<ol class="exercises">([\s\S]*?)<\/ol>/)?.[1];
  const answers=lesson.match(/<details class="answers">([\s\S]*?)<\/details>/)?.[1];
  assert.ok(exercises&&answers,'exercise and key must exist');
  assert.equal((exercises.match(/<li>/g)||[]).length,10);
  assert.equal((answers.match(/<li>/g)||[]).length,10);
  assert.match(lesson,/Пропущена серия решений/);
});

test('formula blocks are native, properly nested MathML',()=>{
  const fragments=mathFragments(lesson);
  assert.ok(fragments.length>=20,'main mathematical displays use MathML');
  for(const fragment of fragments){
    const stack=[];
    for(const m of fragment.matchAll(/<\/?([a-z][a-z0-9]*)\b[^>]*>/g)){
      if(m[0].startsWith('</'))assert.equal(stack.pop(),m[1]);
      else stack.push(m[1]);
    }
    assert.equal(stack.length,0);
    assert.match(fragment,/xmlns="http:\/\/www.w3.org\/1998\/Math\/MathML"/);
    assert.match(fragment,/<(?:mrow|mi|mn|mo|mfrac|msup)>/);
  }
  assert.match(lesson,/<mfrac><mn>1<\/mn><mn>2<\/mn><\/mfrac>/);
  assert.match(lesson,/<msup>/);
});

test('the stepper survives refresh and renders mathematical steps without markup errors',()=>{
  const script=getScript(lesson);
  assert.ok(script);
  new vm.Script(script,{filename:'nikol-trig-lesson.js'});
  const nodes=new Map(),storage=new Map([['nikol-trig-2026-10-23-stepper',JSON.stringify({index:4,all:false})]]);
  const node=id=>{
    if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',attrs:{},value:0,disabled:false,
      setAttribute(k,v){this.attrs[k]=v},addEventListener(){},onclick:null});
    return nodes.get(id);
  };
  const doc={
    documentElement:{dataset:{theme:'light'}},
    getElementById:node,
    querySelectorAll(){return []}
  };
  const ctx=vm.createContext({document:doc,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},window:{print(){}}});
  new vm.Script(script).runInContext(ctx);
  assert.equal(node('stepCount').textContent,'5 / 8');
  assert.match(node('stepContent').innerHTML,/<math xmlns=/);
  node('next').onclick();
  assert.equal(node('stepCount').textContent,'6 / 8');
  assert.equal(JSON.parse(storage.get('nikol-trig-2026-10-23-stepper')).index,5);
  node('all').onclick();
  assert.match(node('stepContent').innerHTML,/<math xmlns=/);
  assert.equal((node('stepContent').innerHTML.match(/<math xmlns=/g)||[]).length,8);
});

function runLab(search='?mode=factors'){
  const nodes=new Map(),modes=['factors','identity'].map(mode=>({
    dataset:{mode},attrs:{},setAttribute(k,v){this.attrs[k]=String(v)},onclick:null
  }));
  const presets=[0,Math.PI/12,Math.PI/8,3*Math.PI/8].map(x=>({dataset:{x:String(x)},onclick:null}));
  const challenges=[Math.PI/12,Math.PI/8,Math.PI/6].map(x=>({dataset:{v:String(x)},onclick:null}));
  const make=id=>{
    if(!nodes.has(id))nodes.set(id,{value:id==='x'?String(Math.PI/8):'',textContent:'',innerHTML:'',hidden:false,attrs:{},style:{},children:[],onclick:null,
      setAttribute(k,v){this.attrs[k]=String(v)},getAttribute(k){return this.attrs[k]},
      append(...a){this.children.push(...a)},addEventListener(k,fn){this['on'+k]=fn}});
    return nodes.get(id);
  };
  const doc={
    documentElement:{dataset:{theme:'light'}},getElementById:make,
    querySelectorAll(q){return q==='[data-mode]'?modes:q==='[data-x]'?presets:q==='#challenge button[data-v]'?challenges:[]},
    createElementNS(_ns,tag){return {tag,attrs:{},textContent:'',setAttribute(k,v){this.attrs[k]=String(v)}}}
  };
  const localStorage={getItem(){return null},setItem(){}};
  const context=vm.createContext({document:doc,localStorage,Math,location:{search},URLSearchParams});
  const js=getScript(lab);assert.ok(js);new vm.Script(js,{filename:'nikol-trig-lab.js'}).runInContext(context);
  return {make,modes,presets,challenges,context};
}

test('laboratory plots the full trigonometric function and overlays the correct identity',()=>{
  assert.match(lab,/yMin=-3\.3,yMax=1\.5/);
  assert.match(lab,/step="any"/);
  assert.match(lab,/clipPath id="plotClip"/);
  const {make,modes,presets}=runLab('?mode=identity');
  const d=make('b').attrs.d;
  const ys=[...d.matchAll(/[ML]-?[\d.]+\s+(-?[\d.]+)/g)].map(x=>Number(x[1]));
  assert.ok(ys.length>500);
  assert.ok(Math.min(...ys)>=19&&Math.max(...ys)<=361,'the curve stays in plotting bounds');
  assert.equal(make('originalLegend').hidden,false);
  assert.equal(make('o').style.opacity,'1');
  assert.equal(modes[1].attrs['aria-pressed'],'true');
  assert.ok(/Совпадение кривых/.test(make('modeNote').textContent));
  presets[2].onclick();
  assert.ok(Math.abs(Number(make('x').value)-Math.PI/8)<1e-12);
  assert.equal(make('f1').textContent,'0');
  presets[1].onclick();
  assert.equal(make('f2').textContent,'0');
  modes[0].onclick();
  assert.equal(make('o').style.opacity,'0');
});

test('factorization preserves the original expression across the full real domain',()=>{
  for(let i=-1000;i<=1000;i++){
    const x=i*0.0137;
    const a=Math.cos(2*x)*Math.sin(4*x)-.5*Math.cos(4*x)-Math.sin(2*x);
    const b=.5*Math.cos(4*x)*(2*Math.sin(2*x)-1);
    assert.ok(Math.abs(a-b)<5e-13,'identity at x='+x);
  }
});
