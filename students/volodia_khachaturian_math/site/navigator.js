/* LEVIN / ATLAS · OGE mathematics. Canonical state is read-only. */
'use strict';
const SVG_NS='http://www.w3.org/2000/svg';
const LEVEL_TEXT=['0 · не изучено / нет оценки','1 · нужна помощь','2 · в процессе','3 · уверенно','4 · освоено'];
const q=id=>document.getElementById(id);
const state={contract:null,groups:[],items:[],byId:new Map(),levels:new Map(),cells:new Map(),rows:new Map(),groupDetails:new Map(),evidence:new Map(),filter:'all',search:'',selected:null,ready:false};
const basePath=relative=>{
  if(typeof relative!=='string'||!relative.startsWith('site/')||relative.includes('..')||!/^[A-Za-z0-9_./-]+$/.test(relative))throw Error('Недопустимый путь в контракте');
  return './'+relative.slice(5);
};
async function readJson(uri){
  const response=await fetch(uri,{cache:'no-store'});
  if(!response.ok)throw Error('HTTP '+response.status+' · '+uri);
  return response.json();
}
const svgEl=(tag,attrs={},text=null)=>{
  const node=document.createElementNS(SVG_NS,tag);
  for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));
  if(text!==null)node.textContent=String(text);
  return node;
};
const el=(tag,className='',content='')=>{
  const node=document.createElement(tag);
  if(className)node.className=className;
  node.textContent=content;
  return node;
};
const pad=n=>String(n).padStart(2,'0');
function polar(r,a){const t=(a-90)*Math.PI/180;return [390+r*Math.cos(t),390+r*Math.sin(t)];}
function wedge(inner,outer,start,end){
  const a=polar(outer,start),b=polar(outer,end),c=polar(inner,end),d=polar(inner,start);
  const large=end-start>180?1:0;
  return ['M',a[0],a[1],'A',outer,outer,0,large,1,b[0],b[1],'L',c[0],c[1],'A',inner,inner,0,large,0,d[0],d[1],'Z'].join(' ');
}
function getLevel(id){
  const entry=state.levels.get(id);
  if(entry===undefined||entry===null)return 0;
  const n=typeof entry==='object'?Number(entry.level):Number(entry);
  return Number.isInteger(n)&&n>=0&&n<=4?n:0;
}
function assessed(id){return state.levels.has(id);}
function matches(item){
  if(state.filter!=='all'&&String(getLevel(item.id))!==state.filter)return false;
  if(!state.search)return true;
  return (item.title+' '+item.group.name+' '+item.group.id+' '+item.id).toLocaleLowerCase('ru').includes(state.search);
}
function drawMap(){
  const svg=q('radialMap'),fragment=document.createDocumentFragment(),count=state.groups.length;
  const sector=360/count;
  fragment.append(svgEl('circle',{cx:390,cy:390,r:101,fill:'none',stroke:'var(--og-line)','stroke-width':1}));
  state.groups.forEach((group,groupIndex)=>{
    const start=groupIndex*sector,end=start+sector;
    fragment.append(svgEl('path',{d:wedge(102,331,start+.35,end-.35),class:'og-sector','aria-hidden':'true'}));
    const numberAt=polar(356,(start+end)/2);
    fragment.append(svgEl('text',{x:numberAt[0],y:numberAt[1],class:'og-sector-label','aria-hidden':'true'},pad(groupIndex+1)));
    const columns=Math.max(1,Math.ceil(group.items.length/7));
    group.items.forEach((item,j)=>{
      const band=Math.floor(j/columns),slot=j%columns;
      const gap=1.55;
      const a0=start+gap+(sector-2*gap)*slot/columns+.13;
      const a1=start+gap+(sector-2*gap)*(slot+1)/columns-.13;
      const inner=108+band*31,outer=inner+27;
      const cell=svgEl('path',{d:wedge(inner,outer,a0,a1),class:'og-cell',tabindex:0,role:'button','data-level':getLevel(item.id),'data-id':item.id,'aria-label':item.group.name+'. '+item.title+'. '+LEVEL_TEXT[getLevel(item.id)],'aria-pressed':'false'});
      cell.append(svgEl('title',{},item.title));
      cell.addEventListener('click',()=>selectItem(item.id,true));
      cell.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selectItem(item.id,true);}});
      cell.addEventListener('focus',()=>{q('dataStatus').textContent=group.name+' · '+item.title;});
      state.cells.set(item.id,cell);fragment.append(cell);
    });
  });
  fragment.append(svgEl('circle',{cx:390,cy:390,r:87,fill:'var(--og-surface)',stroke:'var(--og-line)','stroke-width':'1.3','aria-hidden':'true'}));
  fragment.append(svgEl('text',{x:390,y:370,class:'og-ring-label','aria-hidden':'true'},'МАТЕМАТИКА'));
  fragment.append(svgEl('text',{x:390,y:394,class:'og-ring-sub','aria-hidden':'true'},'ОГЭ · 9 КЛАСС'));
  fragment.append(svgEl('text',{x:390,y:419,class:'og-ring-sub','aria-hidden':'true'},state.items.length+' НАВЫКА'));
  svg.append(fragment);
}
function buildCatalog(){
  const host=q('topicCatalog'),fragment=document.createDocumentFragment();
  state.groups.forEach((group,i)=>{
    const block=document.createElement('details');block.className='og-group';
    block.id='group-'+group.id;
    const summary=document.createElement('summary');
    summary.append(el('span','og-group-no',pad(i+1)));
    const title=el('span','og-group-title',group.name);
    title.append(el('span','og-group-sub',group.items.length+' компетенций'));
    summary.append(title);block.append(summary);
    const list=el('div','og-items');
    group.items.forEach(item=>{
      const button=el('button','og-item');button.type='button';button.dataset.id=item.id;
      button.setAttribute('aria-pressed','false');
      button.append(el('span','og-item-level',String(getLevel(item.id))));
      button.append(el('span','',item.title));
      button.addEventListener('click',()=>selectItem(item.id,false));
      list.append(button);state.rows.set(item.id,button);
    });
    block.append(list);state.groupDetails.set(group.id,block);fragment.append(block);
  });
  host.replaceChildren(fragment);
}
function updateVisibility(){
  if(!state.ready)return;
  let visible=0,visibleGroups=0;
  for(const group of state.groups){
    let within=0;
    for(const item of group.items){
      const show=matches(item),button=state.rows.get(item.id),cell=state.cells.get(item.id);
      button.hidden=!show;cell.dataset.dim=String(!show);
      if(show){within++;visible++;}
    }
    const section=state.groupDetails.get(group.id);
    section.hidden=within===0;
    if(within){visibleGroups++;if(state.search)section.open=true;}
  }
  q('visibleCount').textContent=visible+' / '+state.items.length;
  q('searchStatus').textContent=visible+' навыков в '+visibleGroups+' разделах';
  q('levelFilters').querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===state.filter)));
}
function selectItem(id,fromMap){
  const item=state.byId.get(id);if(!item)return;
  state.selected=id;
  for(const [key,cell] of state.cells){const active=key===id;cell.dataset.active=String(active);cell.setAttribute('aria-pressed',String(active));}
  for(const [key,row] of state.rows){row.dataset.active=String(key===id);row.setAttribute('aria-pressed',String(key===id));}
  q('inspectorMeta').textContent=item.group.name+' / '+item.id;
  q('inspectorTitle').textContent=item.title;
  q('inspectorDescription').textContent='Отдельное умение из экзаменационного раздела. Для подтверждения уровня требуется самостоятельная работа и точное свидетельство результата.';
  q('inspectorLevel').hidden=false;
  q('inspectorLevelText').textContent=LEVEL_TEXT[getLevel(id)]+(assessed(id)?' · подтверждено':' · подтверждений нет');
  const evidenceHost=q('inspectorEvidence');evidenceHost.replaceChildren();
  const related=state.evidence.get(id)||[];
  if(!related.length){evidenceHost.textContent='Подтверждающих занятий пока нет. Цвет карты автоматически изменится после обновления канонических данных.';}
  else related.forEach(e=>{
    const line=el('p','',e.date+' · '+e.relation+' · ');
    if(e.href){
      const link=el('a','',e.title);
      link.href=e.href+'#'+e.anchor;line.append(link);
    }else line.append(document.createTextNode(e.title));
    evidenceHost.append(line);
  });
  if(fromMap){const section=state.groupDetails.get(item.group.id);section.open=true;}
}
function setTheme(){
  let saved=null;
  try{saved=localStorage.getItem('volodia-math-atlas-theme');}catch(_){}
  if(saved==='light'||saved==='dark')document.documentElement.dataset.theme=saved;
  q('themeToggle').addEventListener('click',()=>{
    const next=document.documentElement.dataset.theme==='dark'?'light':'dark';
    document.documentElement.dataset.theme=next;
    try{localStorage.setItem('volodia-math-atlas-theme',next);}catch(_){}
  });
}
function appendEmpty(host,message){
  host.replaceChildren(el('p','og-empty',message));
}
function renderLessons(lessons){
  const host=q('lessonList');host.replaceChildren();
  if(!lessons.length){appendEmpty(host,'В новом математическом кабинете ещё нет опубликованных занятий. После публикации первый урок появится здесь автоматически.');return;}
  for(const lesson of [...lessons].sort((a,b)=>b.date.localeCompare(a.date))){
    const article=el('article','og-lesson');
    article.append(el('small','',lesson.date.split('-').reverse().join('.')));
    const header=el('h3','',lesson.navTitle||lesson.title||'Занятие');article.append(header);
    article.append(el('p','',lesson.summary||lesson.navSubtitle||''));
    if(typeof lesson.href==='string'&&/^[\w.-]+\.html$/.test(lesson.href)){
      const link=el('a','','Открыть занятие');link.href=lesson.href;article.append(link);
    }
    host.append(article);
  }
}
function applyEvidence(lessons){
  for(const lesson of lessons){
    if(!Array.isArray(lesson.outcomes))continue;
    for(const outcome of lesson.outcomes){
      if(!state.byId.has(outcome.competencyId)||!outcome.evidenceAnchor||!['touched','practiced','assessed'].includes(outcome.relation))continue;
      const event={date:lesson.date,relation:outcome.relation,title:lesson.title||lesson.navTitle,anchor:outcome.evidenceAnchor,href:typeof lesson.href==='string'&&/^[\w.-]+\.html$/.test(lesson.href)?lesson.href:null};
      if(!state.evidence.has(outcome.competencyId))state.evidence.set(outcome.competencyId,[]);
      state.evidence.get(outcome.competencyId).push(event);
    }
  }
}
async function boot(){
  setTheme();
  q('levelFilters').addEventListener('click',event=>{
    const button=event.target.closest('button[data-filter]');if(!button||!state.ready)return;
    state.filter=button.dataset.filter;updateVisibility();
  });
  q('competencySearch').addEventListener('input',event=>{state.search=event.target.value.trim().toLocaleLowerCase('ru');updateVisibility();});
  try{
    const contract=await readJson('../student-contract.json');
    if(contract.studentId!=='volodia_khachaturian_math')throw Error('Несовпадение studentId');
    state.contract=contract;
    await new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src=basePath(contract.competencies.catalog);
      script.onload=resolve;script.onerror=()=>reject(Error('Не удалось загрузить каталог навыков'));
      document.head.append(script);
    });
    const data=window.COMPETENCY_MAP_DATA;
    if(!data||!Array.isArray(data.groups)||!data.groups.length||data.student!==contract.studentId)throw Error('Каталог компетенций повреждён');
    const authority=await import(basePath(contract.competencies.mastery));
    const raw=authority.mastery??authority.default;
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Каноническое состояние освоения недоступно');
    state.levels=new Map(Object.entries(raw));
    state.groups=data.groups;
    const seen=new Set();
    for(const group of state.groups){
      if(!Array.isArray(group.items)||!group.id||!group.name)throw Error('Некорректный тематический раздел');
      for(const item of group.items){
        if(!item.id||!item.title||seen.has(item.id))throw Error('Дублирующаяся или пустая competency ID');
        seen.add(item.id);item.group=group;state.items.push(item);state.byId.set(item.id,item);
      }
    }
    q('statGroups').textContent=state.groups.length;
    q('statTotal').textContent=state.items.length;
    q('statEvidence').textContent=state.items.filter(i=>assessed(i.id)).length;
    drawMap();buildCatalog();state.ready=true;updateVisibility();
    q('dataStatus').textContent='Уровни считываются из канонического источника · изменения фильтров их не затрагивают';
  }catch(error){
    q('dataStatus').textContent='Ошибка данных: '+error.message+'. Карта не может достоверно отобразить освоение.';
    appendEmpty(q('topicCatalog'),'Не удалось загрузить программу. Проверьте student-contract.json и источники компетенций.');
    q('statEvidence').textContent='—';
    console.error('OGE atlas:',error);
  }
  try{
    if(!state.contract){renderLessons([]);q('planningText').textContent='Маршрут недоступен до восстановления данных.';return;}
    const registry=await import(basePath(state.contract.lessons.registry));
    const lessons=Array.isArray(registry.LESSONS)?registry.LESSONS:[];
    renderLessons(lessons);applyEvidence(lessons);
    const plan=await readJson(basePath(state.contract.planning.plan));
    const progress=await readJson(basePath(state.contract.planning.state));
    if(plan.studentId!==state.contract.studentId||progress.studentId!==state.contract.studentId||plan.programVersion!==progress.programVersion)throw Error('несовпадение KTP contract');
    const completed=Object.values(progress.records||{}).filter(item=>item.status==='done').length;
    q('planningText').textContent=plan.lessons.length?('В маршруте '+plan.lessons.length+' занятий; завершено '+completed+'. Все отметки поступают из канонического состояния.'):'Персональный календарно-тематический план будет сформирован после входной диагностики. Уровни знаний пока не оценены.';
  }catch(error){renderLessons([]);q('planningText').textContent='Сведения о маршруте временно недоступны: '+error.message;}
}
boot();
