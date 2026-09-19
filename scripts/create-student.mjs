import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

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
    '  <header class="la-topbar"><a class="la-brand" href="#overview"><span class="la-brand-mark">Σ</span><span><strong>'+n+'</strong><small>'+p+'</small></span></a><button class="la-theme-toggle" id="themeToggle" type="button">◐ Тема</button></header>',
    '  <main class="la-shell" id="main">',
    '    <section class="la-hero" id="overview"><div><p class="la-kicker">'+code+' · LEVIN / ATLAS</p><h1>'+n+'</h1><p class="la-lead">'+g+' · '+p+'. Каркас кабинета создан автоматически; программа, занятия и карта компетенций заполняются по мере работы.</p></div><aside class="la-hero-note"><span class="la-index">STATUS / 00</span><strong>Стартовая версия</strong><p>Fingerprint: '+fingerprint.composition+' · '+fingerprint.accent+'</p></aside></section>',
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

export function updateRoster(source,{slug,name,fingerprint}){
  const marker='\n\nThe roster is a deliberate diversity matrix.';
  if(!source.includes(marker))throw new Error('STUDENT_ROSTER.md marker is missing.');
  if(source.includes('| '+slug+' |')||source.includes('| '+slug+' — '))return source;
  const label=name===displayNameFromSlug(slug)?slug:slug+' — '+name;
  const row='| '+label+' | '+fingerprint.composition+' | '+fingerprint.accent+' | '+fingerprint.density+' | '+fingerprint.geometry+' | '+fingerprint.typography+' | '+fingerprint.motion+' |';
  return source.replace(marker,'\n'+row+marker);
}

export function parseArgs(argv){
  const out={slug:null,name:null,program:'Математика',grade:'индивидуальная программа',teacher:'Лёвин Артём Александрович',composition:null,accent:null,dryRun:false,verify:true,help:false};
  const map={name:'name',program:'program',grade:'grade',teacher:'teacher',composition:'composition',accent:'accent'};
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
  if(!out.help)validateSlug(out.slug);
  if(!out.name&&out.slug)out.name=displayNameFromSlug(out.slug);
  return out;
}

export function createStudent({root=process.cwd(),slug,name=displayNameFromSlug(slug),program='Математика',grade='индивидуальная программа',teacher='Лёвин Артём Александрович',composition=null,accent=null,dryRun=false,verify=true}){
  validateSlug(slug);
  const siteDir=path.join(root,'students',slug,'site'),indexPath=path.join(siteDir,'index.html'),designPath=path.join(siteDir,'design.json'),rosterPath=path.join(root,'design-system','STUDENT_ROSTER.md'),contractPath=path.join(root,'design-system','test-contract.mjs');
  if(fs.existsSync(indexPath)||fs.existsSync(designPath))throw new Error('Student site already exists: students/'+slug+'/site');
  if(fs.existsSync(siteDir)&&fs.readdirSync(siteDir).length)throw new Error('Student site directory is not empty: students/'+slug+'/site');
  if(!fs.existsSync(rosterPath))throw new Error('design-system/STUDENT_ROSTER.md is missing.');
  const fingerprint=chooseFingerprint(discoverFingerprints(root),{composition,accent});
  const rosterBefore=fs.readFileSync(rosterPath,'utf8');
  const result={slug,name,program,grade,teacher,fingerprint,files:['students/'+slug+'/site/design.json','students/'+slug+'/site/index.html','design-system/STUDENT_ROSTER.md']};
  if(dryRun)return {...result,dryRun:true};
  fs.mkdirSync(siteDir,{recursive:true});
  try{
    fs.writeFileSync(designPath,JSON.stringify(fingerprint,null,2)+'\n');
    fs.writeFileSync(indexPath,renderIndex({slug,name,program,grade,teacher,fingerprint}));
    fs.writeFileSync(rosterPath,updateRoster(rosterBefore,{slug,name,fingerprint}));
    if(verify){
      const run=spawnSync(process.execPath,[contractPath],{cwd:root,encoding:'utf8'});
      if(run.status!==0)throw new Error('LEVIN / ATLAS contract failed after scaffold creation.\n'+String(run.stderr||run.stdout||''));
      result.verification=String(run.stdout||'').trim();
    }
    return result;
  }catch(error){
    fs.rmSync(siteDir,{recursive:true,force:true});
    fs.writeFileSync(rosterPath,rosterBefore);
    throw error;
  }
}

export function helpText(){
  return [
    'LEVIN / ATLAS student scaffolder',
    '',
    'Usage: node scripts/create-student.mjs <slug> [options]',
    '',
    'Options: --name, --grade, --program, --teacher, --composition, --accent, --dry-run, --no-verify, --help'
  ].join('\n')+'\n';
}
const main=process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url));
if(main){
  try{
    const options=parseArgs(process.argv.slice(2));
    if(options.help)process.stdout.write(helpText());
    else process.stdout.write(JSON.stringify(createStudent(options),null,2)+'\n');
  }catch(error){
    process.stderr.write('create-student: '+error.message+'\n');
    process.exitCode=1;
  }
}
