import test from 'node:test';
import assert from 'node:assert/strict';
import {assertMigrationWriteSet} from '../write-policy.mjs';

function write(path,kind='create'){return {kind,path,content:''};}

test('canonical migration targets are accepted',()=>{
  const studentId='demo_student';
  const result=assertMigrationWriteSet({
    studentId,
    writes:[
      write('students/demo_student/student-contract.json'),
      write('students/demo_student/site/data/ktp-plan.json'),
      write('students/demo_student/site/data/ktp-state.json'),
      write('students/demo_student/site/data/competency-catalog.json'),
      write('students/demo_student/site/data/mastery-state.json'),
      write('students/demo_student/site/data/lessons/2026-09-30.lesson.json'),
      write('students/demo_student/site/lesson-registry.js','update'),
      write('students/demo_student/site/tests/student-platform-v2.test.mjs'),
      write('pipeline/migration/baseline.json','update'),
      write('pipeline/migration/reports/demo_student.json')
    ]
  });
  assert.equal(result.count,10);
});

test('student-facing and unrelated assets are outside the allowlist',()=>{
  for(const target of [
    'students/demo_student/site/index.html',
    'students/demo_student/site/custom.css',
    'students/demo_student/site/assets/a.js',
    'students/demo_student/site/competence-config.js',
    'students/demo_student/chemistry/state.json',
    'students/other_student/student-contract.json',
    'pipeline/migration/manifests/demo_student.json'
  ]){
    assert.throws(
      ()=>assertMigrationWriteSet({studentId:'demo_student',writes:[write(target)]}),
      /outside the migration allowlist/
    );
  }
});

test('duplicate and non-canonical write paths are rejected',()=>{
  assert.throws(
    ()=>assertMigrationWriteSet({
      studentId:'demo_student',
      writes:[
        write('students/demo_student/student-contract.json'),
        write('students/demo_student/student-contract.json','update')
      ]
    }),
    /duplicate write path/
  );
  assert.throws(
    ()=>assertMigrationWriteSet({
      studentId:'demo_student',
      writes:[write('students/demo_student/site/data/../index.html')]
    }),
    /non-canonical path/
  );
  assert.throws(
    ()=>assertMigrationWriteSet({
      studentId:'demo_student',
      writes:[write('students\\demo_student\\student-contract.json')]
    }),
    /backslashes are forbidden/
  );
});

test('lesson metadata target requires canonical calendar date',()=>{
  assertMigrationWriteSet({
    studentId:'demo_student',
    writes:[write('students/demo_student/site/data/lessons/2026-02-28.lesson.json')]
  });
  assert.throws(
    ()=>assertMigrationWriteSet({
      studentId:'demo_student',
      writes:[write('students/demo_student/site/data/lessons/2026-02-31.lesson.json')]
    }),
    /outside the migration allowlist/
  );
  assert.throws(
    ()=>assertMigrationWriteSet({
      studentId:'demo_student',
      writes:[write('students/demo_student/site/data/lessons/30.09.26.lesson.json')]
    }),
    /outside the migration allowlist/
  );
});
