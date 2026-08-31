import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync(new URL('./31.08.26.sim-core.js',import.meta.url),'utf8');
const match=html.match(/\/\* GEOMETRY_CORE_START \*\/([\s\S]*?)\/\* GEOMETRY_CORE_END \*\//);
assert.ok(match,'geometry core marker must exist');
const context={Math};
vm.createContext(context);
vm.runInContext(`${match[1]};this.api={EPS,v,add,sub,mul,dot,cross,norm,unit,triangleArea,distancePointLine,derivedPlane,pointPlaneDistance,pencilPlane,linePlaneAlpha,betaPlane,planePlaneAlphaBeta,planePointResidual,rad};`,context);
const g=context.api;
const near=(a,b,t=1e-9)=>Math.abs(a-b)<=t;

test('three non-collinear points define a valid plane',()=>{
 const A=g.v(0,0,0),B=g.v(2,0,0),C=g.v(0,3,1);
 const plane=g.derivedPlane(A,B,C);
 assert.ok(plane);
 assert.ok(Math.abs(g.planePointResidual(A,plane))<1e-9);
 assert.ok(Math.abs(g.planePointResidual(B,plane))<1e-9);
 assert.ok(Math.abs(g.planePointResidual(C,plane))<1e-9);
});

test('collinearity collapses triangle area and distance',()=>{
 const A=g.v(-2,0,0),B=g.v(2,0,0),C=g.v(.7,0,0);
 assert.ok(g.triangleArea(A,B,C)<g.EPS);
 assert.ok(g.distancePointLine(C,A,B)<g.EPS);
 assert.equal(g.derivedPlane(A,B,C),null);
});

test('triangle area follows 1/2 base times height',()=>{
 const A=g.v(0,0,0),B=g.v(4,0,0),C=g.v(1,3,0);
 const base=g.norm(g.sub(B,A)),h=g.distancePointLine(C,A,B);
 assert.ok(near(g.triangleArea(A,B,C),base*h/2));
});

test('axiom 2 contained line classification',()=>{
 assert.equal(g.linePlaneAlpha(g.v(0,0,0),g.v(2,1,0)).type,'contained');
});

test('line parallel to alpha has constant nonzero z',()=>{
 assert.equal(g.linePlaneAlpha(g.v(0,0,1),g.v(2,1,1)).type,'parallel');
});

test('line crossing alpha computes an actual intersection point',()=>{
 const rel=g.linePlaneAlpha(g.v(0,0,-2),g.v(2,0,2));
 assert.equal(rel.type,'intersect');
 assert.ok(near(rel.point.z,0));
 assert.ok(near(rel.t,.5));
});

test('pencil plane always contains the axis AB',()=>{
 const A=g.v(-2,.3,.4),B=g.v(2,.3,.4);
 for(const angle of [0,Math.PI/4,Math.PI/2,Math.PI]){
   const plane=g.pencilPlane(A,B,angle);
   assert.ok(Math.abs(g.planePointResidual(A,plane))<1e-9);
   assert.ok(Math.abs(g.planePointResidual(B,plane))<1e-9);
 }
});

test('plane-plane boundary cases are classified correctly',()=>{
 assert.equal(g.planePlaneAlphaBeta(0,0).type,'coincident');
 assert.equal(g.planePlaneAlphaBeta(0,1).type,'parallel');
 assert.equal(g.planePlaneAlphaBeta(g.rad(45),0).type,'intersect');
});

test('intersection line of beta with alpha satisfies both planes',()=>{
 const angle=g.rad(35),offset=.8,rel=g.planePlaneAlphaBeta(angle,offset);
 assert.equal(rel.type,'intersect');
 const beta=g.betaPlane(angle,offset);
 const point=g.v(1.25,rel.lineY,0);
 assert.ok(Math.abs(g.planePointResidual(point,beta))<1e-9);
});