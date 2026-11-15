import test from 'node:test';
import assert from 'node:assert/strict';
import {validateStudentPackage} from '../../../../pipeline/student/contract.mjs';
test('sofya_luzianina satisfies Student Platform v2 contract',()=>{const r=validateStudentPackage({root:process.cwd(),studentId:'sofya_luzianina'});assert.equal(r.contractVersion,2);});
