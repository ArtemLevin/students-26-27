import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html=readFileSync(new URL('../25.09.26-lab.html',import.meta.url),'utf8');
class Element {
  constructor(id=''){this.id=id;this.listeners={};this.dataset={};this.style={};this.children=[];this.textContent='';this.value='';this.hidden=false;this.disabled=false;this.tabIndex=0;this.open=false;this.attributes=new Map();}
  addEventListener(name,handler){(this.listeners[name]??=[]).push(handler)}
  fire(name,extra={}){for(const handler of this.listeners[name]??[])handler({target:this,pointerId:1,clientX:0,clientY:0,preventDefault(){},...extra})}
  setAttribute(name,value){this.attributes.set(name,String(value))}
  removeAttribute(name){this.attributes.delete(name)}
  toggleAttribute(name,force){
    if(force)this.setAttribute(name,'');else this.removeAttribute(name);
    if(name==='hidden')this.hidden=Boolean(force);
  }
  getAttribute(name){return this.attributes.get(name)}
  append(child){this.children.push(child)}
  replaceChildren(...items){this.children=items}
  querySelectorAll(selector){return selector==='button'?this.children:[]}
  get firstElementChild(){return this.children[0]}
  focus(){}
  setPointerCapture(){}
  createSVGPoint(){return {x:0,y:0,matrixTransform(){return {x:this.x,y:this.y}}}}
  getScreenCTM(){return {inverse(){return {}}}}
}
const elements=new Map();
for(const [,id] of html.matchAll(/\bid="([^"]+)"/g))elements.set(id,new Element(id));
function addButton(selector,attribute,key){
  const buttons=[];
  for(const match of html.matchAll(new RegExp('<button[^>]*'+attribute+'="([^"]+)"[^>]*>','g'))){
    const b=new Element();b.dataset[key]=match[1];buttons.push(b);
  }
  return buttons;
}
const selections={
  '[data-route-scenario]':addButton('', 'data-route-scenario','routeScenario'),
  '[data-graph-scenario]':addButton('', 'data-graph-scenario','graphScenario'),
  '[data-legend]':addButton('', 'data-legend','legend'),
  '[data-graph-legend]':addButton('', 'data-graph-legend','graphLegend')
};
for(const mode of ['route','graph']){
  const section=html.match(new RegExp('<div class="predict-options" id="'+mode+'Predict"[\\s\\S]*?<\\/div>'))?.[0]??'';
  for(const [,choice] of section.matchAll(/data-prediction="([^"]+)"/g)){
    const button=new Element();button.dataset.prediction=choice;elements.get(mode+'Predict').append(button);
  }
}
const queued=[];
globalThis.requestAnimationFrame=fn=>{queued.push(fn);return queued.length};
globalThis.cancelAnimationFrame=()=>{};
globalThis.window={matchMedia:()=>({matches:false,addEventListener(){}})};
globalThis.document={
  documentElement:new Element('html'),hidden:false,
  getElementById:id=>elements.get(id),
  querySelectorAll:selector=>selections[selector]??[],
  createElementNS:(_,tag)=>new Element(tag),
  addEventListener(){}
};
globalThis.location={search:'?mode=route',pathname:'/students/ivan_petrachenkov/site/25.09.26-lab.html'};
globalThis.history={replaceState(){}};
const saved=new Map();
globalThis.localStorage={getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value)};
function flush(){let safety=0;while(queued.length){if(++safety>10)throw Error('unbounded render loop');queued.shift()(0)}}
function click(element){element.fire('click');flush()}
const id=name=>elements.get(name);
await import('../25.09.26-lab.js');
flush();

test('the quarter-turn step synchronizes geometry, numbers and chart marker',()=>{
  click(id('routeNext'));
  assert.equal(id('angleValue').textContent,'90°');
  assert.equal(id('pathValue').textContent,'7,85 м');
  assert.equal(id('displacementValue').textContent,'7,07 м');
  assert.ok(Number(id('routePlotGuide').getAttribute('x1'))>53);
  assert.ok(id('routeArc').getAttribute('d').includes(' A '));
});
test('snapshot remains visible as a ghost and two numerical states compare',()=>{
  click(id('routeSave'));
  click(id('routeNext'));
  assert.equal(id('routeComparison').hidden,false);
  assert.equal(id('routeGhost').hidden,false);
  assert.equal(id('routeGhost').attributes.has('hidden'),false);
  assert.equal(id('routeOldPath').textContent,'7,85 м');
  assert.equal(id('routeNewPath').textContent,'15,71 м');
});
test('prediction reveals a source example; a new challenge is reached through the plot',()=>{
  click(id('routePredict').children[0]);
  click(id('routeReveal'));
  assert.equal(id('displacementValue').textContent,'0 м');
  assert.equal(id('routePredictionFeedback').dataset.result,'success');
  click(id('routeChallengeStart'));
  id('routePlot').fire('pointerdown',{target:id('routePlotHit'),pointerId:3,clientX:565,clientY:120});
  flush();
  id('routePlot').fire('pointerup',{pointerId:3});flush();
  assert.equal(id('routeChallengeFeedback').dataset.result,'success');
});
test('switching tabs, graph scrub and free negative velocity share one coordinate',()=>{
  click(id('tab-graph'));
  click(selections['[data-graph-scenario]'][1]);
  id('graphPlot').fire('pointerdown',{target:id('graphHit'),pointerId:4,clientX:311,clientY:150});
  flush();id('graphPlot').fire('pointerup',{pointerId:4});flush();
  assert.equal(id('timeValue').textContent,'5 с');
  assert.equal(id('coordinateValue').textContent,'0 м');
  assert.equal(id('graphDot').getAttribute('cx'),'311');
  id('initial').value='4';id('initial').fire('input');flush();
  id('velocity').value='-5';id('velocity').fire('input');flush();
  assert.equal(id('coordinateValue').textContent,'−21 м');
  assert.equal(id('graphInsight').textContent.includes('Отрицательная'),true);
});
test('the graph challenge recognizes the position reached by the learner',()=>{
  click(id('graphChallengeStart'));
  id('time').value='5';id('time').fire('input');flush();
  assert.equal(id('graphChallengeFeedback').dataset.result,'success');
});
test('a touch pointer on the circular route reaches the opposite point',()=>{
  click(id('tab-route'));
  click(selections['[data-route-scenario]'][1]);
  const radius=Number(id('routeBase').getAttribute('r'));
  id('routeScene').fire('pointerdown',{pointerType:'touch',pointerId:6,clientX:300,clientY:252-radius});
  id('routeScene').fire('pointermove',{pointerType:'touch',pointerId:6,clientX:300,clientY:252+radius});
  flush();id('routeScene').fire('pointerup',{pointerId:6});
  assert.equal(id('angleValue').textContent,'180°');
  assert.equal(id('displacementValue').textContent,'40 м');
  assert.equal(id('pathValue').textContent,'62,83 м');
});
test('dragging the object on Ox and then resetting updates the same instant on the chart',()=>{
  click(id('tab-graph'));
  click(selections['[data-graph-scenario]'][1]);
  const startingX=Number(id('axisDot').getAttribute('cx'));
  const zeroX=53+507/2;
  id('graphScene').fire('pointerdown',{pointerType:'mouse',pointerId:7,clientX:startingX,clientY:121});
  id('graphScene').fire('pointermove',{pointerId:7,clientX:zeroX,clientY:121});
  flush();id('graphScene').fire('pointerup',{pointerId:7});
  assert.equal(id('coordinateValue').textContent,'0 м');
  assert.equal(id('timeValue').textContent,'5 с');
  click(id('graphReset'));
  assert.equal(id('coordinateValue').textContent,'−10 м');
  assert.equal(id('graphDot').getAttribute('cx'),'58');
});
