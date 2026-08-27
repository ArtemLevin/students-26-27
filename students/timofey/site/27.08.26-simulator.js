const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const round=(v,n=2)=>Number(v.toFixed(n));
const fmt=(v,n=2)=>{
  if(!Number.isFinite(v)) return '—';
  const abs=Math.abs(v);
  const digits=abs>=100?0:abs>=10?1:n;
  return new Intl.NumberFormat('ru-RU',{maximumFractionDigits:digits}).format(v);
};
const deepClone=o=>JSON.parse(JSON.stringify(o));

export function deriveTrajectory({a,b,wallHeight,margin,probeX}){
  const landing=b/a;
  const vertexX=b/(2*a);
  const maxY=b*b/(4*a);
  const required=wallHeight+margin;
  const disc=b*b-4*a*required;
  const roots=disc>=0?[(b-Math.sqrt(disc))/(2*a),(b+Math.sqrt(disc))/(2*a)]:[];
  const yAtProbe=-a*probeX*probeX+b*probeX;
  return {landing,vertexX,maxY,required,disc,roots,yAtProbe,clearance:yAtProbe-required};
}
export function deriveRail({L0,alpha,deltaMm}){
  const deltaM=deltaMm/1000;
  const T=deltaM/(L0*alpha);
  const L=L0+deltaM;
  return {deltaM,T,L};
}
export function derivePower({pFactor=1,sigmaFactor=1,sFactor=1,baseT=4000}){
  const ratio=Math.pow(pFactor/(sigmaFactor*sFactor),0.25);
  return {ratio,T:baseT*ratio,t4Factor:pFactor/(sigmaFactor*sFactor)};
}
export function derivePowers({a,b}){return {result:a-b};}

const MODE_META={
  trajectory:{
    title:'Парабола: граница условия',
    lead:'Перетаскивайте стену по оси x и сразу отслеживайте высоту, запас, корни и допустимый интервал.',
    hint:'drag + ползунки',
    steps:[
      ['1 · Модель','График y = −ax² + bx задаёт высоту в зависимости от расстояния.'],
      ['2 · Условие','Стена и обязательный запас дают уровень y = H + m.'],
      ['3 · Граница','Пересечения параболы с уровнем — корни граничного уравнения.'],
      ['4 · Неравенство','Между корнями траектория проходит не ниже требуемого уровня.'],
      ['5 · Ответ','Слово «наибольшее» выбирает правую границу x₂.']
    ],
    challenge:'Передвиньте стену точно на дальнюю границу: запас должен стать ≈ 0 м.'
  },
  rail:{
    title:'ΔL: единицы и линейная зависимость',
    lead:'Меняйте удлинение и наблюдайте, как миллиметры превращаются в метры, а T меняется пропорционально ΔL.',
    hint:'конец рельса можно тянуть',
    steps:[
      ['1 · Смысл Δ','ΔL = L − L₀ — изменение длины.'],
      ['2 · Единицы','Миллиметры переводятся в метры: ΔL(м) = ΔL(мм)/1000.'],
      ['3 · Модель','L₀(1 + αT) = L₀ + ΔL.'],
      ['4 · Выражение','После сокращения L₀ получаем T = ΔL/(L₀α).'],
      ['5 · Вывод','При фиксированных L₀ и α температура прямо пропорциональна удлинению.']
    ],
    challenge:'Получите T ≈ 50, изменяя только ΔL.'
  },
  power:{
    title:'T⁴: чувствительность результата',
    lead:'Исследуйте закон P = σST⁴. График показывает, почему огромные изменения P превращаются в умеренные изменения T.',
    hint:'T ∝ (P/σS)¹⁄⁴',
    steps:[
      ['1 · Выразить','T⁴ = P/(σS).'],
      ['2 · Отношение','Сравниваем новый эксперимент с исходным, чтобы убрать громоздкие числа.'],
      ['3 · Четвёртый корень','T/T₀ = (P/P₀ · σ₀/σ · S₀/S)¹⁄⁴.'],
      ['4 · Чувствительность','Рост P в 16 раз даёт рост T только в 2 раза.'],
      ['5 · Проверка','Положительная температура соответствует арифметическому четвёртому корню.']
    ],
    challenge:'Сделайте T ровно в 2 раза больше исходных 4000, меняя P.'
  },
  powers:{
    title:'Степени десятки: знак показателя',
    lead:'Двигайте показатели числителя и знаменателя. Итог вычисляется как a − b и сразу отмечается на шкале.',
    hint:'10ᵃ / 10ᵇ',
    steps:[
      ['1 · Основание','Одинаковое основание 10 позволяет работать только с показателями.'],
      ['2 · Деление','При делении показатели вычитаются: a − b.'],
      ['3 · Скобки','Если b отрицателен, появляется a − (−|b|).'],
      ['4 · Два минуса','Вычитание отрицательного числа превращается в сложение.'],
      ['5 · Проверка','Например, −3 − (−6) = 3, значит результат 10³.']
    ],
    challenge:'Настройте показатели так, чтобы результат был ровно 10³.'
  }
};

const SCENARIOS={
  trajectory:[
    ['base','Базовый',{a:.01,b:1,wallHeight:8,margin:1,probeX:50}],
    ['high','Выше стена',{a:.01,b:1,wallHeight:16,margin:2,probeX:50}],
    ['flat','Пологая дуга',{a:.006,b:.8,wallHeight:8,margin:1,probeX:50}],
    ['edge','Почти вершина',{a:.01,b:1,wallHeight:24,margin:.8,probeX:50}],
    ['impossible','Нет решения',{a:.01,b:1,wallHeight:26,margin:1,probeX:50}]
  ],
  rail:[
    ['base','3 мм',{L0:10,alpha:1.2e-5,deltaMm:3}],
    ['double','ΔL × 2',{L0:10,alpha:1.2e-5,deltaMm:6}],
    ['short','Короткий',{L0:5,alpha:1.2e-5,deltaMm:3}],
    ['material','α × 2',{L0:10,alpha:2.4e-5,deltaMm:3}]
  ],
  power:[
    ['base','Исходный',{pFactor:1,sigmaFactor:1,sFactor:1,baseT:4000}],
    ['double','P × 2',{pFactor:2,sigmaFactor:1,sFactor:1,baseT:4000}],
    ['x16','P × 16',{pFactor:16,sigmaFactor:1,sFactor:1,baseT:4000}],
    ['sigma4','σ × 4',{pFactor:1,sigmaFactor:4,sFactor:1,baseT:4000}]
  ],
  powers:[
    ['base','−3 / −6',{a:-3,b:-6}],
    ['same','Сокращение',{a:-5,b:-5}],
    ['positive','Оба +',{a:7,b:3}],
    ['trap','Ловушка',{a:-2,b:-7}]
  ]
};

const INITIAL={
  mode:'trajectory',scenario:'base',step:0,time:0,speed:1,playing:false,
  trajectory:deepClone(SCENARIOS.trajectory[0][2]),
  rail:deepClone(SCENARIOS.rail[0][2]),
  power:deepClone(SCENARIOS.power[0][2]),
  powers:deepClone(SCENARIOS.powers[0][2])
};
const state=deepClone(INITIAL);
let snapshot=null,predictionChoice=null,predictionBackup=null,raf=0,lastTs=0,scheduled=false;

function modeParams(mode=state.mode){return state[mode];}
function derive(mode=state.mode,params=modeParams(mode)){
  if(mode==='trajectory') return deriveTrajectory(params);
  if(mode==='rail') return deriveRail(params);
  if(mode==='power') return derivePower(params);
  return derivePowers(params);
}
function markCustom(){state.scenario='custom';}
function setMode(mode){
  if(!MODE_META[mode]) return;
  state.mode=mode;state.step=0;state.playing=false;cancelAnimationFrame(raf);raf=0;predictionChoice=null;predictionBackup=null;
  document.querySelectorAll('.mode-tab').forEach(b=>b.classList.toggle('on',b.dataset.mode===mode));
  scheduleRender();
}
function applyScenario(key){
  const row=SCENARIOS[state.mode].find(s=>s[0]===key);if(!row)return;
  state[state.mode]=deepClone(row[2]);state.scenario=key;state.step=0;state.time=0;state.playing=false;
  snapshot=null;predictionChoice=null;predictionBackup=null;cancelAnimationFrame(raf);raf=0;scheduleRender();
}
function resetMode(){applyScenario('base')}

const $=id=>document.getElementById(id);
const els={};
function cacheEls(){
  ['labTitle','labLead','labCanvas','labSvg','labOverlay','labKpis','relationChart','labFormula','scenarioRow','primaryControls','advancedControls','modeHint',
  'timelineSection','playBtn','stepBackTime','stepForwardTime','timeSlider','speedSelect','resetTime','stepPrev','stepNext','stepCopy',
  'predictionPrompt','predictionOptions','predictionRun','predictionReset','predictionResult','challengeText','challengeStatus','snapshotBtn','clearSnapshot',
  'resetExperiment','compareBox','compareTable','discovery','labLegend'].forEach(id=>els[id]=$(id));
}
function scheduleRender(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;render()})}

function render(){
  if(!els.labTitle)return;
  const meta=MODE_META[state.mode],d=derive();
  els.labTitle.textContent=meta.title;els.labLead.textContent=meta.lead;els.modeHint.textContent=meta.hint;
  document.querySelectorAll('.mode-tab').forEach(b=>b.classList.toggle('on',b.dataset.mode===state.mode));
  renderScenarios();renderControls();renderVisual(d);renderKpis(d);renderRelation(d);renderFormula(d);
  renderStep();renderPrediction();renderChallenge(d);renderCompare(d);renderDiscovery(d);renderTimeline();
}
function renderScenarios(){
  els.scenarioRow.innerHTML=SCENARIOS[state.mode].map(([key,label])=>`<button class="scenario-btn ${state.scenario===key?'on':''}" data-scenario="${key}" type="button">${label}</button>`).join('');
}
const control=(id,label,value,min,max,step,display=value,advanced=false)=>({id,label,value,min,max,step,display,advanced});
function controlsForMode(){
  const p=modeParams();
  if(state.mode==='trajectory') return [
    control('a','Кривизна a',p.a,.004,.02,.001,fmt(p.a,3),true),
    control('b','Начальный коэффициент b',p.b,.5,1.5,.05,fmt(p.b,2),true),
    control('wallHeight','Высота стены H',p.wallHeight,2,28,.5,fmt(p.wallHeight,1)+' м'),
    control('margin','Запас m',p.margin,0,8,.5,fmt(p.margin,1)+' м'),
    control('probeX','Расстояние стены x',p.probeX,0,Math.max(100,derive().landing),.5,fmt(p.probeX,1)+' м')
  ];
  if(state.mode==='rail') return [
    control('deltaMm','Удлинение ΔL',p.deltaMm,.5,10,.1,fmt(p.deltaMm,1)+' мм'),
    control('L0','Начальная длина L₀',p.L0,2,20,.5,fmt(p.L0,1)+' м',true),
    control('alpha','Коэффициент α ×10⁻⁵',p.alpha/1e-5,.5,3,.1,fmt(p.alpha/1e-5,1),true)
  ];
  if(state.mode==='power') return [
    control('pFactor','Мощность P/P₀',p.pFactor,.25,32,.25,'×'+fmt(p.pFactor,2)),
    control('sigmaFactor','σ/σ₀',p.sigmaFactor,.25,8,.25,'×'+fmt(p.sigmaFactor,2),true),
    control('sFactor','S/S₀',p.sFactor,.25,8,.25,'×'+fmt(p.sFactor,2),true)
  ];
  return [
    control('a','Показатель a',p.a,-9,9,1,String(p.a)),
    control('b','Показатель b',p.b,-9,9,1,String(p.b))
  ];
}
function renderControls(){
  const cs=controlsForMode();
  const html=c=>`<div class="control"><label for="ctrl-${c.id}">${c.label}</label><output>${c.display}</output><input id="ctrl-${c.id}" data-param="${c.id}" type="range" min="${c.min}" max="${c.max}" step="${c.step}" value="${c.value}"></div>`;
  els.primaryControls.innerHTML=cs.filter(c=>!c.advanced).map(html).join('');
  els.advancedControls.innerHTML=cs.filter(c=>c.advanced).map(html).join('')||'<p class="small">Для этого режима дополнительных параметров нет.</p>';
}
function setParam(id,raw){
  const p=modeParams(),v=Number(raw);
  if(state.mode==='rail'&&id==='alpha')p.alpha=v*1e-5;else p[id]=v;
  if(state.mode==='trajectory'&&id==='probeX')p.probeX=clamp(p.probeX,0,deriveTrajectory(p).landing);
  markCustom();predictionBackup=null;scheduleRender();
}

function renderVisual(d){
  if(state.mode==='trajectory') renderTrajectory(d);
  else if(state.mode==='rail') renderRail(d);
  else if(state.mode==='power') renderPower(d);
  else renderPowers(d);
}
function trajectoryGeometry(params=state.trajectory){
  const d=deriveTrajectory(params);
  const W=620,H=380,L=54,R=592,T=26,B=326,pw=R-L,ph=B-T;
  const xMax=Math.max(100,d.landing*1.04);
  const yMax=Math.max(28,d.maxY,d.required)*1.14;
  const X=x=>L+(x/xMax)*pw,Y=y=>B-(Math.max(0,y)/yMax)*ph;
  const pts=[];for(let i=0;i<=120;i++){const x=d.landing*i/120;pts.push([X(x),Y(-params.a*x*x+params.b*x)])}
  const path=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(2)+' '+p[1].toFixed(2)).join(' ');
  return {d,W,H,L,R,T,B,pw,ph,xMax,yMax,X,Y,path};
}
function renderTrajectory(d){
  const g=trajectoryGeometry(),p=state.trajectory,{X,Y,L,R,T,B,xMax,yMax,path}=g;
  const ticksX=[0,.25,.5,.75,1].map(q=>q*xMax),ticksY=[0,.25,.5,.75,1].map(q=>q*yMax);
  let valid='';
  if(d.roots.length){
    const [r1,r2]=d.roots,pts=[];for(let i=0;i<=70;i++){const x=r1+(r2-r1)*i/70;pts.push([X(x),Y(-p.a*x*x+p.b*x)])}
    valid=`M${X(r1)} ${Y(d.required)} `+pts.map(q=>`L${q[0]} ${q[1]}`).join(' ')+` L${X(r2)} ${Y(d.required)} Z`;
  }
  let ghost='';if(snapshot&&snapshot.mode==='trajectory'){ghost=trajectoryGeometry(snapshot.params).path}
  const xTime=d.landing*state.time,yTime=-p.a*xTime*xTime+p.b*xTime;
  const wallX=X(p.probeX),wallTop=Y(p.wallHeight),reqY=Y(d.required),probeY=Y(Math.max(0,d.yAtProbe));
  const roots=d.roots.map((r,i)=>`<circle class="plot-point" cx="${X(r)}" cy="${reqY}" r="6"/><text class="plot-label" x="${X(r)+(i? -30:9)}" y="${reqY-10}">x${i+1}=${fmt(r,1)}</text>`).join('');
  els.labSvg.innerHTML=`<svg viewBox="0 0 620 380" role="img" aria-label="Интерактивный график параболы">
    <defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="var(--burg)"/></marker></defs>
    ${ticksX.map(x=>`<line class="gridline" x1="${X(x)}" y1="${T}" x2="${X(x)}" y2="${B}"/><text class="plot-muted" x="${X(x)}" y="${B+20}" text-anchor="middle">${fmt(x,0)}</text>`).join('')}
    ${ticksY.map(y=>`<line class="gridline" x1="${L}" y1="${Y(y)}" x2="${R}" y2="${Y(y)}"/><text class="plot-muted" x="${L-8}" y="${Y(y)+4}" text-anchor="end">${fmt(y,0)}</text>`).join('')}
    <line class="axis" x1="${L}" y1="${B}" x2="${R}" y2="${B}"/><line class="axis" x1="${L}" y1="${B}" x2="${L}" y2="${T}"/>
    ${valid?`<path class="plot-valid" d="${valid}"/>`:''}
    ${ghost?`<path class="plot-compare" d="${ghost}"/>`:''}
    <line class="plot-req" x1="${L}" y1="${reqY}" x2="${R}" y2="${reqY}"/>
    <path class="plot-main" d="${path}"/>
    ${roots}
    <line x1="${wallX}" y1="${B}" x2="${wallX}" y2="${wallTop}" stroke="var(--burg)" stroke-width="8" stroke-linecap="round"/>
    <line x1="${wallX}" y1="${wallTop}" x2="${wallX}" y2="${reqY}" stroke="var(--gold)" stroke-width="4" stroke-dasharray="4 4"/>
    <line class="vector" x1="${wallX+10}" y1="${reqY}" x2="${wallX+10}" y2="${probeY}"/>
    <circle class="plot-handle" data-drag="probe" cx="${wallX}" cy="${probeY}" r="9" tabindex="0"/>
    <circle class="plot-point live" cx="${X(xTime)}" cy="${Y(Math.max(0,yTime))}" r="7"/>
    <circle cx="${X(d.vertexX)}" cy="${Y(d.maxY)}" r="5" fill="var(--gold)"/>
    <text class="plot-muted" x="${R}" y="${B+36}" text-anchor="end">x, м</text><text class="plot-muted" x="${L+5}" y="${T+10}">y, м</text>
    <text class="plot-muted" x="${R-4}" y="${reqY-6}" text-anchor="end">H + m = ${fmt(d.required,1)} м</text>
  </svg>`;
  els.labOverlay.innerHTML=`<b>Стена x = ${fmt(p.probeX,1)} м.</b> Траектория здесь: ${fmt(d.yAtProbe,2)} м; требуется ${fmt(d.required,1)} м. Запас: <b>${fmt(d.clearance,2)} м</b>.`;
}
function renderRail(d){
  const p=state.rail,x0=72,xBase=480,ext=clamp((p.deltaMm-.5)/9.5,0,1)*82,xHot=xBase+ext;
  let ghost='';if(snapshot&&snapshot.mode==='rail'){const sp=snapshot.params,se=clamp((sp.deltaMm-.5)/9.5,0,1)*82;ghost=`<line class="rail-ghost" x1="${x0}" y1="178" x2="${xBase+se}" y2="178"/>`}
  els.labSvg.innerHTML=`<svg viewBox="0 0 620 380" role="img" aria-label="Интерактивная модель теплового расширения">
    ${Array.from({length:11},(_,i)=>`<line class="gridline" x1="${x0+i*45}" y1="286" x2="${x0+i*45}" y2="302"/><text class="plot-muted" x="${x0+i*45}" y="320" text-anchor="middle">${i}</text>`).join('')}
    <text class="plot-muted" x="${x0}" y="340">схематическая шкала длины</text>
    ${ghost}
    <line class="rail-base" x1="${x0}" y1="145" x2="${xBase}" y2="145"/>
    <line class="rail-hot" x1="${x0}" y1="220" x2="${xHot}" y2="220"/>
    <line class="plot-req" x1="${xBase}" y1="112" x2="${xBase}" y2="260"/>
    <circle class="plot-handle" data-drag="railDelta" cx="${xHot}" cy="220" r="10"/>
    <text class="plot-label" x="${(x0+xBase)/2}" y="120" text-anchor="middle">L₀ = ${fmt(p.L0,1)} м</text>
    <text class="plot-label" x="${(x0+xHot)/2}" y="198" text-anchor="middle">L = L₀ + ΔL</text>
    <text class="plot-muted" x="${xBase+8}" y="105">исходный конец</text>
    <text class="plot-muted" x="${xHot}" y="256" text-anchor="middle">ΔL = ${fmt(p.deltaMm,1)} мм</text>
  </svg>`;
  els.labOverlay.innerHTML=`<b>${fmt(p.deltaMm,1)} мм = ${fmt(d.deltaM,5)} м.</b> После согласования единиц T = ΔL/(L₀α) = <b>${fmt(d.T,2)}</b>. Визуальное удлинение намеренно усилено, численные значения вычисляются точно.`;
}
function renderPower(d){
  const p=state.power,L=58,R=590,T=34,B=322,pw=R-L,ph=B-T;
  const maxF=32,maxR=Math.pow(maxF/.25/.25,.25)*1.05;
  const X=f=>L+(f/maxF)*pw,Y=r=>B-(r/maxR)*ph;
  const pts=[];for(let i=1;i<=120;i++){const f=maxF*i/120;pts.push([X(f),Y(Math.pow(f/(p.sigmaFactor*p.sFactor),.25))])}
  const path=pts.map((q,i)=>(i?'L':'M')+q[0].toFixed(1)+' '+q[1].toFixed(1)).join(' ');
  let ghost='';if(snapshot&&snapshot.mode==='power'){const gd=derivePower(snapshot.params);ghost=`<circle cx="${X(snapshot.params.pFactor)}" cy="${Y(gd.ratio)}" r="8" fill="var(--burg)" opacity=".55"/>`}
  els.labSvg.innerHTML=`<svg viewBox="0 0 620 380" role="img" aria-label="График зависимости температуры от мощности">
    ${[0,8,16,24,32].map(v=>`<line class="gridline" x1="${X(v)}" y1="${T}" x2="${X(v)}" y2="${B}"/><text class="plot-muted" x="${X(v)}" y="${B+20}" text-anchor="middle">${v}</text>`).join('')}
    ${[0,1,2,3].map(v=>`<line class="gridline" x1="${L}" y1="${Y(v)}" x2="${R}" y2="${Y(v)}"/><text class="plot-muted" x="${L-8}" y="${Y(v)+4}" text-anchor="end">${v}</text>`).join('')}
    <line class="axis" x1="${L}" y1="${B}" x2="${R}" y2="${B}"/><line class="axis" x1="${L}" y1="${B}" x2="${L}" y2="${T}"/>
    <path class="plot-main" d="${path}"/>${ghost}
    <line class="plot-req" x1="${X(p.pFactor)}" y1="${B}" x2="${X(p.pFactor)}" y2="${Y(d.ratio)}"/>
    <circle class="plot-handle" data-drag="powerP" cx="${X(p.pFactor)}" cy="${Y(d.ratio)}" r="10"/>
    <text class="plot-muted" x="${R}" y="${B+38}" text-anchor="end">P/P₀</text><text class="plot-muted" x="${L+6}" y="${T+10}">T/T₀</text>
    <text class="plot-label" x="${X(p.pFactor)+12}" y="${Y(d.ratio)-10}">×${fmt(d.ratio,2)}</text>
  </svg>`;
  els.labOverlay.innerHTML=`Сейчас <b>P = ${fmt(p.pFactor,2)}·P₀</b>, поэтому <b>T/T₀ = ${fmt(d.ratio,3)}</b> и T ≈ <b>${fmt(d.T,0)}</b>. Кривая — четвёртый корень.`;
}
function renderPowers(d){
  const p=state.powers,L=58,R=584,Y=214,min=-12,max=12,X=e=>L+(e-min)/(max-min)*(R-L);
  els.labSvg.innerHTML=`<svg viewBox="0 0 620 380" role="img" aria-label="Шкала показателей степеней десяти">
    <text class="plot-label" x="310" y="60" text-anchor="middle" style="font-size:24px">10${supSvg(p.a)} / 10${supSvg(p.b)} = 10${supSvg(d.result)}</text>
    <line class="axis" x1="${L}" y1="${Y}" x2="${R}" y2="${Y}"/>
    ${Array.from({length:25},(_,i)=>i-12).map(e=>`<line class="exp-tick" x1="${X(e)}" y1="${Y-9}" x2="${X(e)}" y2="${Y+9}"/>${e%3===0?`<text class="plot-muted" x="${X(e)}" y="${Y+30}" text-anchor="middle">${e}</text>`:''}`).join('')}
    <line class="exp-active" x1="${X(p.a)}" y1="${Y-58}" x2="${X(p.a)}" y2="${Y+2}"/><circle class="plot-handle" data-drag="expA" cx="${X(p.a)}" cy="${Y-58}" r="9"/>
    <line class="exp-den" x1="${X(p.b)}" y1="${Y+58}" x2="${X(p.b)}" y2="${Y-2}"/><circle class="plot-handle" data-drag="expB" cx="${X(p.b)}" cy="${Y+58}" r="9"/>
    <circle cx="${X(clamp(d.result,min,max))}" cy="${Y}" r="9" fill="var(--burg)"/>
    <text class="plot-label" x="${X(p.a)}" y="${Y-80}" text-anchor="middle">a=${p.a}</text>
    <text class="plot-label" x="${X(p.b)}" y="${Y+88}" text-anchor="middle">b=${p.b}</text>
    <text class="plot-label" x="${X(clamp(d.result,min,max))}" y="${Y-16}" text-anchor="middle">a−b=${d.result}</text>
  </svg>`;
  els.labOverlay.innerHTML=`Показатель результата вычисляется из одного состояния: <b>${p.a} − (${p.b}) = ${d.result}</b>. ${p.b<0?'Отрицательный показатель в знаменателе превращает вычитание в сложение.':''}`;
}
function supSvg(n){return `<tspan baseline-shift="super" font-size="65%">${n}</tspan>`}

function renderKpis(d){
  let rows;
  if(state.mode==='trajectory') rows=[[fmt(d.yAtProbe,2)+' м','y(x стены)'],[fmt(d.required,1)+' м','требование'],[d.roots.length?fmt(d.roots[1],1)+' м':'нет','дальний корень']];
  else if(state.mode==='rail') rows=[[fmt(state.rail.deltaMm,1)+' мм','ΔL'],[fmt(d.deltaM,5)+' м','после перевода'],[fmt(d.T,2),'T']];
  else if(state.mode==='power') rows=[['×'+fmt(state.power.pFactor,2),'P/P₀'],['×'+fmt(d.ratio,3),'T/T₀'],[fmt(d.T,0),'T']];
  else rows=[[String(state.powers.a),'a'],[String(state.powers.b),'b'],[String(d.result),'a − b']];
  els.labKpis.innerHTML=rows.map(r=>`<div class="kpi-card"><b>${r[0]}</b><span>${r[1]}</span></div>`).join('');
}
function renderRelation(d){
  let rows=[];
  if(state.mode==='trajectory'){
    const max=Math.max(d.maxY,d.required,Math.abs(d.yAtProbe),1);
    rows=[['y стены',Math.max(0,d.yAtProbe)/max,fmt(d.yAtProbe,1)],['требуется',d.required/max,fmt(d.required,1)],['вершина',d.maxY/max,fmt(d.maxY,1)]];
  }else if(state.mode==='rail'){
    const baseT=deriveRail(SCENARIOS.rail[0][2]).T;
    rows=[['ΔL/3мм',state.rail.deltaMm/10,fmt(state.rail.deltaMm/3,2)+'×'],['T/T₀',clamp(d.T/(baseT*3),0,1),fmt(d.T/baseT,2)+'×'],['L₀/10м',clamp(state.rail.L0/20,0,1),fmt(state.rail.L0/10,2)+'×']];
  }else if(state.mode==='power'){
    rows=[['P/P₀',clamp(state.power.pFactor/32,0,1),fmt(state.power.pFactor,1)+'×'],['T/T₀',clamp(d.ratio/3,0,1),fmt(d.ratio,2)+'×'],['σS',clamp((state.power.sigmaFactor*state.power.sFactor)/16,0,1),fmt(state.power.sigmaFactor*state.power.sFactor,1)+'×']];
  }else{
    const m=Math.max(9,Math.abs(state.powers.a),Math.abs(state.powers.b),Math.abs(d.result));
    rows=[['|a|',Math.abs(state.powers.a)/m,String(Math.abs(state.powers.a))],['|b|',Math.abs(state.powers.b)/m,String(Math.abs(state.powers.b))],['|a−b|',Math.abs(d.result)/m,String(Math.abs(d.result))]];
  }
  els.relationChart.innerHTML=rows.map(([label,w,val])=>`<div class="relation-row"><span>${label}</span><span class="relation-track"><i style="width:${clamp(w,0,1)*100}%"></i></span><b>${val}</b></div>`).join('');
}
function renderFormula(d){
  if(state.mode==='trajectory') els.labFormula.innerHTML=d.roots.length?`−${fmt(state.trajectory.a,3)}x² + ${fmt(state.trajectory.b,2)}x = ${fmt(d.required,1)} &nbsp;⇒&nbsp; x₁=${fmt(d.roots[0],2)}, x₂=${fmt(d.roots[1],2)}`:`−${fmt(state.trajectory.a,3)}x² + ${fmt(state.trajectory.b,2)}x = ${fmt(d.required,1)} &nbsp;⇒&nbsp; действительных корней нет`;
  else if(state.mode==='rail') els.labFormula.innerHTML=`T = (${fmt(state.rail.deltaMm,1)}·10⁻³)/(${fmt(state.rail.L0,1)}·${fmt(state.rail.alpha/1e-5,1)}·10⁻⁵) = ${fmt(d.T,2)}`;
  else if(state.mode==='power') els.labFormula.innerHTML=`T/T₀ = (${fmt(state.power.pFactor,2)}/(${fmt(state.power.sigmaFactor,2)}·${fmt(state.power.sFactor,2)}))¹⁄⁴ = ${fmt(d.ratio,3)}`;
  else els.labFormula.innerHTML=`10<sup>${state.powers.a}</sup> / 10<sup>${state.powers.b}</sup> = 10<sup>${state.powers.a}−(${state.powers.b})</sup> = 10<sup>${d.result}</sup>`;
}
function renderStep(){
  const steps=MODE_META[state.mode].steps,idx=clamp(state.step,0,steps.length-1);state.step=idx;
  els.stepCopy.innerHTML=`<b>${steps[idx][0]}</b>${steps[idx][1]}`;
  els.stepPrev.disabled=idx===0;els.stepNext.disabled=idx===steps.length-1;
}
const PREDICTIONS={
  trajectory:{prompt:'Прогноз: если увеличить требуемую высоту на 2 м, дальняя граница x₂…',options:[['left','сдвинется влево'],['right','сдвинется вправо'],['none','не изменится']],correct:'left'},
  rail:{prompt:'Прогноз: если увеличить ΔL в 2 раза при тех же L₀ и α, температура T…',options:[['double','увеличится в 2 раза'],['sqrt','увеличится в √2 раза'],['same','не изменится']],correct:'double'},
  power:{prompt:'Прогноз: если увеличить P в 16 раз при тех же σ и S, температура T…',options:[['x2','увеличится в 2 раза'],['x4','увеличится в 4 раза'],['x16','увеличится в 16 раз']],correct:'x2'},
  powers:{prompt:'Прогноз: если показатель знаменателя уменьшить на 2, итоговый показатель a − b…',options:[['plus2','увеличится на 2'],['minus2','уменьшится на 2'],['same','не изменится']],correct:'plus2'}
};
function renderPrediction(){
  const pr=PREDICTIONS[state.mode];els.predictionPrompt.innerHTML=`<b>${pr.prompt}</b>`;
  els.predictionOptions.innerHTML=pr.options.map(([k,l])=>`<button class="mini-btn ${predictionChoice===k?'selected':''}" data-prediction="${k}" type="button">${l}</button>`).join('');
  if(!predictionBackup&&!predictionChoice)els.predictionResult.textContent='Сначала выберите прогноз, затем запустите проверку.';
}
function runPrediction(){
  if(!predictionChoice){els.predictionResult.textContent='Выберите прогноз.';return}
  if(!predictionBackup)predictionBackup=deepClone(modeParams());
  const before=derive(state.mode,predictionBackup);
  if(state.mode==='trajectory'){state.trajectory.wallHeight=predictionBackup.wallHeight+2;}
  else if(state.mode==='rail'){state.rail.deltaMm=clamp(predictionBackup.deltaMm*2,.5,10);}
  else if(state.mode==='power'){state.power.pFactor=clamp(predictionBackup.pFactor*16,.25,32);}
  else state.powers.b=clamp(predictionBackup.b-2,-9,9);
  markCustom();const after=derive();const ok=predictionChoice===PREDICTIONS[state.mode].correct;
  let fact='';
  if(state.mode==='trajectory'){
    if(before.roots.length&&after.roots.length)fact=`x₂: ${fmt(before.roots[1],1)} → ${fmt(after.roots[1],1)} м.`;
    else fact='При новом уровне число действительных корней изменилось.';
  }else if(state.mode==='rail')fact=`T: ${fmt(before.T,1)} → ${fmt(after.T,1)}.`;
  else if(state.mode==='power')fact=`T/T₀: ${fmt(before.ratio,2)} → ${fmt(after.ratio,2)}.`;
  else fact=`a−b: ${before.result} → ${after.result}.`;
  els.predictionResult.textContent=(ok?'Прогноз подтверждён. ':'Результат отличается от прогноза. ')+fact;scheduleRender();
}
function resetPrediction(){
  if(predictionBackup){state[state.mode]=deepClone(predictionBackup);predictionBackup=null;markCustom()}
  predictionChoice=null;els.predictionResult.textContent='Эксперимент возвращён к исходному состоянию.';scheduleRender();
}
function renderChallenge(d){
  els.challengeText.textContent=MODE_META[state.mode].challenge;let ok=false,msg='';
  if(state.mode==='trajectory'){ok=d.roots.length&&Math.abs(d.clearance)<.12;msg=ok?'Готово: стена стоит на границе допустимого участка.':`Текущий запас: ${fmt(d.clearance,2)} м.`}
  else if(state.mode==='rail'){ok=Math.abs(d.T-50)<.6;msg=ok?'Готово: T ≈ 50. Прямая пропорциональность найдена.':`Сейчас T = ${fmt(d.T,2)}.`}
  else if(state.mode==='power'){ok=Math.abs(d.ratio-2)<.015;msg=ok?'Готово: T/T₀ = 2. Для этого требуется P/(σS) = 16.':`Сейчас T/T₀ = ${fmt(d.ratio,3)}.`}
  else{ok=d.result===3;msg=ok?'Готово: итоговый показатель равен 3.':`Сейчас a − b = ${d.result}.`}
  els.challengeStatus.textContent=msg;els.challengeStatus.className='challenge-status '+(ok?'ok':'');
}
function renderCompare(d){
  if(!snapshot||snapshot.mode!==state.mode){els.compareBox.classList.remove('show');els.compareTable.innerHTML='';return}
  const a=derive(snapshot.mode,snapshot.params),b=d;let rows=[];
  if(state.mode==='trajectory')rows=[['требуемая высота',a.required,b.required],['x₁',a.roots[0],b.roots[0]],['x₂',a.roots[1],b.roots[1]],['ymax',a.maxY,b.maxY]];
  else if(state.mode==='rail')rows=[['ΔL, мм',snapshot.params.deltaMm,state.rail.deltaMm],['T',a.T,b.T],['L, м',a.L,b.L]];
  else if(state.mode==='power')rows=[['P/P₀',snapshot.params.pFactor,state.power.pFactor],['T/T₀',a.ratio,b.ratio],['T',a.T,b.T]];
  else rows=[['a',snapshot.params.a,state.powers.a],['b',snapshot.params.b,state.powers.b],['a−b',a.result,b.result]];
  els.compareTable.innerHTML=`<thead><tr><th>Величина</th><th>A</th><th>B</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r[0]}</td><td>${fmt(Number(r[1]),2)}</td><td>${fmt(Number(r[2]),2)}</td></tr>`).join('')}</tbody>`;
  els.compareBox.classList.add('show');
}
function renderDiscovery(d){
  let text='',tone='';
  if(state.mode==='trajectory'){
    if(d.disc<0){text='Обратите внимание: требуемый уровень выше вершины параболы. Реальных расстояний, удовлетворяющих условию, нет.';tone='alert'}
    else if(Math.abs(d.clearance)<.12){text='Момент открытия: стена стоит на границе. Здесь неравенство превращается в равенство y = H + m.';tone='good'}
    else if(Math.abs(d.required-d.maxY)<1.2){text='Граничный случай: уровень почти касается вершины. Два корня сближаются и в пределе превращаются в один.'}
    else if(d.clearance>=0){text='Сейчас условие выполняется: точка стены лежит внутри допустимого интервала между корнями.';tone='good'}
    else{text='Условие сейчас нарушено. Сравните положение стены с интервалом между двумя корнями.';tone='alert'}
  }else if(state.mode==='rail'){
    const base=deriveRail(SCENARIOS.rail[0][2]);
    if(Math.abs(d.T/base.T-2)<.03){text='Момент открытия: удлинение выросло в 2 раза — T тоже выросла в 2 раза. Это прямая пропорциональность.';tone='good'}
    else{text='Следите одновременно за тремя представлениями: миллиметры → метры → значение T. Все они вычисляются из одного состояния.'}
  }else if(state.mode==='power'){
    if(Math.abs(state.power.pFactor-16)<.1&&state.power.sigmaFactor===1&&state.power.sFactor===1){text='Момент открытия: P выросла в 16 раз, а T только в 2. Четвёртый корень сильно сглаживает изменение.';tone='good'}
    else{text='Сравните длину изменения P с изменением T: степенная зависимость T ∝ P¹⁄⁴ гораздо менее чувствительна, чем линейная.'}
  }else{
    if(state.powers.b<0){text=`Знаменатель имеет отрицательный показатель: ${state.powers.a} − (${state.powers.b}) = ${d.result}. Второй минус увеличивает итоговый показатель.`;tone='good'}
    else if(d.result===0){text='Интересный случай: одинаковые показатели полностью сокращаются, и результат равен 10⁰ = 1.';tone='good'}
    else{text='Двигайте a и b независимо и следите за маркером a − b на общей шкале.'}
  }
  els.discovery.textContent=text;els.discovery.dataset.tone=tone;
}
function renderTimeline(){
  const show=state.mode==='trajectory';els.timelineSection.style.display=show?'block':'none';
  if(show){els.timeSlider.value=String(state.time);els.speedSelect.value=String(state.speed);els.playBtn.textContent=state.playing?'❚❚':'▶'}
}

function animate(ts){
  if(!state.playing)return;
  if(!lastTs)lastTs=ts;const dt=Math.min(.05,(ts-lastTs)/1000);lastTs=ts;
  state.time+=dt*.18*state.speed;
  if(state.time>=1){state.time=1;state.playing=false;lastTs=0}
  scheduleRender();if(state.playing)raf=requestAnimationFrame(animate);
}
function togglePlay(){
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){state.time=1;state.playing=false;scheduleRender();return}
  if(state.time>=1)state.time=0;state.playing=!state.playing;lastTs=0;if(state.playing)raf=requestAnimationFrame(animate);else cancelAnimationFrame(raf);scheduleRender();
}

function pointerToSvgX(svg,e){const r=svg.getBoundingClientRect();return (e.clientX-r.left)/r.width*620}
function handleDragStart(e){
  const target=e.target.closest('[data-drag]');if(!target)return;const svg=target.ownerSVGElement,kind=target.dataset.drag;svg.setPointerCapture?.(e.pointerId);
  const move=ev=>{
    const sx=pointerToSvgX(svg,ev);
    if(kind==='probe'){const g=trajectoryGeometry();state.trajectory.probeX=clamp((sx-g.L)/g.pw*g.xMax,0,g.d.landing)}
    else if(kind==='railDelta'){state.rail.deltaMm=clamp(.5+(sx-480)/82*9.5,.5,10)}
    else if(kind==='powerP'){state.power.pFactor=clamp((sx-58)/(590-58)*32,.25,32)}
    else if(kind==='expA'||kind==='expB'){const val=Math.round(-12+(sx-58)/(584-58)*24);state.powers[kind==='expA'?'a':'b']=clamp(val,-9,9)}
    markCustom();predictionBackup=null;scheduleRender();
  };
  const up=()=>{svg.removeEventListener('pointermove',move);svg.removeEventListener('pointerup',up);svg.removeEventListener('pointercancel',up)};
  svg.addEventListener('pointermove',move);svg.addEventListener('pointerup',up);svg.addEventListener('pointercancel',up);move(e);
}

function initPage(){
  cacheEls();
  document.querySelectorAll('#labModes .mode-tab').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
  els.scenarioRow.addEventListener('click',e=>{const b=e.target.closest('[data-scenario]');if(b)applyScenario(b.dataset.scenario)});
  const onRange=e=>{const input=e.target.closest('input[data-param]');if(input)setParam(input.dataset.param,input.value)};
  els.primaryControls.addEventListener('input',onRange);els.advancedControls.addEventListener('input',onRange);
  els.labSvg.addEventListener('pointerdown',handleDragStart);

  els.playBtn.addEventListener('click',togglePlay);
  els.stepBackTime.addEventListener('click',()=>{state.playing=false;state.time=clamp(state.time-.05,0,1);scheduleRender()});
  els.stepForwardTime.addEventListener('click',()=>{state.playing=false;state.time=clamp(state.time+.05,0,1);scheduleRender()});
  els.timeSlider.addEventListener('input',e=>{state.playing=false;state.time=Number(e.target.value);scheduleRender()});
  els.speedSelect.addEventListener('change',e=>{state.speed=Number(e.target.value);scheduleRender()});
  els.resetTime.addEventListener('click',()=>{state.playing=false;state.time=0;scheduleRender()});
  els.stepPrev.addEventListener('click',()=>{state.step=clamp(state.step-1,0,4);scheduleRender()});
  els.stepNext.addEventListener('click',()=>{state.step=clamp(state.step+1,0,4);scheduleRender()});
  els.predictionOptions.addEventListener('click',e=>{const b=e.target.closest('[data-prediction]');if(b){predictionChoice=b.dataset.prediction;scheduleRender()}});
  els.predictionRun.addEventListener('click',runPrediction);els.predictionReset.addEventListener('click',resetPrediction);
  els.snapshotBtn.addEventListener('click',()=>{snapshot={mode:state.mode,params:deepClone(modeParams())};scheduleRender()});
  els.clearSnapshot.addEventListener('click',()=>{snapshot=null;scheduleRender()});els.resetExperiment.addEventListener('click',resetMode);

  els.labLegend.addEventListener('mouseover',e=>{const b=e.target.closest('[data-kind]');if(b)els.labCanvas.className='lab-canvas highlight-'+b.dataset.kind});
  els.labLegend.addEventListener('mouseout',()=>{els.labCanvas.className='lab-canvas'});
  els.labLegend.addEventListener('focusin',e=>{const b=e.target.closest('[data-kind]');if(b)els.labCanvas.className='lab-canvas highlight-'+b.dataset.kind});
  els.labLegend.addEventListener('focusout',()=>{els.labCanvas.className='lab-canvas'});

  document.querySelectorAll('.tab').forEach(tab=>tab.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('on'));tab.classList.add('on');
    document.querySelectorAll('.panel').forEach(p=>p.classList.remove('on'));const p=$(tab.dataset.panel);p.classList.add('on');
    if(p.dataset.labMode)setMode(p.dataset.labMode);p.scrollIntoView({behavior:'smooth',block:'start'});
  }));
  $('detail').addEventListener('change',e=>document.documentElement.dataset.detail=e.target.value);
  $('theme').addEventListener('click',()=>{document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark'});
  $('print').addEventListener('click',()=>print());
  const answerToggle=$('answerToggle'),answers=$('answers');
  answerToggle.addEventListener('click',()=>{const show=!answers.classList.contains('show');answers.classList.toggle('show',show);answerToggle.setAttribute('aria-expanded',String(show));answerToggle.textContent=show?'Скрыть ответы':'Показать ответы'});
  document.querySelectorAll('.quiz').forEach(q=>q.querySelectorAll('button[data-choice]').forEach(btn=>btn.addEventListener('click',()=>{
    q.querySelectorAll('button').forEach(x=>x.classList.remove('good','bad'));const ok=btn.dataset.choice===q.dataset.answer;
    btn.classList.add(ok?'good':'bad');const f=q.querySelector('.feedback');f.textContent=ok?'Верно.':'Проверьте правило ещё раз.';f.className='feedback '+(ok?'ok':'no');
  })));
  const checks=[...document.querySelectorAll('#checks input')],bar=$('progressBar'),progressText=$('progressText');
  const updateProgress=()=>{const done=checks.filter(x=>x.checked).length;bar.style.width=(done/checks.length*100)+'%';progressText.textContent=`Отмечено ${done} из ${checks.length}.`};
  checks.forEach(x=>x.addEventListener('change',updateProgress));
  render();
}
if(typeof document!=='undefined')initPage();
