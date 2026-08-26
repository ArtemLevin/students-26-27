function renderControls(){
  let primary="",advanced="";
  if(labState.mode==="factor"){
    primary=rangeRow("factorA","a",-6,8,1,labState.factor.a,fmt(labState.factor.a))+rangeRow("factorD","d",-6,8,1,labState.factor.d,fmt(labState.factor.d));
    advanced=rangeRow("factorB","b",-6,8,1,labState.factor.b,fmt(labState.factor.b))+rangeRow("factorC","c",-6,8,1,labState.factor.c,fmt(labState.factor.c));
  }else if(labState.mode==="interval"){
    primary=rangeRow("probeX","x-проба",-5.8,5.8,.1,labState.interval.probe,fmt(labState.interval.probe,1))+`<div class="lab-segment"><button type="button" data-relation="le" aria-pressed="${labState.interval.relation==='le'}">F(x) ≤ 0</button><button type="button" data-relation="ge" aria-pressed="${labState.interval.relation==='ge'}">F(x) ≥ 0</button></div>`;
    advanced=labState.interval.roots.map((r,i)=>rangeRow(`rootRange${i}`,`r${i+1}`,-5,5,.5,r,fmt(r,1),`data-root-range="${i}"`)).join("")+`<div class="lab-segment"><button type="button" data-middle="simple" aria-pressed="${labState.interval.middleKind==='simple'}">простой корень</button><button type="button" data-middle="double" aria-pressed="${labState.interval.middleKind==='double'}">двойной</button><button type="button" data-middle="hole" aria-pressed="${labState.interval.middleKind==='hole'}">знаменатель</button></div>`;
  }else if(labState.mode==="holes"){
    primary=rangeRow("mSlider","m",-8,2,.25,labState.holes.m,fmt(labState.holes.m,2));
    advanced=`<label class="check"><input id="showMistake" type="checkbox" ${labState.holes.showMistake?'checked':''}><span>Показать ошибочный график без ОДЗ</span></label>`;
  }else{
    const m=calcMotion();
    primary=rangeRow("speedSlider","x",10,70,.5,labState.motion.x,`${fmt(labState.motion.x,1)} км/ч`)+rangeRow("motionTime","t",0,m.maxTime,.02,clamp(labState.motion.playTime,0,m.maxTime),`${fmt(labState.motion.playTime,2)} ч`)+`<div class="lab-toolbar-row"><button class="lab-action primary-action" type="button" id="motionPlay">${labState.motion.playing?'Пауза':'▶ Запуск'}</button><button class="lab-action" type="button" id="motionReplay">↺ Повтор</button><button class="lab-action" type="button" id="motionSpeed">${labState.motion.speed}×</button></div>`;
    advanced=`<p class="muted">Две поездки показаны на общей временной шкале. Ползунок t позволяет перематывать эксперимент вручную.</p>`;
  }
  $("#labPrimaryControls").innerHTML=primary;$("#labAdvancedControls").innerHTML=advanced;bindControls();
}
function renderScenarios(){
  const row=$("#labScenarios"),list=LAB_SCENARIOS[labState.mode];row.innerHTML=list.map(s=>`<button type="button" class="scenario-chip" data-scenario="${s.id}" aria-pressed="false">${s.label}</button>`).join("")+`<button type="button" class="scenario-chip free" data-scenario="free" aria-pressed="${labState.free}">Исследовать самому</button>`;
  $$('[data-scenario]',row).forEach(btn=>btn.addEventListener('click',()=>{if(btn.dataset.scenario==='free'){setFree();renderLab(false);return}const sc=list.find(v=>v.id===btn.dataset.scenario);if(!sc)return;labState.free=false;labState.motion.playing=false;sc.apply();pushHistory(`сценарий ${sc.label}`);renderLab(true)}));
}
function bindControls(){
  function range(id,fn){const el=$(id);if(!el)return;el.addEventListener('input',e=>{setFree();fn(Number(e.target.value));renderLab(false)});el.addEventListener('change',()=>pushHistory('параметр'))}
  range('#factorA',v=>labState.factor.a=v);range('#factorB',v=>labState.factor.b=v);range('#factorC',v=>labState.factor.c=v);range('#factorD',v=>labState.factor.d=v);
  range('#probeX',v=>labState.interval.probe=v);
  $$('[data-root-range]').forEach(el=>{el.addEventListener('input',e=>{setFree();const i=Number(el.dataset.rootRange);labState.interval.roots[i]=Number(e.target.value);normalizeRoots(i);renderLab(false)});el.addEventListener('change',()=>pushHistory('корень'))});
  $$('[data-relation]').forEach(btn=>btn.addEventListener('click',()=>{setFree();labState.interval.relation=btn.dataset.relation;pushHistory('знак неравенства');renderLab(true)}));
  $$('[data-middle]').forEach(btn=>btn.addEventListener('click',()=>{setFree();labState.interval.middleKind=btn.dataset.middle;pushHistory('тип критической точки');renderLab(true)}));
  range('#mSlider',v=>labState.holes.m=v);
  $('#showMistake')?.addEventListener('change',e=>{setFree();labState.holes.showMistake=e.target.checked;pushHistory('ОДЗ');renderLab(true)});
  range('#speedSlider',v=>{labState.motion.playing=false;labState.motion.x=v;labState.motion.playTime=0});
  range('#motionTime',v=>{labState.motion.playing=false;labState.motion.playTime=v});
  $('#motionPlay')?.addEventListener('click',()=>{labState.motion.playing=!labState.motion.playing;if(labState.motion.playing&&labState.motion.playTime>=calcMotion().maxTime-.01)labState.motion.playTime=0;lastFrame=0;renderLab(true);if(labState.motion.playing)requestAnimationFrame(motionTick)});
  $('#motionReplay')?.addEventListener('click',()=>{labState.motion.playing=false;labState.motion.playTime=0;renderLab(true)});
  $('#motionSpeed')?.addEventListener('click',()=>{labState.motion.speed=labState.motion.speed===1?2:labState.motion.speed===2?.5:1;renderLab(true)});
}
function normalizeRoots(changed){
  const r=labState.interval.roots;r[0]=clamp(r[0],-5,4);r[1]=clamp(r[1],r[0]+.5,4.5);r[2]=clamp(r[2],r[1]+.5,5);
  if(changed===0&&r[0]>r[1]-.5)r[0]=r[1]-.5;if(changed===2&&r[2]<r[1]+.5)r[2]=r[1]+.5;
}
function syncOutputs(){
  const mappings=[['#factorA',labState.factor.a],['#factorB',labState.factor.b],['#factorC',labState.factor.c],['#factorD',labState.factor.d],['#probeX',labState.interval.probe],['#mSlider',labState.holes.m],['#speedSlider',labState.motion.x],['#motionTime',labState.motion.playTime]];
  mappings.forEach(([id,v])=>{const el=$(id);if(el){el.value=v;const out=el.parentElement.querySelector('output');if(out)out.textContent=id==='#speedSlider'?`${fmt(v,1)} км/ч`:id==='#motionTime'?`${fmt(v,2)} ч`:fmt(v,2)}});
  $$('[data-root-range]').forEach(el=>{const i=Number(el.dataset.rootRange);el.value=labState.interval.roots[i];el.parentElement.querySelector('output').textContent=fmt(labState.interval.roots[i],1)});
}
function renderPrediction(){
  const defs={
    factor:{q:"Что произойдёт со значением выражения, если сделать a = d?",opts:[['zero','Станет 0'],['depends','Будет зависеть от b и c'],['same','Не изменится']],correct:'zero',run(){labState.factor.d=labState.factor.a},explain:"a−d станет нулём, поэтому произведение (b+c)(a−d) равно нулю."},
    interval:{q:"Если средний корень сделать двойным, поменяется ли знак при переходе через него?",opts:[['yes','Да, поменяется'],['no','Нет, останется тем же']],correct:'no',run(){labState.interval.middleKind='double'},explain:"При чётной кратности множитель не меняет знак: квадрат неотрицателен по обе стороны корня."},
    holes:{q:"Сколько пересечений будет у y=x−4 и y=m при m=−3 с учётом ОДЗ?",opts:[['0','0'],['1','1'],['2','2']],correct:'0',run(){labState.holes.m=-3;labState.holes.showMistake=false},explain:"Кандидат x=1 исключён из области определения, поэтому точка пересечения выколота."},
    motion:{q:"Что произойдёт с разностью времён, если увеличить скорость x?",opts:[['down','Уменьшится'],['up','Увеличится'],['same','Останется той же']],correct:'down',run(){labSnapshots.A=currentModeState();labState.motion.x=clamp(labState.motion.x+10,10,70);labState.motion.playTime=0;labSnapshots.B=currentModeState();labState.compare=true},explain:"Обе дроби 180/x и 180/(x+6) уменьшаются, а их разность стремится к нулю."}
  };
  const def=defs[labState.mode],ps=predictionState[labState.mode]||(predictionState[labState.mode]={choice:null,revealed:false});
  $('#predictCard').innerHTML=`<h3>Предскажи результат</h3><p>${def.q}</p><div class="predict-options">${def.opts.map(([id,label])=>`<button type="button" class="predict-option ${ps.choice===id?'selected':''} ${ps.revealed?(id===def.correct?'correct':ps.choice===id?'wrong':''):''}" data-predict="${id}">${label}</button>`).join('')}</div><div class="lab-toolbar-row"><button type="button" class="lab-action primary-action" id="runPrediction" ${!ps.choice?'disabled':''}>Проверить прогноз</button></div><div class="predict-feedback">${ps.revealed?(ps.choice===def.correct?'✓ Прогноз верный. ':'Сравните ожидание и результат. ')+def.explain:''}</div>`;
  $$('[data-predict]',$('#predictCard')).forEach(btn=>btn.addEventListener('click',()=>{ps.choice=btn.dataset.predict;ps.revealed=false;renderPrediction()}));
  $('#runPrediction')?.addEventListener('click',()=>{if(!ps.choice)return;ps.revealed=true;labState.free=false;def.run();pushHistory('проверка прогноза');renderLab(true)});
}
function renderChallenge(){
  let title="",ok=false,progress=0;
  if(labState.mode==='factor'){const d=calcFactor();title='Добейтесь значения выражения 0.';ok=Math.abs(d.right)<1e-8;progress=ok?100:Math.max(8,100-Math.min(100,Math.abs(d.right)*8))}
  if(labState.mode==='interval'){const d=calcInterval();title=`Переместите x-пробу в область, где F(x) ${labState.interval.relation==='le'?'≤':'≥'} 0.`;ok=d.probeIn;progress=ok?100:20}
  if(labState.mode==='holes'){const d=calcHoles();title='Найдите уровень m, при котором пересечений нет.';ok=d.intersections===0;progress=ok?100:35}
  if(labState.mode==='motion'){const d=calcMotion();title='Настройте x так, чтобы разность времён стала 1 час.';ok=Math.abs(d.diff-1)<.025;progress=ok?100:Math.max(10,100-Math.min(90,Math.abs(d.diff-1)*55))}
  const card=$('#challengeCard');card.classList.toggle('done',ok);card.innerHTML=`<h3>${ok?'✓ Исследовательская цель выполнена':'Микро-задача'}</h3><p>${title}</p><div class="challenge-progress"><span style="width:${progress}%"></span></div>`;
}
function snapshotSummary(s){
  if(!s)return '—';
  if(s.mode==='factor')return `значение ${fmt(s.derived.right)}`;
  if(s.mode==='interval')return `F(x) ${s.derived.probeValue===null?'не опр.':fmt(s.derived.probeValue,2)}`;
  if(s.mode==='holes')return `${s.derived.intersections} пересеч.`;
  return `Δt ${fmt(s.derived.diff,2)} ч`;
}
function renderCompare(){
  $('#toggleCompare').setAttribute('aria-pressed',String(labState.compare));
  let html=`<span>Снимки позволяют отделить причину от результата.</span><div class="compare-grid"><div><small>A</small><b>${snapshotSummary(labSnapshots.A)}</b></div><div><small>B</small><b>${snapshotSummary(labSnapshots.B)}</b></div></div>`;
  if(labSnapshots.A&&labSnapshots.B&&labSnapshots.A.mode===labSnapshots.B.mode){
    if(labSnapshots.A.mode==='motion')html+=`<p>Δ(Δt) = ${fmt(labSnapshots.B.derived.diff-labSnapshots.A.derived.diff,2)} ч</p>`;
    if(labSnapshots.A.mode==='holes')html+=`<p>Изменение числа пересечений: ${labSnapshots.A.derived.intersections} → ${labSnapshots.B.derived.intersections}</p>`;
    if(labSnapshots.A.mode==='factor')html+=`<p>Значение: ${fmt(labSnapshots.A.derived.right)} → ${fmt(labSnapshots.B.derived.right)}</p>`;
    if(labSnapshots.A.mode==='interval')html+=`<p>Проба: ${snapshotSummary(labSnapshots.A)} → ${snapshotSummary(labSnapshots.B)}</p>`;
  }
  $('#comparePanel').innerHTML=html;
}
function renderExperimentCopy(){
  const copy={factor:'Меняйте коэффициенты: четыре слагаемых и произведение пересчитываются из одного состояния.',interval:'Перетаскивайте критические точки и x-пробу; сравните простой, двойной корень и ноль знаменателя.',holes:'Тяните горизонталь y=m и найдите уровни, где формальное пересечение исчезает из-за ОДЗ.',motion:'Изменяйте скорость и запускайте сравнение двух поездок на общей шкале времени.'};
  $('#labExplain').textContent=copy[labState.mode];
}
function renderLab(rebuildControls=true){
  $$('[data-lab-mode]').forEach(btn=>{const on=btn.dataset.labMode===labState.mode;btn.setAttribute('aria-selected',String(on));btn.tabIndex=on?0:-1});
  if(rebuildControls){renderScenarios();renderControls()}else syncOutputs();
  renderSvgs();renderStateGrid();renderFormula();renderCause();renderDiscovery();renderPrediction();renderChallenge();renderCompare();renderExperimentCopy();updateHistoryButtons();
  $('#labStatus').textContent=labState.free?'Свободный режим · изменения сразу пересчитывают всю модель.':'Сценарий · можно перейти к свободному исследованию.';
  $('#labReadyBadge').textContent=labState.motion.playing?'эксперимент идёт':'модель связана';
  root.dataset.labReady='true';
}
