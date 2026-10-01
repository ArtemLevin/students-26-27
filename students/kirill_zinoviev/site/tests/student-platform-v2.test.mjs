import test from 'node:test';
import assert from 'node:assert/strict';
import {validateStudentPackage} from '../../../../pipeline/student/contract.mjs';

test('kirill_zinoviev satisfies Student Platform v2 contract',()=>{
  const result=validateStudentPackage({root:process.cwd(),studentId:'kirill_zinoviev'});
  assert.equal(result.contractVersion,2);
});
