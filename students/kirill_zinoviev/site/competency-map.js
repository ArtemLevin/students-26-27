(()=>{
'use strict';
const RAW=window.KIRILL_GRADE7_GROUPS||[], EVIDENCE=new Set(window.KIRILL_GRADE7_EVIDENCE||[]);
const GROUPS=RAW.map(([short,id,title,summary,diagnostic,items])=>({short,id,title,summary,diagnostic,items:items.split('|').map((title,i)=>({id:`${id}_${i+1}`,title}))}));
const LEVELS=['Ещё не изучено','Нужна помощь','В процессе','Почти уверенно','Освоено'];
const STORAGE='kirill-competence-map-v2', REPEAT='kirill-competence-repeat-v1', THEME='kirill-site-theme';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s)), root=document.documentElement;
const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
const all=GROUPS.flatMap(g=>g.items.map(i=>({...i,group:g}))), byId=new Map(all.map(i=>[i.id,i]));
const baseline=Object.fromEntries(all.map(i=>[i.id,EVIDENCE.has(i.id)?2:0]));
let state={...baseline}, repeat=new Set(), current=null, filter='all', query='';
try{const saved=JSON.parse(store.get(STORAGE)||'{}');for(const id in saved)if(byId.has(id))state[id]=Math.max(0,Math.min(4,Number(saved[id])||0))}catch(e){}
try{repeat=new Set(JSON.parse(store.get(REPEAT)||'[]').filter(id=>byId.has(id)))}catch(e){repeat=new Set()}
const save=()=>{store.set(STORAGE,JSON.stringify(state));store.set(REPEAT,JSON.stringify([...repeat]))};
const heat=l=>`var(--heat${l})`;
function polar(r,a){return [400+r*Math.cos((a-90)*Math.PI/180),400+r*Math.sin((a-90)*Math.PI/180)]}
function ringPath(r1,r2,a0,a1){const p1=polar(r2,a0),p2=polar(r2,a1),p3=polar(r1,a1),p4=polar(r1,a0),large=a1-a0>180?1:0;return `M ${p1[0]} ${p1[1]} A ${r2} ${r2} 0 ${large} 1 ${p2[0]} ${p2[1]} L ${p3[0]} ${p3[1]} A ${r1} ${r1} 0 ${large} 0 ${p4[0]} ${p4[1]} Z`}
function visible(item){const l=state[item.id], f=filter==='all'||(filter==='repeat'&&(l<=1||repeat.has(item.id)))||(filter==='progress'&&(l===2||l===3))||(filter==='mastered'&&l===4), q=!query||item.title.toLowerCase().includes(query)||item.group.title.toLowerCase().includes(query);return f&&q}
function renderMap(){
 const svg=$('#radialMap');svg.querySelectorAll('.dynamic').forEach(n=>n.remove());
 const gap=.7, sector=360/GROUPS.length, inner=112, outer=326;
 GROUPS.forEach((g,gi)=>{
   const a0=gi*sector+gap,a1=(gi+1)*sector-gap,step=(outer-inner)/g.items.length;
   g.items.forEach((item,ii)=>{
     const p=document.createElementNS('http://www.w3.org/2000/svg','path'),r1=inner+ii*step,r2=inner+(ii+1)*step,wrapped={...item,group:g};
     p.setAttribute('d',ringPath(r1,r2,a0,a1));p.setAttribute('fill',heat(state[item.id]));p.setAttribute('class','cell dynamic'+(visible(wrapped)?'':' muted'));p.setAttribute('tabindex','0');p.setAttribute('role','button');p.setAttribute('aria-label',`${g.short}. ${item.title}. Уровень ${state[item.id]}: ${LEVELS[state[item.id]]}`);p.addEventListener('click',()=>openSkill(item.id));p.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openSkill(item.id)}});svg.appendChild(p)
   });
   const arc=document.createElementNS('http://www.w3.org/2000/svg','path');arc.setAttribute('d',ringPath(334,350,a0,a1));arc.setAttribute('class','group-arc dynamic');arc.addEventListener('click',()=>focusGroup(g.id));svg.appendChild(arc);
   const mid=(a0+a1)/2,pos=polar(342,mid),txt=document.createElementNS('http://www.w3.org/2000/svg','text');txt.setAttribute('x',pos[0]);txt.setAttribute('y',pos[1]+3);txt.setAttribute('class','group-label dynamic');txt.textContent=g.short;svg.appendChild(txt)
 });
}
function renderIndex(){
 const host=$('#topicIndex');host.innerHTML='';
 GROUPS.forEach((g,gi)=>{
   const details=document.createElement('details');details.className='topic-group';if(gi<4||query)details.open=true;
   const avg=g.items.reduce((s,i)=>s+state[i.id],0)/(4*g.items.length), matched=g.items.filter(i=>visible({...i,group:g}));if(!matched.length&&query)details.hidden=true;
   const sum=document.createElement('summary');sum.innerHTML=`<span>${g.short} · ${g.title}</span><small>${Math.round(avg*100)}% · ${g.items.length}</small>`;details.appendChild(sum);
   const list=document.createElement('div');list.className='topic-list';
   g.items.forEach(item=>{const wrapped={...item,group:g};if(!visible(wrapped))return;const b=document.createElement('button');b.type='button';b.className='topic-row';b.innerHTML=`<i class="dot" style="background:${heat(state[item.id])}"></i><span>${item.title}</span><span class="level">${state[item.id]}/4${repeat.has(item.id)?' ↺':''}</span>`;b.addEventListener('click',()=>openSkill(item.id));list.appendChild(b)});
   details.appendChild(list);host.appendChild(details)
 });
}
function updateStats(){
 const vals=all.map(i=>state[i.id]), mastered=vals.filter(v=>v===4).length, avg=Math.round(vals.reduce((a,b)=>a+b,0)/(4*vals.length)*100), rep=all.filter(i=>state[i.id]<=1||repeat.has(i.id)).length;
 $('#masteredCount').textContent=mastered;$('#averageScore').textContent=avg+'%';$('#repeatCount').textContent=rep;$('#radialPercent').textContent=avg+'%';
 const next=all.find(i=>state[i.id]<=1)||all.find(i=>state[i.id]<4)||all[0], lesson=EVIDENCE.has(next.id);
 $('#recommendTitle').textContent=next.title;$('#recommendText').textContent=`Сектор «${next.group.title}». ${next.group.diagnostic}`;$('#continueTitle').textContent=next.title;$('#continueText').textContent=`Следующая точка диагностики в секторе «${next.group.title}».`;$('#recommendLink').href=lesson?'08.08.26.html':'#route';$('#recommendLink').textContent=lesson?'Открыть занятие':'Как диагностировать';$('#continueLink').href=lesson?'08.08.26.html':'#competencies'
}
function render(){renderMap();renderIndex();updateStats()}
function openSkill(id){
 current=byId.get(id);const l=state[id],g=current.group;
 $('#dialogGroup').textContent=g.short+' · '+g.title;$('#dialogTitle').textContent=current.title;$('#dialogLevel').textContent=l+'/4 · '+LEVELS[l];$('#dialogSector').textContent=g.title;$('#dialogDescription').textContent=g.summary+' Микронавык: '+current.title+'.';$('#dialogDiagnostic').textContent=g.diagnostic;$('#dialogEvidence').textContent=EVIDENCE.has(id)?'Компетенция прямо затронута в пособии «Повторение вычислений» от 08.08.26. Базовый уровень карты: 2/4 — «в процессе».':'Связанного подтверждения в материалах Кирилла пока нет; уровень начинается с 0/4 до отдельной диагностики.';
 $$('.level-btn').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.level)===l)));$('#markRepeat').textContent=repeat.has(id)?'Убрать из повторения':'Добавить в повторение';$('#dialogLink').href=EVIDENCE.has(id)?'08.08.26.html':'#route';$('#dialogLink').textContent=EVIDENCE.has(id)?'Открыть занятие 08.08.26':'Открыть алгоритм диагностики';$('#skillDialog').showModal()
}
function focusGroup(id){const g=GROUPS.find(x=>x.id===id);query=g.title.toLowerCase();$('#search').value=g.title;render();const d=[...$('#topicIndex').children].find(x=>x.querySelector('summary')?.textContent.includes(g.title));if(d){d.hidden=false;d.open=true;d.scrollIntoView({behavior:'smooth',block:'nearest'})}}
$$('.level-btn').forEach(b=>b.addEventListener('click',()=>{if(!current)return;state[current.id]=Number(b.dataset.level);save();openSkill(current.id);render()}));
$('#markRepeat').addEventListener('click',()=>{if(!current)return;repeat.has(current.id)?repeat.delete(current.id):repeat.add(current.id);save();openSkill(current.id);render()});
$('#dialogClose').addEventListener('click',()=>$('#skillDialog').close());$('#skillDialog').addEventListener('click',e=>{if(e.target===$('#skillDialog'))$('#skillDialog').close()});
$$('.filter').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;$$('.filter').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));render()}));
$('#search').addEventListener('input',e=>{query=e.target.value.trim().toLowerCase();render()});
$('#resetMap').addEventListener('click',()=>{if(confirm('Вернуть карту к уровням, подтверждённым материалами 08.08.26?')){state={...baseline};repeat.clear();save();filter='all';query='';$('#search').value='';$$('.filter').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===0)));render()}});
const themeBtn=$('#themeBtn');root.dataset.theme=store.get(THEME)||'dark';themeBtn.addEventListener('click',()=>{root.dataset.theme=root.dataset.theme==='dark'?'light':'dark';store.set(THEME,root.dataset.theme)});$('#printBtn').addEventListener('click',()=>print());
render();
})();
