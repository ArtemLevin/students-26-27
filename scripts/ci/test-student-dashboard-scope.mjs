import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyStudentDashboardChanges,isDashboardRelevantPath} from './student-dashboard-scope.mjs';

test('dashboard and production contract changes are heavy',()=>{
  for(const file of [
    'students/volodia_khachaturian/site/lesson-registry.js',
    'students/xenia_klykova/chemistry/site/index.html',
    'students/volodia_khachaturian/index.html',
    'students/nastya_pavlova/competency-map-data.js',
    'students/nikol_sarkisyants/student-contract.json',
    'shared/student-dashboard/dashboard-core.js',
    'shared/practice/validate-configs.mjs',
    'pipeline/practice/run-stage-04.mjs',
    'pipeline/lessons/lesson-registry.mjs',
    'pipeline/student/contract.mjs',
    'pipeline/migration/inventory-students.mjs',
    'pipeline/prompts/map_lesson_to_ktp.md',
    'pipeline/schemas/student-contract-v2.schema.json',
    'pipeline/prompts/web_page_design.md',
    'design-system/fingerprint.schema.json',
    'scripts/create-student.mjs',
    'scripts/publish-lesson.mjs',
    'scripts/student.mjs',
    '.github/workflows/student-dashboard-tests.yml'
  ])assert.equal(isDashboardRelevantPath(file),true,file);
});

test('material-only and unrelated documentation changes use the lightweight gate',()=>{
  for(const file of [
    'students/sofya_khomenko/tex_docs/29.09.26.tex',
    'students/sofya_khomenko/pdf_docs/29.09.26.pdf',
    'students/sofya_khomenko/posters/29.09.26.png',
    'README.md',
    'docs/teaching-notes.md'
  ])assert.equal(isDashboardRelevantPath(file),false,file);
});

test('classifier normalizes separators, deduplicates and reports relevant paths',()=>{
  const result=classifyStudentDashboardChanges([
    '.\\students\\volodia_khachaturian\\site\\dashboard.js',
    'students/volodia_khachaturian/site/dashboard.js',
    'students/volodia_khachaturian/tex_docs/29.09.26.tex',
    ''
  ]);
  assert.equal(result.heavy,true);
  assert.deepEqual(result.relevant,['students/volodia_khachaturian/site/dashboard.js']);
  assert.deepEqual(result.all,[
    'students/volodia_khachaturian/site/dashboard.js',
    'students/volodia_khachaturian/tex_docs/29.09.26.tex'
  ]);
});

test('material-only change set does not request heavy regression',()=>{
  assert.deepEqual(
    classifyStudentDashboardChanges([
      'students/darya_savenkova/tex_docs/29.09.26.tex',
      'students/darya_savenkova/pdf_docs/29.09.26.pdf'
    ]).heavy,
    false
  );
});
