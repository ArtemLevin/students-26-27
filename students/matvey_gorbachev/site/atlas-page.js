import {LESSONS,getLatestLesson,formatLongDateRu} from './lesson-registry.js?v=20261016-1';

/* Presentation adapter only: preserves Matvey's canonical lessons and mastery. */
const find=id=>document.getElementById(id);
const menu=find('menuButton'),nav=find('primaryNav'),backdrop=find('navBackdrop');
function setOpen(open){
  const active=Boolean(open)&&window.matchMedia('(max-width:760px)').matches;
  document.body.classList.toggle('nav-open',active);
  menu.setAttribute('aria-expanded',String(active));
  menu.setAttribute('aria-label',active?'Закрыть навигацию':'Открыть навигацию');
  backdrop.hidden=!active;
  if(!active&&nav.contains(document.activeElement))menu.focus();
}
menu.addEventListener('click',()=>{const next=menu.getAttribute('aria-expanded')!=='true';setOpen(next);if(next)nav.querySelector('a')?.focus();});
backdrop.addEventListener('click',()=>setOpen(false));
nav.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>setOpen(false)));
window.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&document.body.classList.contains('nav-open'))setOpen(false);
  if(event.key==='Tab'&&document.body.classList.contains('nav-open')){
    const all=[...nav.querySelectorAll('a[href]')];const first=all[0],last=all[all.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
});
window.matchMedia('(max-width:760px)').addEventListener?.('change',()=>setOpen(false));
const latest=getLatestLesson(LESSONS);
if(latest){
  find('latestLessonEyebrow').textContent='01 / Последнее занятие · '+formatLongDateRu(latest.date);
  find('lesson-title').textContent=latest.navTitle||latest.title||'Занятие';
  let summary=String(latest.summary||'Учебный материал занятия').replace(/^Матвей Горбач[её]в\\.\\s*/i,'');
  const title=String(latest.navTitle||latest.title||'');
  if(summary.toLocaleLowerCase('ru').startsWith(title.toLocaleLowerCase('ru')+':')){
    summary=summary.slice(title.length+1).trim();
  }
  find('lessonLead').textContent=summary;
  const href=String(latest.href||'');
  const cta=find('latestLessonCta');
  if(/^[a-zA-Z0-9._-]+\.html$/.test(href)){cta.href=href;cta.hidden=false;}else cta.hidden=true;
  const topics=find('lessonTopics');topics.replaceChildren();
  for(const topic of (latest.topics||[]).slice(0,5)){
    if(typeof topic!=='string'||!topic.trim())continue;
    const span=document.createElement('span');span.textContent=topic;topics.append(span);
  }
  const status=find('latestLessonStatus');status.replaceChildren();
  const statusHeading=document.createElement('p');statusHeading.className='status-title';statusHeading.textContent='Работа на занятии';status.append(statusHeading);
  const items=new Map((window.COMPETENCY_MAP_DATA?.groups||[]).flatMap(group=>(group.items||[]).map(item=>[item.id,item.title])));
  const labels={assessed:'Проверено',practiced:'Практика',touched:'Разбор'};
  const valid=(latest.outcomes||[]).filter(o=>items.has(o.competencyId));
  if(!valid.length){const p=document.createElement('p');p.textContent='Данных о проверке навыков пока нет.';status.append(p);}
  else{
    for(const outcome of valid.slice(0,5)){
      const row=document.createElement('div');row.className='status-outcome';
      const name=document.createElement('b');name.textContent=items.get(outcome.competencyId);
      const level=document.createElement('small');level.textContent=labels[outcome.relation]||'Изучено';
      row.append(name,level);status.append(row);
    }
    const note=document.createElement('p');note.textContent='Освоение навыков фиксируется отдельно по подтверждённым результатам.';status.append(note);
  }
}
