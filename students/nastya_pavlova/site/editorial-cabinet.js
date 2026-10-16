/* Editorial presentation adapter — no writes to mastery, practice or registry. */
import {LESSONS} from './lesson-registry.js';

const $=id=>document.getElementById(id);
const safeRelative=value=>{
 if(typeof value!=='string')return null;
 const ref=value.trim();
 if(!ref||ref.startsWith('/')||ref.startsWith('//')||ref.startsWith('#')||ref.includes('\\')||/^[a-z][\w+.-]*:/i.test(ref)||ref.split('/').includes('..')&&!(ref.startsWith('../pdf_docs/')||ref.startsWith('../tex_docs/')||ref.startsWith('../images/')))return null;
 return ref;
};
const text=(tag,value,className)=>{
 const e=document.createElement(tag);
 if(className)e.className=className;
 e.textContent=String(value??'');
 return e;
};
const dateRu=iso=>{
 const [year,month,day]=String(iso).split('-');
 return [day,month,year].join('.');
};
function latest(){
 const lesson=[...LESSONS].sort((a,b)=>b.date.localeCompare(a.date))[0];
 if(!lesson)return;
 $('latestLessonDate').textContent='01 / ПОСЛЕДНЕЕ ЗАНЯТИЕ · '+dateRu(lesson.date);
 $('lessonTitle').textContent=lesson.title||lesson.navTitle||'Последнее занятие';
 $('latestLessonSummary').textContent=lesson.summary||lesson.navSubtitle||'Учебные материалы занятия';
 const topics=(lesson.topics||[]).filter(v=>typeof v==='string'&&v.trim());
 $('latestLessonTopics').replaceChildren(...topics.slice(0,5).map(t=>text('span',t)));
 const href=safeRelative(lesson.href),cta=$('latestLessonLink');
 if(href){cta.href=href;cta.hidden=false;}
 const links=[];
 for(const [key,label] of [['pdf','PDF'],['tex','TeX'],['lab','Интерактив'],['review','Ревью']]){
  const url=safeRelative(lesson.materials?.[key]);if(!url)continue;
  const a=text('a',label);a.href=url;if(key==='pdf')a.download='';links.push(a);
 }
 $('latestMaterialLinks').replaceChildren(...links);
 const results=(lesson.outcomes||[]).filter(o=>typeof o.label==='string'&&o.label.trim());
 // Labels are reviewed and user-facing; IDs never appear in this surface.
 const unique=[...new Set(results.map(o=>o.label))].slice(0,7);
 $('latestLessonResults').replaceChildren(...unique.map(t=>text('li',t)));
 if(!unique.length)$('latestLessonResults').append(text('li','Материалы занятия доступны для повторения'));
}
// Read the student's verified mastery model. This adapter never infers
// mastery from attendance and never changes the canonical levels.
async function ledger(){
 const response=await Promise.all([
  fetch('./data/competency-catalog.json',{cache:'no-cache'}),
  fetch('./data/mastery-state.json',{cache:'no-cache'})
 ]);
 if(response.some(r=>!r.ok))throw Error('Competency records unavailable');
 const [catalog,mastery]=await Promise.all(response.map(r=>r.json()));
 const ids=[...new Set((catalog.groups||[]).flatMap(g=>(g.items||[]).map(i=>i.id)).filter(Boolean))];
 const values=ids.map(id=>Number(mastery.levels?.[id]?.level??0));
 const stats={
  ledgerTotal:ids.length,
  ledgerEvaluated:values.filter(n=>n>=1&&n<=4).length,
  ledgerConfident:values.filter(n=>n===3).length,
  ledgerProcess:values.filter(n=>n===1||n===2).length,
  ledgerMastered:values.filter(n=>n===4).length
 };
 for(const [id,value] of Object.entries(stats))$(id).textContent=String(value);
 $('competenceLedger').title='Показатели рассчитаны по подтверждённым уровням из карты компетенций';
}
function menu(){
 const nav=$('cabinetNavigation'),toggle=$('cabinetMenuToggle'),backdrop=$('cabinetNavBackdrop');
 let returnFocus=null;
 const open=value=>{
  nav.dataset.open=String(value);
  backdrop.hidden=!value;
  backdrop.dataset.open=String(value);
  toggle.setAttribute('aria-expanded',String(value));
  toggle.setAttribute('aria-label',value?'Закрыть меню':'Открыть меню');
  if(value){returnFocus=document.activeElement;nav.querySelector('a')?.focus();}
  else if(returnFocus&&typeof returnFocus.focus==='function'){returnFocus.focus();returnFocus=null;}
 };
 toggle.addEventListener('click',()=>open(toggle.getAttribute('aria-expanded')!=='true'));
 backdrop.addEventListener('click',()=>open(false));
 nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{if(toggle.getAttribute('aria-expanded')==='true')open(false);}));
 document.addEventListener('keydown',event=>{
  if(toggle.getAttribute('aria-expanded')!=='true')return;
  if(event.key==='Escape'){event.preventDefault();open(false);}
  if(event.key==='Tab'){
   const links=[...nav.querySelectorAll('a')],first=links[0],last=links.at(-1);
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
 });
 window.matchMedia('(min-width: 901px)').addEventListener('change',event=>{if(event.matches){nav.dataset.open='false';backdrop.hidden=true;backdrop.dataset.open='false';toggle.setAttribute('aria-expanded','false');}});
}
try{latest();}catch(_){$('lessonTitle').textContent='История занятий';$('latestLessonSummary').textContent='Откройте архив, чтобы выбрать материал.';}
ledger().catch(()=>{$('competenceLedger').title='Данные оценки временно недоступны';});
menu();
