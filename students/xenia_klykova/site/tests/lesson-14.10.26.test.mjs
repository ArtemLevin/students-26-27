import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const site=path.join(root,'students/xenia_klykova/site');
const page=fs.readFileSync(path.join(site,'14.10.26.html'),'utf8');
const lab=fs.readFileSync(path.join(site,'14.10.26-lab.html'),'utf8');
const metadata=JSON.parse(fs.readFileSync(path.join(site,'data/lessons/2026-10-14.lesson.json'),'utf8'));
const intent=JSON.parse(fs.readFileSync(path.join(site,'data/publication-intents/2026-10-14.json'),'utf8'));
const practice=JSON.parse(fs.readFileSync(path.join(site,'data/practice-publications/2026-10-14.json'),'utf8'));

test('14 October publication is complete, linked and pedagogically conservative',async()=>{
  const tex=fs.readFileSync(path.join(root,'students/xenia_klykova/tex_docs/14.10.26.tex'),'utf8');
  assert.ok(tex.includes('Теорема Безу')&&tex.includes('Горнера'));
  assert.equal(intent.lessonDate,'2026-10-14');
  assert.equal(intent.ktpMatches.length,0);
  assert.equal(metadata.outcomes.length,4);
  const catalog=JSON.parse(fs.readFileSync(path.join(site,'data/competency-catalog.json'),'utf8'));
  const ids=new Set(catalog.groups.flatMap(g=>g.items.map(i=>i.id)));
  for(const evidence of intent.outcomes){
    assert.ok(ids.has(evidence.competencyId),evidence.competencyId);
    assert.ok(page.includes('id="'+evidence.evidenceAnchor+'"'));
    assert.equal(evidence.masteryClaim,null);
    assert.ok(practice.outcomes.some(x=>x.competencyId===evidence.competencyId&&x.evidenceAnchor===evidence.evidenceAnchor&&x.relation===evidence.relation&&x.practiceDisposition==='manual'));
  }
  const {LESSONS}=await import('../lesson-registry.js');
  assert.equal(LESSONS[0].date,'2026-10-14');
  assert.equal(new Set(LESSONS.map(x=>x.date)).size,LESSONS.length);
  assert.equal(LESSONS[0].materials.lab,'14.10.26-lab.html');
  assert.ok(!('pdf' in LESSONS[0].materials),'do not publish a missing PDF link');
});

test('new page and interactive lab parse, have unique ids and only valid file links',()=>{
  for(const [name,source] of [['lesson',page],['lab',lab]]){
    const ids=[...source.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
    assert.equal(new Set(ids).size,ids.length,name+' duplicate ids');
    const scripts=[...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
    assert.ok(scripts.length,name+' script missing');
    for(const [,js] of scripts)assert.doesNotThrow(()=>new Function(js));
    for(const [,ref] of source.matchAll(/\b(?:src|href)="([^"]+)"/g)){
      if(ref.startsWith('#')||/^(?:https?:|data:)/.test(ref))continue;
      const file=ref.split(/[?#]/)[0];
      assert.ok(fs.existsSync(path.resolve(site,file)),name+' broken '+ref);
    }
  }
  assert.equal((page.match(/<label><input type="checkbox"/g)||[]).length,10);
  assert.ok(lab.includes('Math.pow(x-1,10)'));
  assert.ok(lab.includes("den===0"));
  assert.ok(lab.includes('id="xCursor"'));
  assert.ok(lab.includes('role="status"'));
});

test('Horner arithmetic and signs coincide with the source cases',()=>{
  const p=x=>-3*x*x+15*x+72;
  for(let a=-10;a<=10;a++){
    const q=x=>-3*x+(15-3*a);
    for(let x of [-2,-1,0,1,4]){
      assert.equal((x-a)*q(x)+p(a),p(x));
    }
  }
  assert.equal(p(-3),0);assert.equal(p(8),0);assert.equal(p(1),84);
  const f=x=>Math.pow(x-1,10)*Math.pow(x+2,9)/(2*x-3);
  for(const x of [-5,-3])assert.ok(f(x)>0);
  for(const x of [-1,0,1.25])assert.ok(f(x)<0);
  assert.equal(f(-2),0);assert.equal(f(1),0);
  assert.ok(f(2)>0);assert.ok(f(4)>0);
  assert.equal(2*1.5-3,0);
  // The high-degree case has two forbidden points but only one negative interval.
  const big=x=>Math.pow(x-1,41)*(x*x+3)/
    (Math.pow(4*x-10,19)*Math.pow(x-10,24));
  assert.ok(big(1.5)<0);assert.ok(big(2.8)>0);
});
