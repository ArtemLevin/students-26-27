"use strict";
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const root=document.documentElement;
const safeStore={
  get(k,f=null){try{return localStorage.getItem(k)??f}catch(_){return f}},
  set(k,v){try{localStorage.setItem(k,v)}catch(_){}}
};
const safeSession={
  get(k,f=null){try{return sessionStorage.getItem(k)??f}catch(_){return f}},
  set(k,v){try{sessionStorage.setItem(k,v)}catch(_){}}
};
const sectionIndicator=$("#sectionIndicator");

$("#backBtn").addEventListener("click",()=>{ location.href="index.html"; });
$("#printBtn").addEventListener("click",()=>window.print());
$("#detail").addEventListener("change",e=>{root.dataset.detail=e.target.value;safeStore.set("sofya-260826-detail",e.target.value)});
const savedDetail=safeStore.get("sofya-260826-detail","full"); root.dataset.detail=savedDetail; $("#detail").value=savedDetail;

function setTheme(theme){
  root.dataset.theme=theme; safeStore.set("sofya-260826-theme",theme);
  $("#themeBtn").textContent=theme==="light"?"☾ Тёмная":"☀ Светлая";
}
setTheme(safeStore.get("sofya-260826-theme","dark"));
$("#themeBtn").addEventListener("click",()=>setTheme(root.dataset.theme==="light"?"dark":"light"));

const tabs=$$(".tab");
function activateTab(id,focus=false){
  tabs.forEach(tab=>{
    const active=tab.dataset.tab===id;
    tab.classList.toggle("on",active);
    tab.setAttribute("aria-selected",String(active));
    tab.tabIndex=active?0:-1;
  });
  $$(".panel").forEach(panel=>panel.classList.toggle("on",panel.id===id));
  sectionIndicator.textContent=tabs.find(t=>t.dataset.tab===id)?.textContent||"";
  safeStore.set("sofya-260826-tab",id);
  if(focus)$("#"+id)?.focus({preventScroll:true});
  requestAnimationFrame(()=>{if(typeof renderSvgs==="function")renderSvgs()});
}
tabs.forEach((tab,i)=>{
  tab.addEventListener("click",()=>activateTab(tab.dataset.tab));
  tab.addEventListener("keydown",e=>{
    if(!["ArrowLeft","ArrowRight","Home","End"].includes(e.key))return;
    e.preventDefault();
    let next=i;
    if(e.key==="ArrowRight")next=(i+1)%tabs.length;
    if(e.key==="ArrowLeft")next=(i-1+tabs.length)%tabs.length;
    if(e.key==="Home")next=0;if(e.key==="End")next=tabs.length-1;
    tabs[next].focus();activateTab(tabs[next].dataset.tab);
  });
});
activateTab(safeStore.get("sofya-260826-tab","strategy"));

$$(".answer-toggle").forEach(btn=>btn.addEventListener("click",()=>{
  const sol=btn.nextElementSibling; const on=sol.classList.toggle("show");
  btn.textContent=on?"Скрыть ответ":"Показать ответ"; btn.setAttribute("aria-expanded",String(on));
}));

$$("[data-stepper]").forEach(stepper=>{
  const steps=$$(".step",stepper), status=$(".step-status",stepper); let current=1;
  function render(){
    steps.forEach((s,i)=>s.classList.toggle("revealed",i<current));
    status.textContent=`Открыто шагов: ${current} из ${steps.length}`;
    $("[data-prev]",stepper).disabled=current<=1;
    $("[data-next]",stepper).disabled=current>=steps.length;
  }
  $("[data-prev]",stepper).addEventListener("click",()=>{current=Math.max(1,current-1);render()});
  $("[data-next]",stepper).addEventListener("click",()=>{current=Math.min(steps.length,current+1);render()});
  $("[data-all]",stepper).addEventListener("click",()=>{current=steps.length;render()});
  $("[data-reset]",stepper).addEventListener("click",()=>{current=1;render()});
  render();
});

$$(".hint>button").forEach((btn,index)=>{
  const tip=btn.nextElementSibling;
  function show(){tip.classList.add("show");btn.setAttribute("aria-expanded","true")}
  function hide(){tip.classList.remove("show");btn.setAttribute("aria-expanded","false")}
  btn.setAttribute("aria-expanded","false");
  btn.addEventListener("mouseenter",show);btn.addEventListener("focus",show);btn.addEventListener("click",()=>tip.classList.contains("show")?hide():show());
  btn.addEventListener("mouseleave",()=>setTimeout(()=>{if(!tip.matches(":hover")&&!btn.matches(":focus"))hide()},120));
  tip.addEventListener("mouseleave",hide);
  if(index===0&&!safeSession.get("sofya-260826-hint")){
    setTimeout(()=>{btn.classList.add("hint-pulse");show();setTimeout(hide,7000)},3000);
    safeSession.set("sofya-260826-hint","1");
  }
});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){$$(".tip.show").forEach(t=>t.classList.remove("show"));closeModal($("#labModal"));closeModal($("#imageModal"));}});

let quizScore=0, quizAnswered=0;
function refreshQuiz(){ $("#quizScore").textContent=`${quizScore} / ${$$("[data-quiz]").length}`; }
$$("[data-quiz]").forEach(q=>{
  $$(".quiz-options button",q).forEach(btn=>btn.addEventListener("click",()=>{
    if(q.dataset.done)return;
    q.dataset.done="1";quizAnswered++;
    const ok=btn.dataset.value===q.dataset.answer;
    if(ok)quizScore++;
    btn.classList.add(ok?"good-answer":"bad-answer");
    const correct=$(`.quiz-options button[data-value="${q.dataset.answer}"]`,q);correct.classList.add("good-answer");
    $(".feedback",q).textContent=ok?"Верно. Метод распознан правильно.":"Проверьте соответствующий алгоритм в теории.";
    refreshQuiz();
  }));
});
$("#resetQuiz").addEventListener("click",()=>{
  quizScore=0;quizAnswered=0;$$("[data-quiz]").forEach(q=>{delete q.dataset.done;$$("button",q).forEach(b=>b.classList.remove("good-answer","bad-answer"));$(".feedback",q).textContent=""});refreshQuiz()
});
refreshQuiz();

const skillBoxes=$$("[data-skill]");
let skillState={};try{skillState=JSON.parse(safeStore.get("sofya-260826-skills","{}"))||{}}catch(_){}
function updateSkills(){
  const done=skillBoxes.filter(b=>b.checked).length,pct=Math.round(done/skillBoxes.length*100);
  $("#skillProgress").style.width=pct+"%";
  $("#skillText").textContent=pct===100?"Готовность высокая: все ключевые алгоритмы отмечены.":pct>=70?"Хорошая база. Повторите неотмеченные пункты.":`Отмечено ${done} из ${skillBoxes.length}. Продолжайте повторение.`;
  const state={};skillBoxes.forEach((b,i)=>state[i]=b.checked);safeStore.set("sofya-260826-skills",JSON.stringify(state));
}
skillBoxes.forEach((b,i)=>{b.checked=Boolean(skillState[i]);b.addEventListener("change",updateSkills)});updateSkills();

const poster=$("#posterImage"), imageModal=$("#imageModal"), labModal=$("#labModal");
let lastModalTrigger=null;
function openModal(modal,trigger){lastModalTrigger=trigger;modal.classList.add("show");document.body.style.overflow="hidden";$(".close",modal)?.focus();requestAnimationFrame(()=>renderSvgs())}
function closeModal(modal){if(!modal?.classList.contains("show"))return;modal.classList.remove("show");document.body.style.overflow="";lastModalTrigger?.focus?.();lastModalTrigger=null}
poster.addEventListener("click",()=>openModal(imageModal,poster));
$("#closeImage").addEventListener("click",()=>closeModal(imageModal));
$("#closeLab").addEventListener("click",()=>closeModal(labModal));
[imageModal,labModal].forEach(m=>m.addEventListener("click",e=>{if(e.target===m)closeModal(m)}));

const labSvgs=[$("#labSvg"),$("#modalSvg")];
const reduceMotion=window.matchMedia?.("(prefers-reduced-motion: reduce)");
const LAB_DEFAULTS={
  mode:"factor",free:false,highlight:"",compare:false,
  factor:{a:5,b:3,c:2,d:1},
  interval:{roots:[-3,2,3],probe:0,relation:"le",middleKind:"simple"},
  holes:{m:-4,showMistake:false},
  motion:{x:24,playTime:0,playing:false,speed:1}
};
const labState=JSON.parse(JSON.stringify(LAB_DEFAULTS));
let labHistory=[],labHistoryIndex=-1,dragInfo=null,lastFrame=0;
const labSnapshots={A:null,B:null};
const predictionState={};

const LAB_SCENARIOS={
  factor:[
    {id:"base",label:"Базовый",apply:()=>Object.assign(labState.factor,{a:5,b:3,c:2,d:1})},
    {id:"ad-zero",label:"a = d → 0",apply:()=>Object.assign(labState.factor,{a:4,b:3,c:2,d:4})},
    {id:"bc-zero",label:"b = −c → 0",apply:()=>Object.assign(labState.factor,{a:5,b:3,c:-3,d:1})},
    {id:"contrast",label:"Контраст знаков",apply:()=>Object.assign(labState.factor,{a:-2,b:5,c:-1,d:3})}
  ],
  interval:[
    {id:"simple",label:"3 простых корня",apply:()=>Object.assign(labState.interval,{roots:[-3,2,3],probe:0,relation:"le",middleKind:"simple"})},
    {id:"double",label:"Двойной корень",apply:()=>Object.assign(labState.interval,{roots:[-3,1,3],probe:2,relation:"le",middleKind:"double"})},
    {id:"denominator",label:"Ноль знаменателя",apply:()=>Object.assign(labState.interval,{roots:[-3,1,3],probe:0,relation:"le",middleKind:"hole"})},
    {id:"positive",label:"Ищем ≥ 0",apply:()=>Object.assign(labState.interval,{roots:[-4,-1,3],probe:1,relation:"ge",middleKind:"simple"})}
  ],
  holes:[
    {id:"regular",label:"Обычный уровень",apply:()=>Object.assign(labState.holes,{m:-4,showMistake:false})},
    {id:"hole1",label:"Через (1; −3)",apply:()=>Object.assign(labState.holes,{m:-3,showMistake:false})},
    {id:"hole2",label:"Через (−2; −6)",apply:()=>Object.assign(labState.holes,{m:-6,showMistake:false})},
    {id:"mistake",label:"Ошибка: забыли ОДЗ",apply:()=>Object.assign(labState.holes,{m:-3,showMistake:true})}
  ],
  motion:[
    {id:"slow",label:"Медленно",apply:()=>Object.assign(labState.motion,{x:18,playTime:0,playing:false})},
    {id:"solution",label:"Разность 1 ч",apply:()=>Object.assign(labState.motion,{x:30,playTime:0,playing:false})},
    {id:"fast",label:"Быстро",apply:()=>Object.assign(labState.motion,{x:54,playTime:0,playing:false})}
  ]
};

function clone(value){return JSON.parse(JSON.stringify(value))}
function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function fmt(v,d=2){
  if(!Number.isFinite(v))return "—";
  const n=Math.abs(v)<1e-9?0:v;
  return n.toLocaleString("ru-RU",{maximumFractionDigits:d,minimumFractionDigits:0}).replace("-","−");
}
function signLabel(v){return v>1e-8?"+":v<-1e-8?"−":"0"}
function stateCore(){return {mode:labState.mode,free:labState.free,factor:clone(labState.factor),interval:clone(labState.interval),holes:clone(labState.holes),motion:{...clone(labState.motion),playing:false}}}
function restoreCore(snap){
  labState.mode=snap.mode;labState.free=Boolean(snap.free);labState.factor=clone(snap.factor);labState.interval=clone(snap.interval);labState.holes=clone(snap.holes);labState.motion={...clone(snap.motion),playing:false};
}
function pushHistory(label="изменение"){
  const snap=stateCore();
  const key=JSON.stringify(snap);
  if(labHistory[labHistoryIndex]?.key===key)return;
  labHistory=labHistory.slice(0,labHistoryIndex+1);
  labHistory.push({key,snap,label});if(labHistory.length>40)labHistory.shift();
  labHistoryIndex=labHistory.length-1;updateHistoryButtons();
}
function updateHistoryButtons(){
  $("#labUndo").disabled=labHistoryIndex<=0;$("#labRedo").disabled=labHistoryIndex<0||labHistoryIndex>=labHistory.length-1;
}
function currentModeState(){return {mode:labState.mode,data:clone(labState[labState.mode]),derived:derived()}}

function calcFactor(data=labState.factor){
  const {a,b,c,d}=data,terms=[a*b,a*c,-d*b,-d*c],left=terms.reduce((s,v)=>s+v,0),right=(b+c)*(a-d);
  return {terms,left,right,group1:a*(b+c),group2:-d*(b+c),common:b+c,diff:a-d};
}
function intervalEvalAt(x,data=labState.interval){
  const [r1,r2,r3]=data.roots;
  if(data.middleKind==="hole"){
    if(Math.abs(x-r2)<1e-8)return null;
    return ((x-r1)*(x-r3))/(x-r2);
  }
  const middle=data.middleKind==="double"?(x-r2)**2:(x-r2);
  return (x-r1)*middle*(x-r3);
}
function calcInterval(data=labState.interval){
  const roots=[...data.roots].sort((a,b)=>a-b),probeValue=intervalEvalAt(data.probe,{...data,roots}),relation=data.relation;
  const probeAllowed=probeValue!==null;
  const probeIn=probeAllowed&&(relation==="le"?probeValue<=1e-8:probeValue>=-1e-8);
  const points=[-6,...roots,6];
  const bands=[];
  for(let i=0;i<points.length-1;i++){
    const mid=(points[i]+points[i+1])/2,val=intervalEvalAt(mid,{...data,roots});
    bands.push({from:points[i],to:points[i+1],sign:Math.sign(val||0),selected:relation==="le"?val<=0:val>=0});
  }
  return {roots,probeValue,probeAllowed,probeIn,bands};
}
function calcHoles(data=labState.holes){
  const candidateX=data.m+4,excluded=Math.abs(candidateX-1)<1e-8||Math.abs(candidateX+2)<1e-8;
  return {candidateX,excluded,intersections:excluded?0:1,holeLevels:[-3,-6]};
}
function calcMotion(data=labState.motion){
  const x=Math.max(6,Number(data.x)),back=x+6,distance=180,tThere=distance/x,tBack=distance/back,diff=tThere-tBack,residual=diff-1,maxTime=Math.max(tThere,tBack);
  return {x,back,distance,tThere,tBack,diff,residual,maxTime};
}
function derived(){
  if(labState.mode==="factor")return calcFactor();
  if(labState.mode==="interval")return calcInterval();
  if(labState.mode==="holes")return calcHoles();
  return calcMotion();
}
