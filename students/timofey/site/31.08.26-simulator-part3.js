function controlHtml(c,prefix='lab') {
  if(c.type==='select') return `<div class="lab-control"><label>${c.label}</label><select data-control="${c.key}" aria-label="${c.label}">${c.options.map(([v,l])=>`<option value="${v}" ${v===c.value?'selected':''}>${l}</option>`).join('')}</select></div>`;
  return `<div class="lab-control"><label>${c.label}</label><output>${fmt(c.value,2)}</output><input data-control="${c.key}" type="range" min="${c.min}" max="${c.max}" step="${c.step}" value="${c.value}" aria-label="${c.label}"></div>`;
}
function switchesHtml() {
  if(state.mode!=='transforms') return '';
  return `<button class="lab-chip-btn" type="button" data-toggle="reflectX" aria-pressed="${state.config.reflectX}">−f(x) · Ox</button><button class="lab-chip-btn" type="button" data-toggle="reflectY" aria-pressed="${state.config.reflectY}">f(−x) · Oy</button>`;
}

function renderModeTabs(root=els.labModeTabs) {
  if(!root)return; const names={line:'Прямая',quadratic:'Парабола',hyperbola:'Гипербола',intersections:'Пересечения',transforms:'Сдвиги'};
  root.innerHTML=Object.entries(names).map(([k,v])=>`<button type="button" class="lab-mode-btn ${state.mode===k?'on':''}" data-mode="${k}">${v}</button>`).join('');
}
function renderScenarios(root=els.labScenarios) {
  if(!root)return; root.innerHTML=scenarioRows().map(([k,label])=>`<button type="button" class="lab-scenario-btn ${state.scenario===k?'on':''}" data-scenario="${k}">${label}</button>`).join('')+`<button type="button" class="lab-scenario-btn custom ${state.scenario==='custom'?'on':''}" data-scenario="custom">Исследовать самому</button>`;
}
function renderKpis(root,d=currentDerived()) {
  if(!root)return; root.innerHTML=metricsFor(d).slice(0,4).map(([k,v],i)=>`<div class="lab-kpi ${i===0?'hot':''}"><small>${k}</small><b>${v}</b></div>`).join('');
}
function renderBars(root,d=currentDerived()) {
  if(!root)return; const data=barData(d).filter(([,v])=>Number.isFinite(v)); const max=Math.max(1,...data.map(([,v])=>Math.abs(v)));
  root.innerHTML=data.map(([label,v])=>`<div class="lab-bar"><span>${label}</span><div class="lab-bar-track"><div class="lab-bar-fill" style="width:${Math.min(100,Math.abs(v)/max*100)}%;opacity:${v<0?.65:1}"></div></div><output>${fmt(v)}</output></div>`).join('');
}
function renderGuide() {
  const rows=LAB_META[state.mode].guide; const idx=clamp(state.guideStep,0,rows.length-1); const [title,copy]=rows[idx];
  if(els.labGuideCopy)els.labGuideCopy.innerHTML=`<b>${title}</b><span>${copy}</span>`;
  if(els.labStepPrev)els.labStepPrev.disabled=state.guideStep<=0; if(els.labStepNext)els.labStepNext.disabled=state.guideStep>=rows.length-1;
}
function challengeProgress(d=currentDerived()){
  if(d.valid===false)return 0;if(state.mode==='line')return clamp(100-(Math.abs(d.k-2)*24+Math.abs(d.b-1)*14),0,100);
  if(state.mode==='quadratic')return clamp(100-Math.abs(d.c)*25,0,100);if(state.mode==='hyperbola')return clamp(100-Math.abs(d.a-2)*25,0,100);
  if(state.mode==='intersections')return state.config.family==='line-parabola'?(d.points.length===1?100:45):12;
  return clamp(100-(Math.abs(state.config.h-3)+Math.abs(state.config.v-2))*18,0,100);
}
function renderChallenge(d=currentDerived()) {
  if(!els.labChallenge)return; const ch=LAB_META[state.mode].challenge; const done=!!ch.check({...d,config:state.config});
  els.labChallenge.classList.toggle('done',done); els.labChallenge.querySelector('[data-challenge-copy]').textContent=ch.text; els.labChallengeStatus.textContent=done?'✓ выполнено':'в процессе';
  els.labChallengeProgress.style.width=challengeProgress(d)+'%';
  if(done&&!state.achievements[state.mode]){state.achievements[state.mode]=true;saveAchievements();setStatus('Исследовательская цель выполнена!','good')}
  const count=Object.values(state.achievements).filter(Boolean).length; if(els.labAchievement)els.labAchievement.textContent=`открытий ${count}/5`;
}

function predictionSpec() {
  const before=currentDerived(); const cfg=clone(state.config); let afterCfg=clone(cfg), prompt='', options=['увеличится','уменьшится','не изменится'], targetBefore=0,targetAfter=0, explanation='';
  if(state.mode==='line'){
    prompt='Что произойдёт с наклоном k, если поднять точку B на 2 клетки?'; targetBefore=before.k; afterCfg.p2.y=clamp(afterCfg.p2.y+2,-7,8); targetAfter=deriveMode('line',afterCfg).k; explanation=`k: ${fmt(targetBefore)} → ${fmt(targetAfter)}. Изменился Δy при том же Δx.`;
  } else if(state.mode==='quadratic'){
    prompt='Что произойдёт со свободным членом c, если поднять точку A на 2 клетки?'; targetBefore=before.c; afterCfg.p1.y=clamp(afterCfg.p1.y+2,-7,8); targetAfter=deriveMode('quadratic',afterCfg).c; explanation=`c: ${fmt(targetBefore)} → ${fmt(targetAfter)}. Коэффициенты пересчитаны из двух условий.`;
  } else if(state.mode==='hyperbola'){
    prompt='Что произойдёт с горизонтальной асимптотой a, если обе узловые точки поднять на 2?'; targetBefore=before.a; afterCfg.p1.y+=2;afterCfg.p2.y+=2; targetAfter=deriveMode('hyperbola',afterCfg).a; explanation=`a: ${fmt(targetBefore)} → ${fmt(targetAfter)}, а k сохраняется. Это чистый вертикальный сдвиг.`;
  } else if(state.mode==='intersections'){
    prompt='Если поднять график f на 2 единицы, число точек пересечения...'; targetBefore=before.kind==='infinite'?99:before.points.length; afterCfg.line.b+=2; const a=deriveMode('intersections',afterCfg); targetAfter=a.kind==='infinite'?99:a.points.length; explanation=`Число пересечений: ${targetBefore===99?'∞':targetBefore} → ${targetAfter===99?'∞':targetAfter}. Следите за нулями h=f−g.`;
  } else {
    prompt='Если увеличить h на 2 в записи f(x−h), куда сдвинется график?'; options=['вправо','влево','останется']; targetBefore=0;targetAfter=1; afterCfg.h=clamp(afterCfg.h+2,-5,5); explanation='h увеличился: опорная точка и весь график переместились вправо. Минус внутри аргумента даёт сдвиг вправо.';
  }
  let correct=2; if(state.mode==='transforms')correct=0;else if(targetAfter>targetBefore+1e-7)correct=0;else if(targetAfter<targetBefore-1e-7)correct=1;
  return {prompt,options,correct,afterCfg,explanation};
}
function renderPrediction(){
  if(!els.labPredictionPrompt)return;const spec=predictionSpec();els.labPredictionPrompt.textContent=spec.prompt;
  els.labPredictionOptions.innerHTML=spec.options.map((o,i)=>`<button type="button" class="lab-predict-btn ${state.predictionChoice===i?'selected':''}" data-predict="${i}">${o}</button>`).join('');
  els.labPredictionRun.disabled=state.predictionChoice===null;
  els.labPredictionResult.className='lab-predict-result'+(state.predictionResult?.good?' good':state.predictionResult?' bad':'');
  els.labPredictionResult.textContent=state.predictionResult?.text||'Сначала выберите прогноз, затем запустите микроэксперимент.';
}
function runPrediction(){
  const spec=predictionSpec();if(state.predictionChoice===null)return;if(!state.predictionBackup)state.predictionBackup=clone(state.config);
  const good=state.predictionChoice===spec.correct;state.config=clone(spec.afterCfg);markCustom();state.predictionResult={good,text:`${good?'Прогноз совпал.':'Результат отличается от прогноза.'} ${spec.explanation}`};commitHistory();scheduleRender();
}
function resetPrediction(){if(state.predictionBackup){state.config=clone(state.predictionBackup);state.predictionBackup=null;commitHistory()}state.predictionChoice=null;state.predictionResult=null;scheduleRender()}

function renderCompare(d=currentDerived()) {
  if(!els.labCompare)return;if(!state.snapshot||state.snapshot.mode!==state.mode){els.labCompare.innerHTML='<div class="lab-compare-head"><span>Сравнение A/B</span><span class="muted">Сделайте снимок A</span></div>';return}
  const a=deriveMode(state.snapshot.mode,state.snapshot.config);const ma=numericMetrics(a),mb=numericMetrics(d);const rows=ma.map(([label,av],i)=>{const bv=mb[i]?.[1];const delta=Number.isFinite(av)&&Number.isFinite(bv)?bv-av:NaN;return `<tr><td>${label}</td><td>${fmt(av)}</td><td>${fmt(bv)}</td><td class="delta">${Number.isFinite(delta)?(delta>=0?'+':'')+fmt(delta):'—'}</td></tr>`}).join('');
  els.labCompare.innerHTML=`<div class="lab-compare-head"><span>Снимок A ↔ текущее B</span><span>пунктир = A</span></div><table><thead><tr><th>величина</th><th>A</th><th>B</th><th>Δ</th></tr></thead><tbody>${rows}</tbody></table>`;
}
function takeSnapshot(){state.snapshot={mode:state.mode,config:clone(state.config)};setStatus('Снимок A сохранён. Измените модель и сравните состояния.');scheduleRender()}
function clearSnapshot(){state.snapshot=null;scheduleRender()}

function autoApply(t) {
  if(!state.autoBase)state.autoBase=clone(state.config);const c=clone(state.autoBase);const u=clamp(t,0,1);
  if(state.mode==='line')c.p2.y=-5+11*u;
  else if(state.mode==='quadratic')c.a=.35+2.65*u;
  else if(state.mode==='hyperbola')c.p2.y=-4+10*u;
  else if(state.mode==='intersections')c.line.b=-5+10*u;
  else c.h=-4+8*u;
  state.config=c;state.autoT=u;state.scenario='custom';scheduleRender();
}
function autoTick(ts){
  if(!state.playing)return;if(!state.lastTs)state.lastTs=ts;const dt=(ts-state.lastTs)/1000;state.lastTs=ts;let t=state.autoT+dt*.12*state.speed;
  if(t>=1){t=1;state.playing=false;}autoApply(t);if(state.playing)state.raf=requestAnimationFrame(autoTick);else{commitHistory();state.raf=0;state.lastTs=0;}
}
function toggleAuto(){if(reducedMotion){setStatus('Автовоспроизведение отключено из-за prefers-reduced-motion. Используйте ползунок исследования.','warn');return}if(state.playing){stopAuto();commitHistory();scheduleRender();return}if(state.autoT>=1){state.autoT=0;state.autoBase=clone(state.config)}if(!state.autoBase)state.autoBase=clone(state.config);state.playing=true;state.lastTs=0;state.raf=requestAnimationFrame(autoTick);scheduleRender()}
function resetAuto(){stopAuto();if(state.autoBase)state.config=clone(state.autoBase);state.autoT=0;state.autoBase=null;commitHistory();scheduleRender()}

function renderControls(root=els.labControls, switches=els.labSwitches){
  if(!root)return; const controls=controlsFor(); const signature=state.mode+'|'+(state.config.family||'')+'|'+(state.config.base||'');
  if(root.dataset.signature!==signature){root.innerHTML=controls.map(controlHtml).join('');root.dataset.signature=signature;}
  controls.forEach(c=>{const input=root.querySelector(`[data-control="${c.key}"]`);if(!input)return;if(document.activeElement!==input)input.value=String(c.value);const out=input.closest('.lab-control')?.querySelector('output');if(out)out.textContent=fmt(c.value,2);});
  if(switches){const sw=switchesHtml();if(switches.innerHTML!==sw)switches.innerHTML=sw;}
}
function renderStatus(){if(!els.labStatus)return;els.labStatus.textContent=state.status||'Тяните точки на графике или используйте точные ползунки ниже.';els.labStatus.className='lab-status'+(state.statusTone==='warn'?' warn':'')}
function renderLegend(root=els.labLegend){if(!root)return;root.innerHTML='<button data-legend="f"><i></i> f</button><button class="g" data-legend="g"><i></i> g / вторичный</button><button class="ghost" data-legend="ghost"><i></i> исходник / снимок</button><button class="point" data-legend="point"><i></i> изменяемая точка</button>'}

function render() {
  if(!els.labStage)return;const meta=LAB_META[state.mode],d=currentDerived();
  els.labTitle.textContent=meta.title;els.labLead.textContent=meta.lead;if(els.modalLabTitle)els.modalLabTitle.textContent=meta.title;if(els.modalLabLead)els.modalLabLead.textContent=meta.lead;
  renderModeTabs();renderScenarios();renderGraphSvg(els.labStage,d);renderKpis(els.labKpis,d);
  els.labFormula.textContent=formulaFor(d);
  const discovery=discoveryFor(d);els.labInsight.textContent=discovery;els.labInsight.classList.toggle('discovery',discovery!==meta.lead);
  renderBars(els.labBars,d);renderControls();renderGuide();renderChallenge(d);renderPrediction();renderCompare(d);renderStatus();renderLegend();
  if(state.modalOpen){renderModeTabs($('modalLabModeTabs'));renderScenarios(els.modalLabScenarios);renderGraphSvg(els.modalLabStage,d,{modal:true});renderKpis(els.modalLabKpis,d);els.modalLabFormula.textContent=formulaFor(d);els.modalLabInsight.textContent=discovery;renderControls(els.modalLabControls,els.modalLabSwitches);renderLegend(els.modalLabLegend);}
  els.labUndo.disabled=state.historyIndex<=0;els.labRedo.disabled=state.historyIndex>=state.history.length-1;
  els.labSnapshot.textContent=state.snapshot?.mode===state.mode?'Обновить снимок A':'Снимок A';els.labClearSnapshot.disabled=!state.snapshot;
  els.labAutoPlay.textContent=state.playing?'Ⅱ Пауза':'▶ Авто';els.labAutoSlider.value=Math.round(state.autoT*100);els.labAutoValue.textContent=Math.round(state.autoT*100)+'%';els.labAutoSpeed.value=String(state.speed);
  const note=stageNoteFor(d);els.labStageNote.innerHTML=`<strong>${note.title}</strong><span>${note.copy}</span>`;
}
function stageNoteFor(d){if(d.valid===false)return{title:'Ограничение',copy:d.reason};if(state.mode==='line')return{title:'Тяните A и B',copy:'Δx, Δy, k и b связаны в реальном времени'};if(state.mode==='quadratic')return{title:'Тяните A и B',copy:'a задаётся отдельно; V и корни вычисляются автоматически'};if(state.mode==='hyperbola')return{title:'x=0 недоступен',copy:'пунктир показывает обе асимптоты'};if(state.mode==='intersections')return{title:'f=g в красных точках',copy:'золотой inset показывает h=f−g'};return{title:'Пунктир = исходник',copy:'тяните опорную точку, чтобы менять h и v'}}

function svgClientToData(svg,clientX,clientY){const rect=svg.getBoundingClientRect();const px=(clientX-rect.left)/rect.width*SVG_W,py=(clientY-rect.top)/rect.height*SVG_H;const bounds=getViewBounds();const m=mapFns(bounds,graphArea());return{x:m.xFrom(px),y:m.yFrom(py),px,py}}
function startDrag(e,svg){
  const handle=e.target.closest?.('[data-handle]')?.dataset.handle; const p=svgClientToData(svg,e.clientX,e.clientY);
  state.drag={svg,handle:handle||'pan',start:p,last:p,configBefore:clone(state.config),viewBefore:clone(state.view)};try{svg.setPointerCapture?.(e.pointerId)}catch(_){}e.preventDefault();
}
function moveDrag(e){if(!state.drag)return;const {svg,handle}=state.drag;const p=svgClientToData(svg,e.clientX,e.clientY);const prev=state.drag.last;state.drag.last=p;
  if(handle==='pan'){const b=getViewBounds();state.view.panX-=(p.x-prev.x);state.view.panY-=(p.y-prev.y);scheduleRender();return}
  applyHandle(handle,p);markCustom();scheduleRender();e.preventDefault();
}
function endDrag(e){if(!state.drag)return;const changed=!configEqual(state.drag.configBefore,state.config)||!configEqual(state.drag.viewBefore,state.view);state.drag=null;if(changed)commitHistory();scheduleRender()}
function applyHandle(handle,p){const x=snap(clamp(p.x,-6,6),.25),y=snap(clamp(p.y,-7,8),.25);const c=state.config;
  if(handle==='probe'){c.probeX=(state.mode==='hyperbola'&&Math.abs(x)<.25)?(x<0?-.25:.25):x;return}
  if(handle==='p1'||handle==='p2'){c[handle].x=x;c[handle].y=y;enforceConfigConstraints(handle);return}
  if(state.mode==='intersections'){
    const anchorX=handle.endsWith('1')?-2:2;
    if(handle==='f1'||handle==='f2'){const otherX=handle==='f1'?2:-2,otherY=c.line.k*otherX+c.line.b;const d=deriveLineFromPoints({x:anchorX,y},{x:otherX,y:otherY});if(d.valid){c.line.k=d.k;c.line.b=d.b}return}
    if(handle==='g1'||handle==='g2'){const otherX=handle==='g1'?2:-2,otherY=c.other.k*otherX+c.other.b;const d=deriveLineFromPoints({x:anchorX,y},{x:otherX,y:otherY});if(d.valid){c.other.k=d.k;c.other.b=d.b}return}
    if(handle==='gVertex'){const a=c.other.a;const vx=x,vy=y;c.other.b=-2*a*vx;c.other.c=a*vx*vx+vy;return}
    if(handle==='gCenter'){c.other.a=y;return}
    if(handle==='gK'){c.other.k=y-c.other.a;return}
  }
  if(handle==='transformAnchor'){c.h=x;c.v=y;return}
}
function zoomView(mult){state.view.zoom=clamp(state.view.zoom*mult,.65,2.4);scheduleRender()}

function bindLabEvents(root=document){
  root.addEventListener('click',e=>{
    const mode=e.target.closest('[data-mode]')?.dataset.mode;if(mode){setMode(mode);return}
    const sc=e.target.closest('[data-scenario]')?.dataset.scenario;if(sc){applyScenario(sc);return}
    const pred=e.target.closest('[data-predict]')?.dataset.predict;if(pred!==undefined){state.predictionChoice=Number(pred);state.predictionResult=null;scheduleRender();return}
    const toggle=e.target.closest('[data-toggle]')?.dataset.toggle;if(toggle){state.config[toggle]=!state.config[toggle];markCustom();commitHistory();scheduleRender();return}
  });
  root.addEventListener('input',e=>{const key=e.target.dataset.control;if(key)changeControl(key,e.target.value,false)});
  root.addEventListener('change',e=>{const key=e.target.dataset.control;if(key)changeControl(key,e.target.value,true)});
}
function bindSvg(svg){if(!svg)return;svg.addEventListener('pointerdown',e=>startDrag(e,svg));svg.addEventListener('pointermove',moveDrag);svg.addEventListener('pointerup',endDrag);svg.addEventListener('pointercancel',endDrag);svg.addEventListener('wheel',e=>{e.preventDefault();zoomView(e.deltaY<0?1.08:1/1.08)},{passive:false});svg.addEventListener('keydown',e=>{const h=e.target.dataset.handle;if(!h||h==='none')return;let dx=0,dy=0;if(e.key==='ArrowLeft')dx=-.25;if(e.key==='ArrowRight')dx=.25;if(e.key==='ArrowUp')dy=.25;if(e.key==='ArrowDown')dy=-.25;if(dx||dy){e.preventDefault();const d=currentHandlePoint(h);if(d){applyHandle(h,{x:d.x+dx,y:d.y+dy});markCustom();commitHistory();scheduleRender()}}})}
function currentHandlePoint(h){const c=state.config,d=currentDerived();if(h==='p1'||h==='p2')return c[h];if(h==='probe')return{x:c.probeX,y:state.mode==='intersections'?d.fProbe:state.mode==='transforms'?d.transformedY:d.probeY};if(h==='transformAnchor')return{x:c.h,y:c.v};return null}

