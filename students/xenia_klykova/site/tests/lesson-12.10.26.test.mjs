import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const site=path.resolve('students/xenia_klykova/site');
const page=fs.readFileSync(path.join(site,'12.10.26.html'),'utf8');
const lab=fs.readFileSync(path.join(site,'12.10.26-lab.html'),'utf8');
const intent=JSON.parse(fs.readFileSync(path.join(site,'data/publication-intents/2026-10-12.json'),'utf8'));
const practice=JSON.parse(fs.readFileSync(path.join(site,'data/practice-publications/2026-10-12.json'),'utf8'));
const gcd=(a,b)=>b?gcd(b,a%b):a;
const lcm=(a,b)=>a/gcd(a,b)*b;
test('Oct 12 educational content matches the source workbook and anchors',()=>{
  const tex=fs.readFileSync('students/xenia_klykova/tex_docs/12.10.26.tex','utf8');
  assert.ok(tex.includes('72')&&tex.includes('120')&&tex.includes('210'));
  assert.equal(intent.lessonDate,'2026-10-12');
  assert.equal(intent.ktpMatches.length,0);
  const ids=new Set(JSON.parse(fs.readFileSync(path.join(site,'data/competency-catalog.json'),'utf8')).groups.flatMap(g=>g.items.map(i=>i.id)));
  for(const o of intent.outcomes){
    assert.ok(ids.has(o.competencyId));
    assert.ok(page.includes('id="'+o.evidenceAnchor+'"'));
    assert.equal(o.masteryClaim,null);
    assert.ok(practice.outcomes.some(p=>p.competencyId===o.competencyId&&p.evidenceAnchor===o.evidenceAnchor&&p.relation===o.relation&&p.practiceDisposition==='manual'));
  }
  assert.equal((page.match(/<li><label><input type="checkbox">/g)||[]).length,10);
});
test('GCD/LCM arithmetic and recovery examples are exact',()=>{
  assert.equal(gcd(72,120),24);assert.equal(lcm(72,120),360);
  assert.equal(gcd(252,105),21);assert.equal(gcd(1105,478),1);
  assert.equal(gcd(48,180),12);assert.equal(lcm(48,180),720);
  const examples=[[4,36,[[4,36]]],[6,210,[[6,210],[30,42]]],[12,360,[[12,360],[24,180],[36,120],[60,72]]]];
  for(const [d,m,expected] of examples){
    const found=[];
    for(let x=1;x*x<=m/d;x++){
      if((m/d)%x)continue;const y=(m/d)/x;
      if(gcd(x,y)===1)found.push([d*x,d*y]);
    }
    assert.deepEqual(found,expected);
    for(const [a,b] of found){assert.equal(gcd(a,b),d);assert.equal(lcm(a,b),m)}
  }
  for(let n=1;n<=250;n++){
    assert.equal(gcd(n,n+1),1);
    assert.equal(gcd(3*n+2,3*n+5),1);
    assert.equal(gcd(12*n+5,6*n+2),1);
    assert.equal(gcd(17*n+8,5*n+2),gcd(Math.abs(n-2),6));
  }
});
test('lesson and lab have valid scripts, unique identifiers and real links',()=>{
  for(const [name,content] of [['lesson',page],['lab',lab]]){
    const ids=[...content.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
    assert.equal(new Set(ids).size,ids.length,name+' duplicate IDs');
    const inline=[...content.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
    assert.ok(inline.length);
    for(const [,js] of inline)assert.doesNotThrow(()=>new Function(js));
    for(const [,ref] of content.matchAll(/\b(?:src|href)="([^"]+)"/g)){
      if(!ref||ref.startsWith('#')||/^(?:https?:|data:)/.test(ref))continue;
      const target=ref.split(/[?#]/)[0];
      assert.ok(fs.existsSync(path.resolve(site,target)),name+' missing '+ref);
    }
    assert.ok(content.includes('prefers-reduced-motion')||name==='lesson');
  }
  assert.ok(page.includes('href="12.10.26-lab.html#euclid"'));
  assert.ok(page.includes('href="12.10.26-lab.html#pairs"'));
  assert.ok(lab.includes('function renderEuclid()'));
  assert.ok(lab.includes('function pairs()'));
});
test('dashboard publication outcome is the newest lesson if publication completed',async()=>{
  const {LESSONS}=await import('../lesson-registry.js');
  const newRecord=LESSONS.find(x=>x.date==='2026-10-12');
  assert.ok(newRecord,'October 12 lesson missing from dashboard registry');
  assert.ok(LESSONS[0].date>='2026-10-12');
  assert.equal(newRecord.materials.lab,'12.10.26-lab.html');
  assert.equal(newRecord.outcomes.length,intent.outcomes.length);
});
