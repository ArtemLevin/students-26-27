import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const EXACT_PATHS=new Set([
  '.github/workflows/student-dashboard-tests.yml',
  'SITE_GENERATION_PROMPT.md',
  'pipeline/prompts/04_spaced_practice.md',
  'pipeline/prompts/web_page_design.md',
  'pipeline/prompts/extract_lesson_evidence.md',
  'pipeline/prompts/map_lesson_to_ktp.md',
  'pipeline/prompts/build_student_plan.md',
  'pipeline/prompts/migrate_student_architecture.md',
  'pipeline/schemas/spaced-practice-stage-v1.schema.json',
  'scripts/create-student.mjs',
  'scripts/publish-lesson.mjs',
  'scripts/student.mjs',
  'scripts/ci/student-dashboard-scope.mjs',
  'scripts/ci/test-student-dashboard-scope.mjs'
]);
const PREFIXES=[
  'shared/student-dashboard/',
  'shared/practice/',
  'pipeline/practice/',
  'pipeline/lessons/',
  'pipeline/student/',
  'pipeline/migration/',
  'pipeline/schemas/',
  'design-system/'
];

function normalize(value){return String(value||'').trim().replaceAll('\\','/').replace(/^\.\//,'');}

export function isDashboardRelevantPath(value){
  const file=normalize(value);
  if(!file)return false;
  if(EXACT_PATHS.has(file))return true;
  if(PREFIXES.some(prefix=>file.startsWith(prefix)))return true;
  if(file.startsWith('students/')){
    if(file.includes('/site/'))return true;
    if(/^students\/[^/]+\/index\.html$/.test(file))return true;
    if(/^students\/[^/]+\/student-contract\.json$/.test(file))return true;
    if(/^students\/[^/]+\/competency-map[^/]*\.(?:js|css)$/.test(file))return true;
  }
  return false;
}

export function classifyStudentDashboardChanges(files){
  const normalized=[...new Set(files.map(normalize).filter(Boolean))].sort();
  const relevant=normalized.filter(isDashboardRelevantPath);
  return {heavy:relevant.length>0,relevant,all:normalized};
}

function main(){
  const files=fs.readFileSync(0,'utf8').split(/\r?\n/);
  const result=classifyStudentDashboardChanges(files);
  if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,`heavy=${result.heavy?'true':'false'}\n`);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

const invoked=process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url));
if(invoked)main();
