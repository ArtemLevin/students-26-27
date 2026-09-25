import test from 'node:test';
import assert from 'node:assert/strict';
import {
  routeValues, graphValues, graphDomain, routePoint, arcPath,
  progressFromCircle, routeChallenge, graphChallenge
} from '../25.09.26-lab.model.mjs';

const near = (a,b,tolerance=1e-8) => assert.ok(Math.abs(a-b)<tolerance, `${a} ≠ ${b}`);

test('source examples: complete and half circle, repeated endpoint', () => {
  const full=routeValues({radius:5,turns:1,progress:1});
  near(full.path,10*Math.PI);near(full.displacement,0);
  assert.equal(full.returnToStart,true);
  assert.equal(routeChallenge(full),true);
  const half=routeValues({radius:20,turns:.5,progress:1});
  near(half.path,20*Math.PI);near(half.displacement,40);
  const twice=routeValues({radius:5,turns:2,progress:1});
  near(twice.displacement,0);near(twice.path,20*Math.PI);
  assert.ok(twice.path>full.path);
});
test('chord geometry and path inequality agree for all scenarios and many intermediate positions', () => {
  for(const radius of [5,10,20,24]) for(const turns of [.25,.5,1,1.5,2]){
    for(let index=0;index<=200;index++){
      const v=routeValues({radius,turns,progress:index/200});
      assert.ok(v.path+1e-8>=v.displacement);
      near(v.displacement,Math.hypot(v.dx,v.dy));
      near(v.displacement,2*radius*Math.abs(Math.sin(v.theta/2)));
    }
  }
});
test('SVG arc uses true circular segments and closes exact full laps', () => {
  const path=arcPath(120,4*Math.PI);
  assert.equal((path.match(/ A /g)||[]).length,8);
  const beginning=routePoint(120,0),end=routePoint(120,4*Math.PI);
  near(beginning.x,end.x);near(beginning.y,end.y);
});
test('dragging a point near a later lap selects the nearest continuous time', () => {
  const point=routePoint(120,2*Math.PI+.35);
  const fraction=progressFromCircle(point.x,point.y,.53,2);
  near(fraction,(2*Math.PI+.35)/(4*Math.PI));
});
test('graph examples, reverse direction and rest are calculated from one law', () => {
  const first=graphValues({x0:4,velocity:5,time:5});
  assert.deepEqual([first.coordinate,first.delta,first.endpoint],[29,25,54]);
  const second=graphValues({x0:-10,velocity:2,time:5});
  assert.equal(second.coordinate,0);assert.equal(graphChallenge(second),true);
  assert.equal(graphValues({x0:4,velocity:-5,time:3}).coordinate,-11);
  const still=graphValues({x0:4,velocity:0,time:10});
  assert.equal(still.coordinate,4);assert.equal(still.delta,0);
  const domain=graphDomain(first,second);
  assert.ok(domain.min<=-10 && domain.max>=54);
});
test('outside controls cannot produce impossible state', () => {
  const r=routeValues({radius:0,turns:8,progress:3});
  assert.deepEqual([r.radius,r.turns,r.progress],[5,2,1]);
  const g=graphValues({x0:Infinity,velocity:-100,time:-3});
  assert.deepEqual([g.x0,g.velocity,g.time],[-10,-5,0]);
});
