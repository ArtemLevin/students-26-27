(() => {
'use strict';
const D=window.COMPETENCY_MAP_DATA;
if(!D||!Array.isArray(D.groups))return console.error('COMPETENCY_MAP_DATA is unavailable');
const G=D.groups,A=G.flatMap(g=>g.items.map((x,i)=>({...x,group:g,itemIndex:i}))),M=new Map(A.map(x=>[x.id,x]));
const BASE={...(D.baselineLevels||{})},BREP=new Set(D.baselineRepeat||[]),E=D.evidence||{};
const S=D.student||'student',PK='ege-profile-math',LK=`${S}-${PK}-competency-map`,RK=`${S}-${PK}-repeat`,TK=`${S}-${PK}-theme`;
const L=['0 / 4 · ещё впереди','1 / 4 · нужна помощь','2 / 4 · пройдена с опорой','3 / 4 · почти уверенно','4 / 4 · освоено'];
const $=id=>document.getElementById(id);
const el={svg:$('radialMap'),tip:$('mapTooltip'),cat:$('topicCatalog'),match:$('catalogMatchCount'),search:$('topicSearch'),
covered:$('coveredCount'),coverage:$('coveragePercent'),repeat:$('repeatCount'),total:$('totalCount'),center:$('centerPercent'),centerTopics:$('centerTopics'),
reset:$('resetBaseline'),theme:$('themeToggle'),dlg:$('topicDialog'),dg:$('dialogGroup'),dt:$('dialogTitle'),ds:$('dialogStatus'),dl:$('dialogLevelText'),
dd:$('dialogDescription'),dx:$('dialogDiagnostic'),dh:$('dialogHistory'),dm:$('dialogMaterialLinks'),rt:$('repeatToggle'),ft:$('focusTitle'),fx:$('focusText'),fa:$('focusAction')};
const read=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k)||JSON.stringify(f));return v}catch(_){return f}};
let levels=read(LK,{}); if(!levels||Array.isArray(levels)||typeof levels!=='object')levels={};
let reps=new Set(Array.isArray(read(RK,[]))?read(RK,[]):[]),filter='all',q='',active=null;
const save=()=>{localStorage.setItem(LK,JSON.stringify(levels));localStorage.setItem(RK,JSON.stringify([...reps]))};
const level=id=>Number.isInteger(+levels[id])&&+levels[id]>=0&&+levels[id]<=4?+levels[id]:(Number.isInteger(+BASE[id])?+BASE[id]:0);
const status=id=>(reps.has(id)||BREP.has(id))?'repeat':level(id)>0?'covered':'future';
const statusText=id=>status(id)==='repeat'?'Пора повторить':status(id)==='covered'?'Пройдено':'Ещё впереди';
const allRepeat=()=>new Set([...BREP,...reps]);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const css=s=>window.CSS?.escape?CSS.escape(s):String(s).replace(/[^a-zA-Z0-9_-]/g,'\\$&');
const polar=(r,a)=>{const t=(a-90)*Math.PI/180;return{x:400+r*Math.cos(t),y:400+r*Math.sin(t)}};
const arc=(ri,ro,a,b)=>{const p=polar(ro,a),q=polar(ro,b),u=polar(ri,b),v=polar(ri,a),z=b-a>180?1:0;return`M ${p.x} ${p.y} A ${ro} ${ro} 0 ${z} 1 ${q.x} ${q.y} L ${u.x} ${u.y} A ${ri} ${ri} 0 ${z} 0 ${v.x} ${v.y} Z`};
const svg=(tag,attrs={})=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));return n};
const visible=x=>{
  const text=!q||`${x.title} ${x.group.name}`.toLocaleLowerCase('ru').includes(q);
  const state=filter==='all'||(filter==='covered'&&level(x.id)>0)||(filter==='repeat'&&status(x.id)==='repeat')||(filter==='future'&&level(x.id)===0&&status(x.id)!=='repeat');
  return text&&state
};
function tip(id,x,y){
  const t=M.get(id); if(!t)return;
  el.tip.innerHTML=`<b>${esc(t.title)}</b><span>${esc(t.group.name)}</span><span>${esc(statusText(id))} · ${esc(L[level(id)])}</span>`;el.tip.hidden=false;moveTip(x,y)
}
function moveTip(x,y){
  if(el.tip.hidden)return;const m=12,o=14,r=el.tip.getBoundingClientRect();let l=x+o,t=y+o;
  if(l+r.width+m>innerWidth)l=x-r.width-o;if(t+r.height+m>innerHeight)t=y-r.height-o;
  el.tip.style.left=`${Math.max(m,Math.min(l,innerWidth-r.width-m))}px`;el.tip.style.top=`${Math.max(m,Math.min(t,innerHeight-r.height-m))}px`
}
const hideTip=()=>el.tip.hidden=true;
function draw(){
  el.svg.querySelectorAll('.generated-map-node').forEach(n=>n.remove());
  const ri=145,ro=378,max=Math.max(...G.map(g=>g.items.length)),rw=(ro-ri)/max,gap=Math.min(1.35,rw*.22),ss=360/G.length,sg=1.15;
  G.forEach((g,gi)=>{
    const a=gi*ss+sg/2,b=(gi+1)*ss-sg/2;
    g.items.forEach((it,i)=>{
      const x=svg('path',{d:arc(ri+i*rw,ri+i*rw+rw-gap,a,b),class:'radial-cell generated-map-node',tabindex:'0',role:'button','data-topic-id':it.id,'data-status':status(it.id),'data-level':String(level(it.id)),'aria-label':`${it.title}. Раздел: ${g.name}. ${statusText(it.id)}. ${L[level(it.id)]}`});
      const tt=svg('title');tt.textContent=`${it.title} · ${g.name} · ${statusText(it.id)}`;x.append(tt);
      x.onmouseenter=e=>tip(it.id,e.clientX,e.clientY);x.onmousemove=e=>moveTip(e.clientX,e.clientY);x.onmouseleave=hideTip;
      x.onfocus=()=>{const r=x.getBoundingClientRect();tip(it.id,r.left+r.width/2,r.top+r.height/2)};x.onblur=hideTip;x.onclick=()=>open(it.id);
      x.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open(it.id)}};el.svg.append(x)
    });
    const p=polar(391,(a+b)/2),t=svg('text',{x:p.x,y:p.y,class:'sector-label generated-map-node','aria-hidden':'true'});t.textContent=g.code;el.svg.append(t)
  });apply()
}
function catalog(){
  el.cat.textContent='';
  G.forEach(g=>{
    const d=document.createElement('details'),s=document.createElement('summary'),title=document.createElement('span'),p=document.createElement('span');
    d.dataset.groupId=g.id;title.className='group-title';title.innerHTML=`<span class="group-code">${esc(g.code)}</span><span>${esc(g.name)}</span>`;p.className='group-progress';p.dataset.progressFor=g.id;s.append(title,p);d.append(s);
    const list=document.createElement('div');list.className='topic-list';
    g.items.forEach(it=>{const b=document.createElement('button');b.type='button';b.className='topic-row';b.dataset.topicId=it.id;b.innerHTML=`<span class="topic-dot ${status(it.id)}" aria-hidden="true"></span><span>${esc(it.title)}</span><span class="topic-level">${level(it.id)}/4</span>`;b.setAttribute('aria-label',`${it.title}. ${statusText(it.id)}. ${L[level(it.id)]}`);b.onclick=()=>open(it.id);list.append(b)});
    d.append(list);if(g.items.some(it=>level(it.id)>0||status(it.id)==='repeat'))d.open=true;el.cat.append(d)
  });
  G.forEach(g=>{const n=g.items.filter(it=>level(it.id)>0||status(it.id)==='repeat').length,tar=el.cat.querySelector(`[data-progress-for="${g.id}"]`);if(tar)tar.textContent=`${n} / ${g.items.length}`});apply()
}
function apply(){
  let n=0;
  A.forEach(x=>{const ok=visible(x);if(ok)n++;const p=el.svg.querySelector(`[data-topic-id="${css(x.id)}"]`),r=el.cat.querySelector(`.topic-row[data-topic-id="${css(x.id)}"]`);[p,r].forEach(z=>{if(z){z.classList.toggle('is-dimmed',!ok);z.classList.toggle('is-match',!!q&&ok)}})});
  el.match.textContent=filter==='all'&&!q?`${A.length} тем`:`${n} совпадений`;
  if(q)el.cat.querySelectorAll('details').forEach(d=>{const g=G.find(x=>x.id===d.dataset.groupId);d.open=!!g?.items.some(it=>visible({...it,group:g}))})
}
const link=(href,text)=>{const a=document.createElement('a');a.href=href;a.textContent=text;return a};
function open(id){
  const x=M.get(id);if(!x)return;active=id;const lv=level(id),st=status(id),ev=E[id];
  el.dg.textContent=`${x.group.code} · ${x.group.name}`;el.dt.textContent=x.title;el.ds.textContent=statusText(id);el.ds.dataset.status=st;el.dl.textContent=L[lv];el.dd.textContent=x.description;el.dx.textContent=x.diagnostic;el.dm.innerHTML='';
  if(ev){el.dh.textContent=ev.text;if(ev.href)el.dm.append(link(ev.href,'Открыть PDF'));if(ev.tex)el.dm.append(link(ev.tex,'Открыть TeX'))}
  else el.dh.textContent=Object.hasOwn(levels,id)?'Диагностический уровень был изменён вручную на этом устройстве. Подтверждающего материала занятия пока нет.':'Диагностических данных по этой теме пока нет.';
  el.dlg.querySelectorAll('.level-picker button').forEach(b=>{const on=+b.dataset.level===lv;b.classList.toggle('is-selected',on);b.setAttribute('aria-pressed',on?'true':'false')});
  const rep=st==='repeat';el.rt.textContent=rep?'Убрать из повторения':'Добавить в повторение';el.rt.classList.toggle('is-repeat',rep);
  el.dlg.showModal?el.dlg.showModal():el.dlg.setAttribute('open','')
}
function stats(){
  const R=allRepeat(),c=A.filter(x=>level(x.id)>0).length,t=A.filter(x=>level(x.id)>0||R.has(x.id)).length,p=A.length?Math.round(t/A.length*100):0;
  el.covered.textContent=c;el.coverage.textContent=`${p}%`;el.repeat.textContent=R.size;el.total.textContent=A.length;el.center.textContent=`${p}%`;el.centerTopics.textContent=`${A.length} тем`
}
function focus(){
  const R=[...allRepeat()].map(id=>M.get(id)).filter(Boolean);let x,why;
  if(R.length){x=R[0];why='Тема уже отмечена для повторения. Начните с короткой диагностики и затем обновите уровень.'}
  if(!x)for(const g of [...G].reverse()){const ix=g.items.map((it,i)=>level(it.id)>0?i:-1).filter(i=>i>=0);if(!ix.length)continue;const n=g.items.slice(Math.max(...ix)+1).find(it=>level(it.id)===0);if(n){x={...n,group:g};why=`Логичное продолжение текущего раздела «${g.name}» после уже затронутых тем.`;break}}
  if(!x){x=A.find(it=>level(it.id)===0);if(x)why='Следующая тема в полном каталоге программы, по которой пока нет подтверждённой диагностики.'}
  if(!x){x=A.find(it=>level(it.id)>0&&level(it.id)<3);if(x)why='Тема уже проходилась, текущий уровень стоит проверить короткой диагностикой.'}
  el.fa.innerHTML='';if(!x){el.ft.textContent='Карта полностью диагностирована';el.fx.textContent='Следующий шаг можно выбрать по актуальным целям подготовки.';return}
  el.ft.textContent=x.title;el.fx.textContent=`${x.group.name}. ${why}`;const b=document.createElement('button');b.type='button';b.className='focus-link';b.textContent='Открыть карточку →';b.onclick=()=>open(x.id);el.fa.append(b)
}
const refresh=()=>{draw();catalog();stats();focus()};
document.querySelectorAll('.filter').forEach(b=>b.onclick=()=>{filter=b.dataset.filter||'all';document.querySelectorAll('.filter').forEach(x=>{const on=x===b;x.classList.toggle('is-active',on);x.setAttribute('aria-pressed',on?'true':'false')});apply()});
el.search.oninput=()=>{q=el.search.value.trim().toLocaleLowerCase('ru');apply()};
el.reset.onclick=()=>{if(confirm('Вернуть статусы, подтверждённые материалами занятий? Ручные уровни и ручной список повторения будут очищены.')){localStorage.removeItem(LK);localStorage.removeItem(RK);levels={};reps=new Set();refresh()}};
el.theme.onclick=()=>{const t=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=t;localStorage.setItem(TK,t);el.theme.setAttribute('aria-pressed',t==='dark'?'true':'false')};
el.dlg.querySelectorAll('.level-picker button').forEach(b=>b.onclick=()=>{if(active){levels[active]=+b.dataset.level;save();refresh();open(active)}});
el.rt.onclick=()=>{if(!active)return;reps.has(active)?reps.delete(active):reps.add(active);save();refresh();open(active)};
el.dlg.onclick=e=>{if(e.target===el.dlg)el.dlg.close()};
addEventListener('resize',hideTip);addEventListener('scroll',hideTip,{passive:true});
const t=localStorage.getItem(TK)||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=t;el.theme.setAttribute('aria-pressed',t==='dark'?'true':'false');
refresh();
})();