import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const pagePath=path.join(root,'students/xenia_klykova/site/28.08.26.html');
const html=fs.readFileSync(pagePath,'utf8');

const combination=(n,k)=>{if(k<0||k>n)return 0;k=Math.min(k,n-k);let r=1;for(let i=1;i<=k;i++)r=r*(n-k+i)/i;return Math.round(r)};
const powSafe=(base,exp)=>exp===0?1:Math.pow(base,exp);
const sequence=(n,k,p)=>powSafe(p,k)*powSafe(1-p,n-k);
const binomial=(n,k,p)=>combination(n,k)*sequence(n,k,p);
const atLeastOne=(n,p)=>1-powSafe(1-p,n);
const close=(actual,expected,eps=1e-12)=>assert.ok(Math.abs(actual-expected)<eps,`${actual} ≠ ${expected}`);

assert.equal(combination(6,2),15);
assert.equal(combination(10,3),120);
close(binomial(6,1,1/6),Math.pow(5/6,5));
close(binomial(3,2,.8),.384);
close(binomial(6,4,.8),.24576);
close(atLeastOne(6,1/6),1-Math.pow(5/6,6));
close(combination(6,2)*sequence(6,2,1/6),binomial(6,2,1/6));
close(Array.from({length:11},(_,k)=>binomial(10,k,.5)).reduce((a,b)=>a+b,0),1);
assert.equal(binomial(6,1,0),0);
assert.equal(binomial(6,6,1),1);

for(const token of [
  'id="probabilityLab"','id="distributionSvg"','id="nRange"','id="kRange"','id="pRange"',
  'data-scenario="sandbox"','id="snapshotButton"','id="undoButton"','id="redoButton"',
  'id="playSweep"','id="prediction"','id="challenge"','id="trialStrip"',
  'prefers-reduced-motion','requestAnimationFrame','P(X=j)','Исследовать самому'
]) assert.ok(html.includes(token),`probability lab: missing ${token}`);

assert.ok(!/<script\s+[^>]*src=/i.test(html),'probability lab must remain autonomous');
assert.ok(!/(?:src|href)=["']https?:\/\//i.test(html),'probability lab must not load remote resources');

const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(match=>match[1]);
assert.ok(scripts.length>0,'probability lab: inline script missing');
for(const script of scripts) new Function(script);

console.log('✓ probability lab: math invariants, architecture hooks and inline JS syntax verified');
