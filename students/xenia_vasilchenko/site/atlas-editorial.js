import {LESSONS, getLatestLesson, formatLongDateRu} from './lesson-registry.js';

// Presentation adapter: only reads canonical lesson registry and competency map.
// Preserve the existing competency-map.js as the sole owner of student mastery.
const $=id=>document.getElementById(id);
const data=window.COMPETENCY_MAP_DATA;
const slug=s=>String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[^a-z0-9а-я]+/gi,'-').replace(/^-+|-+$/g,'');
const levelKey=data?.meta ? data.meta.student+'-'+slug(data.meta.program)+'-competency-map' : null;
const byId=new Map((data?.groups||[]).flatMap(g=>(g.items||[]).map(item=>[item.id,item.title])));
const safeHref=value=>{
  if(typeof value!=='string')return null;
  const href=value.trim();
  if(!href||href.startsWith('/')||href.startsWith('#')||href.includes('\\')||/^[a-z][\w+.-]*:/i.test(href))return null;
  return href;
};
const text=(tag,value,className)=>{
  const node=document.createElement(tag);
  node.textContent=String(value||'');
  if(className)node.className=className;
  return node;
};

function refreshStats(){
  const items=(data?.groups||[]).flatMap(g=>g.items||[]);
  let saved={};
  if(levelKey){
    try {const parsed=JSON.parse(localStorage.getItem(levelKey)||'{}');if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))saved=parsed;}catch{}
  }
  const levels=items.map(item=>{
    const override=saved[item.id];
    const valid=override!==undefined&&Number.isInteger(Number(override));
    return Math.max(0,Math.min(4,valid?Number(override):Number(item.baselineLevel)||0));
  });
  const numbers={
    totalCount:items.length,
    evaluatedCount:levels.filter(n=>n>0).length,
    confidentCountMain:levels.filter(n=>n===3).length,
    processCountMain:levels.filter(n=>n===1||n===2).length,
    masteredCountMain:levels.filter(n=>n===4).length
  };
  for(const [id,value] of Object.entries(numbers)){const node=$(id);if(node)node.textContent=String(value);}
}
const lesson=getLatestLesson(LESSONS);
if(lesson){
  $('lesson-title').textContent=lesson.navTitle||lesson.title||'Материалы занятия';
  $('lessonLead').textContent=lesson.navSubtitle||lesson.summary||'Откройте материалы урока.';
  $('latestLessonEyebrow').textContent='01 / '+formatLongDateRu(lesson.date)+' · Последнее занятие';
  const topics=(lesson.topics||[]).filter(t=>typeof t==='string'&&t.trim());
  $('lessonTopics').replaceChildren(...topics.map(t=>text('span',t,'chip')));
  const href=safeHref(lesson.href);
  if(href){$('latestLessonCta').href=href;$('latestLessonCta').hidden=false;}
  const pdf=safeHref(lesson.materials?.pdf);
  if(pdf){$('latestLessonPdf').href=pdf;$('latestLessonPdf').hidden=false;}
  if(href){
    $('latestPracticeLink').href=href+'#practice';
    $('latestPracticeLink').textContent='Открыть тренировку ↗';
    const label=document.querySelector('.practice-label');
    if(label)label.textContent='ПУТЬ А · 10 ЗАДАНИЙ';
  }
  const status=$('latestLessonStatus');
  const outcomeIds=(lesson.outcomes||[])
    .filter(o=>o&&['practiced','touched'].includes(o.relation))
    .map(o=>o.competencyId);
  const validNames=[...new Set(outcomeIds.map(id=>byId.get(id)).filter(Boolean))].slice(0,5);
  status.replaceChildren(text('p','СОДЕРЖАНИЕ ЗАНЯТИЯ','atlas-kicker'),text('h3','Что разбирали'));
  if(validNames.length){
    const list=document.createElement('ul');
    for(const name of validNames)list.append(text('li',name));
    status.append(list);
  }else{
    status.append(text('p','Содержание описано в материалах занятия.'));
  }
  status.append(text('p','Уровни освоения сохраняются до самостоятельной диагностики. Совместная практика сама по себе оценку не повышает.'));
}else{
  $('lesson-title').textContent='Материалы занятий';
  $('lessonLead').textContent='Откройте архив, чтобы увидеть доступные уроки.';
  $('latestLessonStatus').textContent='Подтверждённых записей о занятиях пока нет.';
  $('latestPracticeLink').hidden=true;
}
if(data?.meta?.updated)$('mapUpdatedDate').textContent='Карта обновлена '+data.meta.updated;
refreshStats();
// Changes in the map's level editor are persisted synchronously by
// competency-map.js. Read the same data after that handler runs.
document.addEventListener('click',event=>{
  if(event.target.closest('.level-button,#resetConfirmed,#repeatButton'))
    queueMicrotask(refreshStats);
});
window.addEventListener('storage',event=>{
  if(event.key===levelKey)refreshStats();
});

const menu=$('mobileMenu'),backdrop=$('mobileBackdrop'),button=$('menuButton'),close=$('closeMobileMenu');
let lastFocus=null;
function setMenu(open,restore=false){
  menu.hidden=!open;backdrop.hidden=!open;
  button.setAttribute('aria-expanded',String(open));
  document.body.classList.toggle('mobile-menu-open',open);
  if(open){lastFocus=document.activeElement;close.focus();}
  else if(restore)(lastFocus||button).focus();
}
button.addEventListener('click',()=>setMenu(menu.hidden));
close.addEventListener('click',()=>setMenu(false,true));
backdrop.addEventListener('click',()=>setMenu(false,true));
menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>setMenu(false)));
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!menu.hidden){setMenu(false,true);return;}
  if(event.key==='Tab'&&!menu.hidden){
    const links=[...menu.querySelectorAll('a,button')].filter(n=>!n.hidden);
    const first=links[0],last=links.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
});
window.matchMedia('(min-width:901px)').addEventListener('change',event=>{
  if(event.matches&&!menu.hidden)setMenu(false);
});
