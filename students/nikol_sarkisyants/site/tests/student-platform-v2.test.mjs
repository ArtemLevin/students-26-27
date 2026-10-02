import test from 'node:test';
import assert from 'node:assert/strict';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateStudentPackage} from '../../../../pipeline/student/contract.mjs';

const testDir=dirname(fileURLToPath(import.meta.url));
const repoRoot=resolve(testDir,'../../../..');

test('nikol_sarkisyants satisfies Student Platform v2 contract',()=>{
  const result=validateStudentPackage({root:repoRoot,studentId:'nikol_sarkisyants'});
  assert.equal(result.contractVersion,2);
});
