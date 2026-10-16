import test from 'node:test';
import assert from 'node:assert/strict';
import {validateStudentPackage} from '../../../../pipeline/student/contract.mjs';

test('nastya_pavlova satisfies Student Platform v2 contract',()=>{
  const result=validateStudentPackage({root:process.cwd(),studentId:'nastya_pavlova'});
  assert.equal(result.contractVersion,2);
});

// Check semantic mathematical markup alongside the student package contract.
import './mathml-1510.test.mjs';
