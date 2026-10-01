import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {getProgramProfile} from '../pipeline/programs/profiles.mjs';

export const ACCENTS=['vermilion','cobalt','forest','ochre','plum','petrol','burgundy','graphite'];
export const ARCHETYPES={
  cartographer:{densities:['airy','balanced'],geometry:'circular',typographies:['editorial','technical-editorial'],motions:['calm'],signature:['radial-dominance','coordinate-grid','route-index']},
  lab:{densities:['compact','balanced'],geometry:'orthogonal',typographies:['technical'],motions:['mechanical','calm'],signature:['instrument-grid','mono-readouts','measurement-rules']},
  editorial:{densities:['airy','balanced'],geometry:'mixed',typographies:['editorial','technical-editorial'],motions:['calm'],signature:['overscale-type','asymmetric-margins','editorial-rules']},
  blueprint:{densities:['balanced','airy','compact'],geometry:'orthogonal',typographies:['technical','technical-editorial'],motions:['calm','mechanical'],signature:['coordinate-grid','section-index','dimension-rules']},
  archive:{densities:['balanced','airy'],geometry:'mixed',typographies:['technical-editorial'],motions:['calm'],signature:['catalog-spine','record-index','chronology-rules']},
  cosmos:{densities:['airy','balanced'],geometry:'circular',typographies:['editorial','technical-editorial'],motions:['calm'],signature:['radial-hierarchy','orbital-rules','sparse-field']}
};
const AXES=['composition','accent','density','geometry','typography','motion'];

export function validateSlug(slug){
  if(typeof slug!=='string'||!/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(slug))throw new Error('Slug must use lowercase latin letters, digits and single underscores only.');
  return slug;
}
export function displayNameFromSlug(slug){
  validateSlug(slug);
  return slug.split('_').map(part=>part.charAt(0).toUpperCase()+part.slice(1)).join(' ');
}
function html(value){
  return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
}
function walk(dir){
  if(!fs.existsSync(dir))return [];
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const full=path.join(dir,entry.name);
    return entry.isDirectory()?walk(full):[full];
  });
}
export function discoverFingerprints(root){
  return walk(path.join(root,'students')).filter(file=>file.endsWith(path.sep+'site'+path.sep+'design.json')).sort().map(file=>({path:file,data:JSON.parse(fs.readFileSync(file,'utf8'))}));
}
function key(x){return [x.composition,x.accent,x.density,x.geometry,x.typography,x.motion,...x.signature].join('|');}
function distance(a,b){return AXES.reduce((n,k)=>n+(a[k]===b[k]?0:1),0);}
function count(existing,k,v){return existing.reduce((n,item)=>n+(item.data[k]===v?1:0),0);}

export function chooseFingerprint(existing,{composition=null,accent=null}={}){
  if(composition&&!ARCHETYPES[composition])throw new Error('Unknown composition: '+composition);
  if(accent&&!ACCENTS.includes(accent))throw new Error('Unknown accent: '+accent);
  const used=new Set(existing.map(item=>key(item.data)));
  const candidates=[];
  for(const c of composition?[composition]:Object.keys(ARCHETYPES)){
    const p=ARCHETYPES[c];
    for(const a of accent?[accent]:ACCENTS){
      for(const density of p.densities)for(const typography of p.typographies)for(const motion of p.motions){
        const x={system:'LEVIN_ATLAS',version:'1.0',composition:c,accent:a,density,geometry:p.geometry,typography,motion,signature:[...p.signature]};
        if(used.has(key(x)))continue;
        const minDistance=existing.length?Math.min(...existing.map(item=>distance(x,item.data))):AXES.length;
        const penalty=AXES.reduce((sum,k)=>sum+count(existing,k,x[k]),0);
        candidates.push({x,minDistance,penalty,compositionCount:count(existing,'composition',c),accentCount:count(existing,'accent',a),stable:key(x)});
      }
    }
  }
  if(!candidates.length)throw new Error('No unique LEVIN / ATLAS fingerprint remains for the requested overrides.');
  candidates.sort((a,b)=>b.minDistance-a.minDistance||a.penalty-b.penalty||a.compositionCount-b.compositionCount||a.accentCount-b.accentCount||a.stable.localeCompare(b.stable));
  return candidates[0].x;
}

export function renderIndex({slug,name,program,grade,teacher,fingerprint}){
  const n=html(name),p=html(program),g=html(grade),t=html(teacher),code=html(slug.toUpperCase().replaceAll('_',' / '));
  return [
    '<!doctype html>',
    '<html lang="ru" data-theme="light">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width,initial-scale=1">',
    '  <meta name="description" content="Персональный учебный навигатор '+n+': '+p+'">',
    '  <meta name="color-scheme" content="light dark">',
    '  <title>'+n+' · '+p+'</title>',
    '  <link rel="stylesheet" href="../../../design-system/tokens.css">',
    '  <link rel="stylesheet" href="../../../design-system/foundations.css">',
    '  <link rel="stylesheet" href="../../../design-system/archetypes.css">',
    '  <link rel="stylesheet" href="../../../design-system/student-sites.css">',
    '  <link rel="stylesheet" href="../../../design-system/scaffold.css">',
    '</head>',
    '<body data-atlas data-atlas-adapter="universal" data-atlas-composition="'+fingerprint.composition+'" data-atlas-accent="'+fingerprint.accent+'" data-atlas-density="'+fingerprint.density+'" data-atlas-motion="'+fingerprint.motion+'">',
    '  <a class="la-skip" href="#main">К содержанию</a>',
    '  <header class="la-topbar"><a class="la-brand" href="#overview"><span class="la-brand-mark">Σ</span><span><strong>'+n+'</strong><small>'+p+'</small></span></a><span><a class="la-theme-toggle" href="ktp.html">КТП</a> <button class="la-theme-toggle" id="themeToggle" type="button">◐ Тема</button></span></header>',
    '  <main class="la-shell" id="main">',
    '    <section class="la-hero" id="overview"><div><p class="la-kicker">'+code+' · LEVIN / ATLAS</p><h1>'+n+'</h1><p class="la-lead">'+g+' · '+p+'. Каркас Student Platform v2 создан автоматически; программа, занятия и карта компетенций заполняются по мере работы, а каноническое учебное состояние хранится в репозитории.</p></div><aside class="la-hero-note"><span class="la-index">STATUS / 00</span><strong>Стартовая версия</strong><p>Fingerprint: '+fingerprint.composition+' · '+fingerprint.accent+'</p></aside></section>',
    '    <section class="la-summary" aria-label="Сводка прогресса"><article><strong>0</strong><span>пройдено</span></article><article><strong>0%</strong><span>затронуто</span></article><article><strong>0</strong><span>повторить</span></article><article><strong>—</strong><span>навыков</span></article></section>',
    '    <section class="la-map-section" id="map"><header class="la-section-head"><div><p class="la-kicker">MAP / 01</p><h2>Карта компетенций</h2><p>Подключите каталог программы и сохраните круговую карту как главный рабочий инструмент кабинета.</p></div></header><div class="la-map-grid"><div class="la-map-placeholder" role="img" aria-label="Заготовка круговой карты компетенций"><span class="la-ring la-ring-a"></span><span class="la-ring la-ring-b"></span><span class="la-ring la-ring-c"></span><div class="la-map-center"><strong>00</strong><span>catalog pending</span></div></div><aside class="la-catalog-placeholder"><span class="la-index">CATALOG / PENDING</span><h3>Структура программы</h3><ol><li>Добавьте тематические сектора.</li><li>Свяжите навыки со стабильными ID.</li><li>Подключите историю занятий и уровни 0–4.</li></ol></aside></div></section>',
    '    <section class="la-notes"><div><p class="la-kicker">ROUTE / 02</p><h2>Следующие шаги</h2></div><ol><li><span>01</span><strong>Каталог</strong><p>Зафиксировать полную программу и атомарные навыки.</p></li><li><span>02</span><strong>Диагностика</strong><p>Задать подтверждённые уровни и очередь повторения.</p></li><li><span>03</span><strong>Материалы</strong><p>Связать занятия, PDF, TeX и интерактивные лаборатории.</p></li></ol></section>',
    '  </main>',
    '  <footer class="la-footer"><span>'+n+'</span><span>'+p+'</span><span>Преподаватель: '+t+'</span></footer>',
    "  <script>(()=>{const k='"+slug+"-atlas-theme',r=document.documentElement,b=document.getElementById('themeToggle'),s=localStorage.getItem(k);if(s==='dark'||s==='light')r.dataset.theme=s;b?.addEventListener('click',()=>{r.dataset.theme=r.dataset.theme==='dark'?'light':'dark';localStorage.setItem(k,r.dataset.theme);});})();</script>",
    '</body>',
    '</html>',
    ''
  ].join('\n');
}


export function renderStudentContract({slug,name,program,planningMode}){
  return JSON.stringify({
    version:2,
    studentId:slug,
    studentName:name,
    program,
    planning:{
      mode:planningMode,
      plan:'site/data/ktp-plan.json',
      state:'site/data/ktp-state.json'
    },
    lessons:{
      registry:'site/lesson-registry.js',
      metadataDir:'site/data/lessons'
    },
    competencies:{
      catalog:'site/competency-map-data.js',
      mastery:'site/mastery-authority.js'
    },
    practice:{config:null}
  },null,2)+'\n';
}

export function renderKtpPlan({slug,profileId}){
  return JSON.stringify({
    version:1,
    studentId:slug,
    programVersion:profileId+'-pending-v1',
    lessons:[]
  },null,2)+'\n';
}

export function renderKtpState({slug,profileId,date='1970-01-01'}){
  return JSON.stringify({
    version:1,
    studentId:slug,
    programVersion:profileId+'-pending-v1',
    updated:date,
    records:{}
  },null,2)+'\n';
}

export function renderLessonRegistry(){
  return [
    'export const LESSONS=[];',
    '',
    'export function compareLessonsNewestFirst(left,right){return right.date.localeCompare(left.date);}',
    'export function sortedLessons(lessons=LESSONS){return [...lessons].sort(compareLessonsNewestFirst);}',
    'export function getLatestLesson(lessons=LESSONS){return sortedLessons(lessons)[0]||null;}',
    'export function getLessonByDate(date,lessons=LESSONS){return lessons.find(item=>item.date===date)||null;}',
    ''
  ].join('\n');
}

export function renderCompetencyData({slug,name,program}){
  return [
    '(() => {',
    "  'use strict';",
    '  window.COMPETENCY_MAP_DATA={',
    '    student:'+JSON.stringify(slug)+',',
    '    studentName:'+JSON.stringify(name)+',',
    '    program:'+JSON.stringify(program)+',',
    "    updated:'',",
    "    sourceNote:'Student Platform v2 scaffold: competency catalog pending.',",
    '    groups:[],',
    '    baselineLevels:{},',
    '    baselineRepeat:[],',
    '    evidence:{},',
    '    materials:[]',
    '  };',
    '})();',
    ''
  ].join('\n');
}

export function renderMasteryAuthority(){
  return [
    'export const mastery={};',
    'export default mastery;',
    ''
  ].join('\n');
}

export function renderKtpPage({slug,name,program,teacher}){
  const n=html(name),p=html(program),t=html(teacher);
  return [
    '<!doctype html>',
    '<html lang="ru" data-theme="light">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width,initial-scale=1">',
    '  <meta name="color-scheme" content="light dark">',
    '  <meta name="description" content="КТП '+n+': '+p+'">',
    '  <title>КТП · '+n+' · '+p+'</title>',
    '  <link rel="stylesheet" href="../../../design-system/tokens.css">',
    '  <link rel="stylesheet" href="../../../design-system/foundations.css">',
    '  <link rel="stylesheet" href="../../../design-system/archetypes.css">',
    '  <link rel="stylesheet" href="../../../design-system/student-sites.css">',
    '  <link rel="stylesheet" href="../../../design-system/scaffold.css">',
    '  <style>',
    '    .ktp-shell{max-width:1100px;margin:auto;padding:clamp(1rem,3vw,2rem)}',
    '    .ktp-head{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;border-bottom:1px solid currentColor;padding-bottom:1rem}',
    '    .ktp-head h1{margin:.35rem 0;font-size:clamp(2rem,6vw,4rem)}',
    '    .ktp-status{margin:2rem 0;padding:1rem 0;border-block:1px solid color-mix(in srgb,currentColor 22%,transparent)}',
    '    .ktp-list{display:grid;gap:0}.ktp-item{padding:1rem 0;border-bottom:1px solid color-mix(in srgb,currentColor 16%,transparent)}',
    '    .ktp-item h2{margin:.25rem 0;font-size:1.15rem}.ktp-meta{font-family:monospace;font-size:.8rem;opacity:.72}',
    '    a{color:inherit}.repo-note{max-width:70ch;line-height:1.55}',
    '    @media(max-width:700px){.ktp-head{display:block}}',
    '  </style>',
    '</head>',
    '<body>',
    '<main class="ktp-shell" id="main">',
    '  <header class="ktp-head"><div><small>'+p+'</small><h1>'+n+'</h1><p>Календарно-тематический план</p></div><a href="index.html">← Навигатор</a></header>',
    '  <section class="ktp-status" aria-live="polite"><strong id="planStatus">Загрузка плана…</strong><p class="repo-note">Источник истины — репозиторий. Эта страница отображает <code>ktp-plan.json</code> и <code>ktp-state.json</code>; учебное состояние в браузере не сохраняется.</p></section>',
    '  <section id="ktpList" class="ktp-list" aria-label="План занятий"></section>',
    '</main>',
    '<footer class="ktp-shell"><small>'+t+' эксклюзивно для '+n+'</small></footer>',
    '<script type="module">',
    "const esc=value=>String(value??'').replace(/[&<>\"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[char]));",
    "const dateLabel=value=>value?value.split('-').reverse().join('.'): 'дата уточняется';",
    "async function load(url){const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw new Error('HTTP '+response.status+' · '+url);return response.json();}",
    'try{',
    "  const [plan,state]=await Promise.all([load('./data/ktp-plan.json'),load('./data/ktp-state.json')]);",
    "  if(plan.studentId!=="+JSON.stringify(slug)+"||state.studentId!=="+JSON.stringify(slug)+")throw new Error('studentId mismatch');",
    "  if(plan.programVersion!==state.programVersion)throw new Error('programVersion mismatch');",
    "  const host=document.getElementById('ktpList'),status=document.getElementById('planStatus');",
    "  status.textContent=plan.lessons.length?('В плане: '+plan.lessons.length+' занятий'):'План готов к содержательному заполнению';",
    "  if(!plan.lessons.length){host.innerHTML='<p>Структура кабинета готова. Персональный маршрут будет добавлен через repository pipeline.</p>';}",
    "  else host.innerHTML=plan.lessons.map(item=>{const record=state.records[item.id]||{status:'planned'};return '<article class=\"ktp-item\"><div class=\"ktp-meta\">'+esc(item.id)+' · '+esc(dateLabel(record.scheduledDate||item.plannedDate))+' · '+esc(record.status)+'</div><h2>'+esc(item.topic)+'</h2><p>'+esc(item.content)+'</p></article>';}).join('');",
    '}catch(error){',
    "  document.getElementById('planStatus').textContent='КТП временно недоступен';",
    "  document.getElementById('ktpList').innerHTML='<p>'+esc(error.message)+'</p>';",
    '}',
    '</script>',
    '</body>',
    '</html>',
    ''
  ].join('\n');
}

export function renderStudentV2Test({slug}){
  return [
    "import test from 'node:test';",
    "import assert from 'node:assert/strict';",
    "import {validateStudentPackage} from '../../../../pipeline/student/contract.mjs';",
    '',
    "test('"+slug+" satisfies Student Platform v2 contract',()=>{",
    "  const result=validateStudentPackage({root:process.cwd(),studentId:'"+slug+"'});",
    "  assert.equal(result.contractVersion,2);",
    "});",
    ''
  ].join('\n');
}

export function updateMigrationBaseline(source){
  const baseline=JSON.parse(source);
  if(baseline.version!==1)throw new Error('Unsupported pipeline/migration/baseline.json');
  baseline.total+=1;
  baseline.minV2+=1;
  baseline.byArchitecture=baseline.byArchitecture||{};
  baseline.byArchitecture.v2=(baseline.byArchitecture.v2||0)+1;
  return JSON.stringify(baseline,null,2)+'\n';
}

export function updateRoster(source,{slug,name,fingerprint}){
  const marker='\n\nThe roster is a deliberate diversity matrix.';
  if(!source.includes(marker))throw new Error('STUDENT_ROSTER.md marker is missing.');
  if(source.includes('| '+slug+' |')||source.includes('| '+slug+' — '))return source;
  const label=name===displayNameFromSlug(slug)?slug:slug+' — '+name;
  const row='| '+label+' | '+fingerprint.composition+' | '+fingerprint.accent+' | '+fingerprint.density+' | '+fingerprint.geometry+' | '+fingerprint.typography+' | '+fingerprint.motion+' |';
  return source.replace(marker,'\n'+row+marker);
}

export function parseArgs(argv){
  const out={slug:null,name:null,program:null,profile:'custom',grade:'индивидуальная программа',teacher:'Лёвин Артём Александрович',composition:null,accent:null,dryRun:false,verify:true,help:false};
  const map={name:'name',program:'program',profile:'profile',grade:'grade',teacher:'teacher',composition:'composition',accent:'accent'};
  const args=[...argv];
  while(args.length){
    const token=args.shift();
    if(token==='--help'||token==='-h'){out.help=true;continue;}
    if(token==='--dry-run'){out.dryRun=true;continue;}
    if(token==='--no-verify'){out.verify=false;continue;}
    if(token.startsWith('--')){
      const k=token.slice(2);
      if(!map[k])throw new Error('Unknown option: '+token);
      const value=args.shift();
      if(value===undefined||value.startsWith('--'))throw new Error('Option '+token+' requires a value.');
      out[map[k]]=value;
      continue;
    }
    if(out.slug)throw new Error('Unexpected positional argument: '+token);
    out.slug=token;
  }
  if(!out.help){
    validateSlug(out.slug);
    getProgramProfile(out.profile);
  }
  if(!out.name&&out.slug)out.name=displayNameFromSlug(out.slug);
  return out;
}

export function createStudent({
  root=process.cwd(),
  slug,
  name=displayNameFromSlug(slug),
  program=null,
  profile='custom',
  grade='индивидуальная программа',
  teacher='Лёвин Артём Александрович',
  composition=null,
  accent=null,
  dryRun=false,
  verify=true
}){
  validateSlug(slug);
  const profileSpec=getProgramProfile(profile);
  const resolvedProgram=program||profileSpec.defaultProgram;
  const studentRoot=path.join(root,'students',slug);
  const siteDir=path.join(studentRoot,'site');
  const dataDir=path.join(siteDir,'data');
  const lessonsDir=path.join(dataDir,'lessons');
  const indexPath=path.join(siteDir,'index.html');
  const designPath=path.join(siteDir,'design.json');
  const studentContractPath=path.join(studentRoot,'student-contract.json');
  const ktpPath=path.join(siteDir,'ktp.html');
  const planPath=path.join(dataDir,'ktp-plan.json');
  const statePath=path.join(dataDir,'ktp-state.json');
  const registryPath=path.join(siteDir,'lesson-registry.js');
  const competencyPath=path.join(siteDir,'competency-map-data.js');
  const masteryPath=path.join(siteDir,'mastery-authority.js');
  const studentTestPath=path.join(siteDir,'tests','student-platform-v2.test.mjs');
  const rosterPath=path.join(root,'design-system','STUDENT_ROSTER.md');
  const designContractPath=path.join(root,'design-system','test-contract.mjs');
  const v2ValidatorPath=path.join(root,'pipeline','student','validate.mjs');
  const baselinePath=path.join(root,'pipeline','migration','baseline.json');

  if(fs.existsSync(indexPath)||fs.existsSync(designPath)||fs.existsSync(studentContractPath))throw new Error('Student site already exists: students/'+slug);
  if(fs.existsSync(studentRoot)&&walk(studentRoot).length)throw new Error('Student directory is not empty: students/'+slug);
  for(const required of [rosterPath,designContractPath,v2ValidatorPath,baselinePath]){
    if(!fs.existsSync(required))throw new Error(path.relative(root,required)+' is missing.');
  }

  const fingerprint=chooseFingerprint(discoverFingerprints(root),{composition,accent});
  const rosterBefore=fs.readFileSync(rosterPath,'utf8');
  const baselineBefore=fs.readFileSync(baselinePath,'utf8');
  const relativeFiles=[
    'students/'+slug+'/student-contract.json',
    'students/'+slug+'/site/design.json',
    'students/'+slug+'/site/index.html',
    'students/'+slug+'/site/ktp.html',
    'students/'+slug+'/site/lesson-registry.js',
    'students/'+slug+'/site/competency-map-data.js',
    'students/'+slug+'/site/mastery-authority.js',
    'students/'+slug+'/site/data/ktp-plan.json',
    'students/'+slug+'/site/data/ktp-state.json',
    'students/'+slug+'/site/data/lessons/.gitkeep',
    'students/'+slug+'/site/tests/student-platform-v2.test.mjs',
    'design-system/STUDENT_ROSTER.md',
    'pipeline/migration/baseline.json'
  ];
  const result={
    slug,name,program:resolvedProgram,profile:profileSpec.id,
    planningMode:profileSpec.planningMode,grade,teacher,fingerprint,
    architectureVersion:2,files:relativeFiles
  };
  if(dryRun)return {...result,dryRun:true};

  fs.mkdirSync(lessonsDir,{recursive:true});
  fs.mkdirSync(path.dirname(studentTestPath),{recursive:true});
  try{
    fs.writeFileSync(designPath,JSON.stringify(fingerprint,null,2)+'\n');
    fs.writeFileSync(indexPath,renderIndex({slug,name,program:resolvedProgram,grade,teacher,fingerprint}));
    fs.writeFileSync(studentContractPath,renderStudentContract({
      slug,name,program:resolvedProgram,planningMode:profileSpec.planningMode
    }));
    fs.writeFileSync(ktpPath,renderKtpPage({slug,name,program:resolvedProgram,teacher}));
    fs.writeFileSync(planPath,renderKtpPlan({slug,profileId:profileSpec.id}));
    fs.writeFileSync(statePath,renderKtpState({slug,profileId:profileSpec.id}));
    fs.writeFileSync(path.join(lessonsDir,'.gitkeep'),'');
    fs.writeFileSync(registryPath,renderLessonRegistry());
    fs.writeFileSync(competencyPath,renderCompetencyData({slug,name,program:resolvedProgram}));
    fs.writeFileSync(masteryPath,renderMasteryAuthority());
    fs.writeFileSync(studentTestPath,renderStudentV2Test({slug}));
    fs.writeFileSync(rosterPath,updateRoster(rosterBefore,{slug,name,fingerprint}));
    fs.writeFileSync(baselinePath,updateMigrationBaseline(baselineBefore));

    if(verify){
      const designRun=spawnSync(process.execPath,[designContractPath],{cwd:root,encoding:'utf8'});
      if(designRun.status!==0)throw new Error('LEVIN / ATLAS contract failed after scaffold creation.\n'+String(designRun.stderr||designRun.stdout||''));
      const v2Run=spawnSync(process.execPath,[v2ValidatorPath,slug],{cwd:root,encoding:'utf8'});
      if(v2Run.status!==0)throw new Error('Student Platform v2 contract failed after scaffold creation.\n'+String(v2Run.stderr||v2Run.stdout||''));
      result.verification=[
        String(designRun.stdout||'').trim(),
        String(v2Run.stdout||'').trim()
      ].filter(Boolean).join('\n');
    }
    return result;
  }catch(error){
    fs.rmSync(studentRoot,{recursive:true,force:true});
    fs.writeFileSync(rosterPath,rosterBefore);
    fs.writeFileSync(baselinePath,baselineBefore);
    throw error;
  }
}

export function helpText(){
  return [
    'LEVIN / ATLAS student scaffolder',
    '',
    'Usage: node scripts/create-student.mjs <slug> [options]',
    '',
    'Options: --name, --grade, --profile, --program, --teacher, --composition, --accent, --dry-run, --no-verify, --help'
  ].join('\n')+'\n';
}
export function run(argv=process.argv.slice(2)){
  const options=parseArgs(argv);
  if(options.help){process.stdout.write(helpText());return null;}
  const result=createStudent(options);
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  return result;
}
const main=process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url));
if(main){
  try{run();}
  catch(error){
    process.stderr.write('create-student: '+error.message+'\n');
    process.exitCode=1;
  }
}
