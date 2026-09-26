import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const testDir=dirname(fileURLToPath(import.meta.url));
const siteDir=dirname(testDir);
const lesson=readFileSync(join(siteDir,'25.09.26.html'),'utf8');
const lab=readFileSync(join(siteDir,'25.09.26-lab.html'),'utf8');
const registry=readFileSync(join(siteDir,'lesson-registry.js'),'utf8');
const index=readFileSync(join(siteDir,'index.html'),'utf8');
const heatmap=readFileSync(join(siteDir,'dashboard-data-25.09.js'),'utf8');

function extractCore(){
  const start='/* TANGENT_CORE_START */';
  const end='/* TANGENT_CORE_END */';
  const a=lab.indexOf(start);
  const b=lab.indexOf(end);
  assert.ok(a>=0&&b>a,'tangent math core markers must exist');
  return lab.slice(a+start.length,b);
}

function loadCore(){
  const context={};
  vm.createContext(context);
  vm.runInContext(extractCore()+'\nglobalThis.__TangentCore=TangentCore;',context);
  return context.__TangentCore;
}

const Core=loadCore();

test('lesson and lab keep only local production resources',()=>{
  for(const html of [lesson,lab]){
    assert.doesNotMatch(html,/<script[^>]+src="https?:/i);
    assert.doesNotMatch(html,/<link[^>]+href="https?:/i);
    assert.doesNotMatch(html,/\bTODO\b|\bFIXME\b|lorem|остальное без изменений/i);
    assert.doesNotMatch(html,/onclick=/i);
  }
  for(const rel of [
    '../pdf_docs/25.09.26.pdf',
    '../tex_docs/25.09.26.tex',
    '../images/25.09.26.png'
  ]){
    const absolute=join(siteDir,rel);
    assert.equal(existsSync(absolute),true,'missing local material: '+rel);
  }
});

test('lesson preserves the source mathematical relations',()=>{
  for(const marker of [
    'f′(x₀) = k = tg α',
    'k=(y₂−y₁)/(x₂−x₁)',
    'f′(x₀)=k=(f(x₀)−y₁)/(x₀−x₁)',
    'f′(x₀)=f(x₀)/x₀',
    'f′(x₀)=m',
    'f′(x₀)=k',
    'f(x₀)=kx₀+b',
    'f(−2/3)=−32/27',
    '−32/3'
  ])assert.ok(lesson.includes(marker),'missing mathematical marker: '+marker);
});

test('static tangent graphic is tied to the exact worked example',()=>{
  assert.match(lesson,/data-function="x\^2\/4"/);
  assert.match(lesson,/data-tangent="x-1"/);
  assert.match(lesson,/data-math-point="0,-1"/);
  assert.match(lesson,/data-math-point="2,1"/);
  assert.match(lesson,/\(0; −1\)/);
  assert.match(lesson,/\(2; 1\)/);
});

test('interactive tangent model is mathematically exact across its range',()=>{
  for(const x0 of [-3,-2,-1,0,1,2,3]){
    const s=Core.state(x0);
    assert.ok(Math.abs(s.y0-x0*x0/4)<1e-12);
    assert.ok(Math.abs(s.k-x0/2)<1e-12);
    assert.ok(Math.abs(Core.lineValue(s.k,s.b,x0)-s.y0)<1e-12);
    const dx=2;
    const x1=x0-1;
    const x2=x0+1;
    const dy=Core.lineValue(s.k,s.b,x2)-Core.lineValue(s.k,s.b,x1);
    assert.ok(Math.abs(dy/dx-s.k)<1e-12);
  }
});

test('parallel-line mode preserves equal slopes and different intercepts',()=>{
  for(const m of [-2,-1,0,.25,1,2]){
    const s=Core.parallel(m,-1,1,1.5);
    assert.equal(s.k1,m);
    assert.equal(s.k2,m);
    assert.ok(Math.abs((s.y2-s.y1)-2)<1e-12);
  }
});

test('lab constrains the visual experiment and supports deep-linked modes',()=>{
  assert.match(lab,/id="x0" type="range" min="-3" max="3" step="0\.5"/);
  assert.match(lab,/clip-path="url\(#slopeClip\)"/);
  assert.match(lab,/clip-path="url\(#parallelClip\)"/);
  assert.match(lab,/new URLSearchParams\(location\.search\)\.get\('mode'\)/);
  assert.match(lab,/slopeStage\.hidden=!slope/);
  assert.match(lab,/parallelStage\.hidden=slope/);
  assert.match(lab,/@media\(prefers-reduced-motion:reduce\)/);
});

test('lesson integration remains unique and connected to the competence map',()=>{
  assert.equal((registry.match(/date:'2026-09-25'/g)||[]).length,1);
  assert.match(registry,/materials:\{pdf:'\.\.\/pdf_docs\/25\.09\.26\.pdf',tex:'\.\.\/tex_docs\/25\.09\.26\.tex',lab:'25\.09\.26-lab\.html'\}/);
  assert.match(index,/dashboard-data-25\.09\.js\?v=20260925-1/);
  for(const id of ['t8_geometric','t8_derivative_graph','t8_interpret']){
    assert.match(heatmap,new RegExp(id+':3'));
  }
});
