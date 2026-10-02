import test from 'node:test';
import assert from 'node:assert/strict';
import {validateStudentPackage} from '../../../../pipeline/student/contract.mjs';

test('darya_savenkova satisfies Student Platform v2 contract',()=>{
  const result=validateStudentPackage({root:process.cwd(),studentId:'darya_savenkova'});
  assert.equal(result.contractVersion,2);
});
