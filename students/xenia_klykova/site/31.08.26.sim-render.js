'use strict';
function project(P,camera=state.camera){
 const ya=rad(camera.yaw),pi=rad(camera.pitch),cy=Math.cos(ya),sy=Math.sin(ya),cp=Math.cos(pi),sp=Math.sin(pi);
 const x1=cy*P.x-sy*P.y,y1=sy*P.x+cy*P.y,z1=P.z;
 const y2=cp*y1-sp*z1,z2=sp*y1+cp*z1,scale=78*camera.zoom;
 return{x:310+x1*scale,y:225-y2*scale,depth:z2}
}
function screenDeltaToWorld(dx,dy){
 const ya=rad(state.camera.yaw),pi=rad(state.camera.pitch),cy=Math.cos(ya),sy=Math.sin(ya),cp=Math.max(.25,Math.cos(pi)),scale=78*state.camera.zoom;
 const dx1=dx/scale,dy1=(-dy/scale)/cp;
 return{x:cy*dx1+sy*dy1,y:-sy*dx1+cy*dy1}
}
function planePolygon(plane,size=2.8){return[add(add(plane.origin,mul(plane.u,-size)),mul(plane.v,-size)),add(add(plane.origin,mul(plane.u,size)),mul(plane.v,-size)),add(add(plane.origin,mul(plane.u,size)),mul(plane.v,size)),add(add(plane.origin,mul(plane.u,-size)),mul(plane.v,size))]}
function svgPoints(points){return points.map(P=>{const s=project(P);return`${s.x.toFixed(1)},${s.y.toFixed(1)}`}).join(' ')}
function pointSvg(name,P,{ghost=false}={}){
 const s=project(P),sel=state.selected===name&&!ghost,cls=`point${sel?' selected':''}${ghost?' ghost':''}`;
 return`<g data-object="${name}"><circle class="${cls}" data-point="${name}" cx="${s.x}" cy="${s.y}" r="${ghost?5:7}" tabindex="${ghost?-1:0}" role="${ghost?'img':'button'}" aria-label="${ghost?'Снимок точки '+name:'Точка '+name+'. Стрелки перемещают по плоскости, PageUp и PageDown меняют высоту.'}"/><text class="model-label" x="${s.x+10}" y="${s.y-10}">${name}</text></g>`
}
function lineSegment(P,Q,extend=3.5){const d=unit(sub(Q,P)),mid=mul(add(P,Q),.5);return[add(mid,mul(d,-extend)),add(mid,mul(d,extend))]}
function planeSvg(plane,cls='plane-shape',label=''){const poly=planePolygon(plane),center=project(plane.origin),labelSvg=label?`<text class="model-label" x="${center.x+90}" y="${center.y-65}">${label}</text>`:'';return`<polygon class="${cls}" data-layer="${cls.includes('beta')?'beta':cls.includes('derived')?'derived':'alpha'}" points="${svgPoints(poly)}"/>${labelSvg}`}
function gridSvg(){
 let out='';for(let i=-3;i<=3;i++){const [a,b]=[project(v(-3,i,0)),project(v(3,i,0))];out+=`<line class="scene-grid" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;const [c,d]=[project(v(i,-3,0)),project(v(i,3,0))];out+=`<line class="scene-grid" x1="${c.x}" y1="${c.y}" x2="${d.x}" y2="${d.y}"/>`}return out
}
function axesSvg(){let out='';for(const [axis,end,label] of [['x',v(3.3,0,0),'x'],['y',v(0,3.3,0),'y'],['z',v(0,0,2.7),'z']]){const a=project(v(0,0,0)),b=project(end);out+=`<line class="axis-line" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/><text class="model-note" x="${b.x+4}" y="${b.y-4}">${label}</text>`}return out}
function sceneMarkup(snap=null,ghost=false){
 const local=snap?{...state,scene:snap.scene,data:snap.data,camera:state.camera,selected:null}:state,d=local.data,p=d.points,A=p.A,B=p.B,C=p.C;
 let out=ghost?'':gridSvg()+axesSvg();
 const alpha={origin:v(0,0,0),u:v(1,0,0),v:v(0,1,0),n:v(0,0,1)};
 if(local.scene==='unique'){
   const pl=triangleArea(A,B,C)<COLLINEAR_TOL?null:derivedPlane(A,B,C);if(pl)out+=planeSvg(pl,ghost?'plane-shape ghost':'plane-shape derived',ghost?'':'(ABC)');
   const [L1,L2]=lineSegment(A,B);out+=`<line class="geom-line${ghost?' ghost':''}" data-layer="line" x1="${project(L1).x}" y1="${project(L1).y}" x2="${project(L2).x}" y2="${project(L2).y}"/>`;
   out+=pointSvg('A',A,{ghost})+pointSvg('B',B,{ghost})+pointSvg('C',C,{ghost});
 }else if(local.scene==='pencil'){
   const pl=pencilPlane(A,B,rad(d.pencilAngle));out+=planeSvg(pl,ghost?'plane-shape ghost':'plane-shape derived',ghost?'':'γ');
   const [L1,L2]=lineSegment(A,B);out+=`<line class="geom-line hot${ghost?' ghost':''}" data-layer="line" x1="${project(L1).x}" y1="${project(L1).y}" x2="${project(L2).x}" y2="${project(L2).y}"/>`;
   out+=pointSvg('A',A,{ghost})+pointSvg('B',B,{ghost})+pointSvg('C',C,{ghost});
 }else if(local.scene==='axiom2'){
   out+=planeSvg(alpha,ghost?'plane-shape ghost':'plane-shape','α');const [L1,L2]=lineSegment(A,B);out+=`<line class="geom-line${ghost?' ghost':''}" data-layer="line" x1="${project(L1).x}" y1="${project(L1).y}" x2="${project(L2).x}" y2="${project(L2).y}"/>`;out+=pointSvg('A',A,{ghost})+pointSvg('B',B,{ghost});
 }else if(local.scene==='linePlane'){
   out+=planeSvg(alpha,ghost?'plane-shape ghost':'plane-shape','α');const P=d.line.P,Q=d.line.Q,[L1,L2]=lineSegment(P,Q,4.3),rel=linePlaneAlpha(P,Q);out+=`<line class="geom-line${ghost?' ghost':''}" data-layer="line" x1="${project(L1).x}" y1="${project(L1).y}" x2="${project(L2).x}" y2="${project(L2).y}"/>`;out+=pointSvg('P',P,{ghost})+pointSvg('Q',Q,{ghost});if(rel.point&&!ghost){const I=project(rel.point);out+=`<circle class="point" cx="${I.x}" cy="${I.y}" r="6"/><text class="model-label" x="${I.x+9}" y="${I.y-8}">I</text>`}
 }else if(local.scene==='planes'){
   const beta=betaPlane(rad(d.beta.angle),d.beta.offset),rel=planePlaneAlphaBeta(rad(d.beta.angle),d.beta.offset);out+=planeSvg(alpha,ghost?'plane-shape ghost':'plane-shape','α')+planeSvg(beta,ghost?'plane-shape ghost':'plane-shape beta','β');if(rel.type==='intersect'&&!ghost){const y=clamp(rel.lineY,-3.2,3.2),L1=project(v(-3.3,y,0)),L2=project(v(3.3,y,0));out+=`<line class="geom-line intersection" data-layer="intersection" x1="${L1.x}" y1="${L1.y}" x2="${L2.x}" y2="${L2.y}"/>`}
 }else{
   const pl=derivedPlane(A,B,C),beta=betaPlane(rad(d.beta.angle),d.beta.offset);out+=planeSvg(alpha,ghost?'plane-shape ghost':'plane-shape','α');if(pl)out+=planeSvg(pl,ghost?'plane-shape ghost':'plane-shape derived',ghost?'':'(ABC)');out+=planeSvg(beta,ghost?'plane-shape ghost':'plane-shape beta',ghost?'':'β');const [L1,L2]=lineSegment(d.line.P,d.line.Q,4);out+=`<line class="geom-line${ghost?' ghost':''}" data-layer="line" x1="${project(L1).x}" y1="${project(L1).y}" x2="${project(L2).x}" y2="${project(L2).y}"/>`;out+=pointSvg('A',A,{ghost})+pointSvg('B',B,{ghost})+pointSvg('C',C,{ghost})+pointSvg('P',d.line.P,{ghost})+pointSvg('Q',d.line.Q,{ghost});
 }
 return out
}
function renderSvg(svg){
 if(!svg)return;let ghost='';const source=state.ghost&&(snapshots.A||snapshots.B);if(source&&source.scene===state.scene)ghost=sceneMarkup(source,true);
 svg.innerHTML=`<g>${ghost}${sceneMarkup()}</g>`;bindSvg(svg);applyHighlight(svg)
}
function applyHighlight(svg){if(!state.highlight)return;svg.querySelectorAll('[data-layer]').forEach(el=>{el.style.opacity=el.dataset.layer===state.highlight?'1':'.16'})}
function bindSvg(svg){
 if(svg.dataset.bound!=='1'){
  svg.dataset.bound='1';
  svg.addEventListener('pointerdown',onPointerDown);svg.addEventListener('pointermove',onPointerMove);svg.addEventListener('pointerup',onPointerUp);svg.addEventListener('pointercancel',onPointerUp);svg.addEventListener('keydown',onSvgKeyDown);
  svg.addEventListener('wheel',e=>{e.preventDefault();const before=snapshotState();state.camera.zoom=clamp(state.camera.zoom*(e.deltaY<0?1.08:.92),.7,1.7);commit(before);scheduleRender()},{passive:false});
 }
}
function pointerName(target){return target?.getAttribute?.('data-point')}
function onPointerDown(e){const name=pointerName(e.target),svg=e.currentTarget;svg.setPointerCapture?.(e.pointerId);svg.classList.add('dragging');drag={type:name?'point':'camera',name,startX:e.clientX,startY:e.clientY,lastX:e.clientX,lastY:e.clientY,before:snapshotState()};if(name){state.selected=name;scheduleRender()}}
function onPointerMove(e){if(!drag)return;const dx=e.clientX-drag.lastX,dy=e.clientY-drag.lastY;drag.lastX=e.clientX;drag.lastY=e.clientY;if(drag.type==='camera'){state.camera.yaw=clamp(state.camera.yaw+dx*.45,-180,180);state.camera.pitch=clamp(state.camera.pitch-dy*.32,-10,75)}else{const delta=screenDeltaToWorld(dx,dy),target=selectedPoint();if(target){target.x=clamp(target.x+delta.x,-3.2,3.2);target.y=clamp(target.y+delta.y,-3.2,3.2)}}scheduleRender()}
function onPointerUp(e){if(!drag)return;e.currentTarget.classList.remove('dragging');commit(drag.before);drag=null;scheduleRender()}
function onSvgKeyDown(e){const name=pointerName(e.target);if(!name)return;if(e.key==='Enter'||e.key===' '){e.preventDefault();state.selected=name;scheduleRender();return}const map={ArrowLeft:['x',-.1],ArrowRight:['x',.1],ArrowUp:['y',.1],ArrowDown:['y',-.1],PageUp:['z',.1],PageDown:['z',-.1]};if(!map[e.key])return;e.preventDefault();state.selected=name;const [axis,delta]=map[e.key];transact(()=>{const P=selectedPoint();P[axis]=clamp(P[axis]+delta,-3.2,3.2)})}

function renderMetrics(){
 const m=sceneMetrics(),els=[q('#metric1'),q('#metric2'),q('#metric3'),q('#metric4')],set=(i,label,value,tone='')=>{q(`#metric${i}Label`).textContent=label;q(`#metric${i}Value`).textContent=value;els[i-1].dataset.tone=tone};
 if(state.scene==='unique'||state.scene==='pencil'||state.scene==='sandbox'){set(1,'h(C,AB)',fmt(m.h),'');set(2,'S△ABC',fmt(m.area),'');set(3,'|AB|',fmt(m.ab),'');set(4,'Плоскостей',m.planeCount,m.collinear?'warn':'good')}
 else if(state.scene==='axiom2'){set(1,'A ∈ α',m.aIn?'да':'нет',m.aIn?'good':'warn');set(2,'B ∈ α',m.bIn?'да':'нет',m.bIn?'good':'warn');set(3,'Прямая AB',relationLabel(m.relation),m.relation==='contained'?'good':'warn');set(4,'Аксиома 2',m.aIn&&m.bIn?'условие выполнено':'условие нарушено',m.aIn&&m.bIn?'good':'warn')}
 else if(state.scene==='linePlane'){set(1,'z(P)',fmt(m.zP),'');set(2,'z(Q)',fmt(m.zQ),'');set(3,'Положение',relationLabel(m.relation),m.relation==='intersect'?'good':'');set(4,'t пересечения',m.t===null?'—':fmt(m.t),'')}
 else if(state.scene==='planes'){set(1,'θ',`${fmt(m.angle,1)}°`,'');set(2,'смещение d',fmt(m.offset),'');set(3,'α и β',relationLabel(m.relation),m.relation==='intersect'?'good':'warn');set(4,'линия y',m.lineY===null?'—':fmt(m.lineY),'')}
}
function renderEducation(){
 const e=education[state.scene],m=sceneMetrics();q('#causeText').textContent=e.cause;q('#calcText').textContent=e.calc;q('#resultText').textContent=e.result;q('#liveFormula').textContent=e.formula;
 const discover=discoveryMessage();q('#modelStatus').textContent=discover||e.status;q('#modelStatus').classList.toggle('discovery',Boolean(discover));if(discover)discoverySeen.add(`${state.scene}:${discover}`);
 q('#challengePrompt').textContent=e.challenge;q('#challengeState').textContent=challengePassed()?'✓ Выполнено. Сформулируйте закономерность своими словами.':'Условие пока не выполнено.';
 q('#predictionPrompt').textContent=e.prediction;const box=q('#predictionOptions');if(box.dataset.scene!==state.scene){box.dataset.scene=state.scene;predictionChoice=null;q('#predictionFeedback').textContent='';box.innerHTML=e.options.map(([id,label])=>`<button class="predict-btn" type="button" data-predict="${id}">${label}</button>`).join('');box.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{predictionChoice=b.dataset.predict;box.querySelectorAll('button').forEach(x=>x.classList.toggle('chosen',x===b));q('#predictionFeedback').textContent='Прогноз сохранён. Запустите эксперимент или измените модель.'}))}
 if(predictionChoice&&isPredictionResolved(m)){q('#predictionFeedback').textContent=predictionChoice===e.correct?'✓ Прогноз подтвердился. Теперь объясните причину через условие аксиомы.':'Результат отличается от прогноза. Сравните изменившийся параметр и итоговый статус.'}
}
function isPredictionResolved(m){if(state.scene==='unique')return m.h<.08;if(state.scene==='pencil')return state.timeline>.7;if(state.scene==='axiom2')return Math.abs(state.data.points.B.z)>.4;if(state.scene==='linePlane')return m.relation==='parallel';if(state.scene==='planes')return m.relation==='coincident';if(state.scene==='sandbox')return m.area>.2&&Math.abs(state.data.points.C.z)>.5;return false}
function selectedNameAllowed(){if(state.scene==='linePlane')return['P','Q'];if(state.scene==='planes')return[];if(state.scene==='pencil')return['A','B','C'];if(state.scene==='axiom2')return['A','B'];return state.scene==='sandbox'?['A','B','C','P','Q']:['A','B','C']}
function ensureSelected(){const allowed=selectedNameAllowed();if(!allowed.includes(state.selected))state.selected=allowed[0]||'C'}
function renderControls(){
 ensureSelected();const pt=selectedPoint(),z=q('#pointZ');const allowed=selectedNameAllowed().length>0;z.disabled=!allowed;q('#nudgeDown').disabled=!allowed;q('#nudgeUp').disabled=!allowed;q('#snapPlane').disabled=!allowed;q('#snapLine').disabled=!allowed;
 q('#selectedPointLabel').textContent=allowed?`Высота ${state.selected}`:'Высота точки';z.value=pt?Math.round(pt.z*100):0;q('#pointZValue').value=pt?fmt(pt.z):'—';
 q('#yaw').value=state.camera.yaw;q('#pitch').value=state.camera.pitch;q('#zoom').value=Math.round(state.camera.zoom*100);q('#yawOut').value=`${Math.round(state.camera.yaw)}°`;q('#pitchOut').value=`${Math.round(state.camera.pitch)}°`;q('#zoomOutValue').value=`${Math.round(state.camera.zoom*100)}%`;
 const sp=q('#sceneParam'),lab=q('#sceneParamLabel'),out=q('#sceneParamOut'),sp2=q('#secondaryParam'),lab2=q('#secondaryParamLabel'),out2=q('#secondaryParamOut');
 if(state.scene==='pencil'){lab.firstChild.textContent='Угол плоскости γ ';sp.min=0;sp.max=180;sp.step=1;sp.value=state.data.pencilAngle;out.value=`${Math.round(state.data.pencilAngle)}°`;lab2.firstChild.textContent='Точность коллинеарности ';sp2.disabled=true;out2.value='фикс.'}
 else if(state.scene==='planes'){lab.firstChild.textContent='Угол β ';sp.min=0;sp.max=90;sp.step=1;sp.value=state.data.beta.angle;out.value=`${Math.round(state.data.beta.angle)}°`;lab2.firstChild.textContent='Смещение β ';sp2.disabled=false;sp2.min=-200;sp2.max=200;sp2.step=5;sp2.value=Math.round(state.data.beta.offset*100);out2.value=fmt(state.data.beta.offset)}
 else if(state.scene==='sandbox'){lab.firstChild.textContent='Смещение β ';sp.min=-200;sp.max=200;sp.step=5;sp.value=Math.round(state.data.beta.offset*100);out.value=fmt(state.data.beta.offset);lab2.firstChild.textContent='Угол β ';sp2.disabled=false;sp2.min=0;sp2.max=90;sp2.step=1;sp2.value=state.data.beta.angle;out2.value=`${Math.round(state.data.beta.angle)}°`}
 else{lab.firstChild.textContent='Параметр сценария ';sp.min=0;sp.max=100;sp.step=1;sp.value=Math.round(state.timeline*100);out.value=`${Math.round(state.timeline*100)}%`;lab2.firstChild.textContent='Доп. параметр ';sp2.disabled=true;out2.value='—'}
 q('#undoBtn').disabled=!undoStack.length;q('#redoBtn').disabled=!redoStack.length;q('#timeline').value=Math.round(state.timeline*100);q('#playBtn').textContent=state.playing?'❚❚ Пауза':'▶ Эксперимент';q('#ghostToggle').setAttribute('aria-pressed',String(state.ghost));
}
function renderChart(){
 const svg=q('#relationChart'),m=sceneMetrics();let body=`<line class="chart-axis" x1="42" y1="135" x2="475" y2="135"/><line class="chart-axis" x1="42" y1="135" x2="42" y2="20"/>`;
 if(state.scene==='unique'||state.scene==='pencil'||state.scene==='sandbox'){const maxH=3,maxA=Math.max(1,sceneMetrics().ab*maxH/2),x=h=>42+clamp(h/maxH,0,1)*410,y=a=>135-clamp(a/maxA,0,1)*105;body+=`<path class="chart-line" d="M ${x(0)} ${y(0)} L ${x(maxH)} ${y(sceneMetrics().ab*maxH/2)}"/><circle class="chart-dot" cx="${x(m.h)}" cy="${y(m.area)}" r="6"/><text class="chart-label" x="300" y="158">h(C,AB)</text><text class="chart-label" x="47" y="18">S△ABC</text><text class="chart-label" x="${x(m.h)+8}" y="${y(m.area)-8}">h=${fmt(m.h)}, S=${fmt(m.area)}</text>`}
 else if(state.scene==='axiom2'){const a=m.aIn?1:0,b=m.bIn?1:0;body+=barSvg('A∈α',a,38)+barSvg('B∈α',b,82)+barSvg('AB⊂α',m.relation==='contained'?1:0,126)}
 else if(state.scene==='linePlane'){const y0=82,scale=38;body+=`<line class="chart-axis" x1="42" y1="${y0}" x2="475" y2="${y0}"/><circle class="chart-dot" cx="180" cy="${y0-m.zP*scale}" r="6"/><circle class="chart-dot" cx="355" cy="${y0-m.zQ*scale}" r="6"/><text class="chart-label" x="170" y="155">P</text><text class="chart-label" x="345" y="155">Q</text><text class="chart-label" x="50" y="${y0-5}">α: z=0</text>`}
 else{const x=42+clamp(m.angle/90,0,1)*410;body+=`<path class="chart-line" d="M42 120 L475 25"/><circle class="chart-dot" cx="${x}" cy="${120-(x-42)/433*95}" r="6"/><text class="chart-label" x="250" y="158">угол θ между α и β</text><text class="chart-label" x="${x-15}" y="18">${fmt(m.angle,1)}°</text>`}
 svg.innerHTML=body
}
function barSvg(label,value,y){const width=300*value;return`<text class="chart-label" x="45" y="${y-7}">${label}</text><rect x="155" y="${y-21}" width="300" height="14" rx="7" fill="var(--line)"/><rect x="155" y="${y-21}" width="${width}" height="14" rx="7" fill="var(--accent)"/><text class="chart-label" x="462" y="${y-9}" text-anchor="end">${value?'да':'нет'}</text>`}
function renderCompare(){
 const body=q('#compareBody');if(!snapshots.A||!snapshots.B||snapshots.A.scene!==snapshots.B.scene){body.innerHTML='<tr><td colspan="4">Сохраните два снимка одного сценария.</td></tr>';return}
 const a=sceneMetrics({...state,...snapshots.A}),b=sceneMetrics({...state,...snapshots.B});let rows=[];
 if(['unique','pencil','sandbox'].includes(snapshots.A.scene))rows=[['h(C,AB)',a.h,b.h],['S△ABC',a.area,b.area],['|AB|',a.ab,b.ab]];
 else if(snapshots.A.scene==='axiom2')rows=[['A∈α',a.aIn?1:0,b.aIn?1:0],['B∈α',a.bIn?1:0,b.bIn?1:0],['AB⊂α',a.relation==='contained'?1:0,b.relation==='contained'?1:0]];
 else if(snapshots.A.scene==='linePlane')rows=[['z(P)',a.zP,b.zP],['z(Q)',a.zQ,b.zQ]];
 else rows=[['θ',a.angle,b.angle],['d',a.offset,b.offset]];
 body.innerHTML=rows.map(([label,x,y])=>`<tr><td>${label}</td><td>${fmt(x)}</td><td>${fmt(y)}</td><td class="delta">${fmt(y-x)}</td></tr>`).join('')
}
function scheduleRender(){if(!raf)raf=requestAnimationFrame(()=>{raf=0;renderAll()})}
function renderAll(){renderSvg(q('#modelSvg'));renderSvg(q('#modalSvg'));renderMetrics();renderEducation();renderControls();renderChart();renderCompare();syncScenarioButtons()}
function syncScenarioButtons(){qa('.scenario').forEach(b=>b.classList.toggle('on',b.dataset.scene===state.scene));qa('.mode-btn').forEach(b=>b.classList.toggle('on',b.dataset.mode===state.mode))}

function loadScene(name){const before=snapshotState();state.scene=name;state.data=deep(scenarioDefaults[name]);state.timeline=0;state.playing=false;state.selected=name==='linePlane'?'Q':name==='axiom2'?'B':'C';predictionChoice=null;commit(before);scheduleRender()}
function applyTimeline(t){state.timeline=clamp(t,0,1);const d=state.data,base=deep(scenarioDefaults[state.scene]);if(state.scene==='unique'){const A=base.points.A,B=base.points.B,C0=base.points.C,ab=sub(B,A),u=dot(sub(C0,A),ab)/dot(ab,ab),foot=add(A,mul(ab,u));d.points.C=add(mul(C0,1-state.timeline),mul(foot,state.timeline))}
 else if(state.scene==='pencil')d.pencilAngle=10+160*state.timeline;
 else if(state.scene==='axiom2')d.points.B.z=1.8*state.timeline;
 else if(state.scene==='linePlane'){d.line.P.z=1.2;d.line.Q.z=1.2*(state.timeline>.98?1:-1+2*state.timeline)}
 else if(state.scene==='planes'){d.beta.offset=0;d.beta.angle=52*(1-state.timeline)}
 else if(state.scene==='sandbox')d.points.C.z=.2+2*state.timeline;
 scheduleRender()
}
function animationFrame(ts){if(!state.playing)return;const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;if(!lastFrame)lastFrame=ts;const dt=(ts-lastFrame)/1000;lastFrame=ts;const step=(reduce?.08:dt*.22)*state.speed;applyTimeline(state.timeline+step);if(state.timeline>=1){state.playing=false;lastFrame=0;scheduleRender();return}requestAnimationFrame(animationFrame)}
