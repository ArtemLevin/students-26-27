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
const archivePage=fs.readFileSync(path.join(site,'archive.html'),'utf8');
const archiveJS=fs.readFileSync(path.join(site,'archive.js'),'utf8');
const archiveCSS=fs.readFileSync(path.join(site,'archive.css'),'utf8');
const metadata=JSON.parse(fs.readFileSync(path.join(site,'data/lessons/2026-10-09.lesson.json'),'utf8'));
const intent=JSON.parse(fs.readFileSync('pipeline/publication-intents/xenia_klykova/2026-10-09.json','utf8'));
const practice=JSON.parse(fs.readFileSync(path.join(site,'data/practice-publications/2026-10-09.json'),'utf8'));
const competencyCatalog=JSON.parse(fs.readFileSync(path.join(site,'data/competency-catalog.json'),'utf8'));
const mastery=fs.readFileSync(path.join(site,'data/mastery-state.json'),'utf8');
const close=(a,b)=>Math.abs(a-b)<1e-9;

test('canonical registry always controls latest lesson order',()=>{
  const historical=[{date:'2026-10-07',href:'07.10.26.html',title:'Historical enriched lesson'}];
  const composed=composeLessons(LESSONS,historical);
  assert.deepEqual(composed.slice(0,3).map(x=>x.date),LESSONS.slice(0,3).map(x=>x.date));
  assert.ok(LESSONS[0].date>='2026-10-09','the earlier lesson remains in the archive');
  assert.equal(composed.find(x=>x.date==='2026-10-07').title,'Historical enriched lesson');
  assert.equal(composed.length,LESSONS.length);
  assert.equal(new Set(composed.map(x=>x.date)).size,composed.length);
  assert.ok(dashboard.includes('composeLessons(BASE_LESSONS,LEGACY_SNAPSHOTS)'));
  assert.ok(homepage.includes('dashboard.js?v=20261015-1'));
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
  assert.ok(page.includes('<mo>&lt;</mo>') && page.includes('<mn>0,8</mn>') && page.includes('<mi>t</mi>'));
  assert.ok(page.includes('<mn>1,2</mn>'));
  assert.ok(page.includes('<mtext> кг</mtext>'));
  assert.ok(page.includes('<mtext> дня</mtext>'));
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

test('all published mathematical expressions have MathML semantics',()=>{
  const roots=(html)=>[...html.matchAll(/<math\b[^>]*>/g)].map(m=>m[0]);
  const lessonMath=roots(page),labMath=roots(lab);
  assert.ok(lessonMath.length>=75,'lesson formula coverage: '+lessonMath.length);
  assert.ok(labMath.length>=19,'lab formula coverage: '+labMath.length);
  assert.ok(lessonMath.every(m=>m.includes('xmlns="http://www.w3.org/1998/Math/MathML"')));
  assert.ok(labMath.every(m=>m.includes('xmlns="http://www.w3.org/1998/Math/MathML"')));
  assert.ok((page.match(/<mfrac>/g)||[]).length>=8,'fraction semantic structures required');
  assert.ok((page.match(/<msup>/g)||[]).length>=15,'powers must use msup');
  assert.ok((page.match(/<msub>/g)||[]).length>=2,'indices must use msub');
  assert.ok(page.includes('<msqrt>'),'square root must use msqrt');
  assert.ok(!/class="equation">[^<]/.test(page),'plain text in formula blocks');
  assert.ok(!/class="equation">[^<]/.test(lab),'plain text in lab equation');
  assert.ok(lab.includes('tValue.innerHTML=numberMath(t'));
  assert.ok(lab.includes('hValue.innerHTML=numberMath(h'));
  assert.ok(lab.includes('calculation.innerHTML='));
  assert.ok(lab.includes("feedback.innerHTML='Верно:"));
});

test('Xenia atlas landing page exposes a standalone monthly archive and retains dashboard controls',()=>{
  const css=fs.readFileSync(path.join(site,'atlas-bannova-reference.css'),'utf8');
  const design=JSON.parse(fs.readFileSync(path.join(site,'design.json'),'utf8'));
  assert.equal(design.system,'LEVIN_ATLAS');
  assert.equal(design.accent,'graphite');
  assert.equal(design.density,'airy');
  assert.equal(design.typography,'editorial');
  assert.ok(homepage.includes('atlas-bannova-reference.css'));
  assert.ok(homepage.includes('data-atlas-accent="graphite"'));
  assert.ok(homepage.includes('id="atlasTitle"'));
  assert.ok(homepage.includes('class="atlas-ledger"'));
  assert.ok(homepage.includes('class="atlas-catalog"'));
  assert.ok(homepage.includes('id="archivePageCta"'));
  assert.ok(homepage.includes('id="archivePageCta" href="archive.html"'));
  assert.ok(homepage.includes('href="archive.html"'),'navigation must lead to archive page');
  assert.ok(!homepage.includes('id="lessonArchive"'),'archive section must be removed from homepage');
  for(const retired of ['recentLessons','archiveToggle','archiveMore','archivePage','archivePrev','archiveNext']){
    assert.ok(!homepage.includes('id="'+retired+'"'),'retired archive control should not appear: '+retired);
  }
  for(const id of ['lesson-title','latestLessonCta','latestPdfLink','latestTexLink','totalCount','evaluatedCount','confidentCountMain','processCountMain','masteredCountMain','radialMap','topicIndex','competenceMap','competencyDialog','practiceRoot','menuButton','sidebar','themeToggle']){
    assert.ok(homepage.includes('id="'+id+'"'),'missing dashboard control '+id);
  }
  const ids=[...homepage.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(new Set(ids).size,ids.length,'all page IDs must be unique');
  assert.ok(css.includes('.atlas-archive-portal-link'));
  assert.ok(css.includes('grid-template-columns:repeat(5,minmax(0,1fr))'));
  assert.ok(css.includes('@media(max-width:680px)'));
  assert.ok(css.includes('prefers-reduced-motion'));
});

test('monthly tile archive is data-driven, safe and reachable',()=>{
  for(const id of ['archiveRoot','archiveSearch','archiveMonths','archiveTotal','archiveMonthTotal','archiveTheme','archiveEmpty']){
    assert.ok(archivePage.includes('id="'+id+'"'),'archive page missing '+id);
  }
  assert.ok(archivePage.includes('archive.js?v=20261016-2'));
  assert.ok(archivePage.includes('archive.css?v=20261016-2'));
  assert.ok(archivePage.includes('href="index.html"'));
  const ids=[...archivePage.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
  assert.equal(new Set(ids).size,ids.length,'duplicate archive page IDs');
  assert.ok(archiveJS.includes("composeLessons(BASE_LESSONS"),'same chronology as dashboard');
  assert.ok(archiveJS.includes("groupLessonsByMonth"),'month groups derived from dates');
  assert.ok(archiveJS.includes("document.createElement"),'construct tile text safely');
  assert.ok(archiveJS.includes("tile.hidden=!matched"),'search filters tile visibility');
  assert.ok(!archiveJS.includes('innerHTML'),'titles and topics must never inject HTML');
  assert.ok(archiveCSS.includes('grid-auto-flow:row'),'strict chronological reading order');
  assert.ok(archiveCSS.includes('grid-template-columns:repeat(3,minmax(0,1fr))'));
  assert.ok(archiveCSS.includes('grid-auto-rows:var(--archive-card-height,auto)'));
  assert.ok(!archiveCSS.includes('-webkit-line-clamp'),'lesson titles and descriptions must be fully visible');
  assert.ok(!archiveCSS.includes('grid-row:span'),'cards must not span multiple rows');
  assert.ok(archiveJS.includes("card.className='archive-tile'"),'all lesson cards share one size');
  assert.ok(archiveJS.includes("equalizeTiles()"),'shared card height recalculates responsively');
  assert.ok(archiveCSS.includes('@media(max-width:700px)'));
  assert.ok(archiveCSS.includes('prefers-reduced-motion'));
  assert.ok(LESSONS.length>=30,'all historical lessons remain accessible');
  assert.ok(new Set(LESSONS.map(x=>x.date.slice(0,7))).size>=4,'multiple months available');
});

test('latest lesson presents readable evidence and valid editorial layout markup',async()=>{
  const {LESSONS}=await import('../lesson-registry.js');
  const {presentLessonOutcome}=await import('../../../../shared/student-dashboard/outcome-adapter.js');
  const latest=LESSONS[0];
  assert.equal(latest.date,'2026-10-15');
  for(const evidence of latest.outcomes){
    const view=presentLessonOutcome(evidence,{lessonDate:latest.date});
    assert.ok(evidence.label?.trim(),'outcome lacks reviewed human-readable label');
    assert.equal(view.label,evidence.label);
    assert.notEqual(view.label,evidence.competencyId,'internal IDs must not be shown to students');
  }
  assert.equal(presentLessonOutcome({competencyId:'t19_example',evidenceAnchor:'lesson',relation:'touched'}).label,'Навык занятия','a missing label must never leak an internal key');
  assert.equal(presentLessonOutcome(latest.outcomes[0],{resolveCompetencyLabel:()=> 'Делимость целых чисел'}).label,'Делимость целых чисел','catalog title should take priority when available');
  assert.ok(homepage.includes('<section class="lesson-summary" id="lesson"'));
  assert.ok(!homepage.includes('class="lesson-summary\''));
  assert.ok(homepage.includes('id="latestLessonStatus"'));
  assert.ok(homepage.includes('atlas-bannova-reference.css'));
});
