import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {LESSONS} from '../lesson-registry.js';

const site=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const student=path.dirname(site);
const html=fs.readFileSync(path.join(site,'17.10.26.html'),'utf8');
const tex=fs.readFileSync(path.join(student,'tex_docs/17.10.26.tex'),'utf8');
const metadata=JSON.parse(fs.readFileSync(path.join(site,'data/lessons/2026-10-17.lesson.json'),'utf8'));
const intent=JSON.parse(fs.readFileSync(path.join(site,'data/publication-intents/2026-10-17.json'),'utf8'));
const practice=JSON.parse(fs.readFileSync(path.join(site,'data/practice-publications/2026-10-17.json'),'utf8'));
const catalog=JSON.parse(fs.readFileSync(path.join(site,'data/competency-catalog.json'),'utf8'));
const current=LESSONS.find(item=>item.date==='2026-10-17');
const close=(a,b)=>Math.abs(a-b)<1e-10;
const roots=(a,b,c,target)=>{const D=b*b-4*a*(c-target);return [(-b-Math.sqrt(D))/(2*a),(-b+Math.sqrt(D))/(2*a)].sort((x,y)=>x-y)};

test('one canonical 17 October lesson and all older lessons retained',()=>{
  assert.equal(LESSONS.filter(item=>item.date==='2026-10-17').length,1);
  assert.ok(LESSONS[0].date>='2026-10-17','17 October lesson must remain accessible as new lessons are added');
  assert.ok(LESSONS.some(item=>item.date==='2026-10-15'));
  assert.deepEqual([...LESSONS].map(item=>item.date),[...LESSONS].map(item=>item.date).sort().reverse());
  assert.equal(current.href,'17.10.26.html');
  assert.deepEqual(current.materials,metadata.materials);
  assert.ok(metadata.materials.pdf && metadata.materials.tex);
  assert.equal(metadata.outcomes.length,9);
});
test('verified competency evidence and practice decisions preserve mastery',()=>{
  const ids=new Set(catalog.groups.flatMap(group=>group.items.map(item=>item.id)));
  const anchors=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
  assert.equal(anchors.size,[...html.matchAll(/\bid="([^"]+)"/g)].length,'unique ids');
  for(const outcome of intent.outcomes){
    assert.ok(ids.has(outcome.competencyId),outcome.competencyId);
    assert.ok(anchors.has(outcome.evidenceAnchor),outcome.evidenceAnchor);
    assert.equal(outcome.confidence,'exact');
    assert.equal(outcome.decision,'apply');
    assert.equal(outcome.masteryClaim,null);
    const reviewed=practice.outcomes.find(item=>item.competencyId===outcome.competencyId&&item.evidenceAnchor===outcome.evidenceAnchor&&item.relation===outcome.relation);
    assert.equal(reviewed?.practiceDisposition,'manual');
  }
  assert.ok(html.includes('Алгоритм самостоятельного решения'));
  assert.ok(html.includes('40 мин'));
});
test('source parity, MathML semantics, local assets, visible practice',()=>{
  assert.match(tex,/Повторение задач первой части/);
  assert.match(tex,/Путь А/);
  assert.equal((html.match(/class="exercise"/g)||[]).length,10);
  assert.ok((html.match(/<math\b/g)||[]).length>=150,'all mathematical expressions including narrative values use MathML');
  const article=html.split('<article class="article">')[1]?.split('</article>')[0]||'';
  const nonMathProse=article.replace(/<math\b[^>]*>[\s\S]*?<\/math>/g,'').replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/g,'').replace(/<[^>]+>/g,' ');
  assert.doesNotMatch(nonMathProse,/(?:[√²³⅓⅔]|\d+[,/]\d+|(?:[a-zA-Z])\s*[=<>≥≤≠+−]\s*\d+)/u,'raw mathematical notation must never appear outside MathML');
  assert.doesNotMatch(article,/<(?:sup|sub)\b/,'avoid HTML superscripts for mathematics');
  const svg=html.split('<svg id="heightGraph"')[1]?.split('</svg>')[0]||'';
  assert.equal((svg.match(/<foreignObject\b/g)||[]).length,6,'every graph tick is MathML');
  assert.equal((svg.match(/<math\b/g)||[]).length,6);
  assert.equal((svg.match(/<text\b/g)||[]).length,0,'graph mathematical labels do not use plain SVG text');
  assert.match(html,/<output id="graphResult"[^>]*>[\s\S]*?<math\b/);
  assert.doesNotMatch(html,/labOutput\.textContent\s*=/,'live graph must update MathML nodes instead of replacing them with text');
  assert.equal((html.match(/<span class="math\b/g)||[]).length,0);
  assert.ok((html.match(/<mfrac>/g)||[]).length>=8);
  assert.ok((html.match(/<msup>/g)||[]).length>=6);
  assert.ok((html.match(/<msub>/g)||[]).length>=5);
  assert.ok((html.match(/<msqrt>/g)||[]).length>=3);
  assert.ok(html.includes('xmlns="http://www.w3.org/1998/Math/MathML"'));
  assert.ok(html.includes('prefers-reduced-motion'));
  for(const [,reference] of html.matchAll(/(?:href|src)="([^"]+)"/g)){
    if(reference.startsWith('#')){
      assert.ok(html.includes('id="'+reference.slice(1)+'"'),reference);
      continue;
    }
    if(/^(?:data:|mailto:|https?:)/.test(reference))continue;
    const clean=reference.split(/[?#]/,1)[0];
    assert.ok(fs.existsSync(path.resolve(site,clean)),'missing local asset '+reference);
  }
});
test('independent arithmetic audit of source examples and all 10 answers',()=>{
  assert.ok(close(0.5*6*0.5,1.5));
  assert.equal((-1*8+4*(-6)),-32);
  assert.ok(close(.62-.38,.24));
  assert.ok(close(.6*.4+.6*.1+.2*.4,.38));
  assert.ok(close(1*.10+4*.05+6*.08,.78));
  assert.equal(25**(7-1),Math.sqrt(125**(7+1)));
  let r=roots(-10,26,1.2,10);
  assert.ok(close(r[0],.4)&&close(r[1],2.2)&&close(r[1]-r[0],1.8));
  assert.ok(close(240/(72-12)-240/72,2/3));
  assert.ok(close(.5*6*6*.5,9));
  assert.equal((-3*6+2*(-4)),-26);
  assert.ok(close(.72-.28,.44));
  assert.ok(close(.15+4*.10+6*.05,.85));
  assert.ok(close(.5*.4+.5*.2+.3*.4,.42));
  r=roots(-5,20,1,16);assert.ok(close(r[1]-r[0],2));
  r=roots(-10,30,2,22);assert.ok(close(r[1]-r[0],1));
  assert.ok(close(240/(80-16)-240/80,.75));
});
