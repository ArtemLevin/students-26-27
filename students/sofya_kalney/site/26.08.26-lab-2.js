function svgText(x,y,text,cls="",size=18,anchor="middle",extra=""){
  return `<text x="${x}" y="${y}" class="${cls}" font-size="${size}" text-anchor="${anchor}" dominant-baseline="middle" ${extra}>${text}</text>`;
}
function svgLine(x1,y1,x2,y2,cls="grid-stroke",width=2,extra=""){
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}" stroke-width="${width}" stroke-linecap="round" ${extra}/>`;
}
function handle(cx,cy,label,drag,semantic="object"){
  return `<g data-drag="${drag}" data-semantic="${semantic}" tabindex="0" role="slider" aria-label="${label}"><circle cx="${cx}" cy="${cy}" r="13" fill="var(--card)" stroke="var(--gold)" stroke-width="3"/><circle cx="${cx}" cy="${cy}" r="4" fill="var(--gold)"/></g>`;
}
function railX(value,min,max,x1=95,x2=300){return x1+(value-min)/(max-min)*(x2-x1)}
function renderFactorSvg(){
  const d=calcFactor(),F=labState.factor,rows=[['a',F.a],['b',F.b],['c',F.c],['d',F.d]],min=-6,max=8;
  let h=svgText(320,28,"Факторизация как сохранение значения","gold-text",21);
  rows.forEach((row,i)=>{const y=75+i*55,x=railX(row[1],min,max);h+=svgText(42,y,row[0],"",19,'middle',`data-semantic="object"`)+svgLine(80,y,315,y,'grid-stroke',5,`data-semantic="object"`)+svgText(327,y,fmt(row[1]),"gold-text",17,'start',`data-semantic="object"`)+handle(x,y,`${row[0]} = ${row[1]}`,`factor:${row[0]}`)});
  const termMax=Math.max(1,...d.terms.map(v=>Math.abs(v))),baseX=390,barMax=170;
  h+=svgText(480,68,"4 слагаемых","muted-text",15);
  d.terms.forEach((v,i)=>{const y=105+i*38,w=Math.abs(v)/termMax*barMax;h+=`<rect x="${baseX}" y="${y-11}" width="${w}" height="22" rx="6" fill="${v>=0?'var(--accent2)':'var(--bad)'}" opacity=".76" data-semantic="object"/>`+svgText(baseX+w+8,y,fmt(v),v>=0?'good-text':'bad-text',15,'start',`data-semantic="object"`)});
  h+=`<rect x="70" y="320" width="500" height="105" rx="18" fill="var(--card)" stroke="var(--line)" data-semantic="result"/>`;
  h+=svgText(320,345,`a(b+c) − d(b+c) = (${fmt(d.common)})·(${fmt(d.diff)})`,"",18,'middle',`data-semantic="result"`);
  h+=svgText(215,385,`сумма = ${fmt(d.left)}`,"good-text",21,'middle',`data-semantic="result"`)+svgText(425,385,`произведение = ${fmt(d.right)}`,"good-text",21,'middle',`data-semantic="result"`);
  h+=svgText(320,448,d.left===d.right?"✓ значения совпадают":"проверьте вычисления",d.left===d.right?'good-text':'bad-text',16,'middle',`data-semantic="constraint"`);
  return h;
}
function renderIntervalSvg(){
  const I=calcInterval(),data=labState.interval,min=-6,max=6,x1=60,x2=590,X=v=>x1+(v-min)/(max-min)*(x2-x1),y=250;
  let h=svgText(320,28,data.middleKind==="hole"?"Рациональная схема знаков":"Метод интервалов","gold-text",21);
  h+=svgText(320,58,data.middleKind==="hole"?`(x−${fmt(I.roots[0])})(x−${fmt(I.roots[2])}) / (x−${fmt(I.roots[1])})`:`(x−${fmt(I.roots[0])})(x−${fmt(I.roots[1])})${data.middleKind==='double'?'²':''}(x−${fmt(I.roots[2])})`,"muted-text",16);
  I.bands.forEach((b,i)=>{const bx=X(b.from),bw=X(b.to)-bx;h+=`<rect x="${bx}" y="120" width="${bw}" height="72" rx="9" fill="${b.selected?'var(--good)':'var(--card)'}" opacity="${b.selected?'.20':'.66'}" stroke="var(--line)" data-semantic="result"/>`+svgText(bx+bw/2,145,b.sign>=0?'+':'−',b.sign>=0?'good-text':'bad-text',26,'middle',`data-semantic="result"`)+svgText(bx+bw/2,176,b.selected?'берём':'не берём',b.selected?'good-text':'muted-text',13,'middle',`data-semantic="result"`)});
  h+=svgLine(x1,y,x2,y,'',3,`stroke="var(--text)" data-semantic="object"`);
  I.roots.forEach((r,i)=>{const kind=i===1&&data.middleKind==='hole'?'hole':'root';h+=svgLine(X(r),205,X(r),290,'grid-stroke',2,`stroke-dasharray="5 5" data-semantic="constraint"`);if(kind==='hole')h+=`<circle cx="${X(r)}" cy="${y}" r="9" fill="var(--card2)" stroke="var(--bad)" stroke-width="3" data-semantic="constraint"/>`;else h+=`<circle cx="${X(r)}" cy="${y}" r="8" fill="var(--accent2)" stroke="var(--card2)" stroke-width="3" data-semantic="constraint"/>`;h+=svgText(X(r),310,fmt(r),kind==='hole'?'bad-text':'gold-text',15,'middle',`data-semantic="constraint"`)+handle(X(r),y,`критическая точка ${fmt(r)}`,`root:${i}`,kind==='hole'?'constraint':'object')});
  const probeX=X(data.probe);h+=svgLine(probeX,100,probeX,365,'good-stroke',2,`stroke-dasharray="6 5" data-semantic="object"`)+handle(probeX,350,`пробная точка x = ${fmt(data.probe)}`,"probe")+svgText(probeX,385,`x=${fmt(data.probe)}`,"gold-text",15,'middle',`data-semantic="object"`);
  h+=`<rect x="95" y="405" width="450" height="48" rx="13" fill="var(--card)" stroke="${I.probeIn?'var(--good)':'var(--bad)'}" data-semantic="result"/>`+svgText(320,430,I.probeValue===null?"F(x) не определено — точка исключена":`F(x) = ${fmt(I.probeValue,2)} → ${I.probeIn?'принадлежит решению':'не принадлежит решению'}`,I.probeIn?'good-text':'bad-text',16,'middle',`data-semantic="result"`);
  return h;
}
function renderHolesSvg(){
  const H=calcHoles(),D=labState.holes,left=55,right=590,top=58,bottom=350,xmin=-5,xmax=5,ymin=-9,ymax=3,X=x=>left+(x-xmin)/(xmax-xmin)*(right-left),Y=y=>bottom-(y-ymin)/(ymax-ymin)*(bottom-top);
  let h=svgText(320,25,"Сокращение меняет формулу, но не ОДЗ","gold-text",20);
  for(let x=-5;x<=5;x++)h+=svgLine(X(x),top,X(x),bottom,'grid-stroke',1,`opacity=".55"`);
  for(let y=-9;y<=3;y++)h+=svgLine(left,Y(y),right,Y(y),'grid-stroke',1,`opacity=".55"`);
  h+=svgLine(left,Y(0),right,Y(0),'',2,`stroke="var(--text)"`)+svgLine(X(0),top,X(0),bottom,'',2,`stroke="var(--text)"`);
  h+=svgLine(X(xmin),Y(xmin-4),X(xmax),Y(xmax-4),'accent-stroke',4,`data-semantic="result"`);
  [[1,-3],[-2,-6]].forEach(([x,y])=>{if(D.showMistake)h+=`<circle cx="${X(x)}" cy="${Y(y)}" r="10" fill="var(--bad)" opacity=".3" data-semantic="constraint"/>`;h+=`<circle cx="${X(x)}" cy="${Y(y)}" r="9" fill="var(--card2)" stroke="var(--bad)" stroke-width="4" data-semantic="constraint"/>`+svgText(X(x)+13,Y(y)-16,`(${fmt(x)}; ${fmt(y)})`,'bad-text',14,'start',`data-semantic="constraint"`)});
  const yy=Y(D.m);h+=svgLine(left,yy,right,yy,'good-stroke',3,`stroke-dasharray="9 7" data-semantic="object"`)+handle(right-8,yy,`m = ${fmt(D.m)}`,"m")+svgText(right-15,yy-17,`m=${fmt(D.m)}`,'good-text',15,'end',`data-semantic="object"`);
  if(!H.excluded)h+=`<circle cx="${X(H.candidateX)}" cy="${yy}" r="8" fill="var(--good)" stroke="var(--card2)" stroke-width="3" data-semantic="result"/>`;
  h+=`<rect x="75" y="385" width="490" height="62" rx="14" fill="var(--card)" stroke="${H.excluded?'var(--bad)':'var(--good)'}" data-semantic="result"/>`+svgText(320,407,`y=m ⇒ x=m+4=${fmt(H.candidateX)}`,"",16,'middle',`data-semantic="result"`)+svgText(320,430,H.excluded?"но x исключён ОДЗ → 0 пересечений":"x допустим → 1 пересечение",H.excluded?'bad-text':'good-text',16,'middle',`data-semantic="result"`);
  return h;
}
function renderMotionSvg(){
  const M=calcMotion(),D=labState.motion,left=62,right=574,track=right-left,t=clamp(D.playTime,0,M.maxTime),p1=Math.min(1,M.x*t/180),p2=Math.min(1,M.back*t/180);
  let h=svgText(320,26,"Одна дистанция — разные скорости — разные времена","gold-text",20);
  h+=svgText(62,72,`туда: v=${fmt(M.x)} км/ч`,'',16,'start',`data-semantic="object"`)+svgLine(left,110,right,110,'grid-stroke',8,`data-semantic="object"`)+`<circle cx="${left+track*p1}" cy="110" r="12" fill="var(--accent2)" stroke="var(--card2)" stroke-width="3" data-semantic="object"/>`+svgText(578,110,`${fmt(M.tThere,2)} ч`,'good-text',15,'start',`data-semantic="result"`);
  h+=svgText(62,155,`обратно: v=${fmt(M.back)} км/ч`,'',16,'start',`data-semantic="object"`)+svgLine(left,193,right,193,'grid-stroke',8,`data-semantic="object"`)+`<circle cx="${left+track*p2}" cy="193" r="12" fill="var(--good)" stroke="var(--card2)" stroke-width="3" data-semantic="object"/>`+svgText(578,193,`${fmt(M.tBack,2)} ч`,'good-text',15,'start',`data-semantic="result"`);
  h+=svgText(62,230,`общая шкала времени: t=${fmt(t,2)} ч`,'muted-text',14,'start',`data-semantic="object"`);
  const gx1=75,gx2=570,gy1=420,gy2=275,xMin=10,xMax=70,yMax=7,X=x=>gx1+(x-xMin)/(xMax-xMin)*(gx2-gx1),Y=y=>gy1-y/yMax*(gy1-gy2);
  h+=svgLine(gx1,gy1,gx2,gy1,'',2,`stroke="var(--text)"`)+svgLine(gx1,gy1,gx1,gy2,'',2,`stroke="var(--text)"`)+svgText(320,456,"скорость x, км/ч",'muted-text',13)+svgText(45,347,"Δt",'muted-text',13);
  let path="";for(let x=10;x<=70;x+=1){const diff=180/x-180/(x+6);path+=(x===10?'M':'L')+`${X(x).toFixed(2)} ${Y(diff).toFixed(2)} `}h+=`<path d="${path}" fill="none" stroke="var(--accent2)" stroke-width="3" data-semantic="result"/>`;
  h+=svgLine(gx1,Y(1),gx2,Y(1),'bad-stroke',2,`stroke-dasharray="7 6" data-semantic="constraint"`)+svgText(gx2-4,Y(1)-13,"цель: 1 ч",'bad-text',13,'end',`data-semantic="constraint"`);
  h+=`<circle cx="${X(M.x)}" cy="${Y(M.diff)}" r="10" fill="var(--gold)" stroke="var(--card2)" stroke-width="3" data-semantic="result"/>`+handle(X(M.x),Y(M.diff),`скорость ${fmt(M.x)} км/ч`,"speed");
  return h;
}
function renderSvgs(){
  let html=labState.mode==="factor"?renderFactorSvg():labState.mode==="interval"?renderIntervalSvg():labState.mode==="holes"?renderHolesSvg():renderMotionSvg();
  labSvgs.forEach(svg=>{if(!svg)return;svg.innerHTML=html;svg.dataset.highlight=labState.highlight||"";bindSvgInteractions(svg)});
}

function stateItems(){
  if(labState.mode==="factor"){const d=calcFactor();return [["a−d",fmt(d.diff)],["b+c",fmt(d.common)],["сумма",fmt(d.left)],["произведение",fmt(d.right)]]}
  if(labState.mode==="interval"){const d=calcInterval();return [["x-проба",fmt(labState.interval.probe)],["F(x)",d.probeValue===null?'не опр.':fmt(d.probeValue,2)],["знак",d.probeValue===null?'—':signLabel(d.probeValue)],["решение",d.probeIn?'да':'нет']]}
  if(labState.mode==="holes"){const d=calcHoles();return [["m",fmt(labState.holes.m)],["x=m+4",fmt(d.candidateX)],["ОДЗ",d.excluded?'исключено':'допустимо'],["пересечений",String(d.intersections)]]}
  const d=calcMotion();return [["туда",`${fmt(d.x)} км/ч`],["обратно",`${fmt(d.back)} км/ч`],["Δt",`${fmt(d.diff,2)} ч`],["ошибка цели",`${fmt(d.residual,2)} ч`]];
}
function renderStateGrid(){
  const html=stateItems().map(([k,v])=>`<div class="state-chip"><small>${k}</small><b>${v}</b></div>`).join("");$("#labStateGrid").innerHTML=html;$("#modalLabState").innerHTML=html;
}
function renderFormula(){
  let text="";
  if(labState.mode==="factor"){const d=calcFactor();text=`<div class="formula-line">ab + ac − db − dc = (b+c)(a−d) = ${fmt(d.right)}</div>`}
  if(labState.mode==="interval"){const d=labState.interval,[a,b,c]=d.roots;text=`<div class="formula-line">F(x) = ${d.middleKind==='hole'?`(x−${fmt(a)})(x−${fmt(c)})/(x−${fmt(b)})`:`(x−${fmt(a)})(x−${fmt(b)})${d.middleKind==='double'?'²':''}(x−${fmt(c)})`} ${d.relation==='le'?'≤':'≥'} 0</div>`}
  if(labState.mode==="holes")text=`<div class="formula-line">((x−1)(x+2)(x−4))/((x−1)(x+2)) = x−4, &nbsp; x ≠ 1; −2</div>`;
  if(labState.mode==="motion"){const d=calcMotion();text=`<div class="formula-line">180/x − 180/(x+6) = ${fmt(d.diff,2)}; &nbsp; цель = 1</div>`}
  $("#labFormula").innerHTML=text;
}
function renderCause(){
  let text="";
  if(labState.mode==="factor"){const d=calcFactor();text=`<strong>Причина → следствие.</strong> Меняя a или d, вы меняете множитель a−d; меняя b или c — множитель b+c. Их произведение сразу перестраивает значение всего выражения.`}
  if(labState.mode==="interval"){const d=labState.interval;text=`<strong>Причина → следствие.</strong> Критические точки делят ось на интервалы. ${d.middleKind==='double'?'Чётная кратность среднего корня сохраняет знак при переходе.':d.middleKind==='hole'?'Ноль знаменателя делит интервалы, но никогда не включается в ответ.':'У простого корня знак меняется.'}`}
  if(labState.mode==="holes")text=`<strong>Причина → следствие.</strong> m задаёт кандидата x=m+4. Если кандидат равен 1 или −2, сокращённая прямая визуально проходит через точку, которой в исходной функции нет.`;
  if(labState.mode==="motion")text=`<strong>Причина → следствие.</strong> Увеличение x сокращает оба времени. Разность тоже уменьшается: график Δt(x) движется вниз и приближается к нулю.`;
  $("#labCause").innerHTML=text;
}
function renderDiscovery(){
  let msg="";
  if(labState.mode==="factor"){const d=calcFactor();if(Math.abs(d.right)<1e-8)msg=`<b>Момент открытия:</b> выражение стало нулём, потому что ${Math.abs(d.diff)<1e-8?'a−d=0':'b+c=0'}. Один нулевой множитель обнуляет всё произведение.`}
  if(labState.mode==="interval"&&labState.interval.middleKind==="double")msg=`<b>Обратите внимание:</b> по разные стороны от двойного корня знак одинаков. Именно кратность объясняет отсутствие смены знака.`;
  if(labState.mode==="holes"&&calcHoles().excluded)msg=`<b>Интересный случай:</b> формальное решение x=m+4 найдено, но ОДЗ удаляет его. Поэтому пересечений нет.`;
  if(labState.mode==="motion"&&Math.abs(calcMotion().diff-1)<.025)msg=`<b>Цель найдена:</b> при x=30 км/ч времена равны 6 ч и 5 ч, поэтому разность точно 1 ч.`;
  const el=$("#labDiscovery");el.innerHTML=msg;el.classList.toggle("show",Boolean(msg));
}
function setFree(){labState.free=true;$("#labStatus").textContent="Свободный режим: параметры задаёте вы."}
function rangeRow(id,label,min,max,step,value,output,extra=""){
  return `<div class="lab-control-row"><label for="${id}">${label}</label><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" ${extra}><output for="${id}">${output}</output></div>`;
}
