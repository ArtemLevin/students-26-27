import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateStudentPackage} from '../../../../pipeline/student/contract.mjs';

test('nadya_klimenko satisfies Student Platform v2 contract',()=>{
  const result=validateStudentPackage({root:process.cwd(),studentId:'nadya_klimenko'});
  assert.equal(result.contractVersion,2);
  const mastery=JSON.parse(
    fs.readFileSync('students/nadya_klimenko/site/data/mastery-state.json','utf8')
  );
  assert.equal(mastery.updated,'2026-10-03');
  assert.equal(Object.keys(mastery.levels).length,17);
  for(const entry of Object.values(mastery.levels)){
    assert.equal(entry.level,4);
    assert.equal(entry.sourceKind,'lesson-assessment');
    assert.equal(entry.sourcePath,'site/data/lessons/2026-10-03.lesson.json');
  }
});
