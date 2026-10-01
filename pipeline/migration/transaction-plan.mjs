import {buildValidatedMigrationPlan} from './plan.mjs';
import {buildMigrationSnapshot} from './snapshot.mjs';

export function buildTransactionalMigrationPlan({
  root=process.cwd(),
  manifest,
  manifestPath,
  migrationDate
}={}){
  const plan=buildValidatedMigrationPlan({
    root,
    manifest,
    migrationDate
  });

  if(!plan.executable){
    return {
      ...plan,
      preconditions:[],
      preservation:{
        protectedFiles:[],
        manifest:null,
        baseline:null
      }
    };
  }

  const snapshot=buildMigrationSnapshot({
    root,
    studentId:plan.studentId,
    manifestPath,
    writePaths:plan.writes.map(item=>item.path)
  });

  return {
    ...plan,
    preconditions:snapshot.preconditions,
    preservation:{
      protectedFiles:snapshot.protectedFiles,
      manifest:snapshot.manifest,
      baseline:snapshot.baseline
    }
  };
}
