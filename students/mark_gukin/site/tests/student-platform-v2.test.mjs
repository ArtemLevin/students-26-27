import test from 'node:test';
import assert from 'node:assert/strict';
import {validateStudentPackage} from '../../../../pipeline/student/contract.mjs';

test('mark_gukin satisfies Student Platform v2 contract',()=>{
  const result=validateStudentPackage({root:process.cwd(),studentId:'mark_gukin'});
  assert.equal(result.contractVersion,2);
});
