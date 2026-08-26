$$('[data-lab-mode]').forEach((btn,index,arr)=>{
  btn.addEventListener('click',()=>{labState.motion.playing=false;labState.mode=btn.dataset.labMode;labState.free=false;pushHistory('режим');renderLab(true)});
  btn.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();let n=index;if(e.key==='ArrowRight')n=(index+1)%arr.length;if(e.key==='ArrowLeft')n=(index-1+arr.length)%arr.length;if(e.key==='Home')n=0;if(e.key==='End')n=arr.length-1;arr[n].focus();arr[n].click()});
});
$('#freeExplore').addEventListener('click',()=>{setFree();pushHistory('свободный режим');renderLab(true)});
$('#labUndo').addEventListener('click',()=>{if(labHistoryIndex<=0)return;labHistoryIndex--;restoreCore(labHistory[labHistoryIndex].snap);renderLab(true)});
$('#labRedo').addEventListener('click',()=>{if(labHistoryIndex>=labHistory.length-1)return;labHistoryIndex++;restoreCore(labHistory[labHistoryIndex].snap);renderLab(true)});
$('#labReset').addEventListener('click',()=>{labState.motion.playing=false;const mode=labState.mode;Object.assign(labState,clone(LAB_DEFAULTS));labState.mode=mode;pushHistory('сброс');renderLab(true)});
$('#snapshotA').addEventListener('click',()=>{labSnapshots.A=currentModeState();renderCompare();$('#labStatus').textContent='Снимок A сохранён.'});
$('#snapshotB').addEventListener('click',()=>{labSnapshots.B=currentModeState();renderCompare();$('#labStatus').textContent='Снимок B сохранён.'});
$('#toggleCompare').addEventListener('click',()=>{labState.compare=!labState.compare;renderCompare();renderSvgs()});
$$('.legend-btn').forEach(btn=>{btn.addEventListener('mouseenter',()=>{labState.highlight=btn.dataset.highlight;renderSvgs()});btn.addEventListener('focus',()=>{labState.highlight=btn.dataset.highlight;renderSvgs()});btn.addEventListener('mouseleave',()=>{labState.highlight='';renderSvgs()});btn.addEventListener('blur',()=>{labState.highlight='';renderSvgs()})});

function clientToSvg(svg,e){const r=svg.getBoundingClientRect(),vb=svg.viewBox.baseVal;return{x:(e.clientX-r.left)/r.width*vb.width+vb.x,y:(e.clientY-r.top)/r.height*vb.height+vb.y}}
function valueFromX(x,min,max,x1,x2){return min+(clamp(x,x1,x2)-x1)/(x2-x1)*(max-min)}
function bindSvgInteractions(svg){
  $$('[data-drag]',svg).forEach(el=>{
    el.addEventListener('pointerdown',e=>{e.preventDefault();dragInfo={type:el.dataset.drag,svg};svg.setPointerCapture?.(e.pointerId);setFree()});
    el.addEventListener('keydown',e=>{const step=e.shiftKey?1:.5;if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const dir=(e.key==='ArrowLeft'||e.key==='ArrowDown')?-1:1;applyKeyboardDrag(el.dataset.drag,dir*step);pushHistory('клавиатурное изменение');renderLab(true)});
  });
  if(svg.dataset.boundPointer)return;svg.dataset.boundPointer='1';
  svg.addEventListener('pointermove',e=>{if(!dragInfo||dragInfo.svg!==svg)return;applySvgDrag(dragInfo.type,clientToSvg(svg,e));renderLab(false)});
  const end=()=>{if(!dragInfo||dragInfo.svg!==svg)return;dragInfo=null;pushHistory('перетаскивание');renderLab(true)};svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',end);
}
function applyKeyboardDrag(type,delta){
  if(type.startsWith('factor:'))labState.factor[type.split(':')[1]]=clamp(labState.factor[type.split(':')[1]]+delta,-6,8);
  else if(type.startsWith('root:')){const i=Number(type.split(':')[1]);labState.interval.roots[i]+=delta;normalizeRoots(i)}
  else if(type==='probe')labState.interval.probe=clamp(labState.interval.probe+delta,-5.8,5.8);
  else if(type==='m')labState.holes.m=clamp(labState.holes.m+delta,-8,2);
  else if(type==='speed'){labState.motion.x=clamp(labState.motion.x+delta,10,70);labState.motion.playTime=0}
}
function applySvgDrag(type,p){
  if(type.startsWith('factor:')){const k=type.split(':')[1];labState.factor[k]=Math.round(valueFromX(p.x,-6,8,95,300))}
  else if(type.startsWith('root:')){const i=Number(type.split(':')[1]);labState.interval.roots[i]=Math.round(valueFromX(p.x,-6,6,60,590)*2)/2;normalizeRoots(i)}
  else if(type==='probe')labState.interval.probe=Math.round(valueFromX(p.x,-6,6,60,590)*10)/10;
  else if(type==='m'){const top=58,bottom=350,ymin=-9,ymax=3;labState.holes.m=Math.round((ymax-(p.y-top)/(bottom-top)*(ymax-ymin))*4)/4;labState.holes.m=clamp(labState.holes.m,-8,2)}
  else if(type==='speed'){labState.motion.playing=false;labState.motion.x=Math.round(valueFromX(p.x,10,70,75,570)*2)/2;labState.motion.playTime=0}
}
function motionTick(ts){
  if(!labState.motion.playing)return;if(!lastFrame)lastFrame=ts;const dt=Math.min(.08,(ts-lastFrame)/1000);lastFrame=ts;const m=calcMotion();labState.motion.playTime+=dt*1.15*labState.motion.speed;if(labState.motion.playTime>=m.maxTime){labState.motion.playTime=m.maxTime;labState.motion.playing=false}renderLab(false);if(labState.motion.playing)requestAnimationFrame(motionTick);else renderLab(true)
}

$('#openLab').addEventListener('click',()=>openModal(labModal,$('#openLab')));

// Невидимый диагностический интерфейс для регрессионных тестов предметной логики.
window.__sofyaAlgebraLab={calcFactor,calcInterval,calcHoles,calcMotion,getState:()=>clone(labState)};
pushHistory('начальное состояние');renderLab(true);
window.addEventListener("resize",()=>requestAnimationFrame(()=>renderSvgs()));
new MutationObserver(()=>requestAnimationFrame(()=>renderSvgs())).observe(root,{attributes:true,attributeFilter:["data-theme"]});
