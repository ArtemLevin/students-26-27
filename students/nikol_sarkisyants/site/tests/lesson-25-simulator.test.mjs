import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const testDir=dirname(fileURLToPath(import.meta.url));
const siteDir=dirname(testDir);
const html=readFileSync(join(siteDir,'25.08.26.html'),'utf8');

function extractCore(){
  const start='/* MODEL_CORE_START */';
  const end='/* MODEL_CORE_END */';
  const a=html.indexOf(start),b=html.indexOf(end);
  assert.ok(a>=0&&b>a,'model core markers must exist');
  return html.slice(a+start.length,b);
}

function loadCore(){
  const context={};
  vm.createContext(context);
  vm.runInContext(`${extractCore()}\nglobalThis.__GeoCore=GeoCore;`,context);
  return context.__GeoCore;
}

const GeoCore=loadCore();

test('classic 25-20 lesson configuration is mathematically exact',()=>{
  const {A,B,C}=GeoCore.classic2520();
  const t=GeoCore.triangle(A,B,C);
  assert.ok(Math.abs(t.AB-25)<1e-9);
  assert.ok(Math.abs(t.AH-20)<1e-9);
  assert.ok(Math.abs(t.BH-15)<1e-9);
  assert.ok(Math.abs(t.AC-125/6)<1e-9);
  assert.ok(Math.abs(t.BC-125/6)<1e-9);
  assert.ok(Math.abs(t.pythagorasResidual)<1e-9);
});

test('altitude projection correctly distinguishes inside and extension cases',()=>{
  const inside=GeoCore.triangle({x:7,y:8},{x:0,y:0},{x:15,y:0});
  const outside=GeoCore.triangle({x:19,y:8},{x:0,y:0},{x:14,y:0});
  assert.ok(inside.projectionT>0&&inside.projectionT<1);
  assert.ok(outside.projectionT>1);
  assert.ok(Math.abs(outside.area-.5*outside.BC*outside.AH)<1e-9);
});

test('diameter theorem remains exact while point moves on circle',()=>{
  for(const theta of [.2,.7,1.2,2.1,2.8]){
    const c=GeoCore.circleState(10,theta,2.5);
    assert.ok(Math.abs(c.angleBDC-90)<1e-9);
    assert.ok(Math.abs(c.angleEBD-c.angleECD)<1e-9);
  }
});

test('similarity state keeps linear ratio k and area ratio k squared',()=>{
  for(const k of [.2,.5,.6,.8]){
    const s=GeoCore.similarity({x:5,y:8},{x:0,y:0},{x:16,y:0},k);
    assert.ok(Math.abs(s.lengthRatio-k)<1e-9);
    assert.ok(Math.abs(s.areaRatio-k*k)<1e-9);
  }
});

test('simulator exposes research interactions and progressive disclosure',()=>{
  for(const marker of [
    'data-mode="height"','data-mode="area"','data-mode="circle"','data-mode="similarity"',
    'Исследовать самому','id="snapshotBtn"','id="undoBtn"','id="redoBtn"','id="playBtn"',
    'id="timeline"','id="predictOptions"','id="challengeText"','id="miniChart"',
    'pointerdown','requestAnimationFrame','prefers-reduced-motion','Подробнее · вычисления и график'
  ])assert.ok(html.includes(marker),`missing simulator capability: ${marker}`);
});

test('simulator keeps one state object and renders both compact and modal views from it',()=>{
  assert.match(html,/const state=structuredClone\(initial\)/);
  assert.match(html,/function currentData\(\)/);
  assert.match(html,/renderSvg\(\$\('#simSvg'\)\)/);
  assert.match(html,/renderSvg\(\$\('#simModalSvg'\),true\)/);
  assert.doesNotMatch(html,/setInterval\(/);
});
