import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const page = fs.readFileSync(new URL('../27.11.26.html',import.meta.url),'utf8');
const lab = fs.readFileSync(new URL('../27.11.26-lab.html',import.meta.url),'utf8');
const intent=JSON.parse(fs.readFileSync(new URL('../../27.11.26.intent.json',import.meta.url),'utf8'));
test('lesson has five source tasks, anchors, MathML, valid script syntax and local resources',()=>{
  assert.equal((page.match(/class="task"/g)||[]).length,5);
  const ids=[...page.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
  assert.equal(new Set(ids).size,ids.length);
  assert.ok((page.match(/<math\b/g)||[]).length>100);
  assert.equal((page.match(/<math\b/g)||[]).length,(page.match(/<\/math>/g)||[]).length);
  for(const o of intent.outcomes){assert.ok(ids.includes(o.evidenceAnchor));assert.equal(o.masteryClaim,null)}
  for(const html of [page,lab]){
    for(const s of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(s[1]);
    for(const m of html.matchAll(/(?:href|src)="([^"]+)"/g)){
      const p=m[1].split('#')[0];if(p&&!p.includes(':'))assert.ok(fs.existsSync(new URL('../'+p,import.meta.url)),p);
    }
  }
});
const start=lab.indexOf('const G=10'),end=lab.indexOf('const escText=');
const ctx=vm.createContext({});
vm.runInContext(lab.slice(start,end)+';globalThis.solve=model;',ctx);
const solve=ctx.solve, angle=Math.asin(.6)*180/Math.PI;
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8, a+' != '+b);
test('lift and balloon: signed acceleration, weightlessness and ballast',()=>{
  close(solve('lift',{m:60,a:-2,v:-1,susp:0}).n,480);
  close(solve('lift',{m:60,a:2,v:-1,susp:0}).n,720);
  close(solve('lift',{m:60,a:-10,v:-1,susp:1}).n,0);
  close(solve('air',{m:550,rho:1.2,volume:500,drag:500,v:1}).a,0);
  close(solve('air',{m:500,rho:1.2,volume:500,drag:500,v:1}).a,1);
});
test('horizontal traction, compression and loss of contact',()=>{
  const params={m:20,f:100,alpha:angle,mu:.25,v:1};
  let r=solve('horizontal',params);close(r.n,140);close(r.f,35);close(r.a,2.25);
  r=solve('horizontal',{...params,alpha:-angle});close(r.n,260);close(r.f,65);close(r.a,.75);
  r=solve('horizontal',{m:10,f:300,alpha:60,mu:.25,v:1});assert.equal(r.valid,false);close(r.n,0);close(r.f,0);assert.ok(r.ay>0);
});
test('wall and incline: signs and contact threshold',()=>{
  let r=solve('wall',{m:4,f:80,alpha:angle,mu:.25,v:1});close(r.n,48);close(r.f,12);close(r.a,3);
  r=solve('wall',{m:4,f:40,alpha:angle,mu:.25,v:1});close(r.a,-3.5);
  const p={m:20,f:200,beta:angle,alpha:angle,mu:.25,v:1};
  r=solve('incline',p);close(r.n,40);close(r.f,10);close(r.a,1.5);
  r=solve('incline',{...p,f:800/3});close(r.n,0);assert.equal(r.boundary,true);
});
test('Newton vector balance for all modes and both directions',()=>{
 for(const mode of ['lift','air','horizontal','wall','incline'])for(const v of [-1,1]){
 const r=solve(mode,{m:20,a:2,v,susp:0,rho:1.2,volume:100,drag:30,f:100,alpha:30,beta:25,mu:.25});
 close(r.forces.reduce((a,f)=>a+f.x,0),20*r.ax);
 close(r.forces.reduce((a,f)=>a+f.y,0),20*r.ay);
 }
});
