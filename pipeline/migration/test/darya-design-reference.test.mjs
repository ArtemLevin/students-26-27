import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {ROOT} from '../inventory-students.mjs';

const SNAPSHOT_PATH=path.join(
  ROOT,
  'pipeline',
  'migration',
  'design-references',
  'darya_savenkova.json'
);

function referenceFiles(){
  const roots=[
    path.join(ROOT,'students','darya_savenkova','site'),
    path.join(ROOT,'students','darya_savenkova','images')
  ];
  const out=[];
  const walk=directory=>{
    for(const entry of fs.readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en'))){
      const file=path.join(directory,entry.name);
      if(entry.isDirectory()){
        walk(file);
        continue;
      }
      if(!entry.isFile())continue;
      const relative=path.relative(ROOT,file).replaceAll('\\','/');
      if(relative.startsWith('students/darya_savenkova/site/data/'))continue;
      if(relative.startsWith('students/darya_savenkova/site/tests/'))continue;
      if(relative==='students/darya_savenkova/site/lesson-registry.js')continue;
      out.push(relative);
    }
  };
  for(const root of roots)walk(root);
  return out.sort((a,b)=>a.localeCompare(b,'en'));
}

function sha256(file){
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

test('Darya design-reference surface matches the approved migration snapshot',()=>{
  const snapshot=JSON.parse(fs.readFileSync(SNAPSHOT_PATH,'utf8'));
  assert.equal(snapshot.version,1);
  assert.equal(snapshot.studentId,'darya_savenkova');
  assert.equal(snapshot.role,'student-dashboard-design-reference');
  assert.ok(Array.isArray(snapshot.files));
  assert.ok(snapshot.files.length>=8);

  const required=[
    'students/darya_savenkova/site/index.html',
    'students/darya_savenkova/site/design.json',
    'students/darya_savenkova/site/competency-map.css',
    'students/darya_savenkova/site/competency-map.js',
    'students/darya_savenkova/site/competency-map-data.js',
    'students/darya_savenkova/site/lesson-14.09.26-progress.js',
    'students/darya_savenkova/site/14.09.26.html',
    'students/darya_savenkova/site/14.09.26-lab.html'
  ];
  const paths=snapshot.files.map(item=>item.path).sort((a,b)=>a.localeCompare(b,'en'));
  assert.equal(new Set(paths).size,paths.length);
  assert.deepEqual(paths,referenceFiles());
  for(const value of required)assert.ok(paths.includes(value),value);

  for(const item of snapshot.files){
    assert.match(item.path,/^students\/darya_savenkova\/(?:site|images)\//);
    assert.equal(item.path.includes('/site/data/'),false);
    assert.equal(item.path.includes('/site/tests/'),false);
    assert.notEqual(item.path,'students/darya_savenkova/site/lesson-registry.js');
    const file=path.join(ROOT,...item.path.split('/'));
    assert.ok(fs.existsSync(file),'missing design-reference file: '+item.path);
    assert.equal(sha256(file),item.sha256,'design-reference drift: '+item.path);
  }
});
