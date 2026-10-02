import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {discoverHistoricalLessons} from '../legacy/discover-lessons.mjs';
import {inspectStudent,ROOT} from '../inventory-students.mjs';
import {validateStudentMigrationManifest} from '../manifest.mjs';

function write(file,content=''){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,content);
}
function fixture(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'historical-lessons-'));
  const studentId='demo_student';
  const site=path.join(root,'students',studentId,'site');
  write(path.join(site,'index.html'),'<!doctype html>');
  write(path.join(site,'design.json'),'{}');
  write(path.join(site,'dashboard.js'),'export {};');
  write(path.join(site,'30.09.26.html'),'<!doctype html><h1>Recent</h1>');
  write(path.join(site,'lessons','20-05-26.html'),'<!doctype html><h1>Nested</h1>');
  write(
    path.join(site,'lesson-registry.js'),
    'export const LESSONS='+JSON.stringify([
      {date:'2026-09-30',href:'30.09.26.html',title:'Recent'},
      {date:'2026-05-20',href:'lessons/20-05-26.html',title:'Nested'}
    ])+';\n'
  );
  return {root,studentId,site};
}

test('discovery unions registry and recursive filesystem and preserves nested href',()=>{
  const x=fixture();
  write(path.join(x.site,'lessons','20-05-26-lab.html'),'<div>lab</div>');
  const report=discoverHistoricalLessons(x);
  assert.equal(report.lessons.length,2);
  assert.equal(report.byDate.get('2026-05-20').href,'lessons/20-05-26.html');
  assert.deepEqual(report.byDate.get('2026-05-20').sources,['filesystem','registry']);
  assert.equal(report.byDate.has('2026-05-20-lab'),false);
  assert.deepEqual(report.diagnostics,[]);
});

test('discovery accepts a frozen literal lesson registry without executing registry code',()=>{
  const x=fixture();
  const registry=fs.readFileSync(path.join(x.site,'lesson-registry.js'),'utf8');
  const literal=registry.match(/export const LESSONS=(\[[\s\S]*\]);/)?.[1];
  assert.ok(literal);
  write(
    path.join(x.site,'lesson-registry.js'),
    'export const LESSONS=Object.freeze('+literal+');\n'
  );
  const report=discoverHistoricalLessons(x);
  assert.equal(report.lessons.length,2);
  assert.deepEqual(report.diagnostics,[]);
});

test('lesson discovery still rejects arbitrary computed LESSONS wrappers',()=>{
  const x=fixture();
  write(
    path.join(x.site,'lesson-registry.js'),
    "export const LESSONS=buildLessons([{date:'2026-09-30',href:'30.09.26.html'}]);\n"
  );
  assert.throws(
    ()=>discoverHistoricalLessons(x),
    /LESSONS must be an array literal/
  );
});

test('filesystem-only dated lesson remains part of historical coverage',()=>{
  const x=fixture();
  write(path.join(x.site,'lessons','21-05-26.html'),'<!doctype html><h1>Unregistered</h1>');
  const report=discoverHistoricalLessons(x);
  assert.equal(report.lessons.length,3);
  assert.equal(report.byDate.get('2026-05-21').href,'lessons/21-05-26.html');
  assert.deepEqual(report.diagnostics,[{
    type:'unregistered-lesson',
    date:'2026-05-21',
    href:'lessons/21-05-26.html'
  }]);
});

test('missing registry target fails closed',()=>{
  const x=fixture();
  write(
    path.join(x.site,'lesson-registry.js'),
    "export const LESSONS=[{date:'2026-09-30',href:'missing.html'}];\n"
  );
  assert.throws(
    ()=>discoverHistoricalLessons(x),
    /registry href target is missing/
  );
});

test('duplicate date pointing at different files fails closed',()=>{
  const x=fixture();
  write(path.join(x.site,'lessons','30-09-26.html'),'<!doctype html><h1>Duplicate</h1>');
  assert.throws(
    ()=>discoverHistoricalLessons(x),
    /multiple historical lesson HTML files/
  );
});

test('unsafe registry traversal is rejected before reading target',()=>{
  const x=fixture();
  write(
    path.join(x.site,'lesson-registry.js'),
    "export const LESSONS=[{date:'2026-09-30',href:'../30.09.26.html'}];\n"
  );
  assert.throws(
    ()=>discoverHistoricalLessons(x),
    /unsafe path segments/
  );
});

test('manifest cannot omit a nested historical lesson',()=>{
  const x=fixture();
  const manifest={
    version:1,
    studentId:x.studentId,
    identity:{studentName:'Demo Student',program:'Demo Program'},
    sourceArchitecture:'modern-shared',
    planning:{mode:'rolling',ktpExtraction:null},
    lessonMappings:[{lessonDate:'2026-09-30',ktpMatches:[]}],
    competencyMappings:[],
    preserveMastery:[],
    ambiguities:[],
    blockers:[],
    warnings:[]
  };
  assert.throws(
    ()=>validateStudentMigrationManifest({root:x.root,manifest}),
    /missing historical lesson classification for 2026-05-20/
  );
});


test('real Nikol frozen registry is readable and covers every dated lesson HTML',()=>{
  const report=discoverHistoricalLessons({root:ROOT,studentId:'nikol_sarkisyants'});
  const inventory=inspectStudent(ROOT,'nikol_sarkisyants');
  assert.equal(report.lessons.length,22);
  assert.equal(inventory.counts.lessonHtml,22);
  assert.deepEqual(report.diagnostics,[]);
});

test('real Timofey history includes nested lessons and inventory sees the same dated HTML surface',()=>{
  const report=discoverHistoricalLessons({root:ROOT,studentId:'timofey'});
  assert.ok(report.lessons.length>=26);
  assert.equal(report.byDate.get('2026-05-20')?.href,'lessons/20-05-26.html');
  assert.ok(report.byDate.get('2026-05-20')?.sources.includes('registry'));
  assert.ok(report.byDate.get('2026-05-20')?.sources.includes('filesystem'));
  const inventory=inspectStudent(ROOT,'timofey');
  assert.equal(inventory.counts.lessonHtml,report.lessons.length);
});
