import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {LESSONS} from '../lesson-registry.js';
import {composeLessons} from '../lesson-sequence.js';

const site=path.resolve('students/xenia_klykova/site');
const page=fs.readFileSync(path.join(site,'09.10.26.html'),'utf8');
const lab=fs.readFileSync(path.join(site,'09.10.26-lab.html'),'utf8');
const dashboard=fs.readFileSync(path.join(site,'dashboard.js'),'utf8');
const homepage=fs.readFileSync(path.join(site,'index.html'),'utf8');
const metadata=JSON.parse(fs.readFileSync(path.join(site,'data/lessons/2026-10-09.lesson.json'),'utf8'));
const intent=JSON.parse(fs.readFileSync('pipeline/publication-intents/xenia_klykova/2026-10-09.json','utf8'));
const practice=JSON.parse(fs.readFileSync(path.join(site,'data/practice-publications/2026-10-09.json'),'utf8'));
const competencyCatalog=JSON.parse(fs.readFileSync(path.join(site,'data/competency-catalog.json'),'utf8'));
const mastery=fs.readFileSync(path.join(site,'data/mastery-state.json'),'utf8');
const close=(a,b)=>Math.abs(a-b)<1e-9;

test('canonical registry always controls latest lesson order',()=>{
  assert.equal(LESSONS[0].date,'2026-10-09');
  const historical=[{date:'2026-10-07',href:'07.10.26.html',title:'Historical enriched lesson'}];
  const composed=composeLessons(LESSONS,historical);
  assert.equal(composed[0].date,'2026-10-09');
  assert.equal(composed[1].date,'2026-10-08');
  assert.equal(composed[2].title,'Historical enriched lesson');
  assert.equal(composed.length,LESSONS.length);
  assert.equal(new Set(composed.map(x=>x.date)).size,composed.length);
  assert.ok(dashboard.includes('composeLessons(BASE_LESSONS,LEGACY_SNAPSHOTS)'));
  assert.ok(homepage.includes('dashboard.js?v=20261009-review-2'));
});

test('exact evidence anchors and practice dispositions are consistent',()=>{
  const ids=new Set(competencyCatalog.groups.flatMap(g=>g.items.map(i=>i.id)));
  assert.equal(intent.outcomes.length,5);
  for(const outcome of intent.outcomes){
    assert.ok(ids.has(outcome.competencyId),outcome.competencyId);
    assert.ok(page.includes('id="'+outcome.evidenceAnchor+'"'),outcome.evidenceAnchor);
    assert.equal(outcome.masteryClaim,null);
    const associated=practice.outcomes.find(x=>x.competencyId===outcome.competencyId&&x.evidenceAnchor===outcome.evidenceAnchor&&x.relation===outcome.relation);
    assert.equal(associated?.practiceDisposition,'manual');
  }
  assert.equal(metadata.outcomes.length,intent.outcomes.length);
  assert.ok(mastery.includes('"t10_validation"'));
});

test('mathematical values and training answer keys',()=>{
  const h=t=>2+14*t-5*t*t;
  assert.ok(close(h(.8),10));
  assert.ok(close(h(2),10));
  assert.ok(close(h(1.4),11.8));
  assert.ok(close(2-.8,1.2));
  assert.ok(close(256/(2*6400)*1000,20));
  assert.ok(close(.023*80**2-.5*80+32,139.2));
  assert.ok(close(255/(16-1)-255/(16+1),2));
  assert.ok(close(.05*13.5+.13*22.5,.10*36));
  assert.ok(close(1/3+1/6,1/2));
  assert.ok(page.includes('0,8 &lt; t &lt; 2'));
  assert.ok(page.includes('2 − 0,8 = 1,2 секунды'));
  assert.ok(page.includes('<li>20 кг</li>'));
  assert.ok(page.includes('<li>4,5 дня</li>'));
});

test('both pages have unique IDs, valid inline scripts and existing local links',()=>{
  for(const [name,html] of [['lesson',page],['lab',lab]]){
    const identifiers=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
    assert.equal(new Set(identifiers).size,identifiers.length,name+' duplicate IDs');
    const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
    assert.ok(scripts.length>0,name+' missing JavaScript');
    for(const src of scripts)assert.doesNotThrow(()=>new Function(src),name+' script syntax');
    for(const [,raw] of html.matchAll(/\b(?:href|src)="([^"]+)"/g)){
      const target=raw.split(/[?#]/)[0];
      if(!target||target.startsWith('http:')||target.startsWith('https:')||target.startsWith('data:'))continue;
      const absolute=path.resolve(site,target);
      assert.ok(fs.existsSync(absolute),name+' dead link '+raw);
    }
  }
});

test('graph accessibility, mobile scrolling, keyboard and theme contracts',()=>{
  assert.ok(page.includes('.graph{max-width:700px;padding:1rem 0;overflow-x:auto}'));
  assert.ok(lab.includes('class="plot-scroll" tabindex="0" role="region"'));
  assert.ok(lab.includes('aria-live="polite"'));
  assert.ok(lab.includes('type="range"'));
  assert.ok(lab.includes('prefers-reduced-motion'));
  assert.ok(lab.includes("localStorage.getItem('xenia-091026-v1-theme')"));
  assert.ok(lab.includes('data-t="0.8"'));
  assert.ok(lab.includes('data-t="1.4"'));
  assert.ok(lab.includes('data-t="2"'));
  assert.ok(!/eval\s*\(/.test(page+lab));
});
