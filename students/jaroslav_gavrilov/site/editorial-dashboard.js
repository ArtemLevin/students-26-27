import {LESSONS} from './lesson-registry.js';

/* Purely presentational adapter. Competency levels and repeat state remain
   exclusively owned by competency-map.js and its existing storage keys. */
const $=id=>document.getElementById(id);
const catalog=new Map((window.COMPETENCY_MAP_DATA?.groups||[])
  .flatMap(group=>(group.items||[]).map(item=>[item.id,item.title])));
const safeLocalHref=value=>{
  if(typeof value!=='string')return null;
  const href=value.trim();
  if(!href||href.startsWith('/')||href.startsWith('#')||href.includes('\\')||
    /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(href))return null;
  return href;
};
const dateLabel=value=>{
  const [year,month,day]=String(value).split('-');
  const names=['января','февраля','марта','апреля','мая','июня','июля','августа',
    'сентября','октября','ноября','декабря'];
  return day+' '+(names[Number(month)-1]||month)+' '+year;
};
function node(tag,cls,text){
  const element=document.createElement(tag);
  if(cls)element.className=cls;
  if(text!==undefined)element.textContent=String(text);
  return element;
}
function renderLatest(){
  const latest=LESSONS.filter(item=>/^\d{4}-\d{2}-\d{2}$/.test(item.date))
    .sort((a,b)=>b.date.localeCompare(a.date))[0];
  const title=$('lessonTitle'),lead=$('lessonLead'),chips=$('lessonTopics');
  const materials=$('lessonMaterials'),status=$('latestLessonStatus'),cta=$('latestLessonCta');
  if(!latest){
    title.textContent='Опубликованных занятий пока нет';
    lead.textContent='Занятия появятся здесь после публикации в учебном журнале.';
    status.replaceChildren(node('p','atlas-status-note','Учебные результаты пока не опубликованы.'));
    return;
  }
  $('latestLessonEyebrow').textContent='01 / Последнее занятие · '+dateLabel(latest.date);
  title.textContent=latest.navTitle||latest.title||'Материалы занятия';
  lead.textContent=latest.navSubtitle||latest.summary||'Разобранные материалы учебного занятия.';
  chips.replaceChildren(...(latest.topics||[]).filter(t=>typeof t==='string'&&t.trim())
    .slice(0,4).map(t=>node('span','chip',t)));
  const link=safeLocalHref(latest.href||latest.materials?.html);
  if(link){cta.href=link;cta.hidden=false;}else{cta.hidden=true;cta.removeAttribute('href');}
  const m=latest.materials||{},resources=[
    [m.pdf,'PDF-пособие'],[m.tex,'TeX-исходник'],[m.lab,'Интерактив']
  ];
  if(latest.date==='2026-10-15')resources.push(['../images/15.10.26.png','Постер']);
  materials.replaceChildren();
  for(const [href,label] of resources){
    const safe=safeLocalHref(href);
    if(safe){
      const a=node('a','',label+' ↗');
      a.href=safe;
      materials.append(a);
    }
  }
  const head=node('p','status-title','На занятии');
  const expl=node('p','atlas-status-note',
    'Указанные навыки изучались или отрабатывались. Уровень самостоятельного освоения здесь не повышается.');
  status.replaceChildren(head,expl);
  const outcomes=(latest.outcomes||[]).filter(x=>x&&typeof x==='object').slice(0,5);
  if(!outcomes.length)status.append(node('p','atlas-status-note',
    'Для этого занятия пока нет опубликованной детализации навыков.'));
  for(const item of outcomes){
    const row=node('div','atlas-outcome');
    const content=node('div');
    const title=catalog.get(item.competencyId)||'Учебный навык';
    content.append(node('strong','',title));
    const label=item.relation==='assessed'?'Есть отдельная проверка':
      item.relation==='practiced'?'Разбирали и отрабатывали':'Обсуждали на занятии';
    content.append(node('small','',label));
    row.append(content);
    status.append(row);
  }
}
function initMobileNav(){
  const mobile=$('menuButton'),sidebar=$('sidebar'),backdrop=$('sidebarBackdrop'),close=$('sidebarClose');
  const mq=window.matchMedia('(max-width:900px)');
  let open=false;
  function apply(){
    if(!mq.matches)open=false;
    document.body.classList.toggle('sidebar-open',open);
    backdrop.hidden=!open;
    mobile.setAttribute('aria-expanded',String(open));
    mobile.setAttribute('aria-label',open?'Закрыть навигацию':'Открыть навигацию');
    sidebar.inert=mq.matches&&!open;
  }
  function toggle(next){open=next;apply();if(open)close.focus();else mobile.focus();}
  mobile.addEventListener('click',()=>toggle(!open));
  close.addEventListener('click',()=>toggle(false));
  backdrop.addEventListener('click',()=>toggle(false));
  sidebar.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
    if(open){open=false;apply();}
  }));
  document.addEventListener('keydown',event=>{
    if(!open)return;
    if(event.key==='Escape'){event.preventDefault();toggle(false);return;}
    if(event.key==='Tab'){
      const focusable=[...sidebar.querySelectorAll('a[href],button:not([disabled])')]
        .filter(el=>el.getClientRects().length);
      const first=focusable[0],last=focusable[focusable.length-1];
      if(!first)return;
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  });
  mq.addEventListener?.('change',apply);
  apply();
}
const mainTheme=$('themeToggle');
$('mobileThemeToggle').addEventListener('click',()=>mainTheme.click());
function applyFromMap(){
  const theme=document.documentElement.dataset.theme==='dark'?'dark':'light';
  document.body.dataset.theme=theme;
  $('mobileThemeToggle').setAttribute('aria-label',theme==='dark'?'Включить светлую тему':'Включить тёмную тему');
}
new MutationObserver(applyFromMap).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
applyFromMap();
renderLatest();
initMobileNav();
