import test from 'node:test';
import assert from 'node:assert/strict';
import {validateStudentPackage} from '../../../../pipeline/student/contract.mjs';

test('anna_bannova satisfies Student Platform v2 contract',()=>{
  const result=validateStudentPackage({root:process.cwd(),studentId:'anna_bannova'});
  assert.equal(result.contractVersion,2);
  assert.equal(result.ktpLessons,174);
});
