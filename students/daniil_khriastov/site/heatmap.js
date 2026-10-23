(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const labels = ['Не изучено','Нужна помощь','В процессе','Уверенно','Освоено'];
  const descriptions = [
    'Тема ещё не изучалась или подтверждено отсутствие освоения.',
    'При решении требуется существенная помощь.',
    'Метод знаком, но результат пока нестабилен.',
    'Типовые задания выполняются самостоятельно.',
    'Навык устойчив в смешанных и отсроченных заданиях.'
  ];
  const $ = id => document.getElementById(id);
  const state = {items:[], byId:new Map(), groups:[], levels:{}, selected:null, mapFocus:null, lastSelectionSource:null, filter:'all', query:'', lessons:[], contract:null, isReady:false, evidenceRequest:0};
  const els = {svg:$('radialMap'), catalog:$('catalogList'), status:$('dataStatus'), filters:$('filters')};
  const safePath = p => typeof p==='string' && /^site\/[a-zA-Z0-9/_\-.]+$/.test(p) && !p.split('/').includes('..');
  const siteUrl = p => new URL('../'+p, location.href).href;
  const msg = (node,text) => {node.textContent=text;};
  const append = (parent,tag,text,cls) => {
    const node=document.createElement(tag);
    if(text!==undefined)node.textContent=String(text);
    if(cls)node.className=cls;
    parent.append(node);return node;
  };
  const svgNode = (tag,attrs,parent) => {
    const el=document.createElementNS(NS,tag);
    Object.entries(attrs||{}).forEach(([k,v])=>el.setAttribute(k,String(v)));
    parent.append(el);return el;
  };
  async function json(path){
    if(!safePath(path))throw Error('Неверный путь данных в контракте: '+String(path));
    const res=await fetch(siteUrl(path),{cache:'no-store'});
    if(!res.ok)throw Error('Не удалось загрузить '+path+' (HTTP '+res.status+')');
    return res.json();
  }
  async function moduleData(path){
    if(!safePath(path))throw Error('Неверный путь данных в контракте');
    if(path.endsWith('.json'))return json(path);
    if(!path.endsWith('.js'))throw Error('Неподдерживаемый формат данных '+path);
    return import(siteUrl(path));
  }
  async function catalogData(path){
    if(!safePath(path) || !path.endsWith('.js'))throw Error('Неверный путь каталога');
    await new Promise((resolve,reject)=>{
      const node=document.createElement('script');
      node.src=siteUrl(path);node.onload=resolve;node.onerror=()=>reject(Error('Каталог компетенций недоступен'));document.head.append(node);
    });
    const data=window.COMPETENCY_MAP_DATA;
    if(!data || !Array.isArray(data.groups))throw Error('Некорректный формат каталога компетенций');
    return data;
  }
  function normalizeMastery(raw){
    const source=raw.levels && typeof raw.levels==='object' ? raw.levels : (raw.mastery || raw.default || raw);
    if(!source || typeof source!=='object' || Array.isArray(source))throw Error('Некорректный mastery state');
    const levels={};
    for(const [id,entry] of Object.entries(source)){
      const value=typeof entry==='number'?entry:entry && entry.level;
      if(!Number.isInteger(value) || value<0 || value>4)throw Error('Некорректный уровень для '+id);
      levels[id]={level:value,sourcePath:entry && entry.sourcePath || '',basis:entry && entry.basis || ''};
    }
    return levels;
  }
  const level=id => state.levels[id]===undefined?null:state.levels[id].level;
  const levelName=value => value===null?'Нет подтверждённой оценки':labels[value];
  const chosen = item => state.selected===item.id;
  const visible = item => (state.filter==='all' || (state.filter==='unknown'?level(item.id)===null:String(level(item.id))===state.filter)) && (!state.query || (item.title+' '+item.group.name+' '+item.id).toLocaleLowerCase('ru').includes(state.query));
  function polar(radius,angle){
    const rad=(angle-90)*Math.PI/180;
    return {x:420+radius*Math.cos(rad),y:420+radius*Math.sin(rad)};
  }
  function arc(inner,outer,start,end){
    const a=polar(outer,start),b=polar(outer,end),c=polar(inner,end),d=polar(inner,start);
    const large=end-start>180?1:0;
    return 'M '+a.x.toFixed(2)+' '+a.y.toFixed(2)+' A '+outer+' '+outer+' 0 '+large+' 1 '+b.x.toFixed(2)+' '+b.y.toFixed(2)+' L '+c.x.toFixed(2)+' '+c.y.toFixed(2)+' A '+inner+' '+inner+' 0 '+large+' 0 '+d.x.toFixed(2)+' '+d.y.toFixed(2)+' Z';
  }
  function renderMap(){
    const svg=els.svg;
    [...svg.children].filter(node=>!['title','desc'].includes(node.tagName.toLowerCase())).forEach(el=>el.remove());
    svgNode('circle',{cx:420,cy:420,r:342,class:'radial-outline'},svg);
    if(state.items.length){
      const ringCount=Math.min(14,Math.max(5,Math.ceil(Math.sqrt(state.items.length/1.6))));
      const total=state.items.length;
      const gap=Math.min(1.4,20/state.groups.length);
      let start=0;
      state.groups.forEach((g,index)=>{
        const span=360*g.items.length/total;
        const columns=Math.ceil(g.items.length/ringCount);
        const sectorStart=start+gap,sectorEnd=start+span-gap;
        const step=(sectorEnd-sectorStart)/columns;
        g.items.forEach((item,i)=>{
          const row=i%ringCount,col=Math.floor(i/ringCount),rIn=110+row*220/ringCount,rOut=110+(row+1)*220/ringCount-2;
          const d=arc(rIn,rOut,sectorStart+col*step+.15,sectorStart+(col+1)*step-.15);
          const attributes={d,class:'radial-cell',tabindex:'-1',role:'button','data-id':item.id,'data-level':level(item.id)===null?'unknown':level(item.id),'aria-label':item.title+'; '+g.name+'; '+levelName(level(item.id))};
          const path=svgNode('path',attributes,svg);
          svgNode('title',{},path).textContent=item.title+' — '+levelName(level(item.id));
        });
        if(span>12){
          const mid=polar(367,start+span/2);
          svgNode('text',{x:mid.x.toFixed(2),y:mid.y.toFixed(2),class:'radial-label',dy:'.3em','aria-hidden':'true'},svg).textContent=String(index+1).padStart(2,'0');
        }
        start+=span;
      });
    }
    svgNode('circle',{cx:420,cy:420,r:106,class:'radial-center'},svg);
    svgNode('text',{x:420,y:406,class:'radial-center-primary'},svg).textContent=state.items.length||'—';
    svgNode('text',{x:420,y:434,class:'radial-center-small'},svg).textContent='НАВЫКОВ';
    svgNode('text',{x:420,y:454,class:'radial-center-caption'},svg).textContent=Object.keys(state.levels).filter(id=>state.items.some(x=>x.id===id)).length+' имеют оценку';
    refreshMapState();
  }
  function refreshMapState(){
    const all=[...els.svg.querySelectorAll('.radial-cell')];
    const available=all.filter(path=>visible(state.byId.get(path.dataset.id)));
    if(!available.some(path=>path.dataset.id===state.mapFocus))state.mapFocus=available[0]?.dataset.id||null;
    all.forEach(path=>{
      const id=path.dataset.id,item=state.byId.get(id);
      const show=visible(item);
      path.classList.toggle('is-dim',!show);
      path.setAttribute('tabindex',show&&id===state.mapFocus?'0':'-1');
      path.setAttribute('aria-hidden',String(!show));
      path.classList.toggle('is-active',state.selected===id);
      path.setAttribute('aria-pressed',String(state.selected===id));
    });
    els.catalog.querySelectorAll('.atlas-item').forEach(button=>{
      const item=state.byId.get(button.dataset.id);
      button.hidden=!visible(item);
      button.classList.toggle('is-active',chosen(item));
      button.setAttribute('aria-pressed',String(chosen(item)));
    });
    els.catalog.querySelectorAll('details').forEach(d=>{
      const hits=[...d.querySelectorAll('.atlas-item')].filter(x=>!x.hidden).length;
      d.hidden=hits===0;
      if(state.query && hits)d.open=true;
    });
    $('visibleCount').textContent=state.items.filter(visible).length+' / '+state.items.length;
    $('catalogCount').textContent=state.items.length+' ЗАПИСЕЙ';
    $('totalCount').textContent=state.items.length;
  }
  function renderCatalog(){
    els.catalog.replaceChildren();
    if(!state.groups.length){
      append(els.catalog,'p','Каталог программы ещё формируется. Учебная карта автоматически отобразит навыки после утверждения программы и публикации канонического каталога.','atlas-empty');
      return;
    }
    state.groups.forEach((g,i)=>{
      const details=append(els.catalog,'details');
      details.open=i===0;
      const summary=append(details,'summary');
      append(summary,'span',String(i+1).padStart(2,'0')+' / '+g.name);
      append(summary,'small',g.items.length+' навыков');
      const box=append(details,'div',undefined,'atlas-items');
      g.items.forEach(item=>{
        const button=append(box,'button',undefined,'atlas-item');
        button.type='button';button.dataset.id=item.id;button.dataset.level=level(item.id)===null?'unknown':String(level(item.id));
        button.setAttribute('aria-pressed','false');
        append(button,'i').setAttribute('aria-hidden','true');
        append(button,'span',item.title);
        append(button,'strong',level(item.id)===null?'—':level(item.id)+'/4');
      });
    });
    refreshMapState();
  }
  function showDetail(item){
    msg($('detailGroup'),item.group.name);
    msg($('detailTitle'),item.title);
    msg($('detailSummary'),item.description || item.diagnostic || 'Описание проверки навыка будет добавлено в каталог программы.');
    msg($('detailLevel'),level(item.id)===null?'Без оценки':level(item.id)+' / 4 · '+levelName(level(item.id)));
    msg($('detailId'),item.id);
    const ev=$('detailEvidence');ev.replaceChildren();
    const value=level(item.id),record=state.levels[item.id];
    append(ev,'strong',value===null?'Подтверждение освоения':'Что означает уровень');
    append(ev,'p',value===null?'Оценка навыка пока отсутствует. Этот статус не равен уровню 0.':descriptions[value]);
    if(record && record.basis)append(ev,'p',record.basis);
    if(record && record.sourcePath){
      const request=++state.evidenceRequest;
      append(ev,'p','Проверяем подтверждающее занятие…','atlas-muted');
      verifyEvidence(item,record,request);
    }else state.evidenceRequest++;
  }
  async function verifyEvidence(item,record,request){
    const ev=$('detailEvidence');
    try{
      if(!safePath(record.sourcePath)||!record.sourcePath.endsWith('.lesson.json'))throw Error('Неизвестный формат evidence');
      const metadata=await json(record.sourcePath);
      const outcome=(metadata.outcomes||[]).find(x=>x.competencyId===item.id && x.relation==='assessed' && x.masteryClaim && x.masteryClaim.confidence==='exact' && x.masteryClaim.level===record.level);
      const href=metadata.materials && metadata.materials.html;
      if(!outcome||!href||!/^[a-zA-Z0-9._-]+\.html$/.test(href)||!outcome.evidenceAnchor)throw Error('Evidence не подтверждено');
      const html=await fetch(new URL(href,location.href),{cache:'no-store'});
      if(!html.ok)throw Error('Занятие не опубликовано');
      const text=await html.text();
      const doc=new DOMParser().parseFromString(text,'text/html');
      if(!doc.getElementById(outcome.evidenceAnchor))throw Error('Якорь evidence отсутствует');
      if(request!==state.evidenceRequest)return;
      ev.querySelectorAll('.atlas-muted').forEach(x=>x.remove());
      const link=append(ev,'a','Доказательство: '+(metadata.title||metadata.date||'занятие')+' ↗');
      link.href=href+'#'+encodeURIComponent(outcome.evidenceAnchor);
      append(ev,'p','Связь: assessed · точное подтверждение. Дата: '+(metadata.date||'—'));
    }catch(error){
      if(request!==state.evidenceRequest)return;
      ev.querySelectorAll('.atlas-muted').forEach(x=>x.remove());
      append(ev,'p','Ссылка на подтверждение недоступна или не прошла проверку.','atlas-muted');
    }
  }
  function select(id,source){
    const item=state.byId.get(id);
    if(!item)return;
    state.selected=id;
    state.mapFocus=id;
    if(source)state.lastSelectionSource=source;
    showDetail(item);refreshMapState();
    const btn=[...els.catalog.querySelectorAll('.atlas-item')].find(x=>x.dataset.id===id);
    if(btn && !btn.closest('details').open)btn.closest('details').open=true;
    if(source==='catalog'||(source==='map'&&window.matchMedia('(max-width:1100px)').matches)){
      const detail=$('detail');
      $('returnToSelection').hidden=false;
      detail.focus({preventScroll:true});
      detail.scrollIntoView({block:'start',behavior:'instant'});
    }
  }
  function restoreSelectionFocus(){
    if(!state.selected)return;
    let target;
    if(state.lastSelectionSource==='map')target=[...els.svg.querySelectorAll('.radial-cell')].find(node=>node.dataset.id===state.selected);
    else target=[...els.catalog.querySelectorAll('.atlas-item')].find(node=>node.dataset.id===state.selected);
    if(!target)return;
    if(target.closest('details'))target.closest('details').open=true;
    target.focus({preventScroll:true});
    target.scrollIntoView({block:'center',behavior:'instant'});
  }
  function attachEvents(){
    els.filters.addEventListener('click',event=>{
      const b=event.target.closest('button[data-filter]');
      if(!b)return;
      state.filter=b.dataset.filter;
      els.filters.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
      refreshMapState();
    });
    $('search').addEventListener('input',e=>{state.query=e.target.value.trim().toLocaleLowerCase('ru');refreshMapState()});
    els.catalog.addEventListener('click',e=>{const b=e.target.closest('button[data-id]');if(b)select(b.dataset.id,'catalog')});
    const crossHighlight=(event,active)=>{
      const button=event.target.closest('button[data-id]');
      if(!button)return;
      const node=[...els.svg.querySelectorAll('.radial-cell')].find(path=>path.dataset.id===button.dataset.id);
      if(node)node.classList.toggle('is-active',active || state.selected===button.dataset.id);
    };
    els.catalog.addEventListener('mouseover',event=>crossHighlight(event,true));
    els.catalog.addEventListener('mouseout',event=>crossHighlight(event,false));
    els.catalog.addEventListener('focusin',event=>crossHighlight(event,true));
    els.catalog.addEventListener('focusout',event=>crossHighlight(event,false));
    els.svg.addEventListener('click',e=>{const path=e.target.closest('.radial-cell');if(path)select(path.dataset.id,'map')});
    els.svg.addEventListener('keydown',e=>{
      const path=e.target.closest('.radial-cell');
      if(!path)return;
      if(e.key==='Enter'||e.key===' '){e.preventDefault();select(path.dataset.id,'map');return}
      const delta={'ArrowRight':1,'ArrowDown':1,'ArrowLeft':-1,'ArrowUp':-1}[e.key];
      if(delta===undefined&&e.key!=='Home'&&e.key!=='End')return;
      e.preventDefault();
      const paths=[...els.svg.querySelectorAll('.radial-cell')].filter(x=>x.getAttribute('aria-hidden')!=='true');
      if(!paths.length)return;
      const index=Math.max(0,paths.findIndex(x=>x===path));
      const next=e.key==='Home'?0:e.key==='End'?paths.length-1:(index+delta+paths.length)%paths.length;
      state.mapFocus=paths[next].dataset.id;
      refreshMapState();
      paths[next].focus();
    });
    $('returnToSelection').addEventListener('click',restoreSelectionFocus);
    els.svg.addEventListener('mouseover',e=>{const path=e.target.closest('.radial-cell');if(path)path.classList.add('is-active')});
    els.svg.addEventListener('mouseout',e=>{const path=e.target.closest('.radial-cell');if(path && path.dataset.id!==state.selected)path.classList.remove('is-active')});
    els.svg.addEventListener('focusin',e=>{const path=e.target.closest('.radial-cell');if(path)path.classList.add('is-active')});
    els.svg.addEventListener('focusout',e=>{const path=e.target.closest('.radial-cell');if(path&&path.dataset.id!==state.selected)path.classList.remove('is-active')});
    const toggle=$('themeToggle'),storageKey='daniil_khriastov_atlas_theme';
    try{const v=localStorage.getItem(storageKey);if(v==='dark'||v==='light')document.documentElement.dataset.theme=v}catch(_){}
    const updateButton=()=>{toggle.textContent=document.documentElement.dataset.theme==='dark'?'Светлая тема':'Тёмная тема'};
    updateButton();
    toggle.addEventListener('click',()=>{
      const v=document.documentElement.dataset.theme==='dark'?'light':'dark';
      document.documentElement.dataset.theme=v;updateButton();
      try{localStorage.setItem(storageKey,v)}catch(_){}
    });
  }
  async function renderLessonData(contract){
    try{
      const module=await moduleData(contract.lessons.registry);
      const lessons=Array.isArray(module.LESSONS)?module.LESSONS:[];
      state.lessons=[...lessons].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
      const root=$('latestLesson');root.replaceChildren();
      if(!state.lessons.length){append(root,'p','Опубликованных веб-занятий пока нет. Пособие от 23 октября доступно ниже.');return}
      const lesson=state.lessons[0];
      append(root,'p',String(lesson.date||'').split('-').reverse().join('.'),'atlas-technical');
      append(root,'h3',lesson.title||'Занятие');
      if(lesson.summary)append(root,'p',lesson.summary);
      if(lesson.href && /^[\w.-]+\.html$/.test(lesson.href)){
        const r=await fetch(new URL(lesson.href,location.href),{method:'HEAD'});
        if(r.ok){const a=append(root,'a','Открыть занятие ↗');a.href=lesson.href}
      }
      const arch=$('archive');arch.replaceChildren();
      for(const item of state.lessons.slice(1,15)){
        if(item.href&&/^[\w.-]+\.html$/.test(item.href)){
          const a=append(arch,'a',(item.date||'')+' · '+(item.title||'Занятие'));a.href=item.href;
        }
      }
    }catch(err){msg($('latestLesson'),'Не удалось загрузить журнал занятий: '+err.message)}
  }
  async function renderRoute(contract){
    try{
      const [plan,progress]=await Promise.all([json(contract.planning.plan),json(contract.planning.state)]);
      if(plan.studentId!==contract.studentId||progress.studentId!==contract.studentId||plan.programVersion!==progress.programVersion)throw Error('Несогласованный план и состояние');
      const items=plan.lessons||[],records=progress.records||{},done=items.filter(x=>records[x.id] && records[x.id].status==='done').length;
      const host=$('routeStatus');host.replaceChildren();
      if(!items.length){append(host,'p','Индивидуальный учебный маршрут ещё не опубликован.');return}
      append(host,'p',done+' из '+items.length+' пунктов завершены по фактическому КТП.');
      const upcoming=items.find(x=>!records[x.id]||records[x.id].status==='planned'||records[x.id].status==='in_progress');
      if(upcoming)append(host,'p','Ближайший шаг: '+upcoming.topic);
      const a=append(host,'a','Смотреть полный маршрут ↗');a.href='ktp.html';
    }catch(err){msg($('routeStatus'),'Не удалось загрузить учебный маршрут: '+err.message)}
  }
  async function start(){
    attachEvents();
    try{
      const response=await fetch('../student-contract.json',{cache:'no-store'});
      if(!response.ok)throw Error('student-contract.json: HTTP '+response.status);
      const contract=await response.json();
      if(contract.version!==2||contract.studentId!=='daniil_khriastov')throw Error('Некорректный Student Platform v2 contract');
      state.contract=contract;msg($('programLabel'),contract.program||'Математика');
      const [catalog,masteryModule]=await Promise.all([catalogData(contract.competencies.catalog),moduleData(contract.competencies.mastery)]);
      state.levels=normalizeMastery(masteryModule);
      const seen=new Set();
      state.groups=catalog.groups.map((g,i)=>{
        const group={name:g.name||g.title||'Тема '+(i+1),id:g.id||String(i),items:[]};
        (g.items||[]).forEach(raw=>{
          if(!raw.id||seen.has(raw.id))throw Error('Отсутствует или повторяется competency ID');
          seen.add(raw.id);
          const item={id:raw.id,title:raw.title||raw.name||raw.id,description:raw.description||'',diagnostic:raw.diagnostic||'',group};
          group.items.push(item);state.items.push(item);state.byId.set(item.id,item);
        });
        return group;
      }).filter(g=>g.items.length);
      state.isReady=true;
      const availableLevels=new Set(state.items.map(item=>level(item.id)===null?'unknown':String(level(item.id))));
      els.filters.querySelectorAll('button[data-filter]').forEach(button=>{
        if(button.dataset.filter!=='all')button.hidden=!availableLevels.has(button.dataset.filter);
      });
      renderCatalog();renderMap();
      msg(els.status,state.items.length?'Выберите компетенцию. Уровни показаны из канонического mastery state.':'Структура кабинета готова. Каталог компетенций ещё не заполнен; учебные оценки отсутствуют.');
      renderLessonData(contract);renderRoute(contract);
    }catch(error){
      msg(els.status,'Данные карты недоступны: '+error.message+'. Уровни не отображаются, чтобы не подменять отсутствие данных оценкой 0.');
      els.status.setAttribute('data-error','true');
      msg($('detailSummary'),'Проверьте Student Platform v2 contract, каталог и источник mastery.');
    }
  }
  start();
})();