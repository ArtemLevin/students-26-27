import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {ROOT} from '../inventory-students.mjs';
import {buildMigrationCandidate} from '../build/candidate.mjs';
import {extractLegacyKtp} from '../legacy/ktp-extractor.mjs';

function repoRoot(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'migration-candidate-'));
  fs.mkdirSync(path.join(root,'students'),{recursive:true});
  return root;
}
function write(file,content=''){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,content);
}
function modernSharedFixture(){
  const root=repoRoot(),studentId='demo_student';
  const base=path.join(root,'students',studentId),site=path.join(base,'site');
  write(path.join(site,'index.html'),'<!doctype html><h1>Demo</h1>');
  write(path.join(site,'design.json'),'{}');
  write(path.join(site,'dashboard.js'),'export {};');
  write(
    path.join(site,'lesson-registry.js'),
    'export const LESSONS='+JSON.stringify([{
      date:'2026-09-30',
      href:'30.09.26.html',
      title:'Прикладные формулы',
      summary:'Формулы и ограничения.',
      topics:['формулы'],
      outcomes:[{competencyId:'text_15',label:'Формулы',level:2,tone:'process'}]
    }],null,2)+';\n'
  );
  write(
    path.join(site,'competency-map-data.js'),
    "window.COMPETENCY_MAP_DATA={groups:[{id:'text',name:'Текстовые задачи',items:[{id:'text_15',title:'Прикладные формулы'}]}]};"
  );
  write(
    path.join(site,'competence-config.js'),
    "window.STUDENT_COMPETENCE_CONFIG={teacherSeed:{text_15:2}};"
  );
  write(
    path.join(site,'30.09.26.html'),
    '<!doctype html><html><head><meta name="description" content="Формулы и ограничения."></head><body><h1>Прикладные формулы</h1><section id="border"></section></body></html>'
  );
  return {root,studentId,base,site};
}
function rollingManifest(){
  return {
    version:1,
    studentId:'demo_student',
    identity:{studentName:'Demo Student',program:'Demo Program'},
    sourceArchitecture:'modern-shared',
    planning:{mode:'rolling',ktpExtraction:null},
    lessonMappings:[{lessonDate:'2026-09-30',ktpMatches:[]}],
    competencyMappings:[{
      lessonDate:'2026-09-30',
      competencyId:'text_15',
      evidenceAnchor:'border',
      relation:'practiced',
      masteryClaim:null,
      confidence:'exact',
      basis:'Direct practice evidence.'
    }],
    preserveMastery:[{
      competencyId:'text_15',
      level:2,
      sourcePath:'site/competence-config.js',
      sourceKind:'teacher-seed',
      confidence:'exact',
      basis:'Repository teacherSeed explicitly stores level 2.'
    }],
    ambiguities:[],
    blockers:[],
    warnings:[]
  };
}
function fixedFixture(){
  const root=repoRoot(),studentId='ktp_student';
  const base=path.join(root,'students',studentId),site=path.join(base,'site');
  write(path.join(site,'index.html'),'<!doctype html><h1>KTP Student</h1>');
  write(path.join(site,'design.json'),'{}');
  const lessons=[{
    id:'lesson-1',
    n:1,
    date:'2026-09-30',
    stage:'Адаптация',
    block:'Диагностика',
    topic:'Старт',
    content:'Разбор стартовой диагностики.',
    outcome:'Фиксирует основные ошибки.',
    homework:'Повторить ошибки.'
  }];
  write(
    path.join(site,'ktp.html'),
    '<!doctype html><script>const LESSONS='+JSON.stringify(lessons)+';</script>'
  );
  write(
    path.join(site,'competency-map-data.js'),
    "window.COMPETENCY_MAP_DATA={groups:[{id:'core',name:'Core',items:[{id:'ktp_skill',title:'Skill'}]}]};"
  );
  write(
    path.join(site,'30.09.26.html'),
    '<!doctype html><html><head><title>Стартовая диагностика</title></head><body><h1>Стартовая диагностика</h1><section id="task"></section></body></html>'
  );
  return {root,studentId,base,site};
}
function fixedManifest(){
  return {
    version:1,
    studentId:'ktp_student',
    identity:{studentName:'KTP Student',program:'Demo Program'},
    sourceArchitecture:'legacy-ktp',
    planning:{
      mode:'fixed',
      ktpExtraction:{
        source:'site/ktp.html',
        preserveOrder:true,
        confidence:'exact',
        reason:'KTP is a strict ordered LESSONS array.'
      }
    },
    lessonMappings:[{
      lessonDate:'2026-09-30',
      ktpMatches:[{
        ktpId:'ktp-001',
        coverage:'complete',
        confidence:'exact',
        reason:'Historical lesson covers the first KTP row.'
      }]
    }],
    competencyMappings:[],
    preserveMastery:[],
    ambiguities:[],
    blockers:[],
    warnings:[]
  };
}

test('rolling candidate is deterministic and performs zero disk writes',()=>{
  const x=modernSharedFixture();
  const manifest=rollingManifest();
  const before=fs.readdirSync(x.base).sort();

  const first=buildMigrationCandidate({
    root:x.root,
    manifest,
    migrationDate:'2026-10-01'
  });
  const second=buildMigrationCandidate({
    root:x.root,
    manifest,
    migrationDate:'2026-10-01'
  });

  assert.equal(first.executable,true);
  assert.deepEqual(first.writes,second.writes);
  assert.deepEqual(first.diagnostics,second.diagnostics);
  assert.equal(first.candidates.contract.planning.mode,'rolling');
  assert.equal(first.candidates.plan.lessons.length,0);
  assert.deepEqual(first.candidates.state.records,{});
  assert.equal(first.candidates.catalog.groups[0].items[0].id,'text_15');
  assert.equal(first.candidates.mastery.levels.text_15.level,2);
  assert.equal(first.candidates.metadataByDate.get('2026-09-30').outcomes[0].relation,'practiced');
  assert.ok(first.writes.some(item=>item.path==='students/demo_student/student-contract.json'));
  assert.ok(first.writes.some(item=>item.path==='students/demo_student/site/data/lessons/2026-09-30.lesson.json'));
  assert.equal(fs.existsSync(path.join(x.base,'student-contract.json')),false);
  assert.deepEqual(fs.readdirSync(x.base).sort(),before);
});

test('fixed candidate preserves KTP order and derives historical state',()=>{
  const x=fixedFixture();
  const candidate=buildMigrationCandidate({
    root:x.root,
    manifest:fixedManifest(),
    migrationDate:'2026-10-01'
  });

  assert.equal(candidate.executable,true);
  assert.equal(candidate.candidates.plan.lessons.length,1);
  assert.equal(candidate.candidates.plan.lessons[0].id,'ktp-001');
  assert.equal(candidate.candidates.plan.lessons[0].result,'Фиксирует основные ошибки.');
  assert.equal(candidate.candidates.plan.lessons[0].check,'Фиксирует основные ошибки.');
  assert.match(candidate.candidates.plan.programVersion,/^legacy-fixed-[0-9a-f]{12}$/);
  assert.deepEqual(candidate.diagnostics.ktp.fieldAliases,[
    {ktpId:'ktp-001',source:'outcome',target:'result'},
    {ktpId:'ktp-001',source:'outcome',target:'check'}
  ]);

  const record=candidate.candidates.state.records['ktp-001'];
  assert.equal(record.status,'done');
  assert.equal(record.actualDate,'2026-09-30');
  assert.equal(record.coverage,'complete');
  assert.deepEqual(record.lessonRefs,['2026-09-30']);

  const metadata=candidate.candidates.metadataByDate.get('2026-09-30');
  assert.deepEqual(metadata.ktpRefs,['ktp-001']);
  assert.deepEqual(metadata.ktpCoverage,[{ktpId:'ktp-001',coverage:'complete'}]);
});

test('ineligible manifest returns a read-only blocked candidate shell',()=>{
  const x=modernSharedFixture();
  const manifest=rollingManifest();
  delete manifest.identity;

  const candidate=buildMigrationCandidate({
    root:x.root,
    manifest,
    migrationDate:'2026-10-01'
  });
  assert.equal(candidate.executable,false);
  assert.deepEqual(candidate.writes,[]);
  assert.equal(candidate.candidates,null);
  assert.ok(candidate.reviewItems.some(item=>item.type==='identity-missing'));
});

test('KTP extractor fails closed when semantic fields are absent',()=>{
  assert.throws(
    ()=>extractLegacyKtp({
      studentId:'demo',
      source:'<script>const LESSONS=[{"date":"2026-09-30","stage":"S","block":"B","topic":"T","content":"C","homework":"H"}];</script>'
    }),
    /has no result\/outcome\/check text/
  );
});

test('real Danil legacy KTP extracts all 70 rows without semantic invention',()=>{
  const file=path.join(ROOT,'students','danil_kichuk','site','ktp.html');
  const result=extractLegacyKtp({
    studentId:'danil_kichuk',
    source:fs.readFileSync(file,'utf8'),
    sourcePath:'site/ktp.html'
  });
  assert.equal(result.plan.lessons.length,70);
  assert.equal(result.plan.lessons[0].id,'ktp-001');
  assert.equal(result.plan.lessons.at(-1).id,'ktp-070');
  assert.ok(result.fieldAliases.some(item=>item.source==='outcome'&&item.target==='check'));
});

test('real Jaroslav legacy KTP extracts all 72 rows and preserves source stage IDs',()=>{
  const file=path.join(ROOT,'students','jaroslav_gavrilov','site','ktp.html');
  const result=extractLegacyKtp({
    studentId:'jaroslav_gavrilov',
    source:fs.readFileSync(file,'utf8'),
    sourcePath:'site/ktp.html'
  });
  assert.equal(result.plan.lessons.length,72);
  assert.equal(result.plan.lessons[0].id,'ktp-001');
  assert.equal(result.plan.lessons.at(-1).id,'ktp-072');
  assert.equal(result.plan.lessons[0].stageId,'layer3');
  assert.ok(result.fieldAliases.some(item=>item.source==='check'&&item.target==='result'));
});
