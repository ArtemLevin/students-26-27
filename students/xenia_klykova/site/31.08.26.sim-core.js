'use strict';
/* GEOMETRY_CORE_START */
const EPS=1e-6,TAU=Math.PI*2;
const v=(x=0,y=0,z=0)=>({x,y,z});
const add=(a,b)=>v(a.x+b.x,a.y+b.y,a.z+b.z),sub=(a,b)=>v(a.x-b.x,a.y-b.y,a.z-b.z),mul=(a,k)=>v(a.x*k,a.y*k,a.z*k);
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const cross=(a,b)=>v(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x);
const norm=a=>Math.hypot(a.x,a.y,a.z),unit=a=>{const n=norm(a);return n<EPS?v(0,0,0):mul(a,1/n)};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),deg=r=>r*180/Math.PI,rad=d=>d*Math.PI/180;
function triangleArea(A,B,C){return norm(cross(sub(B,A),sub(C,A)))/2}
function distancePointLine(P,A,B){const d=sub(B,A),n=norm(d);return n<EPS?norm(sub(P,A)):norm(cross(sub(P,A),d))/n}
function derivedPlane(A,B,C){const u0=sub(B,A),n0=cross(u0,sub(C,A));if(norm(n0)<EPS)return null;const u=unit(u0),n=unit(n0),w=unit(cross(n,u)),origin=mul(add(add(A,B),C),1/3);return{origin,u,v:w,n}}
function pointPlaneDistance(P,plane){return Math.abs(dot(sub(P,plane.origin),plane.n))}
function rodrigues(vec,axis,angle){const k=unit(axis),c=Math.cos(angle),s=Math.sin(angle);return add(add(mul(vec,c),mul(cross(k,vec),s)),mul(k,dot(k,vec)*(1-c)))}
function pencilPlane(A,B,angle){const u=unit(sub(B,A));let seed=Math.abs(u.z)<.85?v(0,0,1):v(0,1,0);let base=unit(cross(u,seed));if(norm(base)<EPS){seed=v(1,0,0);base=unit(cross(u,seed))}const w=rodrigues(base,u,angle),n=unit(cross(u,w));return{origin:mul(add(A,B),.5),u,v:w,n}}
function linePlaneAlpha(P,Q){const dz=Q.z-P.z;if(Math.abs(P.z)<EPS&&Math.abs(Q.z)<EPS)return{type:'contained',point:null,t:null};if(Math.abs(dz)<EPS)return{type:'parallel',point:null,t:null};const t=-P.z/dz;return{type:'intersect',point:add(P,mul(sub(Q,P),t)),t}}
function betaPlane(angle,offset){const a=angle,u=v(1,0,0),w=v(0,Math.cos(a),Math.sin(a)),origin=v(0,0,offset),n=unit(cross(u,w));return{origin,u,v:w,n}}
function planePlaneAlphaBeta(angle,offset){const s=Math.sin(angle),c=Math.cos(angle);if(Math.abs(s)<EPS)return Math.abs(offset)<EPS?{type:'coincident',lineY:0}:{type:'parallel',lineY:null};return{type:'intersect',lineY:-c*offset/s}}
function planePointResidual(P,plane){return dot(sub(P,plane.origin),plane.n)}
/* GEOMETRY_CORE_END */

const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
function safeGet(k){try{return localStorage.getItem(k)}catch(_){return null}}function safeSet(k,val){try{localStorage.setItem(k,val)}catch(_){}}
const COLLINEAR_TOL=.015;
const deep=o=>JSON.parse(JSON.stringify(o)),fmt=(n,d=2)=>Number.isFinite(n)?Number(n).toFixed(d):'—',near=(a,b,t=.06)=>Math.abs(a-b)<=t;
const scenarioDefaults={
 unique:{points:{A:v(-2,-1,0),B:v(2,-1,0),C:v(.2,1.35,.9)},beta:{angle:45,offset:0},line:{P:v(-1,-1,0),Q:v(1,1,0)},pencilAngle:45},
 pencil:{points:{A:v(-2,0,0),B:v(2,0,0),C:v(.3,0,0)},beta:{angle:45,offset:0},line:{P:v(-1,-1,0),Q:v(1,1,0)},pencilAngle:45},
 axiom2:{points:{A:v(-1.7,-.7,0),B:v(1.5,.8,0),C:v(0,1,1)},beta:{angle:45,offset:0},line:{P:v(-1,-1,0),Q:v(1,1,0)},pencilAngle:45},
 linePlane:{points:{A:v(-2,-1,0),B:v(2,-1,0),C:v(0,1,1)},beta:{angle:45,offset:0},line:{P:v(-1.6,-1.1,-1),Q:v(1.3,.8,1.2)},pencilAngle:45},
 planes:{points:{A:v(-2,0,0),B:v(2,0,0),C:v(0,1,1)},beta:{angle:52,offset:0},line:{P:v(-1,-1,0),Q:v(1,1,0)},pencilAngle:45},
 sandbox:{points:{A:v(-1.8,-1,0),B:v(1.8,-.8,0),C:v(.1,1.3,1.1)},beta:{angle:38,offset:.35},line:{P:v(-1.4,1,-.8),Q:v(1.4,-.4,1.2)},pencilAngle:70}
};
const education={
 unique:{cause:'координаты C',calc:'h(C,AB) и S△ABC',result:'единственность плоскости',status:'Перемещайте C. При приближении к AB площадь треугольника стремится к нулю.',formula:'S△ABC = ½ · |AB| · h(C,AB)',challenge:'Добейтесь коллинеарности A, B, C: h(C,AB) < 0,08.',prediction:'Что произойдёт с единственностью плоскости, если C попадёт на AB?',options:[['uniqueLost','Единственность исчезнет'],['stillOne','Останется одна'],['zeroPlanes','Плоскостей не будет']],correct:'uniqueLost'},
 pencil:{cause:'угол плоскости вокруг AB',calc:'ориентация плоскости',result:'все плоскости содержат AB',status:'Точки A, B, C коллинеарны. Вращайте одну из допустимых плоскостей вокруг общей прямой AB.',formula:'A,B,C ∈ AB ⇒ через A,B,C проходит ∞ плоскостей',challenge:'Установите угол выбранной плоскости около 90°.',prediction:'Изменится ли число плоскостей при вращении вокруг AB?',options:[['sameInf','Нет, останется бесконечным'],['one','Станет 1'],['none','Станет 0']],correct:'sameInf'},
 axiom2:{cause:'высоты A и B над α',calc:'A∈α? B∈α?',result:'AB⊂α или другое положение',status:'Поднимите одну из точек над α и наблюдайте, когда условие аксиомы 2 перестаёт выполняться.',formula:'A∈α ∧ B∈α ⇒ AB⊂α',challenge:'Добейтесь состояния AB ⊂ α.',prediction:'Если поднять B над α, сохранится ли AB ⊂ α?',options:[['no','Нет'],['yes','Да'],['depends','Всегда зависит от рисунка']],correct:'no'},
 linePlane:{cause:'координаты P и Q',calc:'знаки z(P), z(Q)',result:'прямая лежит / пересекает / параллельна α',status:'Меняйте высоты P и Q. Классификация прямой относительно α вычисляется из координат.',formula:'z=0 — плоскость α; для прямой анализируем z(P+t(Q−P))',challenge:'Получите ровно одну точку пересечения прямой с α.',prediction:'Если P и Q имеют одинаковую ненулевую высоту, как расположена прямая?',options:[['parallel','Параллельна α'],['contained','Лежит в α'],['cross','Обязательно пересекает α']],correct:'parallel'},
 planes:{cause:'угол β и смещение',calc:'нормали и взаимное положение',result:'совпадение / пересечение / параллельность',status:'Изменяйте угол β и её смещение. Линия пересечения появляется только при непараллельных плоскостях.',formula:'α: z=0; β задаётся углом θ и смещением d',challenge:'Получите совпадающие плоскости: θ≈0° и d≈0.',prediction:'Что произойдёт при θ→0° и d=0?',options:[['coincident','Плоскости совпадут'],['parallel','Останутся различными параллельными'],['line','Сохранится единственная линия пересечения']],correct:'coincident'},
 sandbox:{cause:'любые параметры',calc:'все геометрические отношения',result:'собственный вывод',status:'Свободный режим: двигайте точки, линию, плоскость β и камеру. Сравнивайте снимки.',formula:'Состояние сцены → вычисления → геометрические отношения',challenge:'Создайте три неколлинеарные точки, причём C должна находиться заметно вне α.',prediction:'Можно ли тремя неколлинеарными точками задать наклонную плоскость?',options:[['yes','Да'],['no','Нет'],['onlyHorizontal','Только горизонтальную']],correct:'yes'}
};

const initialScene='unique';
const state={scene:initialScene,mode:'guided',selected:'C',camera:{yaw:-28,pitch:28,zoom:1},data:deep(scenarioDefaults[initialScene]),timeline:0,playing:false,speed:1,ghost:false,highlight:null};
let undoStack=[],redoStack=[],snapshots={A:null,B:null},raf=0,lastFrame=0,drag=null,predictionChoice=null,discoverySeen=new Set();

function snapshotState(){return deep({scene:state.scene,selected:state.selected,camera:state.camera,data:state.data,timeline:state.timeline})}
function restoreSnapshot(s){state.scene=s.scene;state.selected=s.selected;state.camera=deep(s.camera);state.data=deep(s.data);state.timeline=s.timeline||0;state.playing=false;syncScenarioButtons();scheduleRender()}
function commit(before){const after=JSON.stringify(snapshotState());if(JSON.stringify(before)!==after){undoStack.push(before);if(undoStack.length>40)undoStack.shift();redoStack=[]}}
function transact(fn){const before=snapshotState();fn();commit(before);scheduleRender()}
function undo(){if(!undoStack.length)return;const current=snapshotState(),prev=undoStack.pop();redoStack.push(current);restoreSnapshot(prev)}
function redo(){if(!redoStack.length)return;const current=snapshotState(),next=redoStack.pop();undoStack.push(current);restoreSnapshot(next)}

function currentPoints(){return state.data.points}
function selectedPoint(){const pts=currentPoints();if(pts[state.selected])return pts[state.selected];if(state.selected==='P')return state.data.line.P;if(state.selected==='Q')return state.data.line.Q;return pts.C}
function setSelectedPointValue(axis,value){const target=selectedPoint();if(target)target[axis]=value}
function sceneMetrics(s=state){
 const d=s.data,p=d.points,A=p.A,B=p.B,C=p.C,area=triangleArea(A,B,C),h=distancePointLine(C,A,B),ab=norm(sub(B,A));
 if(s.scene==='unique'||s.scene==='pencil'||s.scene==='sandbox')return{area,h,ab,planeCount:area<COLLINEAR_TOL?'∞':'1',collinear:area<COLLINEAR_TOL};
 if(s.scene==='axiom2'){const rel=linePlaneAlpha(A,B),aIn=Math.abs(A.z)<EPS,bIn=Math.abs(B.z)<EPS;return{aIn,bIn,relation:rel.type,area,h}};
 if(s.scene==='linePlane'){const rel=linePlaneAlpha(d.line.P,d.line.Q);return{relation:rel.type,t:rel.t,intersection:rel.point,zP:d.line.P.z,zQ:d.line.Q.z}};
 if(s.scene==='planes'){const angle=rad(d.beta.angle),rel=planePlaneAlphaBeta(angle,d.beta.offset);return{angle:d.beta.angle,offset:d.beta.offset,relation:rel.type,lineY:rel.lineY}};
 return{area,h,ab}
}
function relationLabel(type){return({contained:'лежит в α',parallel:'параллельна α',intersect:'1 точка пересечения',coincident:'совпадают'})[type]||type}
function challengePassed(){
 const m=sceneMetrics();
 if(state.scene==='unique')return m.h<.08;
 if(state.scene==='pencil')return near(state.data.pencilAngle,90,4);
 if(state.scene==='axiom2')return m.relation==='contained';
 if(state.scene==='linePlane')return m.relation==='intersect';
 if(state.scene==='planes')return Math.abs(state.data.beta.angle)<2&&Math.abs(state.data.beta.offset)<.05;
 if(state.scene==='sandbox')return m.area>.25&&Math.abs(state.data.points.C.z)>.5;
 return false
}
function discoveryMessage(){
 const m=sceneMetrics();
 if((state.scene==='unique'||state.scene==='sandbox')&&m.h<.08)return'Обратите внимание: h≈0 и S≈0 одновременно. Точки практически коллинеарны, поэтому единственность плоскости исчезает.';
 if(state.scene==='axiom2'&&m.relation==='intersect')return'Интересный переход: одна точка осталась в α, вторая вышла из α — прямая теперь имеет с α ровно одну общую точку.';
 if(state.scene==='linePlane'&&m.relation==='parallel')return'Граничный случай: обе точки линии находятся на одной ненулевой высоте, поэтому вся прямая идёт параллельно α.';
 if(state.scene==='planes'&&m.relation==='coincident')return'Особый случай: угол между плоскостями равен нулю и смещение равно нулю — α и β совпали.';
 return null
}
