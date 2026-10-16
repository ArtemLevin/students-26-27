import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {LESSONS,validateLessonRegistry} from '../lesson-registry.js';

const site=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>fs.readFileSync(path.join(site,name),'utf8');
const index=read('index.html'),archive=read('archive.html');
const ids=source=>[...source.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
const student=path.resolve(site,'..');
test('editorial visual contract and standalone archive preserve the student identity',()=>{
  const d=JSON.parse(read('design.json'));
  assert.equal(d.composition,'archive');assert.equal(d.accent,'graphite');
  assert.equal(d.geometry,'orthogonal');
  for(const source of [index,archive])assert.match(source,/Ксени[яи] Васильченко/);
  assert.match(index,/Лёвин Артём Александрович эксклюзивно для Ксении Васильченко/);
  assert.match(archive,/Лёвин Артём Александрович эксклюзивно для Ксении Васильченко/);
  assert.match(index,/href="archive.html"/);
  assert.match(index,/Все занятия <span>по месяцам<\/span>/);
  assert.match(archive,/Архив <em>занятий<\/em>/);
  assert.doesNotMatch(index+archive,/xenia_klykova|Клыкова|ЕГЭ|t19_divisibility/);
});
test('canonical lesson registry is the only archive source',()=>{
  assert.equal(validateLessonRegistry(LESSONS).count,LESSONS.length);
  assert.ok(LESSONS.length>=11);
  assert.equal(LESSONS[0].date,'2026-10-15');
  const js=read('archive.js');
  assert.match(js,/import \{LESSONS\} from '\.\/lesson-registry\.js'/);
  assert.match(js,/groupLessonsByMonth\(LESSONS\)/);
  assert.match(js,/equalizeTiles\(\)/);
  assert.doesNotMatch(js,/LESSON_0710|composeLessons|xenia_klykova/);
  for(const lesson of LESSONS){
    assert.ok(fs.existsSync(path.resolve(site,lesson.href)),lesson.href);
    for(const uri of Object.values(lesson.materials||{})){
      if(typeof uri==='string')assert.ok(fs.existsSync(path.resolve(site,uri)),uri);
    }
  }
});
test('original radial map contract and persisted state identifiers remain stable',()=>{
  const source=read('competency-map.js'),legacy=read('competency-map-data.js');
  new vm.Script(source);new vm.Script(legacy);
  assert.equal(ids(index).length,new Set(ids(index)).size);
  for(const id of ['radialMap','topicCatalog','topicSearch','topicDialog','resetConfirmed',
    'statCovered','statCoverage','statRepeat','statTotal','centerCoverage','centerMeta',
    'themeToggle','themeToggleMobile','dialogTitle','dialogHistory','dialogLevel',
    'mapTooltip','nextFocus','repeatButton'])assert.ok(ids(index).includes(id),id);
  assert.match(index,/competency-map-lesson-20261015\.js/);
  assert.match(index,/competency-map\.js/);
  assert.match(index,/atlas-editorial\.js/);
  assert.doesNotMatch(index,/data-competency-id="[^"]*xenia_klykova/);
});
test('archive tiles have responsive grid and no clipping or truncation CSS',()=>{
  const css=read('archive.css');
  assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/@media\(max-width:1030px\)/);
  assert.match(css,/@media\(max-width:700px\)/);
  assert.match(css,/grid-auto-rows:var\(--archive-card-height,auto\)/);
  assert.doesNotMatch(css,/line-clamp|text-overflow:ellipsis/);
  assert.match(css,/\.archive-tile-title\{[^}]*overflow:visible/s);
  assert.match(css,/\.archive-tile-subtitle\{[^}]*white-space:normal/s);
  assert.match(read('atlas-editorial.css'),/prefers-reduced-motion/);
});
test('links and app scripts resolve without changing any student skill source',()=>{
  for(const [name,source] of [['index.html',index],['archive.html',archive]]){
    for(const match of source.matchAll(/\b(?:href|src)="([^"]+)"/g)){
      const href=match[1];
      if(/^(?:https?:|data:|mailto:|#)/i.test(href))continue;
      assert.ok(fs.existsSync(path.resolve(site,href.split(/[?#]/,1)[0])),name+' -> '+href);
    }
  }
  const module=read('atlas-editorial.js');
  assert.match(module,/data\.meta\.student/);
  assert.match(module,/item\.baselineLevel/);
  assert.doesNotMatch(module,/baselineLevel\s*=|masteryClaim\s*=/);
});
