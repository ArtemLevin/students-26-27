import test from 'node:test';
import assert from 'node:assert/strict';
import {validateStudentPackage} from '../../../../pipeline/student/contract.mjs';

test('jaroslav_vereschagin satisfies Student Platform v2 contract',()=>{
  const result=validateStudentPackage({root:process.cwd(),studentId:'jaroslav_vereschagin'});
  assert.equal(result.contractVersion,2);
});

import fs from 'node:fs';
import path from 'node:path';

const siteDir=path.resolve('students/jaroslav_vereschagin/site');
const pages=['15.10.26.html','15.10.26-lab.html'];

function mathBlocks(html){
  return [...html.split('<script>')[0].matchAll(/<math\b[^>]*>[\s\S]*?<\/math>/g)].map(match=>match[0]);
}

function assertMathMLStructure(markup){
  const valid=new Set(['math','mrow','mo','mi','mn','mtext','msup','mfrac','msqrt','mtable','mtr','mtd']);
  const stack=[];
  for(const match of markup.matchAll(/<(\/)?([a-z]+)\b[^>]*>/g)){
    const closing=Boolean(match[1]),name=match[2];
    assert.ok(valid.has(name),'unsupported MathML tag: '+name);
    if(closing){
      assert.equal(stack.pop(),name,'MathML nesting must be balanced');
    }else{
      stack.push(name);
    }
  }
  assert.deepEqual(stack,[],'MathML must be completely closed');
  assert.match(markup,/xmlns="http:\/\/www\.w3\.org\/1998\/Math\/MathML"/);
  assert.match(markup,/aria-label="[^"]+"/);
}

test('15 October lesson renders equations and 10 tasks with native MathML',()=>{
  const html=fs.readFileSync(path.join(siteDir,pages[0]),'utf8');
  const maths=mathBlocks(html);
  assert.ok(maths.length>=70,'all lesson equations, expressions and solutions should be MathML');
  for(const block of maths)assertMathMLStructure(block);
  assert.match(html,/<mtable\b/,'system of equations should have a MathML table');
  assert.match(html,/<msup\b/,'squares should have MathML superscripts');
  assert.match(html,/<mfrac\b/,'fractions should use MathML fractions');
  assert.match(html,/<msqrt\b/,'roots should use MathML square roots');
  const raw=html.split('<body>')[1].split('<script>')[0].replace(/<math\b[^>]*>[\s\S]*?<\/math>/g,'').replace(/<[^>]*>/g,' ');
  assert.doesNotMatch(raw,/[xy]²|f\(x\)|x\s*∈/,'rendered lesson text should not have unwrapped math expressions');
  assert.equal((html.match(/<details><summary>Сверить ответ<\/summary><p><math\b/g)||[]).length,10);
});

test('interval lab renders fixed and changing values via MathML',()=>{
  const html=fs.readFileSync(path.join(siteDir,pages[1]),'utf8');
  const maths=mathBlocks(html);
  assert.ok(maths.length>=12,'lab explanation should use native MathML');
  for(const block of maths)assertMathMLStructure(block);
  assert.match(html,/createElementNS\(mns,'math'\)/);
  assert.match(html,/replaceChildren\(numericMath\(x\)\)/);
  assert.match(html,/replaceChildren\(numericMath\(num\)\)/);
  assert.match(html,/innerHTML=mathTemplates\[choice\.value\]\.formula/);
  assert.match(html,/innerHTML=mathTemplates\[choice\.value\]\.answer/);
  assert.doesNotMatch(html,/getElementById\('(?:formula|answer)'\)\.textContent/);
  assert.match(html,/Math\/MathML/,'built-in MathML markup is required');
});

test('editorial navigator retains the existing map contract',()=>{
  const home=fs.readFileSync(path.join(siteDir,'index.html'),'utf8');
  const previousIds=['radialMap','topicIndex','mapStatus','catalogMatchCount','topicDialog',
    'focusHeading','focusOpen','repeatToggle','dialogMaterial','themeToggle','resetMap','topicSearch'];
  for(const id of previousIds)assert.match(home,new RegExp('id="'+id+'"'),id+' must be preserved');
  for(const id of ['evaluatedCount','confidentCount','processCount','masteredCount',
    'menuButton','primaryNav','lessonOutcomes'])assert.match(home,new RegExp('id="'+id+'"'));
  assert.match(home,/href="archive\.html" class="editorial-archive-link"/);
  assert.match(home,/data-atlas-composition="archive"/);
  assert.doesNotMatch(home,/Ксения|Клыкова|xenia_klykova/);
  assert.match(home,/Лёвин Артём Александрович эксклюзивно для Ярослава Верещагина/);
});

test('archive uses only this student registry and preserves full-length tiles',()=>{
  const directory=siteDir;
  const html=fs.readFileSync(path.join(directory,'archive.html'),'utf8');
  const script=fs.readFileSync(path.join(directory,'archive.js'),'utf8');
  const css=fs.readFileSync(path.join(directory,'archive.css'),'utf8');
  assert.match(html,/<h1 id="archiveTitle">Архив/);
  assert.match(script,/import \{LESSONS as PUBLISHED\} from '\.\/lesson-registry\.js'/);
  assert.match(script,/groupLessonsByMonth/);
  assert.match(script,/sort\(\(a,b\)=>b\.date\.localeCompare\(a\.date\)\)/);
  assert.match(script,/equalizeTiles/);
  assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css,/grid-template-columns:minmax\(0,1fr\)/);
  assert.doesNotMatch(css,/webkit-line-clamp|line-clamp/);
  assert.doesNotMatch(html+script,/Ксения|Клыкова|xenia_klykova/);
});

test('new editorial scripts never rewrite student mastery or learning records',()=>{
  const shell=fs.readFileSync(path.join(siteDir,'dashboard-editorial.js'),'utf8');
  const logic=fs.readFileSync(path.join(siteDir,'competency-map.js'),'utf8');
  assert.match(shell,/MutationObserver\(updateStats\)/);
  assert.match(shell,/data-level/);
  assert.match(shell,/import\('\.\/lesson-registry\.js'\)/);
  assert.match(logic,/LEVELS_KEY/);
  assert.match(logic,/REPEAT_KEY/);
  assert.doesNotMatch(shell,/localStorage\.setItem|fetch\(.+method:.+POST/);
});
