// Student Platform v2 — render data exclusively from student-contract paths.
import {LESSONS,sortedLessons} from './lesson-registry.js';
const $=id=>document.getElementById(id);
const validatePath=p=>{if(!/^site\/[A-Za-z0-9_./-]+$/.test(p)||p.includes('..'))throw new Error('Недопустимый путь в student-contract');return new URL('../'+p,import.meta.url)};
async function readJson(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(`${r.status}: ${url}`);return r.json()}
function renderJournal(plan,state){
  const root=$('lessonJournal'),route=$('routeSummary');
  root.replaceChildren();
  const recent=sortedLessons(LESSONS);
  if(!recent.length){const p=document.createElement('p');p.textContent='Опубликованных занятий пока нет. Входная диагностическая работа представлена в отдельном разделе выше.';root.appendChild(p);}
  else for(const l of recent.slice(0,5)){
    const row=document.createElement('div');row.className='journal-row';
    const link=document.createElement('a');link.href=l.href;link.textContent=l.title;
    const note=document.createElement('small');note.textContent=l.date+' · '+(l.summary||'');
    row.append(link,note);root.appendChild(row);
  }
  route.replaceChildren();
  const p=document.createElement('p');
  p.textContent=plan.lessons.length?`В плане ${plan.lessons.length} занятий, из них ${Object.values(state.records||{}).filter(r=>r.status==='done').length} завершено.`:'Индивидуальный календарно-тематический план ещё формируется. Подтверждённых завершённых занятий пока нет.';
  route.appendChild(p);
}
async function bootstrap(){
 try{
  const contract=await readJson(new URL('../student-contract.json',import.meta.url));
  if(contract.version!==2||contract.studentId!=='sofya_luzianina')throw new Error('Неверная версия контракта или studentId');
  const [catalog,mastery,plan,state]=await Promise.all([
   readJson(validatePath(contract.competencies.catalog)),readJson(validatePath(contract.competencies.mastery)),
   readJson(validatePath(contract.planning.plan)),readJson(validatePath(contract.planning.state))
  ]);
  if(plan.studentId!==contract.studentId||state.studentId!==contract.studentId||plan.programVersion!==state.programVersion)throw new Error('Несогласованные данные КТП');
  if(mastery.studentId!==contract.studentId||catalog.studentId!==contract.studentId)throw new Error('Несогласованные данные компетенций');
  window.SOFYA_CATALOG=catalog;window.SOFYA_MASTERY=mastery;
  renderJournal(plan,state);
  startMap();
 }catch(error){console.error('Ошибка загрузки Student Platform v2',error);$('catalogCount').textContent='Учебные данные временно недоступны';$('mapLive').textContent='Ошибка загрузки карты';$('lessonJournal').textContent='Не удалось прочитать реестр занятий';$('routeSummary').textContent='Не удалось прочитать КТП';$('detailTitle').textContent='Данные недоступны';$('detailExplain').textContent=error.message;}
}
// Coverage is a presentation-only projection of published lesson evidence, never a mastery claim.
export function recentCoverage(lessons, limit=3) {
  const recent=[...lessons].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,limit);
  const byId=new Map(), rank={touched:1,practiced:2,assessed:3};
  for(const lesson of recent) for(const outcome of lesson.outcomes||[]){
    if(!outcome.competencyId || !outcome.evidenceAnchor || !Object.hasOwn(rank,outcome.relation))continue;
    const id=outcome.competencyId;
    if(!byId.has(id))byId.set(id,{relation:outcome.relation,entries:[]});
    const item=byId.get(id);
    if(rank[outcome.relation]>rank[item.relation])item.relation=outcome.relation;
    if(!item.entries.some(e=>e.date===lesson.date&&e.anchor===outcome.evidenceAnchor&&e.relation===outcome.relation))
      item.entries.push({date:lesson.date,title:lesson.title,href:lesson.href,anchor:outcome.evidenceAnchor,relation:outcome.relation});
  }
  return {recent,byId};
}
function startMap(){
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const catalog = window.SOFYA_CATALOG;
  const authority = window.SOFYA_MASTERY;
  const svg = $('radialMap');
  const tooltip = $('tooltip');
  const ns = 'http://www.w3.org/2000/svg';
  const statuses = ['Не изучено','Нужна помощь','В процессе','Уверенно','Освоено'];
  const descriptions = [
    'Тема пока не изучалась. Этот статус должен быть подтверждён учебным состоянием.',
    'Метод требует существенной помощи и повторения.',
    'Основная идея понятна, но решение остаётся нестабильным.',
    'Типовые задания выполняются самостоятельно.',
    'Навык устойчиво проявляется в смешанных задачах и отсроченной проверке.'
  ];
  if (!catalog || !authority || catalog.studentId !== 'sofya_luzianina' || authority.studentId !== catalog.studentId || !Array.isArray(catalog.groups) || !authority.levels || typeof authority.levels !== 'object') {
    $('detailTitle').textContent = 'Источник данных недоступен';
    $('detailExplain').textContent = 'Не удалось загрузить корректный каталог или состояние компетенций. Проверьте оба файла данных.';
    $('catalogCount').textContent = 'Ошибка загрузки учебных данных.';
    $('mapLive').textContent = 'Ошибка загрузки учебных данных.';
    return;
  }
  const sectors = [
    {id:'mechanics',code:'ME',label:'Механика',short:'МЕХ'},
    {id:'thermo',code:'TH',label:'Молекулярная физика и термодинамика',short:'МКТ'},
    {id:'electricity',code:'EL',label:'Электродинамика',short:'ЭЛ'},
    {id:'quantum',code:'QU',label:'Квантовая физика',short:'КВ'},
    {id:'methods',code:'MD',label:'Методы физики и экзаменационные навыки',short:'МЕТОД'}
  ];
  const byId = new Map();
  const bySector = new Map(sectors.map(s => [s.id, []]));
  const focusById = new Map((catalog.diagnosticFocus || []).map(e => [e.competencyId, e]));
  const cells = new Map();
  const rows = new Map();
  let selectedId = null;
  let filter = 'all';
  let term = '';
  let sectorFilter = 'all';
  const all = catalog.groups.flatMap(group => (group.items || []).map(item => {
    const record = { ...item, groupId: group.id, groupName: group.name, sectorId: group.sectorId, sectorName: group.sectorName };
    if (byId.has(record.id) || !bySector.has(record.sectorId)) throw new Error('Некорректный каталог: ' + record.id);
    byId.set(record.id, record);
    bySector.get(record.sectorId).push(record);
    return record;
  }));
  const coverage=recentCoverage(LESSONS);
  const coverageLabels={touched:'Рассмотрено',practiced:'Отработано',assessed:'Оценивалось'};
  const coverageOf=id=>coverage.byId.get(id)?.relation||null;
  const coverageLabel=id=>coverageLabels[coverageOf(id)]||'';
  function levelOf(id) {
    if (!Object.prototype.hasOwnProperty.call(authority.levels, id)) return null;
    const entry = authority.levels[id];
    const value = typeof entry === 'object' && entry !== null ? entry.level : entry;
    return Number.isInteger(value) && value >= 0 && value <= 4 ? value : null;
  }
  function labelOf(id) { const v=levelOf(id);return v === null ? 'Уровень не установлен' : `${v} — ${statuses[v]}`; }
  function safeText(value) { return String(value ?? ''); }
  function setText(id, text) { $(id).textContent = safeText(text); }
  function elt(type,attrs={},textValue=null) { const el=document.createElement(type);for(const [k,v] of Object.entries(attrs)){if (k==='className')el.className=v;else el.setAttribute(k,safeText(v));}if(textValue!==null)el.textContent=safeText(textValue);return el; }
  function selt(type,attrs={},textValue=null){const e=document.createElementNS(ns,type);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,safeText(v));if(textValue!==null)e.textContent=safeText(textValue);return e;}
  function polar(r, angle) {const a=(angle-90)*Math.PI/180;return {x:500+r*Math.cos(a),y:500+r*Math.sin(a)};}
  function path(inner,outer,start,end){const p1=polar(outer,start),p2=polar(outer,end),p3=polar(inner,end),p4=polar(inner,start);const f=(end-start)>180?1:0;return `M${p1.x.toFixed(3)},${p1.y.toFixed(3)} A${outer},${outer} 0 ${f},1 ${p2.x.toFixed(3)},${p2.y.toFixed(3)} L${p3.x.toFixed(3)},${p3.y.toFixed(3)} A${inner},${inner} 0 ${f},0 ${p4.x.toFixed(3)},${p4.y.toFixed(3)} Z`;}
  function matches(item){
    const v=levelOf(item.id);
    const byState=filter==='all'||(filter==='recent'&&coverageOf(item.id)!==null)||(filter==='recent-practiced'&&coverageOf(item.id)==='practiced')||(filter==='recent-touched'&&coverageOf(item.id)==='touched')||(filter==='unassessed'&&v===null)||(filter==='focus'&&focusById.has(item.id))||(String(v)===filter);
    const byArea=sectorFilter==='all'||item.sectorId===sectorFilter;
    const q=term.trim().toLocaleLowerCase('ru');
    const byQuery=!q || `${item.title} ${item.groupName} ${item.sectorName}`.toLocaleLowerCase('ru').includes(q);
    return byState&&byArea&&byQuery;
  }
  function viewLabel(item){return `${item.title}. ${item.groupName}. ${labelOf(item.id)}${focusById.has(item.id)?'. Указано в диагностике':''}${coverageOf(item.id)?'. '+coverageLabel(item.id)+' за последние занятия':''}.`}
  function buildMap(){
    const usable=360-sectors.length*9;
    const total=all.length;
    let sectorStart=2;
    for (const sector of sectors){
      const items=bySector.get(sector.id);
      const span=usable*items.length/total;
      const sectorEnd=sectorStart+span;
      const guide=selt('path',{d:path(157,403,sectorStart,sectorEnd),class:'sector-band','aria-hidden':'true'});
      svg.appendChild(guide);
      const colCount=Math.ceil(items.length/4);
      const band=span/colCount;
      items.forEach((item,i)=>{
        const ring=Math.floor(i/colCount);
        const col=i%colCount;
        const inner=170+ring*57, outer=218+ring*57;
        const inset=Math.min(.32,band*.11);
        const node=selt('path',{'class':'cell',d:path(inner,outer,sectorStart+col*band+inset,sectorStart+(col+1)*band-inset),tabindex:'0',role:'button','aria-label':viewLabel(item),'data-id':item.id,'aria-pressed':'false','data-level':levelOf(item.id)===null?'unassessed':String(levelOf(item.id))});
        node.appendChild(selt('title',{},viewLabel(item)));
        if(coverageOf(item.id))node.setAttribute('data-coverage',coverageOf(item.id));
        if(focusById.has(item.id))node.classList.add('is-focused');
        node.addEventListener('click',()=>choose(item.id,'map'));
        node.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();choose(item.id,'map')}else if(event.key==='Escape'){tooltip.style.display='none'}});
        node.addEventListener('focus',()=>{choose(item.id,'map');tooltip.style.display='none'});
        node.addEventListener('pointermove',event=>showTooltip(event,item));
        node.addEventListener('pointerleave',()=>tooltip.style.display='none');
        cells.set(item.id,node);svg.appendChild(node);
      });
      const mid=sectorStart+span/2;
      const labelPt=polar(430,mid);
      svg.appendChild(selt('text',{x:labelPt.x.toFixed(2),y:labelPt.y.toFixed(2),'class':'map-sector-label','aria-hidden':'true'},sector.short));
      sectorStart=sectorEnd+9;
    }
    const circle=selt('circle',{cx:'500',cy:'500',r:'149',fill:'none',stroke:'var(--rule-dark)','stroke-width':'1','stroke-dasharray':'2 6','aria-hidden':'true'});
    svg.insertBefore(circle,svg.firstChild);
  }
  function buildAreas(){
    const legend=$('areaLegend'),selector=$('areaSelect');
    for(const sector of sectors){
      const items=bySector.get(sector.id);
      const option=elt('option',{value:sector.id},sector.label);selector.appendChild(option);
      const btn=elt('button',{type:'button',className:'area','data-sector':sector.id,'data-active':'false','aria-pressed':'false'});
      btn.append(elt('span',{className:'meta'},sector.code+' / '+sector.short),elt('b',{},items.length),elt('span',{},sector.label),elt('small',{},'умений'));
      btn.addEventListener('click',()=>{sectorFilter=sectorFilter===sector.id?'all':sector.id;selector.value=sectorFilter;updateFilters();$('map').scrollIntoView({behavior:'smooth',block:'start'});});
      legend.appendChild(btn);
    }
  }
  function buildCatalog(){
    const host=$('topicIndex');
    catalog.groups.forEach((group,i)=>{
      const details=elt('details',{className:'topic-group','data-sector':group.sectorId});
      if(i===0 || group.id==='heat' || group.id==='optics' || group.id==='photons')details.open=true;
      const summary=elt('summary');
      summary.append(elt('h3',{},group.name),elt('small',{},`${String(group.items.length).padStart(2,'0')} умений`));
      const list=elt('ul',{className:'comp-list'});
      group.items.forEach(item=>{
        const li=elt('li',{'data-id':item.id});
        const button=elt('button',{className:'comp',type:'button','aria-current':'false','data-level':levelOf(item.id)===null?'unassessed':String(levelOf(item.id))});
        button.append(elt('i',{className:'dot','aria-hidden':'true'}),elt('span',{className:'comp-name'},item.title));
        const mark=focusById.has(item.id)?elt('span',{className:'focus-mark'},'ФОКУС'):elt('small',{},levelOf(item.id)===null?'—':String(levelOf(item.id)));
        const marks=elt('span',{className:'comp-marks'});
        marks.append(mark);
        if(coverageOf(item.id))marks.append(elt('span',{className:'coverage-mark'},coverageLabel(item.id)));
        button.append(marks);
        button.setAttribute('aria-label',viewLabel(byId.get(item.id)));
        button.addEventListener('click',()=>choose(item.id,'list'));
        li.appendChild(button);list.appendChild(li);rows.set(item.id,{li,button,details});
      });
      details.append(summary,list);host.appendChild(details);
    });
  }
  function buildDiagnostics(){
    const host=$('diagnosticCards');
    const tags={heat_07:'Основной блок',optics_08:'Опережающий блок',photons_02:'Опережающий блок'};
    catalog.diagnosticFocus.forEach(f=>{
      const item=byId.get(f.competencyId);if(!item)return;
      const card=elt('article',{className:'diag'});
      card.append(elt('p',{className:'meta'},tags[f.competencyId]||'Диагностика'),elt('span',{className:'diag-num'},'№ '+f.task),elt('h3',{},item.title),elt('p',{},f.note));
      const btn=elt('button',{type:'button'},'Найти на карте');btn.addEventListener('click',()=>{filter='all';sectorFilter='all';term='';$('searchInput').value='';$('areaSelect').value='all';syncFilterControls();updateFilters();choose(item.id,'diag');$('map').scrollIntoView({behavior:'smooth',block:'start'});});
      card.append(btn);host.appendChild(card);
    });
  }
  function showTooltip(event,item){
    tooltip.replaceChildren(elt('strong',{},item.title),elt('small',{},`${item.groupName} · ${labelOf(item.id)}${coverageOf(item.id)?' · '+coverageLabel(item.id):''}`));
    const x=Math.min(event.clientX+14,window.innerWidth-305),y=Math.min(event.clientY+12,window.innerHeight-85);
    tooltip.style.left=Math.max(12,x)+'px';tooltip.style.top=Math.max(8,y)+'px';tooltip.style.display='block';
  }
  function choose(id,origin){
    const item=byId.get(id);if(!item)return;
    selectedId=id;
    for(const [cid,node] of cells){node.classList.toggle('is-selected',cid===id);node.setAttribute('aria-pressed',cid===id?'true':'false');}
    for(const [cid,entry] of rows)entry.button.setAttribute('aria-current',cid===id?'true':'false');
    setText('detailGroup',item.sectorName+' / '+item.groupName);
    setText('detailTitle',item.title);
    setText('detailLevel',labelOf(id));
    const value=levelOf(id);
    setText('detailExplain',value===null?'Пока отсутствует подтверждённый уровень освоения этого умения. После проверочной работы или занятия он появится в каноническом состоянии.':descriptions[value]);
    setText('detailId','ТЕМА / '+item.groupName);
    const evidence=$('detailEvidence');evidence.replaceChildren();
    const diag=focusById.get(id);
    if(diag){
      const section=elt('div',{className:'evidence'});
      section.append(
        elt('strong',{},'Диагностический ориентир · № '+diag.task),
        elt('p',{},diag.note),
        elt('p',{},'Исходный разбор хранится в материалах ученицы. Доступ определяется настройками хранилища.')
      );
      evidence.appendChild(section);
    }
    const lessonEvidence=coverage.byId.get(id);
    if(lessonEvidence){
      const section=elt('div',{className:'evidence'});
      section.append(elt('strong',{},'Учебный охват · '+coverageLabel(id)),elt('p',{},'Связи с последними опубликованными занятиями. Подтверждённая оценка отображается отдельно.'));
      for(const entry of lessonEvidence.entries){
        if(!/^\d{2}\.\d{2}\.\d{2}\.html$/.test(entry.href)||! /^[A-Za-z][A-Za-z0-9_-]*$/.test(entry.anchor))continue;
        section.append(elt('a',{className:'coverage-link',href:entry.href+'#'+entry.anchor},entry.date+' · '+coverageLabels[entry.relation]+' · '+entry.title));
      }
      evidence.appendChild(section);
    }
    const claim=authority.levels[id];
    if(value!==null && claim && typeof claim==='object'){
      const div=elt('div',{className:'evidence'});
      div.append(elt('strong',{},'Основание подтверждённой оценки'));
      if(claim.basis)div.append(elt('p',{},claim.basis));
      if(claim.sourceKind){
        const sourceLabels={'lesson-assessment':'проверенная работа','teacher-mastery':'оценка преподавателя','teacher-seed':'запись преподавателя','baseline-levels':'начальная проверка','mastery-authority':'подтверждённая оценка','linked-progress-overlay':'результаты практики','stage04-mastery':'закрепление навыка','dashboard-data':'учебный журнал'};
        div.append(elt('small',{},'Подтверждение: '+(sourceLabels[claim.sourceKind]||'учебная проверка')));
      }
      evidence.appendChild(div);
    }
    setText('mapLive','Выбрано: '+viewLabel(item));
    if(origin==='list'&&window.matchMedia('(max-width:820px)').matches)$('details').scrollIntoView({behavior:'smooth',block:'start'});
  }
  function syncFilterControls(){document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.filter===filter?'true':'false'));}
  function updateFilters(){
    let visible=0;
    for(const item of all){
      const ok=matches(item);if(ok)visible++;
      cells.get(item.id).classList.toggle('is-dimmed',!ok);
      const row=rows.get(item.id);row.li.hidden=!ok;
    }
    for(const d of $('topicIndex').children){
      // Match by actual visible descendants to avoid positional assumptions.
      const hasVisible=Array.from(d.querySelectorAll('li')).some(li=>!li.hidden);
      d.hidden=!hasVisible;
      if(term.trim()&&hasVisible)d.open=true;
    }
    $('areaLegend').querySelectorAll('button').forEach(b=>{const active=b.dataset.sector===sectorFilter;b.dataset.active=String(active);b.setAttribute('aria-pressed',String(active));});
    setText('catalogCount',`${visible} из ${all.length} умений соответствуют выбранным условиям.`);
    setText('mapCount',visible);
    setText('mapCountCaption',visible===all.length?'всего умений':'в текущем фильтре');
    if(selectedId && !matches(byId.get(selectedId)))setText('mapLive','Выбранный навык остался в деталях. Текущий фильтр его скрывает в индексе.');
  }
  function attach(){
    $('searchInput').addEventListener('input',event=>{term=event.target.value;updateFilters()});
    $('areaSelect').addEventListener('change',event=>{sectorFilter=event.target.value;updateFilters()});
    document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;syncFilterControls();updateFilters()}));
    const toggle=$('themeToggle');const key='sofya-luzianina-atlas-theme';
    try{const stored=localStorage.getItem(key);if(stored==='dark'||stored==='light')document.documentElement.dataset.theme=stored;else if(window.matchMedia('(prefers-color-scheme: dark)').matches)document.documentElement.dataset.theme='dark'}catch(_){ /* storage may be disabled */ }
    const paint=()=>{const isDark=document.documentElement.dataset.theme==='dark';toggle.setAttribute('aria-pressed',String(isDark));toggle.setAttribute('aria-label',isDark?'Включить светлую тему':'Включить тёмную тему');};
    toggle.addEventListener('click',()=>{document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';paint();try{localStorage.setItem(key,document.documentElement.dataset.theme)}catch(_){}});
    window.addEventListener('storage',event=>{if(event.key===key&&(event.newValue==='dark'||event.newValue==='light')){document.documentElement.dataset.theme=event.newValue;paint();}});
    paint();
  }
  function init(){
    buildMap();buildAreas();buildCatalog();buildDiagnostics();attach();
    setText('skillsTotal',all.length);setText('groupsTotal',catalog.groups.length);
    setText('assessedTotal',all.filter(i=>levelOf(i.id)!==null).length);
    setText('focusTotal',catalog.diagnosticFocus.length);
    const covered=all.filter(i=>coverageOf(i.id)!==null);
    const counts={practiced:0,touched:0,assessed:0};
    for(const i of covered)counts[coverageOf(i.id)]++;
    const dates=coverage.recent.map(l=>l.date.split('-').reverse().join('.')).join(', ');
    setText('coverageSummary',coverage.recent.length?'Последние занятия: '+dates+'. Учебный охват: '+covered.length+' из '+all.length+' умений; отработано '+counts.practiced+', рассмотрено '+counts.touched+(counts.assessed?', оценивалось '+counts.assessed:'')+'. Уровни освоения учитываются отдельно.':'Опубликованных занятий для расчёта охвата пока нет.');
    updateFilters();choose(catalog.diagnosticFocus[0]?.competencyId || all[0]?.id,'init');
  }
  try {init()}catch(err){console.error('Heatmap render error',err);setText('catalogCount','Ошибка построения карты: проверьте каталог и данные.');setText('mapLive','Ошибка построения карты.');}
})();
}
void bootstrap();
