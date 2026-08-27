import assert from 'node:assert/strict';
import {deriveTrajectory,deriveRail,derivePower,derivePowers} from '../27.08.26-simulator.js';

{
  const d=deriveTrajectory({a:0.01,b:1,wallHeight:8,margin:1,probeX:50});
  assert.ok(Math.abs(d.maxY-25)<1e-12);
  assert.ok(Math.abs(d.required-9)<1e-12);
  assert.equal(d.roots.length,2);
  assert.ok(Math.abs(d.roots[0]-10)<1e-9);
  assert.ok(Math.abs(d.roots[1]-90)<1e-9);
  assert.ok(Math.abs(d.yAtProbe-25)<1e-9);
}
{
  const d=deriveTrajectory({a:0.01,b:1,wallHeight:26,margin:1,probeX:50});
  assert.ok(d.disc<0);
  assert.equal(d.roots.length,0);
}
{
  const d=deriveRail({L0:10,alpha:1.2e-5,deltaMm:3});
  assert.ok(Math.abs(d.deltaM-0.003)<1e-12);
  assert.ok(Math.abs(d.T-25)<1e-10);
  const twice=deriveRail({L0:10,alpha:1.2e-5,deltaMm:6});
  assert.ok(Math.abs(twice.T/d.T-2)<1e-12);
}
{
  const base=derivePower({pFactor:1,sigmaFactor:1,sFactor:1,baseT:4000});
  const x16=derivePower({pFactor:16,sigmaFactor:1,sFactor:1,baseT:4000});
  assert.equal(base.T,4000);
  assert.ok(Math.abs(x16.ratio-2)<1e-12);
  assert.ok(Math.abs(x16.T-8000)<1e-9);
}
{
  assert.equal(derivePowers({a:-3,b:-6}).result,3);
  assert.equal(derivePowers({a:-5,b:-5}).result,0);
}
console.log('27.08.26 simulator math: ok');
