import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {chooseFingerprint,createStudent,displayNameFromSlug,parseArgs,validateSlug} from '../scripts/create-student.mjs';

function tempRepo(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'levin-atlas-scaffold-'));
  fs.mkdirSync(path.join(root,'students','existing','site'),{recursive:true});
  fs.mkdirSync(path.join(root,'design-system'),{recursive:true});
  fs.writeFileSync(path.join(root,'students','existing','site','design.json'),JSON.stringify({
    system:'LEVIN_ATLAS',version:'1.0',composition:'editorial',accent:'burgundy',
    density:'airy',geometry:'mixed',typography:'editorial',motion:'calm',
    signature:['overscale-type','asymmetric-margins','editorial-rules']
  },null,2));
  fs.writeFileSync(path.join(root,'design-system','STUDENT_ROSTER.md'),[
    '# Roster','',
    '| Student | Composition | Accent | Density | Geometry | Typography | Motion |',
    '|---|---|---|---|---|---|---|',
    '| existing | editorial | burgundy | airy | mixed | editorial | calm |','',
    'The roster is a deliberate diversity matrix. Change at least three axes when a newly created page is too close to a recent neighbor.',''
  ].join('\n'));
  return root;
}
test('slug safety',()=>{
  assert.equal(validateSlug('ivan_ivanov'),'ivan_ivanov');
  assert.throws(()=>validateSlug('../ivan'),/Slug must use/);
  assert.throws(()=>validateSlug('Ivan Ivanov'),/Slug must use/);
  assert.equal(displayNameFromSlug('ivan_ivanov'),'Ivan Ivanov');
});
test('CLI parsing',()=>{
  const x=parseArgs(['ivan_ivanov','--name','Иван Иванов','--composition','blueprint','--accent','forest','--dry-run','--no-verify']);
  assert.equal(x.slug,'ivan_ivanov');assert.equal(x.name,'Иван Иванов');assert.equal(x.composition,'blueprint');assert.equal(x.accent,'forest');assert.equal(x.dryRun,true);assert.equal(x.verify,false);
});
test('selector avoids a complete duplicate under overrides',()=>{
  const existing=[{data:{composition:'editorial',accent:'burgundy',density:'airy',geometry:'mixed',typography:'editorial',motion:'calm',signature:['overscale-type','asymmetric-margins','editorial-rules']}}];
  const x=chooseFingerprint(existing,{composition:'editorial',accent:'burgundy'});
  assert.equal(x.composition,'editorial');assert.equal(x.accent,'burgundy');
  assert.notDeepEqual([x.density,x.typography,x.motion],['airy','editorial','calm']);
});
test('dry-run writes nothing',()=>{
  const root=tempRepo();
  const result=createStudent({root,slug:'new_student',name:'Новый Ученик',dryRun:true,verify:false});
  assert.equal(result.dryRun,true);assert.equal(fs.existsSync(path.join(root,'students','new_student')),false);
});
test('scaffolder writes the contract files and refuses overwrite',()=>{
  const root=tempRepo();
  const result=createStudent({root,slug:'ivan_ivanov',name:'Иван Иванов',grade:'10 класс',program:'ЕГЭ, профильная математика',verify:false});
  const site=path.join(root,'students','ivan_ivanov','site');
  const design=JSON.parse(fs.readFileSync(path.join(site,'design.json'),'utf8'));
  const html=fs.readFileSync(path.join(site,'index.html'),'utf8');
  const roster=fs.readFileSync(path.join(root,'design-system','STUDENT_ROSTER.md'),'utf8');
  assert.equal(result.slug,'ivan_ivanov');assert.equal(design.system,'LEVIN_ATLAS');
  assert.ok(html.includes('data-atlas-composition="'+design.composition+'"'));
  assert.ok(html.includes('../../../design-system/scaffold.css'));
  assert.ok(roster.includes('ivan_ivanov — Иван Иванов'));
  assert.throws(()=>createStudent({root,slug:'ivan_ivanov',verify:false}),/already exists/);
});
