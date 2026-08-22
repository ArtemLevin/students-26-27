(()=>{
'use strict';
const RAW=window.KIRILL_GRADE7_GROUPS||[],BASE_EVIDENCE=window.KIRILL_GRADE7_EVIDENCE||[];
const LESSONS=[
 {date:'08.08.26',title:'Повторение вычислений',href:'08.08.26.html',ids:BASE_EVIDENCE},
 {date:'12.08.26',title:'Проценты',href:'12.08.26.html',ids:['percent_8','percent_9','percent_11','percent_12','percent_14','models_12']},
 {date:'15.08.26',title:'Текстовые задачи на движение',href:'15.08.26.html',ids:['expr_5','expr_6','equations_4','equations_5','equations_6','equations_12','models_1','models_2','models_3','models_4','models_5','models_6','models_7','models_8','models_14']},
 {date:'19.08.26',title:'Производительность и совместная работа',href:'19.08.26.html',ids:['expr_5','expr_6','expr_7','equations_2','equations_3','equations_4','equations_5','equations_6','equations_8','equations_12','models_1','models_2','models_3','models_4','models_5','models_9','models_10','models_14']},
 {date:'22.08.26',title:'Составление математических моделей',href:'22.08.26.html',ids:['fractions_14','fractions_15','fractions_16','percent_8','percent_9','percent_11','percent_12','percent_14','expr_1','expr_2','expr_3','models_1','models_2','models_3','models_4','models_5','models_12','models_14']}
];
const EVIDENCE=new Set(LESSONS.flatMap(l=>l.ids));
const SOURCES=new Map();
LESSONS.forEach(lesson=>lesson.ids.forEach(id=>{if(!SOURCES.has(id))SOURCES.set(id,[]);SOURCES.get(id).push(lesson)}));
const lessonSources=id=>SOURCES.get(id)||[],latestLesson=id=>{const a=lessonSources(id);return a[a.length-1]||null};
const GROUPS=RAW.map(([short,id,title,summary,diagnostic,items])=>({short,id,title,summary,diagnostic,items:items.split('|').map((title,i)=>({id:`${id}_${i+1}`,title}))}));
const LEVELS=['Ещё не изучено','Нужна помощь','В процессе','Почти уверенно','Освоено'];
const STORAGE='kirill-competence-map-v2',REPEAT='kirill-competence-repeat-v1',THEME='kirill-site-theme';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>Array.from(r.querySelectorAll(s)),root=document.documentElement;
const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
const all=GROUPS.flatMap(g=>g.items.map(i=>({...i,group:g}))),byId=new Map(all.map(i=>[i.id,i]));
const baseline=Object.fromEntries(all.map(i=>[i.id,EVIDENCE.has(i.id)?2:0]));
let state={...baseline},repeat=new Set(),current=null,filter='all',query='';
try{
 const saved=JSON.parse(store.get(STORAGE)||'{}');
 for(const id in saved)if(byId.has(id)){
   const value=Math.max(0,Math.min(4,Number(saved[id])||0));
   state[id]=EVIDENCE.has(id)&&value===0?2:value;
 }
}catch(e){}
try{repeat=new Set(JSON.parse(store.get(REPEAT)||'[]').filter(id=>byId.has(id)))}catch(e){repeat=new Set()}
const save=()=>{store.set(STORAGE,JSON.stringify(state));store.set(REPEAT,JSON.stringify([...repeat]))};
const isRepeat=id=>repeat.has(id)||state[id]===1;
const isCovered=id=>EVIDENCE.has(id)||state[id]>=2;
function status(id){if(isRepeat(id))return'repeat';if(isCovered(id))return'covered';return'neutral'}
function statusText(id){const s=status(id);return s==='repeat'?'Пора повторить':s==='covered'?'Пройдено':'Ещё не проходили'}
function matches(item){const s=status(item.id),filterOk=filter==='all'||filter===s||(filter==='unseen'&&s==='neutral'),q=!query||item.title.toLowerCase().includes(query)||item.group.title.toLowerCase().includes(query);return filterOk&&q}
function polar(r,a){const x=(a-90)*Math.PI/180;return{x:400+r*Math.cos(x),y:400+r*Math.sin(x)}}
function arcPath(innerRadius,outerRadius,startAngle,endAngle){
 const outerStart=polar(outerRadius,startAngle),outerEnd=polar(outerRadius,endAngle),innerEnd=polar(innerRadius,endAngle),innerStart=polar(innerRadius,startAngle),large=endAngle-startAngle>180?1:0;
 return[`M ${outerStart.x} ${outerStart.y}`,`A ${outerRadius} ${outerRadius} 0 ${large} 1 ${outerEnd.x} ${outerEnd.y}`,`L ${innerEnd.x} ${innerEnd.y}`,`A ${innerRadius} ${innerRadius} 0 ${large} 0 ${innerStart.x} ${innerStart.y}`,'Z'].join(' ')
}
const tooltip=$('#mapTooltip');
function positionTip(x,y){if(!tooltip)return;const pad=12,w=tooltip.offsetWidth||330,h=tooltip.offsetHeight||72;tooltip.style.left=Math.max(pad,Math.min(innerWidth-w-pad,x+14))+'px';tooltip.style.top=Math.max(pad,Math.min(innerHeight-h-pad,y+14))+'px'}
function showTip(item,x,y){if(!tooltip)return;const lesson=latestLesson(item.id),source=lesson?`<br>Последнее занятие: ${lesson.date}`:'';tooltip.innerHTML=`<b>${item.title}</b><span>${item.group.short} · ${item.group.title}<br>${statusText(item.id)}${source}</span>`;tooltip.classList.add('show');tooltip.setAttribute('aria-hidden','false');positionTip(x,y)}
function hideTip(){if(!tooltip)return;tooltip.classList.remove('show');tooltip.setAttribute('aria-hidden','true')}
function bindCell(path,item){
 path.addEventListener('click',()=>openSkill(item.id));
 path.addEventListener('mouseenter',e=>showTip(item,e.clientX,e.clientY));
 path.addEventListener('mousemove',e=>positionTip(e.clientX,e.clientY));
 path.addEventListener('mouseleave',hideTip);
 path.addEventListener('focus',()=>{const r=path.getBoundingClientRect();showTip(item,r.left+r.width/2,r.top+r.height/2)});
 path.addEventListener('blur',hideTip);
 path.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openSkill(item.id)}})
}
function renderMap(){
 const svg=$('#radialMap'),old=svg.querySelectorAll('.dynamic');old.forEach(n=>n.remove());
 const sectorSize=360/GROUPS.length,innerRadius=145,maxRings=Math.max(...GROUPS.map(g=>g.items.length)),ringWidth=(380-innerRadius)/maxRings,ringGap=Math.max(1.5,ringWidth*.14),sectorGap=1.4;
 GROUPS.forEach((g,gi)=>{
   const start=gi*sectorSize+sectorGap,end=(gi+1)*sectorSize-sectorGap;
   const groupTarget=[...g.items].sort((a,b)=>state[a.id]-state[b.id])[0];
   const arc=document.createElementNS('http://www.w3.org/2000/svg','path');arc.setAttribute('d',arcPath(112,137,start,end));arc.setAttribute('class','radial-group-arc dynamic');arc.setAttribute('tabindex','0');arc.setAttribute('role','button');arc.setAttribute('aria-label',g.title);arc.addEventListener('click',()=>openSkill(groupTarget.id));arc.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openSkill(groupTarget.id)}});const at=document.createElementNS('http://www.w3.org/2000/svg','title');at.textContent=g.title;arc.appendChild(at);svg.appendChild(arc);
   g.items.forEach((item0,ii)=>{
     const item={...item0,group:g},ringInner=innerRadius+ii*ringWidth,ringOuter=ringInner+ringWidth-ringGap,s=status(item.id);
     const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',arcPath(ringInner,ringOuter,start,end));path.setAttribute('class',`radial-cell dynamic ${s}${matches(item)?'':' is-muted'}${query&&item.title.toLowerCase().includes(query)?' search-match':''}`);path.setAttribute('tabindex','0');path.setAttribute('role','button');path.setAttribute('aria-label',`${g.title}. ${item.title}. ${statusText(item.id)}. Уровень ${state[item.id]} из 4.`);const title=document.createElementNS('http://www.w3.org/2000/svg','title');title.textContent=`${item.title} · ${statusText(item.id)}`;path.appendChild(title);bindCell(path,item);svg.appendChild(path)
   });
   const p=polar(391,start+(end-start)/2),label=document.createElementNS('http://www.w3.org/2000/svg','text');label.setAttribute('x',p.x);label.setAttribute('y',p.y);label.setAttribute('dy','.35em');label.setAttribute('class','radial-group-label dynamic');label.textContent=g.short;svg.appendChild(label)
 });
}
function renderIndex(){
 const host=$('#topicIndex');host.innerHTML='';
 GROUPS.forEach((g,gi)=>{
   const details=document.createElement('details');details.className='topic-group';if(gi<3||query)details.open=true;
   const visible=g.items.filter(i=>matches({...i,group:g}));if(!visible.length&&(query||filter!=='all'))details.hidden=true;
   const covered=g.items.filter(i=>isCovered(i.id)&&!isRepeat(i.id)).length,rep=g.items.filter(i=>isRepeat(i.id)).length;
   const sum=document.createElement('summary');sum.innerHTML=`<span>${g.short} · ${g.title}</span><small>${covered}/${g.items.length}${rep?' · ↺ '+rep:''}</small>`;details.appendChild(sum);
   const list=document.createElement('div');list.className='topic-list';
   g.items.forEach(item=>{const wrapped={...item,group:g};if(!matches(wrapped))return;const s=status(item.id),b=document.createElement('button');b.type='button';b.className='topic-row';const dot=s==='repeat'?'var(--cell-repeat)':s==='covered'?'var(--cell-covered)':'var(--cell-neutral)';b.innerHTML=`<i class="dot" style="background:${dot}"></i><span>${item.title}</span><span class="level">${statusText(item.id)}</span>`;b.addEventListener('click',()=>openSkill(item.id));list.appendChild(b)});
   details.appendChild(list);host.appendChild(details)
 })
}
function updateStats(){
 const covered=all.filter(i=>isCovered(i.id)&&!isRepeat(i.id)).length,rep=all.filter(i=>isRepeat(i.id)).length,coverage=Math.round((covered+rep)/all.length*100);
 $('#masteredCount').textContent=covered;$('#averageScore').textContent=coverage+'%';$('#repeatCount').textContent=rep;$('#evidenceCount').textContent=all.length;$('#radialPercent').textContent=coverage+'%';$('#radialTopicCount').textContent=all.length+' тем';
 const next=all.find(i=>isRepeat(i.id))||all.find(i=>!isCovered(i.id))||all.find(i=>state[i.id]<4)||all[0],lesson=latestLesson(next.id);
 $('#recommendTitle').textContent=next.title;$('#recommendText').textContent=`Раздел «${next.group.title}». ${isRepeat(next.id)?'Тема отмечена для повторения.':next.group.diagnostic}`;$('#continueTitle').textContent=next.title;$('#continueText').textContent=isRepeat(next.id)?`Эту тему из раздела «${next.group.title}» пора повторить.`:`Следующая тема для прохождения в разделе «${next.group.title}».`;$('#recommendLink').href=lesson?lesson.href:'#route';$('#recommendLink').textContent=lesson?`Открыть занятие ${lesson.date}`:'Как работать с темой';$('#continueLink').href=lesson?lesson.href:'#competencies'
}
function render(){renderMap();renderIndex();updateStats()}
function openSkill(id){
 current=byId.get(id);const l=state[id],g=current.group,s=status(id),sources=lessonSources(id),lesson=latestLesson(id);
 $('#dialogGroup').textContent=g.short+' · '+g.title;$('#dialogTitle').textContent=current.title;$('#dialogLevel').textContent=l+'/4 · '+LEVELS[l];$('#dialogSector').textContent=g.title;$('#dialogDescription').textContent=g.summary+' Тема: '+current.title+'.';$('#dialogDiagnostic').textContent=g.diagnostic;
 if(sources.length){const names=sources.map(x=>`${x.date} «${x.title}»`).join('; ');$('#dialogEvidence').textContent=`Тема подтверждена материалами занятий: ${names}.`;}else if(s==='repeat')$('#dialogEvidence').textContent='Тема отмечена для повторения.';else if(s==='covered')$('#dialogEvidence').textContent='Тема отмечена как пройденная по результатам диагностики.';else $('#dialogEvidence').textContent='Связанного занятия или результата диагностики пока нет; ячейка остаётся нейтральной.';
 $$('.level-btn').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.level)===l)));$('#markRepeat').textContent=repeat.has(id)?'Убрать из повторения':'Добавить в повторение';$('#dialogLink').href=lesson?lesson.href:'#route';$('#dialogLink').textContent=lesson?`Открыть занятие ${lesson.date}`:'Открыть алгоритм работы';$('#skillDialog').showModal()
}
$$('.level-btn').forEach(b=>b.addEventListener('click',()=>{if(!current)return;state[current.id]=Number(b.dataset.level);save();$('#skillDialog').close();render();openSkill(current.id)}));
$('#markRepeat').addEventListener('click',()=>{if(!current)return;repeat.has(current.id)?repeat.delete(current.id):repeat.add(current.id);save();$('#skillDialog').close();render();openSkill(current.id)});
$('#dialogClose').addEventListener('click',()=>$('#skillDialog').close());$('#skillDialog').addEventListener('click',e=>{if(e.target===$('#skillDialog'))$('#skillDialog').close()});
$$('.filter').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;$$('.filter').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));render()}));
$('#search').addEventListener('input',e=>{query=e.target.value.trim().toLowerCase();render()});
$('#resetMap').addEventListener('click',()=>{if(confirm('Вернуть карту к состоянию, подтверждённому материалами занятий?')){state={...baseline};repeat.clear();save();filter='all';query='';$('#search').value='';$$('.filter').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===0)));render()}});
const themeBtn=$('#themeBtn');root.dataset.theme=store.get(THEME)||'dark';themeBtn.addEventListener('click',()=>{root.dataset.theme=root.dataset.theme==='dark'?'light':'dark';store.set(THEME,root.dataset.theme)});$('#printBtn').addEventListener('click',()=>print());
render();
})();
