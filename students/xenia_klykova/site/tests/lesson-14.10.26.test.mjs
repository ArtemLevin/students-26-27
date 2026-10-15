import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

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
  assert.ok(f(-2)===0);assert.ok(f(1)===0);
  assert.ok(f(2)>0);assert.ok(f(4)>0);
  assert.equal(2*1.5-3,0);
  // The high-degree case has two forbidden points but only one negative interval.
  const big=x=>Math.pow(x-1,41)*(x*x+3)/
    (Math.pow(4*x-10,19)*Math.pow(x-10,24));
  assert.ok(big(1.5)<0);assert.ok(big(2.8)>0);
});

test('v2 publisher dry-run accepts the reviewed 14 October intent',()=>{
  const run=spawnSync(process.execPath,[
    'scripts/publish-lesson.mjs','xenia_klykova','14.10.26',
    '--intent','students/xenia_klykova/site/data/publication-intents/2026-10-14.json',
    '--dry-run'
  ],{cwd:root,encoding:'utf8'});
  assert.equal(run.status,0,String(run.stderr||run.stdout));
  assert.ok(run.stdout.includes('transactional-v2'),run.stdout);
  assert.ok(run.stdout.includes('"executable": true'),run.stdout);
});

test('lesson equations, practice and answers are fully semantic MathML',()=>{
  assert.ok((page.match(/<math\b/g)||[]).length>=90);
  assert.ok((lab.match(/<math\b/g)||[]).length>=45);
  assert.ok((page.match(/<msup>/g)||[]).length>=40);
  assert.ok((page.match(/<mfrac>/g)||[]).length>=5);
  assert.ok(lab.includes('<msup>')&&lab.includes('<mfrac>'));
  assert.ok(page.includes('xmlns="http://www.w3.org/1998/Math/MathML"'));
  assert.ok(lab.includes('14.10.26-mathml.js'));
  const tasks=page.match(/<ol class="tasklist"[\s\S]+?<\/ol>/)?.[0]||'';
  const taskNodes=[...tasks.matchAll(/<li>([\s\S]*?)<\/li>/g)];
  assert.equal(taskNodes.length,10);
  for(const [i,node] of taskNodes.entries())assert.ok(node[1].includes('<math '),'practice '+(i+1)+' needs MathML');
  const answerList=page.match(/<details class="answers">[\s\S]*?<ol>([\s\S]*?)<\/ol>/)?.[1]||'';
  const answers=[...answerList.matchAll(/<li>([\s\S]*?)<\/li>/g)];
  assert.equal(answers.length,10);
  for(const [i,answer] of answers.entries())assert.ok(answer[1].includes('<math '),'answer '+(i+1)+' needs MathML');
  for(const html of [page,lab]){
    assert.ok(!/<div class="eq">[^(<)]/.test(html),'raw math inside equation block');
    for(const [,fragment] of html.matchAll(/<math\b[^>]*>([\s\S]*?)<\/math>/g)){
      assert.ok(fragment.includes('<mrow>')||fragment.includes('<mn>')||fragment.includes('<mi>')||fragment.includes('<mo>'));
      assert.ok(!fragment.includes('<span')&&!fragment.includes('<div'));
    }
  }
});
