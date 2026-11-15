import {matchesLesson,lessonStatus,scheduledDate,completionDate,selectTimeline} from './ktp-model.mjs';
const $=id=>document.getElementById(id);
const names={planned:"Запланировано",in_progress:"В работе",done:"Пройдено",moved:"Перенесено",skipped:"Пропущено"};
const months=["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
const monthTitles=["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const isoToday=()=>{const d=new Date(),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");return y+"-"+m+"-"+day};
const ruDate=d=>{if(!d)return"Дата уточняется";const [y,m,day]=d.split("-").map(Number);return day+" "+months[m-1]+" "+y};
const shortDate=d=>d?d.slice(8)+"."+d.slice(5,7)+"."+d.slice(2,4):"—";
const mKey=d=>d.slice(0,7);
const safePath=p=>{if(typeof p!=="string"||!/^site\/[A-Za-z0-9_./-]+$/.test(p)||p.includes(".."))throw new Error("Недопустимый путь canonical state");return"../"+p};
async function readJson(p){const r=await fetch(p,{cache:"no-store"});if(!r.ok)throw new Error("HTTP "+r.status+" · "+p);return r.json()}
let plan=null,state=null,currentView="calendar",lastFocus=null;
const record=l=>state.records[l.id]||{status:"planned"};
const status=l=>lessonStatus(l,state.records);
const effectiveDate=l=>scheduledDate(l,state.records);
const lessonById=id=>plan.lessons.find(l=>l.id===id);
const statusEl=s=>{const e=document.createElement("span");e.className="status";e.dataset.status=s;e.textContent=names[s]||s;return e};
function setView(view){
 currentView=view;
 for(const btn of document.querySelectorAll("[data-view]"))btn.setAttribute("aria-pressed",String(btn.dataset.view===view));
 $("viewOverview").hidden=view!=="overview";$("viewCalendar").hidden=view!=="calendar";$("viewToday").hidden=view!=="today";
}
function openLesson(id){
 const l=lessonById(id);if(!l)return;
 const rec=record(l);
 $("detailIndex").textContent=l.id+" / "+ruDate(effectiveDate(l));
 $("detailTitle").textContent=l.topic;
 $("detailMeta").textContent=(names[status(l)]||status(l))+(effectiveDate(l)!==l.plannedDate?" · перенесено с "+ruDate(l.plannedDate):"");
 $("detailStage").textContent=l.stage+" / "+l.block;
 $("detailResult").textContent=l.result;
 $("detailContent").textContent=l.content;
 $("detailCheck").textContent=l.check;
 $("detailHomework").textContent=l.homework;
 $("detailSkills").textContent=l.targetCompetencies.join(" · ");
 const details=[names[status(l)]||status(l)];
 if(rec.actualDate)details.push("Проведено "+ruDate(rec.actualDate));
 if(rec.coverage)details.push("Охват: "+rec.coverage);
 if(rec.actualSummary)details.push(rec.actualSummary);
 $("detailFact").textContent=details.join(". ");
 lastFocus=document.activeElement;
 const dlg=$("lessonDialog");
 if(!dlg.open)dlg.showModal();
 history.replaceState(null,"","#"+id);
}
function closeLesson(){const dlg=$("lessonDialog");if(dlg.open)dlg.close()}
function initDialogs(){
 $("closeDialog").addEventListener("click",closeLesson);
 $("lessonDialog").addEventListener("close",()=>{if(lastFocus&&lastFocus.isConnected)lastFocus.focus();if(location.hash.startsWith("#ktp-"))history.replaceState(null,"",location.pathname+location.search);});
 $("lessonDialog").addEventListener("click",e=>{if(e.target===$("lessonDialog"))closeLesson()});
}
function stageSummary(){
 const el=$("stageList");el.replaceChildren();
 const stages=[...new Map(plan.lessons.map(x=>[x.stageId,x.stage])).entries()];
 stages.forEach(([id,name],index)=>{
  const all=plan.lessons.filter(x=>x.stageId===id),done=all.filter(x=>status(x)==="done").length;
  const row=document.createElement("article");row.className="stage";
  const n=document.createElement("div");n.className="stage-n";n.textContent=String(index+1).padStart(2,"0");
  const main=document.createElement("div");const title=document.createElement("strong");title.textContent=name;
  const sub=document.createElement("small");sub.textContent=shortDate(all[0].plannedDate)+" — "+shortDate(all[all.length-1].plannedDate)+" · "+all.length+" занятий";
  const progress=document.createElement("div");progress.className="progress";progress.setAttribute("role","progressbar");progress.setAttribute("aria-valuenow",done);progress.setAttribute("aria-valuemax",all.length);progress.setAttribute("aria-valuemin","0");progress.setAttribute("aria-label","Пройдено занятий: "+name);
  const fill=document.createElement("i");fill.style.width=(100*done/all.length)+"%";progress.appendChild(fill);
  main.append(title,sub,progress);
  const right=document.createElement("div");right.className="count";right.textContent=done+" / "+all.length;
  row.append(n,main,right);el.appendChild(row);
 });
}
function renderMetrics(){
 const ls=plan.lessons,done=ls.filter(l=>status(l)==="done").length,inProgress=ls.filter(l=>status(l)==="in_progress").length,pending=ls.filter(l=>!["done","in_progress","skipped"].includes(status(l))).length;
 $("metricTotal").textContent=ls.length;$("metricDone").textContent=done;$("metricActive").textContent=inProgress;$("metricPending").textContent=pending;
}
function filtered(){
 return plan.lessons.filter(l=>matchesLesson(l,state.records,{
  query:$("query").value,stageId:$("stageSelect").value,status:$("statusSelect").value
 }));
}
function renderCalendar(){
 const matches=filtered(),host=$("months");host.replaceChildren();
 $("matchCount").textContent=matches.length+" / "+plan.lessons.length+" занятий";
 if(!matches.length){const p=document.createElement("p");p.className="empty";p.textContent="По заданным фильтрам занятий нет.";host.appendChild(p);return}
 const grouped=new Map();matches.forEach(l=>{const key=mKey(effectiveDate(l));if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(l)});
 const allMonths=[...grouped.keys()].sort();
 let currentMonth=mKey(isoToday());
 if(currentMonth<allMonths[0])currentMonth=allMonths[0];
 if(currentMonth>allMonths[allMonths.length-1])currentMonth=allMonths[allMonths.length-1];
 const filtersActive=$("query").value.trim()||$("stageSelect").value!=="all"||$("statusSelect").value!=="all";
 for(const key of allMonths){
  const ls=grouped.get(key).sort((a,b)=>effectiveDate(a).localeCompare(effectiveDate(b)));
  const d=document.createElement("details");d.className="month";d.dataset.month=key;d.open=Boolean(filtersActive)||key===currentMonth;
  const summ=document.createElement("summary");
  const title=document.createElement("strong"),y=Number(key.slice(0,4)),m=Number(key.slice(5));
  title.textContent=monthTitles[m-1]+" "+y;
  const stats=document.createElement("small");stats.textContent=ls.length+" занятий · "+ls.filter(x=>status(x)==="done").length+" пройдено · "+ls.filter(x=>status(x)==="in_progress").length+" в работе";
  summ.append(title,stats);d.appendChild(summ);
  const scroll=document.createElement("div");scroll.className="table-scroll";
  const table=document.createElement("table");const head=document.createElement("thead");const tr=document.createElement("tr");
  for(const t of ["№","Дата","Статус","Тема занятия","Этап"]){const th=document.createElement("th");th.textContent=t;th.scope="col";tr.appendChild(th)}head.appendChild(tr);
  const body=document.createElement("tbody");
  for(const l of ls){
    const row=document.createElement("tr");
    const tdNo=document.createElement("td");tdNo.textContent=String(l.order).padStart(2,"0");
    const tdDate=document.createElement("td");tdDate.textContent=shortDate(effectiveDate(l));
    const tdStatus=document.createElement("td");tdStatus.appendChild(statusEl(status(l)));
    const tdName=document.createElement("td");const btn=document.createElement("button");btn.className="lesson-btn";btn.type="button";btn.textContent=l.topic;btn.addEventListener("click",()=>openLesson(l.id));tdName.appendChild(btn);
    const tdStage=document.createElement("td");tdStage.textContent=l.block;
    row.append(tdNo,tdDate,tdStatus,tdName,tdStage);body.appendChild(row);
  }
  table.append(head,body);scroll.appendChild(table);d.appendChild(scroll);host.appendChild(d);
 }
}
function todayItem(host,lesson,message,displayDate=null){
 host.replaceChildren();
 if(!lesson){const p=document.createElement("p");p.textContent=message;host.appendChild(p);return}
 const h=document.createElement("h3");const b=document.createElement("button");b.type="button";b.textContent=lesson.topic;b.addEventListener("click",()=>openLesson(lesson.id));h.appendChild(b);
 const dt=document.createElement("div");dt.className="date";dt.textContent=ruDate(displayDate||effectiveDate(lesson))+" · "+lesson.id;
 const st=statusEl(status(lesson));
 host.append(dt,h,st);
}
function renderToday(){
 const {todayLesson,next,lastDone}=selectTimeline(plan.lessons,state.records,isoToday());
 todayItem($("todayNow"),todayLesson,"На сегодняшнюю дату занятие не запланировано.");
 todayItem($("todayNext"),next,"Ближайших будущих запланированных занятий нет.");
 todayItem($("todayLast"),lastDone,"Отметок о завершённых занятиях пока нет.",
  lastDone?completionDate(lastDone,state.records):null);
}
async function bootstrap(){
 try{
  const c=await readJson("../student-contract.json");
  if(c.version!==2||c.studentId!=="sofya_luzianina")throw new Error("Неверная версия Student Platform v2 или studentId");
  [plan,state]=await Promise.all([readJson(safePath(c.planning.plan)),readJson(safePath(c.planning.state))]);
  if(plan.studentId!==c.studentId||state.studentId!==c.studentId||plan.programVersion!==state.programVersion)throw new Error("Несогласованная версия КТП");
  if(!Array.isArray(plan.lessons)||!state.records||typeof state.records!=="object")throw new Error("Повреждённые данные КТП");
  if(new Set(plan.lessons.map(x=>x.id)).size!==plan.lessons.length)throw new Error("Дубли ID занятий");
  if(plan.lessons.some(x=>!x.id||!x.topic||!x.plannedDate||!x.result||!x.check||!x.homework))throw new Error("Неполная запись занятия");
  const stages=[...new Map(plan.lessons.map(x=>[x.stageId,x.stage])).entries()];
  for(const [id,name] of stages){const opt=document.createElement("option");opt.value=id;opt.textContent=name;$("stageSelect").appendChild(opt)}
  $("query").addEventListener("input",renderCalendar);$("stageSelect").addEventListener("change",renderCalendar);$("statusSelect").addEventListener("change",renderCalendar);
  $("clearFilters").addEventListener("click",()=>{$("query").value="";$("stageSelect").value="all";$("statusSelect").value="all";renderCalendar()});
  document.querySelectorAll("[data-view]").forEach(x=>x.addEventListener("click",()=>setView(x.dataset.view)));
  initDialogs();renderMetrics();stageSummary();renderCalendar();renderToday();
  const fromHash=location.hash.slice(1);if(/^ktp-\d{3,}$/.test(fromHash)&&lessonById(fromHash)){setView("calendar");openLesson(fromHash)}
 }catch(err){
  console.error("KTP loading failed",err);
  $("loadError").hidden=false;
  $("loadError").textContent="Данные учебного плана временно недоступны. Повторите загрузку страницы. Техническая причина: "+err.message;
  $("months").textContent="Не удалось загрузить календарь.";
  $("stageList").textContent="Нет данных об этапах.";
  $("matchCount").textContent="—";
  for(const id of ["metricTotal","metricDone","metricActive","metricPending"])$(id).textContent="—";
  for(const id of ["todayNow","todayNext","todayLast"])$(id).textContent="Данные недоступны";
  for(const id of ["query","stageSelect","statusSelect","clearFilters"])$(id).disabled=true;
 }
}
const themeKey="sofya-luzianina-atlas-theme";
try{const saved=localStorage.getItem(themeKey);if(saved==="light"||saved==="dark")document.documentElement.dataset.theme=saved}catch{}
$("themeToggle").addEventListener("click",()=>{const root=document.documentElement;root.dataset.theme=root.dataset.theme==="dark"?"light":"dark";try{localStorage.setItem(themeKey,root.dataset.theme)}catch{}});
let expandedBeforePrint=[];
window.addEventListener("beforeprint",()=>{
 expandedBeforePrint=[...document.querySelectorAll(".month")].filter(el=>el.open).map(el=>el.dataset.month);
 document.querySelectorAll(".month").forEach(el=>{el.open=true});
});
window.addEventListener("afterprint",()=>{
 document.querySelectorAll(".month").forEach(el=>{el.open=expandedBeforePrint.includes(el.dataset.month)});
});
window.addEventListener("storage",event=>{
 if(event.key===themeKey&&["light","dark"].includes(event.newValue))
  document.documentElement.dataset.theme=event.newValue;
});
void bootstrap();
