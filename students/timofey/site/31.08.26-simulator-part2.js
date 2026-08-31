function renderGraphSvg(svg, derived = currentDerived(), { modal = false } = {}) {
  if (!svg) return; const bounds = getViewBounds(); const area = graphArea(); const { X, Y } = mapFns(bounds, area);
  const parts = [`<rect x="0" y="0" width="${SVG_W}" height="${SVG_H}" fill="transparent" data-pan-bg="1"/>`, gridSvg(bounds, area)];
  const snapshot = state.snapshot && state.snapshot.mode === state.mode ? deriveMode(state.snapshot.mode, state.snapshot.config) : null;
  if (snapshot && snapshot.valid !== false) parts.push(snapshotCurveSvg(snapshot, bounds));

  if (state.mode === 'line') {
    if (derived.valid) {
      parts.push(`<path class="lab-curve" d="${pathFor(derived.eval,bounds)}"/>`);
      const p1 = state.config.p1, p2 = state.config.p2;
      // slope triangle from p1 to (p2.x,p1.y) to p2
      parts.push(`<path class="lab-helper" d="M${X(p1.x)} ${Y(p1.y)} L${X(p2.x)} ${Y(p1.y)} L${X(p2.x)} ${Y(p2.y)}"/>`);
      parts.push(handleSvg(p1.x,p1.y,'A','p1')); parts.push(handleSvg(p2.x,p2.y,'B','p2'));
      parts.push(handleSvg(state.config.probeX,derived.probeY,'f(x₀)','probe','probe'));
      if (Number.isFinite(derived.xIntercept)) parts.push(`<circle class="lab-point intersection" cx="${X(derived.xIntercept)}" cy="${Y(0)}" r="4"/><text class="lab-point-label" x="${X(derived.xIntercept)+7}" y="${Y(0)-7}">Ox</text>`);
    }
  } else if (state.mode === 'quadratic') {
    if (derived.valid) {
      parts.push(`<path class="lab-curve" d="${pathFor(derived.eval,bounds)}"/>`);
      parts.push(handleSvg(state.config.p1.x,state.config.p1.y,'A','p1')); parts.push(handleSvg(state.config.p2.x,state.config.p2.y,'B','p2'));
      parts.push(handleSvg(state.config.probeX,derived.probeY,'f(x₀)','probe','probe'));
      parts.push(`<circle class="lab-point secondary" cx="${X(derived.vertexX)}" cy="${Y(derived.vertexY)}" r="5"/><text class="lab-point-label" x="${X(derived.vertexX)+8}" y="${Y(derived.vertexY)-8}">V</text>`);
      derived.roots.roots.forEach((r,i)=>parts.push(`<circle class="lab-point intersection" cx="${X(r)}" cy="${Y(0)}" r="4"/><text class="lab-point-label" x="${X(r)+6}" y="${Y(0)-7}">x${i+1}</text>`));
    }
  } else if (state.mode === 'hyperbola') {
    parts.push(`<rect class="lab-band" x="${X(-.18)}" y="${area.t}" width="${Math.max(4,X(.18)-X(-.18))}" height="${area.b-area.t}"/>`);
    parts.push(`<line class="lab-asymptote" x1="${X(0)}" y1="${area.t}" x2="${X(0)}" y2="${area.b}"/>`);
    if (derived.valid) {
      parts.push(`<line class="lab-asymptote" x1="${area.l}" y1="${Y(derived.a)}" x2="${area.r}" y2="${Y(derived.a)}"/>`);
      parts.push(`<path class="lab-curve" d="${pathFor(derived.eval,bounds,area,x=>Math.abs(x)>.035)}"/>`);
      parts.push(handleSvg(state.config.p1.x,state.config.p1.y,'A','p1')); parts.push(handleSvg(state.config.p2.x,state.config.p2.y,'B','p2'));
      if (Math.abs(state.config.probeX) > .18) parts.push(handleSvg(state.config.probeX,derived.probeY,'f(x₀)','probe','probe'));
      parts.push(`<text class="lab-point-label" x="${area.l+7}" y="${Y(derived.a)-7}">y=a</text>`);
    }
  } else if (state.mode === 'intersections') {
    parts.push(`<path class="lab-curve" d="${pathFor(derived.f,bounds)}"/>`);
    const gDomain = state.config.family === 'line-hyperbola' ? x => Math.abs(x)>.035 : () => true;
    parts.push(`<path class="lab-curve secondary" d="${pathFor(derived.g,bounds,area,gDomain)}"/>`);
    derived.points.forEach((p,i)=>parts.push(handleSvg(p.x,p.y,`P${i+1}`,'none','intersection')));
    renderIntersectionHandles(parts,bounds,derived);
    // difference inset
    const inset = graphArea(true); const hb = { xmin: bounds.xmin, xmax: bounds.xmax, ymin: -8, ymax: 8 };
    parts.push(`<rect x="${inset.l}" y="${inset.t}" width="${inset.r-inset.l}" height="${inset.b-inset.t}" rx="9" fill="var(--card)" opacity=".94" stroke="var(--line)"/>`);
    parts.push(gridSvg(hb,inset)); parts.push(`<path class="lab-difference" d="${pathFor(derived.difference,hb,inset,gDomain,180)}"/>`);
    parts.push(`<text class="lab-point-label" x="${inset.l+8}" y="${inset.t+14}">h=f−g</text>`);
  } else {
    const t = derived; const base = t.base; const baseDomain = base.domain;
    parts.push(`<path class="lab-curve ghost" d="${pathFor(base.eval,bounds,area,baseDomain)}"/>`);
    parts.push(`<path class="lab-curve" d="${pathFor(t.eval,bounds,area,x=>Number.isFinite(t.eval(x)))}"/>`);
    parts.push(handleSvg(state.config.h,state.config.v,'опора','transformAnchor','secondary'));
    if (Number.isFinite(t.transformedY)) parts.push(handleSvg(state.config.probeX,t.transformedY,'g(x₀)','probe','probe'));
    if (state.config.base === 'hyperbola') {
      parts.push(`<line class="lab-asymptote" x1="${X(state.config.h)}" y1="${area.t}" x2="${X(state.config.h)}" y2="${area.b}"/>`);
      parts.push(`<line class="lab-asymptote" x1="${area.l}" y1="${Y(state.config.v)}" x2="${area.r}" y2="${Y(state.config.v)}"/>`);
    }
  }
  svg.setAttribute('viewBox', `0 0 ${SVG_W} ${SVG_H}`); svg.innerHTML = parts.join('');
}

function snapshotCurveSvg(derived, bounds) {
  if (state.snapshot.mode === 'line' || state.snapshot.mode === 'quadratic' || state.snapshot.mode === 'hyperbola') {
    if (!derived.eval) return ''; const domain = state.snapshot.mode === 'hyperbola' ? x => Math.abs(x)>.035 : () => true;
    return `<path class="lab-curve snapshot" d="${pathFor(derived.eval,bounds,graphArea(),domain)}"/>`;
  }
  if (state.snapshot.mode === 'intersections') return `<path class="lab-curve snapshot" d="${pathFor(derived.f,bounds)}"/><path class="lab-curve snapshot" d="${pathFor(derived.g,bounds,graphArea(),state.snapshot.config.family==='line-hyperbola'?x=>Math.abs(x)>.035:()=>true)}"/>`;
  if (state.snapshot.mode === 'transforms') return `<path class="lab-curve snapshot" d="${pathFor(derived.eval,bounds,graphArea(),x=>Number.isFinite(derived.eval(x)))}"/>`;
  return '';
}

function renderIntersectionHandles(parts,bounds,derived) {
  const { X, Y } = mapFns(bounds, graphArea()); const c = state.config;
  const lx1=-2,lx2=2; parts.push(handleSvg(lx1,c.line.k*lx1+c.line.b,'F₁','f1')); parts.push(handleSvg(lx2,c.line.k*lx2+c.line.b,'F₂','f2'));
  if (c.family === 'line-line') {
    parts.push(handleSvg(lx1,c.other.k*lx1+c.other.b,'G₁','g1','secondary')); parts.push(handleSvg(lx2,c.other.k*lx2+c.other.b,'G₂','g2','secondary'));
  } else if (c.family === 'line-parabola') {
    const vx=-c.other.b/(2*c.other.a),vy=c.other.a*vx*vx+c.other.b*vx+c.other.c;
    parts.push(handleSvg(vx,vy,'Vg','gVertex','secondary'));
  } else {
    parts.push(`<line class="lab-asymptote" x1="${X(0)}" y1="${graphArea().t}" x2="${X(0)}" y2="${graphArea().b}"/>`);
    parts.push(`<line class="lab-asymptote" x1="${graphArea().l}" y1="${Y(c.other.a)}" x2="${graphArea().r}" y2="${Y(c.other.a)}"/>`);
    parts.push(handleSvg(0,c.other.a,'a','gCenter','secondary')); parts.push(handleSvg(1,c.other.k+c.other.a,'k','gK','secondary'));
  }
  if (Number.isFinite(derived.fProbe)) parts.push(handleSvg(c.probeX,derived.fProbe,'x₀','probe','probe'));
}

function coeffX(v, power='x') {
  if (Math.abs(v) < 1e-10) return '';
  const abs=Math.abs(v); const c=near(abs,1)?'':fmt(abs); return `${v<0?'− ':''}${c}${power}`;
}
function appendTerm(base,v,power='') {
  if(Math.abs(v)<1e-10)return base;const abs=Math.abs(v),body=power?(near(abs,1)?power:`${fmt(abs)}${power}`):fmt(abs);return `${base}${base?' ':''}${v>=0&&base?'+ ':'− '}${body}`;
}
function formulaFor(d = currentDerived()) {
  const c = state.config;
  if (d.valid === false) return d.reason;
  if (state.mode === 'line') {let f=coeffX(d.k);f=appendTerm(f,d.b);return `f(x) = ${f||'0'}   ·   k = Δy/Δx = ${fmt(d.dy)}/${fmt(d.dx)} = ${fmt(d.k)}`;}
  if (state.mode === 'quadratic') {let f=coeffX(d.a,'x²');f=appendTerm(f,d.b,'x');f=appendTerm(f,d.c);return `f(x) = ${f||'0'}   ·   V(${fmt(d.vertexX)}; ${fmt(d.vertexY)})`;}
  if (state.mode === 'hyperbola') {let f=`${near(Math.abs(d.k),1)?(d.k<0?'− ':''):(fmt(d.k))}/x`;f=appendTerm(f,d.a);return `f(x) = ${f}   ·   x ≠ 0   ·   y = ${fmt(d.a)} — горизонтальная асимптота`;}
  if (state.mode === 'intersections') {
    let fbody=coeffX(c.line.k);fbody=appendTerm(fbody,c.line.b);const f=`f(x)=${fbody||'0'}`;
    let gbody='';if(c.family==='line-line'){gbody=coeffX(c.other.k);gbody=appendTerm(gbody,c.other.b);}else if(c.family==='line-parabola'){gbody=coeffX(c.other.a,'x²');gbody=appendTerm(gbody,c.other.b,'x');gbody=appendTerm(gbody,c.other.c);}else{gbody=`${near(Math.abs(c.other.k),1)?(c.other.k<0?'− ':''):fmt(c.other.k)}/x`;gbody=appendTerm(gbody,c.other.a);}
    return `${f}   ·   g(x)=${gbody||'0'}   ·   пересечение ⇔ h(x)=f(x)−g(x)=0`;
  }
  const base = BASE_FUNCTIONS[c.base]?.label || 'f(x)';
  const shiftArg=Math.abs(c.h)<1e-10?'x':`x ${c.h>=0?'−':'+'} ${fmt(Math.abs(c.h))}`; const arg=c.reflectY?`−(${shiftArg})`:shiftArg; const tail=Math.abs(c.v)<1e-10?'':` ${c.v>=0?'+':'−'} ${fmt(Math.abs(c.v))}`;
  return `${base}   →   g(x) = ${c.reflectX?'−':''}f(${arg})${tail}`;
}

function metricsFor(d = currentDerived()) {
  if (d.valid === false) return [['Состояние','недопустимо']];
  if (state.mode === 'line') return [['k',fmt(d.k)],['b',fmt(d.b)],['Δx',fmt(d.dx)],['Δy',fmt(d.dy)],['f(x₀)',fmt(d.probeY)]];
  if (state.mode === 'quadratic') return [['a',fmt(d.a)],['b',fmt(d.b)],['c',fmt(d.c)],['x вершины',fmt(d.vertexX)],['D',fmt(d.roots.discriminant)]];
  if (state.mode === 'hyperbola') return [['k',fmt(d.k)],['a',fmt(d.a)],['x₀',fmt(d.probeX)],['f(x₀)',fmt(d.probeY)],['асимптота',`y=${fmt(d.a)}`]];
  if (state.mode === 'intersections') return [['точек',d.kind==='infinite'?'∞':String(d.points.length)],['f(x₀)',fmt(d.fProbe)],['g(x₀)',fmt(d.gProbe)],['h(x₀)',fmt(d.diffProbe)],['семейство',familyLabel(state.config.family)]];
  return [['h',fmt(state.config.h)],['v',fmt(state.config.v)],['x₀',fmt(state.config.probeX)],['g(x₀)',fmt(d.transformedY)],['база',BASE_FUNCTIONS[state.config.base]?.label||'—']];
}
function numericMetrics(d=currentDerived()) {
  if (d.valid===false) return [];
  if (state.mode==='line') return [['k',d.k],['b',d.b],['f(x₀)',d.probeY]];
  if (state.mode==='quadratic') return [['a',d.a],['b',d.b],['c',d.c]];
  if (state.mode==='hyperbola') return [['k',d.k],['a',d.a],['f(x₀)',d.probeY]];
  if (state.mode==='intersections') return [['f(x₀)',d.fProbe],['g(x₀)',d.gProbe],['h(x₀)',d.diffProbe]];
  return [['h',state.config.h],['v',state.config.v],['g(x₀)',d.transformedY]];
}
function familyLabel(v){return ({'line-line':'прямая + прямая','line-parabola':'прямая + парабола','line-hyperbola':'прямая + гипербола'})[v]||v}

function discoveryFor(d=currentDerived()) {
  if (d.valid===false) return `Ограничение: ${d.reason}`;
  if (state.mode==='line') {
    if (Math.abs(d.k)<.04) return 'Интересный случай: k≈0. Прямая горизонтальна, поэтому f(x) почти не зависит от x.';
    if (Math.abs(d.b)<.05) return 'Обратите внимание: b≈0. Прямая проходит через начало координат и становится прямой пропорциональностью.';
    if (Math.abs(d.k)>6) return 'Почти вертикальная прямая: небольшое изменение x вызывает большое изменение y. При x₁=x₂ формула y=kx+b уже невозможна.';
  }
  if (state.mode==='quadratic') {
    const D=d.roots.discriminant;
    if (Math.abs(D)<.08) return 'Момент открытия: D≈0. Парабола касается Ox ровно в одной точке — корень двойной.';
    if (D<0) return 'Парабола не пересекает Ox: дискриминант отрицателен.';
    if (Math.abs(state.config.p1.x)<.05 || Math.abs(state.config.p2.x)<.05) return `Точка с x=0 показывает c напрямую: c=${fmt(d.c)}.`;
  }
  if (state.mode==='hyperbola') {
    if (Math.abs(d.a)<.05) return 'Горизонтальная асимптота совпала с Ox: это несдвинутая по вертикали гипербола.';
    if (Math.abs(state.config.probeX)<.7) return 'При приближении x к нулю |f(x)| быстро растёт: график приближается к вертикальной асимптоте, не пересекая её.';
    if (d.k<0) return 'Знак k отрицателен: ветви располагаются в противоположных относительно центра четвертях.';
  }
  if (state.mode==='intersections') {
    if (d.kind==='infinite') return 'Особый случай: графики совпали. Уравнение f(x)=g(x) имеет бесконечно много решений.';
    if (d.points.length===0) return 'Сейчас пересечений нет: h(x)=f(x)−g(x) не обращается в ноль.';
    if (d.points.length===1) return 'Особый случай: ровно одно пересечение. Для прямой и параболы это соответствует касанию (D=0).';
    if (d.points.length===2) return 'Две точки пересечения ↔ два нуля графика h(x)=f(x)−g(x).';
  }
  if (state.mode==='transforms') {
    if (Math.abs(state.config.h)<.05 && Math.abs(state.config.v)<.05 && !state.config.reflectX && !state.config.reflectY) return 'Исходный и преобразованный графики совпадают: ни одного преобразования пока нет.';
    if (state.config.h>0) return `Положительное h=${fmt(state.config.h)} в f(x−h) сдвигает график вправо, хотя внутри скобок стоит «минус».`;
    if (state.config.reflectX || state.config.reflectY) return 'Пунктирный график помогает увидеть отражение: расстояния до соответствующей оси сохраняются.';
  }
  return LAB_META[state.mode].lead;
}

function barData(d=currentDerived()) {
  if (d.valid===false) return [];
  if (state.mode==='line') return [['Δx',d.dx],['Δy',d.dy],['k',d.k]];
  if (state.mode==='quadratic') return [['a',d.a],['b',d.b],['c',d.c]];
  if (state.mode==='hyperbola') return [['k',d.k],['a',d.a],['f(x₀)',d.probeY]];
  if (state.mode==='intersections') return [['f(x₀)',d.fProbe],['g(x₀)',d.gProbe],['f−g',d.diffProbe]];
  return [['h',state.config.h],['v',state.config.v],['g(x₀)',d.transformedY]];
}

function controlsFor(mode=state.mode, config=state.config) {
  const range=(key,label,value,min,max,step)=>({type:'range',key,label,value,min,max,step});
  if(mode==='line') return [range('p1.x','A: x',config.p1.x,-6,6,.25),range('p1.y','A: y',config.p1.y,-7,8,.25),range('p2.x','B: x',config.p2.x,-6,6,.25),range('p2.y','B: y',config.p2.y,-7,8,.25),range('probeX','Пробник x₀',config.probeX,-6,6,.25)];
  if(mode==='quadratic') return [range('a','Коэффициент a',config.a,-3,3,.1),range('p1.x','A: x',config.p1.x,-5,5,.25),range('p1.y','A: y',config.p1.y,-7,8,.25),range('p2.x','B: x',config.p2.x,-5,5,.25),range('p2.y','B: y',config.p2.y,-7,8,.25),range('probeX','Пробник x₀',config.probeX,-6,6,.25)];
  if(mode==='hyperbola') return [range('p1.x','A: x',config.p1.x,-6,6,.25),range('p1.y','A: y',config.p1.y,-7,8,.25),range('p2.x','B: x',config.p2.x,-6,6,.25),range('p2.y','B: y',config.p2.y,-7,8,.25),range('probeX','Пробник x₀',config.probeX,-6,6,.25)];
  if(mode==='intersections') {
    const base=[{type:'select',key:'family',label:'Пара графиков',value:config.family,options:[['line-line','прямая + прямая'],['line-parabola','прямая + парабола'],['line-hyperbola','прямая + гипербола']]},range('line.k','f: коэффициент k',config.line.k,-4,4,.1),range('line.b','f: свободный b',config.line.b,-6,7,.1),range('probeX','Пробник x₀',config.probeX,-6,6,.25)];
    if(config.family==='line-line') base.push(range('other.k','g: коэффициент k',config.other.k,-4,4,.1),range('other.b','g: свободный b',config.other.b,-6,7,.1));
    if(config.family==='line-parabola') base.push(range('other.a','g: a',config.other.a,-3,3,.1),range('other.b','g: b',config.other.b,-5,5,.1),range('other.c','g: c',config.other.c,-6,7,.1));
    if(config.family==='line-hyperbola') base.push(range('other.k','g: k',config.other.k,-8,8,.25),range('other.a','g: сдвиг a',config.other.a,-5,5,.25));
    return base;
  }
  return [{type:'select',key:'base',label:'Базовый график',value:config.base,options:Object.entries(BASE_FUNCTIONS).map(([k,v])=>[k,v.label])},range('h','Горизонтальный сдвиг h',config.h,-5,5,.25),range('v','Вертикальный сдвиг v',config.v,-5,5,.25),range('probeX','Пробник x₀',config.probeX,-6,6,.25)];
}
function getByPath(obj,path){return path.split('.').reduce((o,k)=>o?.[k],obj)}
function setByPath(obj,path,value){const parts=path.split('.');let target=obj;for(let i=0;i<parts.length-1;i++)target=target[parts[i]];target[parts.at(-1)]=value}
function normalizedValue(key,value){
  if(state.mode==='hyperbola' && (key==='p1.x'||key==='p2.x'||key==='probeX') && Math.abs(value)<.25) return value<0?-.25:.25;
  if(state.mode==='quadratic' && key==='a' && Math.abs(value)<.1) return value<0?-.1:.1;
  return value;
}
function changeControl(key, raw, commit=false) {
  if(key==='family') {
    const family=raw; state.config.family=family;
    if(family==='line-line') state.config.other={k:-1,b:2};
    if(family==='line-parabola') state.config.other={a:1,b:0,c:-2};
    if(family==='line-hyperbola') state.config.other={k:2,a:0};
  } else if(key==='base') state.config.base=raw;
  else setByPath(state.config,key,normalizedValue(key,Number(raw)));
  enforceConfigConstraints(key); markCustom(); if(commit) commitHistory(); scheduleRender();
}
function enforceConfigConstraints(changedKey='') {
  if(state.mode==='line'||state.mode==='quadratic') {
    const p1=state.config.p1,p2=state.config.p2;
    if(Math.abs(p2.x-p1.x)<.25){ if(changedKey.startsWith('p1'))p1.x=p2.x-(p1.x<=p2.x?.25:-.25); else p2.x=p1.x+(p2.x>=p1.x?.25:-.25); setStatus('Ограничение: узловые точки должны иметь разные абсциссы.','warn'); }
  }
  if(state.mode==='hyperbola') {
    ['p1','p2'].forEach(k=>{if(Math.abs(state.config[k].x)<.25)state.config[k].x=state.config[k].x<0?-.25:.25});
    if(Math.abs(state.config.p1.x-state.config.p2.x)<.25){state.config.p2.x=state.config.p1.x+(state.config.p2.x>=state.config.p1.x?.25:-.25);setStatus('Точки гиперболы должны иметь разные допустимые x.','warn')}
    if(Math.abs(state.config.probeX)<.25)state.config.probeX=state.config.probeX<0?-.25:.25;
  }
  if(state.mode==='intersections'&&state.config.family==='line-parabola'&&Math.abs(state.config.other.a)<.1)state.config.other.a=state.config.other.a<0?-.1:.1;
}

