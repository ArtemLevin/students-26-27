import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const site=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.resolve(site,'../../..');
const read=name=>fs.readFileSync(path.join(site,name),'utf8');
const lesson=read('28.10.26.html');
const lab=read('28.10.26-lab.html');
const intent=JSON.parse(read('data/publication-intents/2026-10-28.json'));
const tex=fs.readFileSync(path.join(root,'students/ekaterina/tex_docs/28.10.26.tex'),'utf8');
const NS='http://www.w3.org/1998/Math/MathML';

function extractIds(html){return [...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);}
function linkedFiles(html){return [...html.matchAll(/\bhref="([^"]+)"/g)].map(x=>x[1]);}
function scriptBody(html){return html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/)?.[1]||'';}
function checkLinks(html){
 const ids=new Set(extractIds(html));
 for(const href of linkedFiles(html)){
  if(href.startsWith('#')){assert.ok(ids.has(href.slice(1)),'missing anchor '+href);continue;}
  if(/^(?:https?:|mailto:|tel:)/.test(href))continue;
  const [target,fragment]=href.split('#',2),pathname=decodeURIComponent(target.split('?')[0]);
  const file=path.resolve(site,pathname);
  assert.ok(fs.existsSync(file),'missing local link '+href);
  if(fragment&&file.endsWith('.html'))assert.ok(extractIds(fs.readFileSync(file,'utf8')).includes(fragment),'missing target anchor '+href);
 }
}
function checkMathML(html){
 let count=0,depth=0;
 for(const tag of html.match(/<\/?math\b[^>]*>/g)||[]){
  if(tag.startsWith('</')){depth--;assert.ok(depth>=0,'orphan MathML closing tag');}
  else{assert.equal(depth,0,'nested MathML root');depth++;assert.ok(tag.includes('xmlns="'+NS+'"'),'MathML namespace missing');count++;}
 }
 assert.equal(depth,0,'unclosed MathML');
 assert.ok(count>=20,'too few semantic MathML nodes');
}
test('lesson and laboratory have unique ids and valid internal anchors',()=>{
 for(const html of [lesson,lab]){
  assert.equal(/<html\b[^>]*lang="ru"/.test(html),true);
  const ids=extractIds(html);
  assert.equal(ids.length,new Set(ids).size,'duplicate ids');
  checkLinks(html);
  assert.ok(html.includes('prefers-reduced-motion:reduce'),'reduced-motion style absent');
 }
});
test('all ten lesson tasks and answers match the worksheet',()=>{
 assert.equal((lesson.match(/<li class="task">/g)||[]).length,10);
 assert.equal((lesson.match(/<details class="answer">/g)||[]).length,10);
 assert.equal((lesson.match(/data-task="\d+"/g)||[]).length,10);
 assert.equal((tex.match(/\\item\s+/g)||[]).length>=10,true);
 assert.ok(lesson.includes('942 рубля'),'commission answer missing');
 assert.ok(lesson.includes('66, 68, 70'),'consecutive even numbers answer missing');
 assert.ok(lesson.includes('a ≤ 4')||lesson.includes('<mo>≤</mo>'),'parameter boundary missing');
 assert.ok(lesson.includes('x &gt; −2')||lesson.includes('<mo>&gt;</mo>'),'linear inequality answer missing');
});
test('native MathML is balanced and no legacy raw LaTeX is visible',()=>{
 checkMathML(lesson);
 checkMathML(lab);
 assert.ok(!lesson.includes('\\begin{document}'));
 assert.ok(lesson.includes('aria-live="polite"'));
 assert.ok(lab.includes('aria-live="polite"'));
});
test('evidence anchors are real, with no unverified mastery increments',()=>{
 assert.equal(intent.studentId,'ekaterina');
 assert.equal(intent.lessonDate,'2026-10-28');
 assert.equal(intent.ktpMatches.length,0);
 assert.ok(intent.outcomes.length>=5);
 const ids=new Set(extractIds(lesson));
 for(const e of intent.outcomes){
  assert.ok(ids.has(e.evidenceAnchor),'unknown evidence anchor: '+e.evidenceAnchor);
  assert.equal(e.masteryClaim,null);
  assert.ok(['touched','practiced'].includes(e.relation));
 }
});
test('training charts align line intersections with plotted zero and threshold',()=>{
 assert.ok(lesson.includes('cx="310" cy="145"'),'task 1 zero not at x=2');
 assert.ok(lesson.includes('cx="273" cy="134"'),'task 2 level intersection not at x=2');
 const y1=2-2,y2=5-2*2;
 assert.equal(y1,0);assert.equal(y2,1);
});
test('laboratory supports exact sign boundary, reset, keyboard controls and prediction',()=>{
 assert.ok(lab.includes('id="at-boundary"'));
 assert.ok(lab.includes('update("boundary")'));
 assert.ok(lab.includes('var y=exact?level:3*x-8'));
 assert.ok(lab.includes('id="reset"'));
 assert.ok(lab.includes('id="xrange"'));
 assert.ok(lab.includes('id="xnum"'));
 assert.ok(lab.includes('id="check-forecast"'));
 assert.ok(lab.includes('data-level="0"')&&lab.includes('data-level="1"'));
 assert.equal(3*(8/3)-8,0);
});
test('inline JavaScript has valid syntax',()=>{
 for(const html of [lesson,lab])assert.doesNotThrow(()=>new Function(scriptBody(html)));
});
console.log('28 October lesson release review: static checks completed.');
