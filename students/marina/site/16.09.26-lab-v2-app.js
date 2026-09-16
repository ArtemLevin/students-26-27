'use strict';

function eventPoint(e){const r=$('#plotSvg').getBoundingClientRect();return {x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};}
function zoomAt(factor,anchor={x:W/2,y:H/2}){const before={x:pxToX(anchor.x),y:pxToY(anchor.y)};state.view.scale=clamp(state.view.scale*factor,22,105);state.view.originX=anchor.x-before.x*state.view.scale;state.view.originY=anchor.y+before.y*state.view.scale;renderPlot();renderRelation();saveLocal();}
function centerView(){state.view={...defaultView};renderPlot();renderRelation();saveLocal();}
function beginPointer(e){const p=eventPoint(e);pointers.set(e.pointerId,p);$('#plotSvg').setPointerCapture(e.pointerId);const lineY=yToPx(state.m),vertexP={x:xToPx(state.h),y:yToPx(state.k)};if(pointers.size===1){if(Math.abs(p.y-lineY)<20){drag={type:'m',id:e.pointerId};}else if(state.mode==='free'&&Math.hypot(p.x-vertexP.x,p.y-vertexP.y)<28){drag={type:'vertex',id:e.pointerId};}else{drag={type:'pan',id:e.pointerId,last:p};$('#canvasWrap').classList.add('dragging');}}else if(pointers.size===2){drag=null;const ps=[...pointers.values()];gesture={distance:Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y),center:{x:(ps[0].x+ps[1].x)/2,y:(ps[0].y+ps[1].y)/2}};}}
function movePointer(e){if(!pointers.has(e.pointerId))return;const p=eventPoint(e);pointers.set(e.pointerId,p);if(pointers.size===2){const ps=[...pointers.values()],dist=Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y),center={x:(ps[0].x+ps[1].x)/2,y:(ps[0].y+ps[1].y)/2};if(gesture&&gesture.distance>0){const before={x:pxToX(gesture.center.x),y:pxToY(gesture.center.y)};state.view.scale=clamp(state.view.scale*(dist/gesture.distance),22,105);state.view.originX=center.x-before.x*state.view.scale;state.view.originY=center.y+before.y*state.view.scale;}gesture={distance:dist,center};renderPlot();return;}if(!drag||drag.id!==e.pointerId)return;if(drag.type==='m'){state.m=clamp(snap(pxToY(p.y)),-12,12);renderDynamic();saveLocal();}else if(drag.type==='vertex'){state.h=clamp(snap(pxToX(p.x)),-6,6);state.k=clamp(snap(pxToY(p.y)),-10,10);state.scenario='free';renderDynamic();saveLocal();}else if(drag.type==='pan'){state.view.originX+=p.x-drag.last.x;state.view.originY+=p.y-drag.last.y;drag.last=p;renderPlot();renderRelation();}}
function endPointer(e){const wasDrag=drag&&drag.id===e.pointerId&&['m','vertex'].includes(drag.type);pointers.delete(e.pointerId);if(pointers.size<2)gesture=null;if(drag&&drag.id===e.pointerId)drag=null;$('#canvasWrap').classList.remove('dragging');if(wasDrag)pushHistory();saveLocal();}

function animationBounds(){if(state.mode==='standard')return[-9,4];if(state.mode==='hole')return[-3,6];return[-10,10];}
function startAnimation(){if(state.anim.running)return;state.anim.running=true;$('#play').classList.add('on');$('#play').textContent='Ⅱ Пауза';animLast=performance.now();pushHistory();raf=requestAnimationFrame(tick);}
function stopAnimation(commit=true){if(!state.anim.running)return;state.anim.running=false;cancelAnimationFrame(raf);$('#play').classList.remove('on');$('#play').textContent='▶ Прогон m';if(commit)pushHistory();saveLocal();}
function tick(now){if(!state.anim.running)return;const [lo,hi]=animationBounds(),dt=Math.min(.05,(now-animLast)/1000),speed=Number($('#speed').value)||1;animLast=now;const rate=reduceMotion?1.25:2.8;let next=state.m+dt*rate*speed;if(reduceMotion)next=snap(next,.25);if(next>hi)next=lo;state.m=clamp(next,-12,12);renderDynamic();raf=requestAnimationFrame(tick);}

function checkChallenge(){const c=CHALLENGES[state.challengeIndex%CHALLENGES.length],d=MathModel.derived(state),fb=$('#challengeFeedback');const ok=c.check(state,d);if(ok){if(!state.challengeDone[c.id]){state.challengeDone[c.id]=true;toast('Вызов выполнен: закономерность найдена.');saveLocal();}fb.textContent='Условие выполнено.';fb.className='feedback good';}else{fb.textContent='Модель проверяет состояние автоматически.';fb.className='feedback';}const done=Object.keys(state.challengeDone||{}).length;$('#challengeProgress').style.width=`${done/CHALLENGES.length*100}%`;}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),2400);}

function runMathTests(){const cases=[];const test=(name,fn)=>{try{if(!fn())throw new Error(name);cases.push(true);}catch(e){console.error('Model test failed:',name,e);cases.push(false);}};
 const S=m=>({...PRESETS.standard,m});const Hs=m=>({...PRESETS.hole,m});
 test('standard below vertex -> 0',()=>MathModel.derived(S(-8)).count===0);
 test('standard tangent -> 1',()=>MathModel.derived(S(-6.25)).count===1&&Math.abs(MathModel.derived(S(-6.25)).D)<EPS);
 test('standard above vertex -> 2',()=>MathModel.derived(S(-4)).count===2);
 test('hole m=3 naive 2 actual 1',()=>{const d=MathModel.derived(Hs(3));return d.naiveCount===2&&d.count===1&&Math.abs(d.hole.y-3)<EPS;});
 test('hole vertex -> 1',()=>MathModel.derived(Hs(-1)).count===1);
 test('standard roots at m=-6',()=>{const r=MathModel.derived(S(-6)).actual;return r.length===2&&Math.abs(r[0])<EPS&&Math.abs(r[1]-1)<EPS;});
 test('downward above maximum -> 0',()=>MathModel.derived({mode:'free',a:-1,h:0,k:3,m:5}).count===0);
 const ok=cases.every(Boolean),badge=$('#testBadge');badge.textContent=`Математическая проверка: ${cases.filter(Boolean).length}/${cases.length}`;badge.className='test-badge '+(ok?'ok':'fail');return ok;}

function bind(){
  renderScenarios();
  $$('.mode').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
  $('#mRange').oninput=e=>setState({m:+e.target.value},{history:false});$('#mRange').onchange=()=>pushHistory();
  $('#aRange').oninput=e=>{let a=+e.target.value;if(Math.abs(a)<.12)a=a<0?-.25:.25;setState({a,scenario:'free'},{history:false});};$('#aRange').onchange=()=>pushHistory();
  $('#hRange').oninput=e=>setState({h:+e.target.value,scenario:'free'},{history:false});$('#hRange').onchange=()=>pushHistory();
  $('#kRange').oninput=e=>setState({k:+e.target.value,scenario:'free'},{history:false});$('#kRange').onchange=()=>pushHistory();
  $('#play').onclick=()=>state.anim.running?stopAnimation(true):startAnimation();
  $('#speed').onchange=e=>state.anim.speed=+e.target.value;
  $('#undo').onclick=undo;$('#redo').onclick=redo;
  $('#theme').onclick=()=>{document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';localStorage.setItem('marina-theme',document.documentElement.dataset.theme);renderAll();};
  $('#reset').onclick=()=>{stopAnimation(false);const keepTheme=document.documentElement.dataset.theme;state={...state,...PRESETS.standard,showGrid:true,showNaive:true,view:{...defaultView},highlight:null,ghosts:true,compareA:null,compareB:null,anim:{running:false,speed:1},predictionIndex:0,predictionChoice:null,challengeIndex:0,challengeDone:{}};history=[];historyIndex=-1;renderPrediction();renderAll();pushHistory();saveLocal();document.documentElement.dataset.theme=keepTheme;toast('Лаборатория возвращена к исходному состоянию.');};
  $('#plotSvg').addEventListener('pointerdown',beginPointer);$('#plotSvg').addEventListener('pointermove',movePointer);$('#plotSvg').addEventListener('pointerup',endPointer);$('#plotSvg').addEventListener('pointercancel',endPointer);
  $('#canvasWrap').addEventListener('wheel',e=>{e.preventDefault();zoomAt(e.deltaY<0?1.12:.89,eventPoint(e));},{passive:false});
  $('#zoomIn').onclick=()=>zoomAt(1.2);$('#zoomOut').onclick=()=>zoomAt(.83);$('#center').onclick=centerView;$('#gridToggle').onclick=e=>{state.showGrid=!state.showGrid;e.currentTarget.textContent='Сетка: '+(state.showGrid?'вкл.':'выкл.');renderPlot();saveLocal();};
  $$('.legend button').forEach(b=>{b.onclick=()=>{state.highlight=state.highlight===b.dataset.highlight?null:b.dataset.highlight;$$('.legend button').forEach(x=>x.classList.toggle('on',x.dataset.highlight===state.highlight));renderPlot();};});
  $('#saveA').onclick=()=>{state.compareA=coreSnapshot();renderCompare();renderPlot();saveLocal();toast('Состояние A сохранено.');};$('#saveB').onclick=()=>{state.compareB=coreSnapshot();renderCompare();renderPlot();saveLocal();toast('Состояние B сохранено.');};$('#restoreA').onclick=()=>restoreCore(state.compareA);$('#restoreB').onclick=()=>restoreCore(state.compareB);$('#ghostToggle').onchange=e=>{state.ghosts=e.target.checked;renderPlot();saveLocal();};
  $('#runPrediction').onclick=()=>{const p=PREDICTIONS[state.predictionIndex%PREDICTIONS.length],fb=$('#predictFeedback');if(state.predictionChoice===null){fb.textContent='Сначала выберите прогноз.';fb.className='feedback bad';return;}const correct=state.predictionChoice===p.ok;p.run();fb.textContent=correct?'Прогноз совпал с моделью.':'Сравните прогноз с результатом на поле и строкой Δ.';fb.className='feedback '+(correct?'good':'bad');};
  $('#nextPrediction').onclick=()=>{state.predictionIndex=(state.predictionIndex+1)%PREDICTIONS.length;state.predictionChoice=null;renderPrediction();saveLocal();};
  $('#nextChallenge').onclick=()=>{state.challengeIndex=(state.challengeIndex+1)%CHALLENGES.length;renderChallenge();checkChallenge();saveLocal();};$('#challengeHint').onclick=()=>toast(CHALLENGES[state.challengeIndex%CHALLENGES.length].hint);
  document.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;if(e.key==='ArrowUp'){e.preventDefault();setState({m:clamp(snap(state.m+.25),-12,12)},{history:true});}if(e.key==='ArrowDown'){e.preventDefault();setState({m:clamp(snap(state.m-.25),-12,12)},{history:true});}});
}

function initFromUrl(){const qs=new URLSearchParams(location.search),m=qs.get('mode'),sc=qs.get('scenario');if(m==='hole')Object.assign(state,{...PRESETS.hole,view:state.view,showGrid:state.showGrid,ghosts:state.ghosts,compareA:state.compareA,compareB:state.compareB,challengeDone:state.challengeDone});else if(m==='free')Object.assign(state,{...PRESETS.free,view:state.view,showGrid:state.showGrid,ghosts:state.ghosts,compareA:state.compareA,compareB:state.compareB,challengeDone:state.challengeDone});else if(m==='m'||m==='standard')Object.assign(state,{...PRESETS.standard,view:state.view,showGrid:state.showGrid,ghosts:state.ghosts,compareA:state.compareA,compareB:state.compareB,challengeDone:state.challengeDone});if(sc){const x=SCENARIOS.find(v=>v.id===sc);if(x){const p=PRESETS[x.mode];Object.assign(state,{...p,m:x.m,scenario:x.id,view:state.view,showGrid:state.showGrid,ghosts:state.ghosts,compareA:state.compareA,compareB:state.compareB,challengeDone:state.challengeDone});}}}

loadLocal();document.documentElement.dataset.theme=localStorage.getItem('marina-theme')||'light';initFromUrl();bind();renderPrediction();renderAll();pushHistory();runMathTests();
