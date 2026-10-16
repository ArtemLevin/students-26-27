import {LESSONS as BASE_LESSONS} from './lesson-registry.js';

export const LESSONS=[...BASE_LESSONS].sort((a,b)=>String(b.date).localeCompare(String(a.date)));

const $=id=>document.getElementById(id);
const MONTHS=['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
const monthLabel=isoMonth=>{
  const [year,month]=isoMonth.split('-').map(Number);
  return MONTHS[month-1]+' '+year;
};
const fullDate=isoDate=>{
  const [y,m,d]=isoDate.split('-');
  return d+'.'+m+'.'+y;
};
const normal=s=>String(s||'').toLocaleLowerCase('ru-RU').replaceAll('ё','е').trim();
const localHref=value=>{
  if(typeof value!=='string')return null;
  const s=value.trim();
  // Only allow relative on-site links. Never interpolate raw data into HTML.
  if(!s||s.startsWith('/')||s.startsWith('//')||s.startsWith('#')||/^[a-zA-Z][\w+.-]*:/.test(s)||s.includes('\\'))return null;
  return s;
};
const plural=(n,a,b,c)=>{
  const x=n%100,y=x%10;
  return x>=11&&x<=14?c:y===1?a:y>=2&&y<=4?b:c;
};
function span(tag,className,text){
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(text!==undefined)node.textContent=String(text);
  return node;
}
function link(href,text,className){
  const a=span('a',className,text);
  a.href=href;
  return a;
}
function tile(lesson,index){
  const card=document.createElement('article');
  card.className='archive-tile';
  const shownTitle=lesson.title||lesson.navTitle||'Материалы занятия';
  const href=localHref(lesson.href);
  const cardMain=href?link(href,'','archive-tile-main'):span('div','archive-tile-main');
  const meta=span('div','archive-tile-meta');
  const date=span('time','archive-tile-date',fullDate(lesson.date));
  date.dateTime=lesson.date;
  meta.append(date,span('span','archive-tile-type',index===0?'Последнее в месяце':'Урок'));
  const title=span('h3','archive-tile-title',shownTitle);
  const tagline=span('p','archive-tile-subtitle',lesson.navSubtitle&&lesson.navSubtitle!==shownTitle?lesson.navSubtitle:lesson.summary||'Материалы занятия');
  const topics=span('div','archive-tile-topics');
  const availableTopics=(lesson.topics||[]).filter(t=>typeof t==='string'&&t.trim()).slice(0,2);
  for(const value of availableTopics)topics.append(span('span','archive-tile-topic',value));
  if((lesson.topics||[]).length>2)topics.append(span('span','archive-tile-more','+'+((lesson.topics||[]).length-2)));
  const go=span('span','archive-tile-open',href?'Открыть занятие ↗':'Материал уточняется');
  cardMain.append(meta,title,tagline,topics,go);
  card.append(cardMain);
  const m=lesson.materials||{};
  const resources=[['pdf','PDF'],['tex','TeX'],['lab','Интерактив'],['review','Ревью']]
    .map(([key,label])=>[localHref(m[key]),label]).filter(([url])=>url);
  if(resources.length){
    const footer=span('div','archive-tile-resources');
    for(const [url,label] of resources){
      const a=link(url,label,'archive-resource');
      a.setAttribute('aria-label',label+': '+shownTitle);
      footer.append(a);
    }
    card.append(footer);
  }
  card.dataset.search=normal([lesson.date,fullDate(lesson.date),shownTitle,lesson.navTitle,lesson.navSubtitle,lesson.summary,...(lesson.topics||[])].join(' '));
  return card;
}
export function groupLessonsByMonth(lessons){
  const grouped=new Map();
  for(const lesson of [...lessons].sort((a,b)=>b.date.localeCompare(a.date))){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(lesson.date))throw new Error('Invalid lesson date');
    const key=lesson.date.slice(0,7);
    if(!grouped.has(key))grouped.set(key,[]);
    grouped.get(key).push(lesson);
  }
  return grouped;
}
function makeSection(month,lessons){
  const section=span('section','archive-month');
  section.id='month-'+month;
  section.setAttribute('aria-labelledby','month-title-'+month);
  const head=span('header','archive-month-head');
  const count=span('span','archive-month-counter',String(lessons.length).padStart(2,'0')+' / '+plural(lessons.length,'занятие','занятия','занятий'));
  const heading=span('h2','archive-month-title',monthLabel(month));
  heading.id='month-title-'+month;
  head.append(heading,count);
  const grid=span('div','archive-month-grid');
  grid.dataset.month=month;
  grid.dataset.count=String(lessons.length);
  lessons.forEach((lesson,index)=>grid.append(tile(lesson,index)));
  section.append(head,grid);
  return section;
}
// Measure the tallest untruncated card and use that height across every month.
// Measurements are repeated at breakpoints and after web fonts load.
function equalizeTiles(){
  const root=$('archiveRoot');
  const tiles=[...root.querySelectorAll('.archive-tile')];
  const sections=[...root.querySelectorAll('.archive-month')];
  if(!tiles.length)return;
  const hiddenTiles=tiles.filter(card=>card.hidden);
  const hiddenSections=sections.filter(section=>section.hidden);
  for(const section of hiddenSections)section.hidden=false;
  for(const card of hiddenTiles)card.hidden=false;
  root.style.removeProperty('--archive-card-height');
  // Trigger layout at natural height, then apply one height to ALL monthly grids.
  const naturalHeight=Math.max(320,...tiles.map(card=>Math.ceil(card.scrollHeight)+2));
  root.style.setProperty('--archive-card-height',naturalHeight+'px');
  for(const card of hiddenTiles)card.hidden=true;
  for(const section of hiddenSections)section.hidden=true;
}

function render(){
  const months=groupLessonsByMonth(LESSONS);
  const nav=$('archiveMonths'),root=$('archiveRoot');
  $('archiveTotal').textContent=String(LESSONS.length);
  $('archiveMonthTotal').textContent=String(months.size);
  const sections=[],anchors=[];
  for(const [month,lessons] of months){
    const section=makeSection(month,lessons);
    const a=link('#month-'+month,monthLabel(month),'archive-month-link');
    a.append(span('span','archive-month-link-count',String(lessons.length).padStart(2,'0')));
    sections.push(section);anchors.push(a);
  }
  nav.replaceChildren(...anchors);
  root.replaceChildren(...sections);
  root.setAttribute('aria-busy','false');
  if(!LESSONS.length)root.textContent='Опубликованных занятий пока нет. Архив пополнится после первого занятия.';
  equalizeTiles();
  let frame=0;
  window.addEventListener('resize',()=>{
    cancelAnimationFrame(frame);
    frame=requestAnimationFrame(equalizeTiles);
  },{passive:true});
  document.fonts?.ready.then(equalizeTiles);
  function filter(){
    const query=normal($('archiveSearch').value);
    let visible=0,activeMonths=0;
    for(const section of sections){
      let count=0;
      for(const tile of section.querySelectorAll('.archive-tile')){
        const matched=tile.dataset.search.includes(query);
        tile.hidden=!matched;
        if(matched){visible++;count++;}
      }
      section.hidden=count===0;
      if(count)activeMonths++;
      const anchor=nav.querySelector('[href="#'+section.id+'"]');
      if(anchor)anchor.hidden=count===0;
    }
    $('archiveEmpty').hidden=visible!==0;
    $('archiveSearchStatus').textContent=query
      ?'Найдено: '+visible+' '+plural(visible,'занятие','занятия','занятий')+' в '+activeMonths+' '+plural(activeMonths,'месяце','месяцах','месяцах')
      :LESSONS.length+' '+plural(LESSONS.length,'занятие','занятия','занятий')+' · '+months.size+' '+plural(months.size,'месяц','месяца','месяцев');
  }
  $('archiveSearch').addEventListener('input',filter);
  filter();
}
const key='denis_ermolaev_atlas_theme';
function theme(value){
  if(value==='dark')document.body.removeAttribute('data-theme');
  else document.body.dataset.theme='light';
  $('archiveTheme').setAttribute('aria-label',value==='dark'?'Включить светлую тему':'Включить тёмную тему');
}
let current='light';
try{current=localStorage.getItem(key)==='dark'?'dark':'light';}catch(_){}
theme(current);
$('archiveTheme').addEventListener('click',()=>{
  current=current==='light'?'dark':'light';theme(current);
  try{localStorage.setItem(key,current);}catch(_){}
});
try{render();}catch(error){
  console.error('Не удалось загрузить архив занятий',error);
  $('archiveRoot').textContent='Архив временно недоступен. Вернитесь в учебный кабинет и попробуйте снова.';
  $('archiveRoot').setAttribute('aria-busy','false');
  $('archiveSearchStatus').textContent='Ошибка загрузки архива';
}
