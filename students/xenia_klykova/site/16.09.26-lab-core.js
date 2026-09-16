"use strict";
const NS="http://www.w3.org/2000/svg";
const $=id=>document.getElementById(id), scene=$("scene"), viewport=$("viewport"), canvas=$("canvas");
const ui={modeTitle:$("modeTitle"),modeLead:$("modeLead"),sideText:$("sideText"),scenarios:$("scenarios"),stats:$("stats"),controls:$("controls"),result:$("result"),calcs:$("calcs"),chart:$("miniChart"),compare:$("compare"),compareBody:$("compareBody"),proof:$("proofBadge"),free:$("freeBadge"),stepTitle:$("stepTitle"),stepText:$("stepText"),predictQuestion:$("predictQuestion"),predictOptions:$("predictOptions"),predictFeedback:$("predictFeedback"),challengeText:$("challengeText"),challengeBar:$("challengeBar"),challengeFeedback:$("challengeFeedback"),discovery:$("discovery"),kbd:$("kbdHelp")};
const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)), round=(x,n=1)=>Number(x.toFixed(n)), deep=o=>JSON.parse(JSON.stringify(o));
const state={mode:"plane",scenario:"parallel",free:false,zoom:1,panX:0,panY:0,rot:.38,guideStep:0,focus:null,snapshot:null,predictionChoice:null,drag:null,plane:{relation:"parallel",uA:-.42,uB:.32,lift:0},midline:{AD:12,BC:14,angle:72,separation:1.15},similarity:{r:.5,BB1:7,tilt:0}};
const history=[],future=[];
const MODE={
 plane:{title:"Когда прямая действительно лежит в плоскости?",lead:"Меняйте конфигурацию и отделяйте геометрический факт от того, что можно строго доказать по условию.",text:"Ключевой вопрос — сколько различных точек прямой c гарантированно принадлежат плоскости α и достаточно ли этого для вывода c ⊂ α.",scenarios:[['parallel','a ∥ b: две точки'],['pierce','a ∩ b: c выходит из α'],['border','Граничный: c остаётся в α']],steps:[['1. Исходные прямые','Сначала смотрим, как расположены a и b внутри α.'],['2. Точки пересечения','Следим, где c встречает a и b и совпадают ли эти точки.'],['3. Проверка достаточности','Две различные точки c в α дают строгий критерий принадлежности всей прямой.'],['4. Вывод','Сравниваем фактическое положение c и то, что гарантировано данными.']]},
 midline:{title:"Что сохраняется у четырёх средних линий?",lead:"Меняйте длины противоположных рёбер и форму тетраэдра — все зависимые величины пересчитываются одновременно.",text:"M, N, P, Q — середины DB, DC, AB, AC. Проверьте экспериментально, какие стороны MNPQ зависят от AD и BC и почему периметр не зависит от ракурса и формы тетраэдра.",scenarios:[['textbook','AD=12, BC=14'],['training','AD=18, BC=10'],['sameP','Тот же P, другая форма'],['flat','Почти плоский случай']],steps:[['1. Середины рёбер','Сначала отмечены M, N, P, Q на четырёх рёбрах.'],['2. Пара MN и PQ','Обе стороны — средние линии граней, содержащих BC: MN=PQ=BC/2.'],['3. Пара MP и NQ','Обе стороны — средние линии граней, содержащих AD: MP=NQ=AD/2.'],['4. Параллелограмм и периметр','Противоположные стороны попарно равны и параллельны, поэтому P(MNPQ)=AD+BC.']]},
 similarity:{title:"Как рождается пропорция подобия?",lead:"Перетаскивайте C и B₁, затем специально нарушьте параллельность и посмотрите, какая связь исчезнет.",text:"Когда CC₁ ∥ BB₁ и A, C₁, B₁ коллинеарны, треугольники ACC₁ и ABB₁ подобны. Проверяем руками соответствие CC₁/BB₁ = AC/AB.",scenarios:[['midpoint','C — середина, BB₁=7'],['threeTwo','AC:CB=3:2'],['twoThree','AC:CB=2:3'],['broken','Нарушить параллельность']],steps:[['1. Параллельные прямые','BB₁ и CC₁ задают вспомогательную плоскость β.'],['2. Общая прямая плоскостей','A, B₁, C₁ лежат на α∩β, значит коллинеарны.'],['3. Два треугольника','При CC₁ ∥ BB₁ получаем равные соответствующие углы и подобие.'],['4. Пропорция','Соответствуют CC₁ ↔ BB₁ и AC ↔ AB, поэтому CC₁/BB₁=AC/AB.']]}
};
const SCENARIOS={
 plane:{parallel:{plane:{relation:"parallel",uA:-.42,uB:.32,lift:0}},pierce:{plane:{relation:"intersect",uA:0,uB:0,lift:.82}},border:{plane:{relation:"intersect",uA:0,uB:0,lift:0}}},
 midline:{textbook:{midline:{AD:12,BC:14,angle:72,separation:1.15}},training:{midline:{AD:18,BC:10,angle:112,separation:1.35}},sameP:{midline:{AD:16,BC:10,angle:45,separation:1.55}},flat:{midline:{AD:12,BC:14,angle:20,separation:.45}}},
 similarity:{midpoint:{similarity:{r:.5,BB1:7,tilt:0}},threeTwo:{similarity:{r:.6,BB1:20,tilt:0}},twoThree:{similarity:{r:.4,BB1:25,tilt:0}},broken:{similarity:{r:.4,BB1:25,tilt:12}}}
};
function subject(){return state[state.mode]}
function coreSnapshot(){return {mode:state.mode,scenario:state.scenario,free:state.free,plane:deep(state.plane),midline:deep(state.midline),similarity:deep(state.similarity),rot:state.rot}}
function applySnapshot(s){state.mode=s.mode;state.scenario=s.scenario;state.free=s.free;state.plane=deep(s.plane);state.midline=deep(s.midline);state.similarity=deep(s.similarity);state.rot=s.rot;state.guideStep=0;mountMode();schedule()}
function pushHistory(){const s=coreSnapshot(),last=history.at(-1);if(!last||JSON.stringify(last)!==JSON.stringify(s)){history.push(s);if(history.length>60)history.shift();future.length=0}paintHistory()}
function undo(){if(history.length<2)return;future.push(history.pop());applySnapshot(history.at(-1));paintHistory()}
function redo(){if(!future.length)return;const s=future.pop();history.push(deep(s));applySnapshot(s);paintHistory()}
function paintHistory(){$("undoBtn").disabled=history.length<2;$('redoBtn').disabled=future.length===0}
const svg=(tag,attrs={},text="")=>{const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v));if(text)n.textContent=text;return n};
const line=(a,b,cls,attrs={})=>svg("line",{x1:a[0],y1:a[1],x2:b[0],y2:b[1],class:cls,...attrs});
const text=(p,t,cls="label",attrs={})=>svg("text",{x:p[0],y:p[1],class:cls,...attrs},t);
const circle=(p,r=6,cls="point",attrs={})=>svg("circle",{cx:p[0],cy:p[1],r,class:cls,...attrs});
const poly=(pts,cls,attrs={})=>svg("polygon",{points:pts.map(p=>p.join(",")).join(" "),class:cls,...attrs});
function applyView(){viewport.setAttribute("transform",`translate(${state.panX} ${state.panY}) scale(${state.zoom})`);$("zoomLabel").value=Math.round(state.zoom*100)+"%"}
function clearScene(){viewport.replaceChildren()}
function planeProject(u,v,z=0){return [500+u*285+v*80,330+v*175-u*25-z*165]}
function planeMetrics(m=state.plane){const guaranteed=m.relation==="parallel"?2:1;const actualInPlane=m.relation==="parallel"||Math.abs(m.lift)<.03;return {guaranteed,actualInPlane,lift:Math.abs(m.lift),proof:m.relation==="parallel"}}
function drawPlane(m,ghost=false){const g=svg("g",{class:ghost?"ghost":""});
 const corners=[[-1.25,-.86],[1.25,-.86],[1.25,.86],[-1.25,.86]].map(([u,v])=>planeProject(u,v));g.append(poly(corners,"plane"));
 for(let i=-1;i<=1;i+=.5)g.append(line(planeProject(-1.2,i*.7),planeProject(1.2,i*.7),"plane-grid"));
 for(let i=-1;i<=1;i+=.5)g.append(line(planeProject(i,-.8),planeProject(i,.8),"plane-grid"));
 g.append(text(planeProject(1.05,-.68),"α","label"));
 if(m.relation==="parallel"){
   const v1=-.38,v2=.42,A=planeProject(m.uA,v1),B=planeProject(m.uB,v2),a1=planeProject(-1.05,v1),a2=planeProject(1.05,v1),b1=planeProject(-1.05,v2),b2=planeProject(1.05,v2);
   g.append(line(a1,a2,"line-a",{'data-focus':'a'}),line(b1,b2,"line-b",{'data-focus':'v'}));
   const dx=B[0]-A[0],dy=B[1]-A[1],L=Math.hypot(dx,dy),ux=dx/L,uy=dy/L;g.append(line([A[0]-ux*120,A[1]-uy*120],[B[0]+ux*120,B[1]+uy*120],"line-c",{'data-focus':'b'}));
   g.append(circle(A,7,"point",{'data-focus':'g'}),circle(B,7,"point",{'data-focus':'g'}),text([A[0]-24,A[1]-12],"A"),text([B[0]+12,B[1]-8],"B"),text([a2[0]+10,a2[1]],"a"),text([b2[0]+10,b2[1]],"b"),text([B[0]+ux*105,B[1]+uy*105],"c"));
   if(!ghost){g.append(circle(A,12,"handle",{'data-handle':'planeA','aria-label':'Перетащить точку A вдоль прямой a'}),circle(B,12,"handle",{'data-handle':'planeB','aria-label':'Перетащить точку B вдоль прямой b'}));}
   if(state.guideStep===1||state.guideStep===2)g.append(circle(A,18,"focus-ring"),circle(B,18,"focus-ring"));
 }else{
   const Q=planeProject(0,0),a1=planeProject(-1,-.75),a2=planeProject(1,.75),b1=planeProject(-1,.75),b2=planeProject(1,-.75),H=planeProject(.7,.42,m.lift),H0=planeProject(.7,.42,0);
   g.append(line(a1,a2,"line-a",{'data-focus':'a'}),line(b1,b2,"line-b",{'data-focus':'v'}),line(Q,H,"line-c",{'data-focus':'b'}),line(H0,H,"helper"));
   g.append(circle(Q,8,"point",{'data-focus':'g'}),text([Q[0]+12,Q[1]-12],"Q=A=B"),text([a2[0]+8,a2[1]],"a"),text([b2[0]+8,b2[1]],"b"),text([H[0]+10,H[1]-10],"c"),text([H0[0]+12,H0[1]+20],"проекция c на α","soft-label"));
   if(!ghost)g.append(circle(H,13,"handle",{'data-handle':'planeLift','aria-label':'Изменить выход прямой c из плоскости'}));
   if(state.guideStep===1||state.guideStep===2)g.append(circle(Q,20,"focus-ring"));
 }
 return g}
function midModel(m=state.midline){const th=m.angle*Math.PI/180,L1=m.AD/10,L2=m.BC/10,h=m.separation;const A=[-L1/2,0,h],D=[L1/2,0,h],v=[Math.cos(th)*L2,Math.sin(th)*L2,0],B=[-v[0]/2,-v[1]/2,-h],C=[v[0]/2,v[1]/2,-h];const mid=(x,y)=>x.map((q,i)=>(q+y[i])/2);return {A,D,B,C,M:mid(D,B),N:mid(D,C),P:mid(A,B),Q:mid(A,C)}}
function p3(p){const c=Math.cos(state.rot),s=Math.sin(state.rot),x=p[0]*c-p[2]*s,z=p[0]*s+p[2]*c;return [500+x*155,320-p[1]*150+z*48]}
function drawMidline(m,ghost=false){const V=midModel(m),p={};for(const[k,v]of Object.entries(V))p[k]=p3(v);const g=svg("g",{class:ghost?"ghost":""});
 g.append(poly([p.A,p.B,p.D],"face-a"),poly([p.A,p.C,p.D],"face-v"));
 const edges=[["A","B"],["A","C"],["A","D"],["B","C"],["B","D"],["C","D"]];edges.forEach(([u,v],i)=>g.append(line(p[u],p[v],"edge "+(i===1||i===4?"hidden-edge":""),{'data-focus':i<3?'a':'v'})));
 [["M","N","mid"],["P","Q","mid"],["M","P","mid alt"],["N","Q","mid alt"]].forEach(([u,v,c])=>g.append(line(p[u],p[v],c,{'data-focus':'b'})));
 for(const k of ['A','B','C','D','M','N','P','Q']){g.append(circle(p[k],k.charCodeAt(0)<69?5.5:6.5,k.charCodeAt(0)<69?"point a":"point",{'data-focus':k.length===1?'g':'b'}),text([p[k][0]+8,p[k][1]-8],k));}
 if(state.guideStep===1){for(const k of ['M','N','P','Q'])g.append(circle(p[k],16,"focus-ring"));}
 if(state.guideStep===2){g.append(line(p.M,p.N,"line-c guide-hot"),line(p.P,p.Q,"line-c guide-hot"));}
 if(state.guideStep===3){g.append(line(p.M,p.P,"line-c guide-hot"),line(p.N,p.Q,"line-c guide-hot"));}
 if(!ghost){const y=585,x0=155,w=260,adX=x0+w*(m.AD-4)/20,bcX=585+w*(m.BC-4)/20;g.append(text([x0,y-36],"AD","value-label"),line([x0,y],[x0+w,y],"ruler"),line([x0,y],[adX,y],"ruler-fill"),circle([adX,y],11,"handle",{'data-handle':'AD'}),text([adX-14,y-15],String(round(m.AD,1)),"soft-label"));g.append(text([585,y-36],"BC","value-label"),line([585,y],[585+w,y],"ruler"),line([585,y],[bcX,y],"ruler-fill"),circle([bcX,y],11,"handle",{'data-handle':'BC'}),text([bcX-14,y-15],String(round(m.BC,1)),"soft-label"));}
 return g}
function similarityGeom(m=state.similarity){const AB=50,H=m.BB1,d=m.tilt*Math.PI/180,Cx=m.r*AB,den=AB*Math.cos(d)-H*Math.sin(d);const t=(m.r*AB*Math.cos(d))/den,s=(m.r*AB*H)/den;return {AB,H,t,s,valid:Math.abs(m.tilt)<.25&&t>0&&t<1.3&&s>0}}
function simPoint(x,y){return [180+x/50*620,535-y*12]}
function drawSimilarity(m,ghost=false){const q=similarityGeom(m),A=simPoint(0,0),B=simPoint(50,0),B1=simPoint(50,m.BB1),C=simPoint(m.r*50,0),C1=simPoint(q.t*50,q.t*m.BB1),g=svg("g",{class:ghost?"ghost":""});
 g.append(poly([A,B,B1],"face-v"),poly([A,C,C1],"face-a"),line(A,B,"edge"),line(A,B1,"edge",{'data-focus':'b'}),line(B,B1,"line-b",{'data-focus':'v'}),line(C,C1,"line-a",{'data-focus':'a'}));
 g.append(line([C[0]-20,C[1]],[C[0]+20,C[1]],"helper"));
 for(const[k,p]of Object.entries({A,B,B1,C,C1})){g.append(circle(p,7,"point",{'data-focus':'g'}),text([p[0]+9,p[1]-9],k.replace('1','₁')))}
 g.append(text([560,105],`AC/AB = ${round(m.r,2)}`,"value-label"),text([805,(B[1]+B1[1])/2],`BB₁ = ${round(m.BB1,1)}`,"soft-label"),text([C1[0]+12,(C[1]+C1[1])/2],`CC₁ = ${round(q.s,2)}`,"soft-label"));
 if(Math.abs(m.tilt)>.25)g.append(text([C1[0]+18,C1[1]-18],`отклонение ${round(m.tilt,1)}°`,"soft-label"));
 if(!ghost){g.append(circle(C,13,"handle",{'data-handle':'C','aria-label':'Переместить точку C вдоль AB'}),circle(B1,13,"handle",{'data-handle':'B1','aria-label':'Изменить длину BB1'}));}
 if(state.guideStep===1)g.append(line(B,B1,"line-c guide-hot"),line(C,C1,"line-c guide-hot"));
 if(state.guideStep===2)g.append(line(A,B1,"line-c guide-hot"));
 if(state.guideStep===3)g.append(poly([A,C,C1],"face-a",{stroke:'var(--gold)','stroke-width':3}),poly([A,B,B1],"face-v",{stroke:'var(--gold)','stroke-width':3}));
 return g}
function metrics(){if(state.mode==='plane')return planeMetrics();if(state.mode==='midline'){const m=state.midline;return {mn:m.BC/2,mp:m.AD/2,P:m.AD+m.BC,angle:m.angle,separation:m.separation}}const m=state.similarity,q=similarityGeom();return {ratio:m.r,cc:q.s,bb:m.BB1,observed:q.s/m.BB1,tilt:m.tilt,valid:q.valid}}
function drawBars(labels,vals,classes){const g=svg('g');const max=Math.max(...vals,1),x=40,w=210;labels.forEach((lab,i)=>{const y=35+i*48;g.append(text([8,y+14],lab,'soft-label'),svg('rect',{x,y,width:w,height:14,rx:7,class:'bar-bg'}),svg('rect',{x,y,width:w*vals[i]/max,height:14,rx:7,class:classes[i]}),text([x+w+8,y+12],String(round(vals[i],2)),'value-label'))});return g}
function renderChart(){ui.chart.replaceChildren();const W=320,H=150;ui.chart.append(line([30,125],[300,125],'ruler'),line([30,15],[30,125],'ruler'));
 if(state.mode==='plane'){const m=planeMetrics();ui.chart.append(drawBars(['гарант. точки','высота c'],[m.guaranteed,m.lift*2],['bar-a','bar-g']));return}
 if(state.mode==='midline'){const bc=state.midline.BC,x0=4,x1=24,y0=8,y1=48,px=x=>30+(x-x0)/(x1-x0)*260,py=y=>125-(y-y0)/(y1-y0)*105;ui.chart.append(line([px(x0),py(x0+bc)],[px(x1),py(x1+bc)],'line-a'),circle([px(state.midline.AD),py(state.midline.AD+bc)],6,'point'));ui.chart.append(text([120,18],`P = AD + ${round(bc,1)}`,'soft-label'));return}
 const Hh=state.similarity.BB1,px=r=>30+r*260,py=y=>125-y/Math.max(Hh,1)*100;ui.chart.append(line([px(.05),py(.05*Hh)],[px(.95),py(.95*Hh)],'line-a'));const q=similarityGeom();ui.chart.append(circle([px(state.similarity.r),py(q.s)],6,'point'));ui.chart.append(text([95,18],`CC₁ = (AC/AB)·BB₁ при ∥`,'soft-label'))}
function render(){clearScene();if(state.snapshot&&state.snapshot.mode===state.mode){if(state.mode==='plane')viewport.append(drawPlane(state.snapshot.plane,true));if(state.mode==='midline')viewport.append(drawMidline(state.snapshot.midline,true));if(state.mode==='similarity')viewport.append(drawSimilarity(state.snapshot.similarity,true));}
 if(state.mode==='plane')viewport.append(drawPlane(state.plane));if(state.mode==='midline')viewport.append(drawMidline(state.midline));if(state.mode==='similarity')viewport.append(drawSimilarity(state.similarity));applyView();paintSide();syncControls();renderChart();paintCompare();paintGuide();paintChallenge();paintHistory();highlightFocus();}
let raf=0;function schedule(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;render()})}
function setHTMLStats(items){ui.stats.innerHTML=items.map(([k,v])=>`<div class="stat"><small>${k}</small><b>${v}</b></div>`).join('')}
function paintSide(){const m=metrics();ui.free.textContent=state.free?'Исследовать самому':'Готовый сценарий';ui.free.className='badge '+(state.free?'good':'');
 if(state.mode==='plane'){setHTMLStats([['различных точек c в α',m.guaranteed],['выход из α',m.lift<.03?'0':'+'+round(m.lift,2)],['фактически c⊂α',m.actualInPlane?'да':'нет'],['строго следует из условия',m.proof?'да':'нет']]);ui.proof.textContent=m.proof?'Критерий доказан':'Данных недостаточно';ui.proof.className='badge '+(m.proof?'good':'warn');ui.result.className='result '+(m.proof?'':'warn');ui.result.innerHTML=m.proof?'<b>A и B различны и обе лежат в α.</b><br>Следовательно, вся c принадлежит α.':m.actualInPlane?'<b>В этой конкретной конфигурации c лежит в α.</b><br>Но из факта A=B=Q это не следует: одной общей точки недостаточно.':'<b>c пересекает a и b в одной точке Q и выходит из α.</b><br>Контрпример показывает, почему одной точки недостаточно.';ui.calcs.innerHTML='<div class="formula">две различные точки c в α ⇒ c ⊂ α</div><p>Если a ∩ b = Q, обе встречи c с a и b могут совпасть в Q. Тогда условие даёт только одну точку c в α.</p>';}
 else if(state.mode==='midline'){setHTMLStats([['MN = PQ',round(m.mn,2)],['MP = NQ',round(m.mp,2)],['периметр MNPQ',round(m.P,2)],['угол между AD и BC',round(m.angle,0)+'°']]);ui.proof.textContent='P = AD + BC';ui.proof.className='badge good';ui.result.className='result';ui.result.innerHTML=`<b>${round(m.mn,2)} + ${round(m.mp,2)} + ${round(m.mn,2)} + ${round(m.mp,2)} = ${round(m.P,2)}</b><br>Изменение угла или пространственного разнесения меняет форму, но не периметр.`;ui.calcs.innerHTML=`<div class="formula">MN=PQ=BC/2=${round(m.mn,2)}</div><div class="formula">MP=NQ=AD/2=${round(m.mp,2)}</div><div class="formula">P=2·BC/2+2·AD/2=AD+BC=${round(m.P,2)}</div>`;}
 else{setHTMLStats([['AC / AB',round(m.ratio,3)],['CC₁ / BB₁',round(m.observed,3)],['CC₁',round(m.cc,2)],['отклонение от ∥',round(Math.abs(m.tilt),1)+'°']]);ui.proof.textContent=m.valid?'Треугольники подобны':'Параллельность нарушена';ui.proof.className='badge '+(m.valid?'good':'warn');ui.result.className='result '+(m.valid?'':'warn');ui.result.innerHTML=m.valid?`<b>${round(m.cc,2)} / ${round(m.bb,2)} = ${round(m.ratio,3)}.</b><br>Две пары соответствующих сторон меняются в одном масштабе.`:`<b>CC₁ ∦ BB₁.</b><br>Отношение CC₁/BB₁ = ${round(m.observed,3)}, тогда как AC/AB = ${round(m.ratio,3)}. Пропорция перестала быть следствием подобия.`;ui.calcs.innerHTML=`<div class="formula">AC/AB = ${round(m.ratio,3)}</div><div class="formula">CC₁/BB₁ = ${round(m.observed,3)}</div><p>${m.valid?'Равенство отношений подтверждено текущей геометрией.':'Условие параллельности нарушено, поэтому сравнивать эти отношения как соответствующие стороны подобных треугольников нельзя.'}</p>`;}
 paintDiscovery()}
function paintDiscovery(){let msg='';if(state.mode==='plane'&&state.plane.relation==='intersect'&&state.plane.lift>.45)msg='Обратите внимание: c встречает обе исходные прямые, но это всё ещё одна и та же точка Q — и c может выйти из α.';if(state.mode==='midline'&&Math.abs((state.midline.AD+state.midline.BC)-26)<.08&&state.scenario==='sameP')msg='Интересный случай: форма изменилась заметно, а периметр остался 26. Значит, угол между AD и BC в формулу периметра не входит.';if(state.mode==='similarity'&&Math.abs(state.similarity.tilt)>3)msg='Что изменилось? A, C₁, B₁ по-прежнему коллинеарны, но исчезла параллельность CC₁ и BB₁ — вместе с ней исчезло и подобие.';ui.discovery.textContent=msg;ui.discovery.classList.toggle('show',!!msg)}
