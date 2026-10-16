import test from 'node:test';
import assert from 'node:assert/strict';
import {validateStudentPackage} from '../../../../pipeline/student/contract.mjs';

test('denis_ermolaev satisfies Student Platform v2 contract',()=>{
  const result=validateStudentPackage({root:process.cwd(),studentId:'denis_ermolaev'});
  assert.equal(result.contractVersion,2);
});
