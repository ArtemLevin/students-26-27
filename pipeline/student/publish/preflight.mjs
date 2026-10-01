import fs from 'node:fs';
import path from 'node:path';
import {
  loadJson,
  resolveStudentContractPath,
  validateKtpPlanData,
  validateStudentContractData,
  validateStudentPackage
} from '../contract.mjs';
import {
  assertEvidenceAnchors,
  loadCompetencyCatalog,
  validateLessonPublicationIntentData
} from '../publication-contract.mjs';

function lessonBase(isoDate){
  const [year,month,day]=isoDate.split('-');
  return day+'.'+month+'.'+year.slice(-2);
}

export function preflightLessonPublication({
  root=process.cwd(),
  studentId,
  intent
}={}){
  if(!studentId)throw new Error('preflight: studentId is required');
  if(!intent)throw new Error('preflight: publication intent is required');

  const currentPackage=validateStudentPackage({root,studentId});
  const studentRoot=path.join(root,'students',studentId);
  const contractPath=path.join(studentRoot,'student-contract.json');
  const contract=validateStudentContractData(loadJson(contractPath),{studentId});
  const planPath=resolveStudentContractPath(root,studentId,contract.planning.plan);
  const registryPath=resolveStudentContractPath(root,studentId,contract.lessons.registry);
  const catalogPath=resolveStudentContractPath(root,studentId,contract.competencies.catalog);
  const plan=validateKtpPlanData(loadJson(planPath),{studentId});
  const competencyCatalog=loadCompetencyCatalog(catalogPath);

  const validated=validateLessonPublicationIntentData(intent,{
    studentId,
    plan,
    competencyIds:competencyCatalog.ids
  });

  const siteRoot=path.dirname(registryPath);
  const htmlPath=path.join(siteRoot,lessonBase(validated.lessonDate)+'.html');
  if(!fs.existsSync(htmlPath)){
    throw new Error('preflight: lesson HTML is missing: '+path.relative(root,htmlPath));
  }
  const html=fs.readFileSync(htmlPath,'utf8');
  assertEvidenceAnchors(html,validated.outcomes,{
    label:'lesson '+validated.lessonDate
  });

  const appliedKtpMatches=validated.ktpMatches.filter(item=>item.decision==='apply');
  const appliedOutcomes=validated.outcomes.filter(item=>item.decision==='apply');
  const reviewItems=[
    ...validated.ktpMatches.filter(item=>item.decision==='review').map(item=>({
      type:'ktp',
      id:item.ktpId,
      confidence:item.confidence
    })),
    ...validated.outcomes.filter(item=>item.decision==='review').map(item=>({
      type:'competency',
      id:item.competencyId,
      confidence:item.confidence
    }))
  ];

  return {
    studentId,
    lessonDate:validated.lessonDate,
    architectureVersion:currentPackage.contractVersion,
    planningMode:currentPackage.planningMode,
    html:path.relative(root,htmlPath).replaceAll('\\','/'),
    appliedKtpIds:appliedKtpMatches.map(item=>item.ktpId),
    appliedCompetencyIds:[...new Set(appliedOutcomes.map(item=>item.competencyId))],
    reviewItems,
    warnings:[...validated.warnings],
    writes:[]
  };
}
