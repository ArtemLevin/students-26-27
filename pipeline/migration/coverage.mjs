export const MIGRATION_COVERAGE_VERSION=1;

function fail(message){throw new Error('migration coverage: '+message);}
function isObject(value){return !!value&&typeof value==='object'&&!Array.isArray(value);}
function integer(value,label){
  if(!Number.isInteger(value)||value<0)fail(label+' must be a non-negative integer');
}
function strings(value,label){
  if(!Array.isArray(value)||value.some(item=>typeof item!=='string'))fail(label+' must be an array of strings');
  if(new Set(value).size!==value.length&&['writes','preservation.protectedFilesChanged','lessons.missing','lessons.extra','competencies.missing','competencies.extra'].includes(label)){
    fail(label+' must contain unique values');
  }
}
function stable(value){
  if(Array.isArray(value))return value.map(stable);
  if(isObject(value)){
    return Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])]));
  }
  return value;
}
function diagnostic(value){
  return typeof value==='string'?value:JSON.stringify(stable(value));
}
function diff(source,candidate){
  const left=new Set(source),right=new Set(candidate);
  return {
    source:left.size,
    candidate:right.size,
    missing:[...left].filter(item=>!right.has(item)).sort(),
    extra:[...right].filter(item=>!left.has(item)).sort()
  };
}
function candidateMetadata(candidate){
  if(!candidate?.candidates?.metadataByDate)return new Map();
  return candidate.candidates.metadataByDate;
}
function candidateCompetencyIds(candidate){
  const ids=[];
  for(const group of candidate?.candidates?.catalog?.groups||[]){
    for(const item of group.items||[])ids.push(item.id);
  }
  return ids;
}
function protectedWrite(pathValue,studentId){
  const prefix='students/'+studentId+'/';
  if(!pathValue.startsWith(prefix))return false;
  const relative=pathValue.slice(prefix.length);
  if(relative.startsWith('pdf_docs/')||relative.startsWith('tex_docs/')||relative.startsWith('images/'))return true;
  if(['site/index.html','site/design.json','site/dashboard.js','site/practice-config.js','site/ktp.html'].includes(relative))return true;
  if(relative.startsWith('site/')&&relative.endsWith('.html'))return true;
  return false;
}

export function validateMigrationCoverageData(value){
  if(!isObject(value))fail('report must be an object');
  const keys=[
    'version','studentId','sourceArchitecture','targetArchitecture','migrationDate',
    'complete','lessons','ktp','competencies','mastery','materials','preservation',
    'writes','warnings','reviewItems','blockers'
  ];
  const actual=Object.keys(value).sort(),expected=[...keys].sort();
  if(JSON.stringify(actual)!==JSON.stringify(expected))fail('report fields do not match v1 contract');
  if(value.version!==MIGRATION_COVERAGE_VERSION)fail('unsupported version');
  if(typeof value.studentId!=='string'||!value.studentId)fail('studentId is required');
  if(value.targetArchitecture!=='v2')fail('targetArchitecture must be v2');
  if(typeof value.migrationDate!=='string')fail('migrationDate is required');
  if(typeof value.complete!=='boolean')fail('complete must be boolean');

  for(const [name,item] of [['lessons',value.lessons],['competencies',value.competencies]]){
    if(!isObject(item))fail(name+' must be an object');
    integer(item.source,name+'.source');integer(item.candidate,name+'.candidate');
    strings(item.missing,name+'.missing');strings(item.extra,name+'.extra');
  }

  if(!isObject(value.ktp))fail('ktp must be an object');
  if(!['fixed','rolling'].includes(value.ktp.mode))fail('ktp.mode is invalid');
  integer(value.ktp.sourceLessons,'ktp.sourceLessons');
  integer(value.ktp.candidateLessons,'ktp.candidateLessons');
  integer(value.ktp.mappedHistoricalLessons,'ktp.mappedHistoricalLessons');
  if(!Array.isArray(value.ktp.fieldAliases))fail('ktp.fieldAliases must be an array');

  if(!isObject(value.mastery))fail('mastery must be an object');
  for(const key of ['resolvedSource','candidate','conflicts','orphans'])integer(value.mastery[key],'mastery.'+key);

  if(!isObject(value.materials))fail('materials must be an object');
  for(const key of ['html','pdf','tex','lab'])integer(value.materials[key],'materials.'+key);

  if(!isObject(value.preservation))fail('preservation must be an object');
  strings(value.preservation.protectedFilesChanged,'preservation.protectedFilesChanged');
  strings(value.writes,'writes');
  strings(value.warnings,'warnings');
  strings(value.reviewItems,'reviewItems');
  strings(value.blockers,'blockers');
  return value;
}

export function buildMigrationCoverage({
  manifest,
  candidate,
  legacyState,
  migrationDate,
  writePaths=[]
}={}){
  const sourceLessonDates=manifest.lessonMappings.map(item=>item.lessonDate);
  const metadata=candidateMetadata(candidate);
  const candidateLessonDates=[...metadata.keys()];

  const sourceCompetencyIds=legacyState?.catalog?.ids||[];
  const projectedCompetencyIds=candidateCompetencyIds(candidate);

  const materials={html:0,pdf:0,tex:0,lab:0};
  for(const item of metadata.values()){
    for(const key of Object.keys(materials)){
      if(item.materials?.[key])materials[key]+=1;
    }
  }

  const lessonCoverage=diff(sourceLessonDates,candidateLessonDates);
  const competencyCoverage=diff(sourceCompetencyIds,projectedCompetencyIds);
  const candidateMastery=Object.keys(candidate?.candidates?.mastery?.levels||{}).length;
  const resolvedSource=legacyState?.mastery?.resolved?.length||0;
  const conflicts=legacyState?.mastery?.conflicts?.length||0;
  const orphans=legacyState?.diagnostics?.orphanClaims?.length||0;
  const sourceKtp=candidate?.diagnostics?.ktp?.sourceRows||0;
  const candidateKtp=candidate?.candidates?.plan?.lessons?.length||0;
  const protectedFilesChanged=[...new Set(
    writePaths.filter(item=>protectedWrite(item,manifest.studentId))
  )].sort();

  const reviewItems=(candidate?.reviewItems||[]).map(diagnostic);
  const blockers=(candidate?.blockers||[]).map(diagnostic);
  const warnings=(candidate?.warnings||[]).map(diagnostic);
  const fixedKtpComplete=manifest.planning.mode==='fixed'
    ?sourceKtp===candidateKtp&&sourceKtp>0
    :sourceKtp===0&&candidateKtp===0;

  const complete=
    candidate?.executable===true&&
    lessonCoverage.missing.length===0&&lessonCoverage.extra.length===0&&
    competencyCoverage.missing.length===0&&competencyCoverage.extra.length===0&&
    resolvedSource===candidateMastery&&conflicts===0&&orphans===0&&
    fixedKtpComplete&&
    protectedFilesChanged.length===0&&
    reviewItems.length===0&&blockers.length===0;

  const report={
    version:MIGRATION_COVERAGE_VERSION,
    studentId:manifest.studentId,
    sourceArchitecture:manifest.sourceArchitecture,
    targetArchitecture:'v2',
    migrationDate,
    complete,
    lessons:lessonCoverage,
    ktp:{
      mode:manifest.planning.mode,
      sourceLessons:sourceKtp,
      candidateLessons:candidateKtp,
      mappedHistoricalLessons:manifest.lessonMappings.filter(item=>item.ktpMatches.length>0).length,
      fieldAliases:[...(candidate?.diagnostics?.ktp?.fieldAliases||[])]
    },
    competencies:competencyCoverage,
    mastery:{
      resolvedSource,
      candidate:candidateMastery,
      conflicts,
      orphans
    },
    materials,
    preservation:{protectedFilesChanged},
    writes:[...new Set(writePaths)].sort(),
    warnings,
    reviewItems,
    blockers
  };
  return validateMigrationCoverageData(report);
}
