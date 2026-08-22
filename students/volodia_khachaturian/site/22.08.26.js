(()=>{'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const get=(k,d)=>{try{return localStorage.getItem(k)||d}catch(e){return d}},set=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
const T=[
['Автомобиль проехал 120 км за 2 часа. Можно ли считать автомобиль материальной точкой?','Сравните размеры автомобиля с расстоянием.',['Вспомните определение материальной точки.','Размеры автомобиля малы по сравнению со 120 км.','Модель материальной точки применима.'],'Можно считать при несущественности размеров.'],
['x₁=5 м → x₂=18 м. Найдите путь и модуль перемещения.','Движение без разворота.',['18−5=13 м.','Путь 13 м.','Перемещение 13 м.'],'13 м; 13 м.'],
['300 м вперёд и 100 м назад.','Путь складывает участки.',['Путь 300+100=400 м.','Финиш в 200 м от старта.','Перемещение 200 м.'],'400 м; 200 м.'],
['Полный оборот вокруг парка R=20 м.','Старт и финиш совпадают.',['Путь 2πR=40π м.','Перемещение 0.'],'40π м; 0.'],
['Квадрат со стороной 5 м: A→B→C.','Перемещение — диагональ.',['Путь 5+5=10 м.','По Пифагору s=5√2 м.'],'10 м; 5√2 м.'],
['Половина окружности R=3 м.','Перемещение — диаметр.',['Путь πR=3π м.','Перемещение 2R=6 м.'],'3π м; 6 м.'],
['Два тела достигли высот 15 м и 25 м. На сколько отличаются пути?','В ответах пособия учитывается подъём и возврат.',['Первое: 30 м.','Второе: 50 м.','Разность 20 м.'],'20 м.'],
['Четверть окружности d=8 м.','Используйте L=πd.',['Вся окружность 8π м.','Четверть 2π м.'],'2π м.'],
['xA=2 м → xB=10 м → xC=6 м.','Путь — оба участка; перемещение A→C.',['AB=8 м, BC=4 м.','Путь 12 м.','Перемещение 4 м.'],'12 м; 4 м.'],
['Перпендикулярные участки 6 м и 8 м.','Перемещение — гипотенуза.',['s²=36+64=100.','s=10 м.'],'10 м.']];
$('#tasks').innerHTML=T.map((t,i)=>`<article class="card"><div class="ey">Задача ${i+1}</div><h3>${t[0]}</h3><div class="idea"><b>Смысл условия</b><p>${t[1]}</p></div><div class="steps">${t[2].map((x,j)=>`<div class="step"><b>Шаг ${j+1}.</b> ${x}</div>`).join('')}</div><div class="actions"><button data-prev>← Назад</button><button data-next>Следующий шаг</button><button data-all>Показать всё</button><button data-hide>Скрыть</button></div><p class="answer">Ответ: ${t[3]}</p></article>`).join('');
$$('#tasks>.card').forEach((c,i)=>{let n=+get('v22-step-'+i,'0'),a=[...c.querySelectorAll('.step')],d=(all=false)=>{a.forEach((x,j)=>x.classList.toggle('show',all||j<n));set('v22-step-'+i,n)};c.querySelector('[data-next]').onclick=()=>{n=Math.min(a.length,n+1);d()};c.querySelector('[data-prev]').onclick=()=>{n=Math.max(0,n-1);d()};c.querySelector('[data-all]').onclick=()=>{n=a.length;d(true)};c.querySelector('[data-hide]').onclick=()=>{n=0;d()};d()});
$$('.tab').forEach((b,i,a)=>{b.onclick=()=>{a.forEach(x=>x.setAttribute('aria-selected',x===b?'true':'false'));$$('.panel').forEach(p=>p.classList.toggle('on',p.id===b.dataset.tab));set('v22-tab',b.dataset.tab)};b.onkeydown=e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();a[(i+(e.key==='ArrowRight'?1:-1)+a.length)%a.length].focus()}}});document.querySelector(`.tab[data-tab="${get('v22-tab','theory')}"]`)?.click();
document.documentElement.dataset.theme=get('v22-theme','light');$('#theme').onclick=()=>{const t=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=t;set('v22-theme',t);render()};$('#print').onclick=()=>print();
const Q=[['300 м вперёд и 100 м назад: путь?',['200 м','400 м'],'400 м'],['Полный оборот: перемещение?',['0','2πR'],'0'],['R=3 м, половина окружности: путь?',['6 м','3π м'],'3π м'],['6 м и 8 м: перемещение?',['14 м','10 м'],'10 м']];
function quiz(){ $('#quizbox').innerHTML=Q.map((q,i)=>`<div class="quiz" data-i="${i}"><p>${i+1}. ${q[0]}</p>${q[1].map(x=>`<button>${x}</button>`).join('')}<p class="muted"></p></div>`).join('');$$('.quiz').forEach(q=>q.querySelectorAll('button').forEach(b=>b.onclick=()=>{if(q.dataset.done)return;q.dataset.done='1';const ok=b.textContent===Q[+q.dataset.i][2];b.classList.add(ok?'good':'bad');q.dataset.ok=ok?'1':'0';q.lastElementChild.textContent=ok?'Верно.':'Проверьте соответствующий раздел теории.';score()}));score()}
function score(){const d=$$('.quiz[data-done]');$('#score').textContent=d.length?`Результат: ${d.filter(x=>x.dataset.ok==='1').length} из 4.`:''} quiz();$('#resetQuiz').onclick=quiz;
let cs={};try{cs=JSON.parse(get('v22-checks','{}'))}catch(e){};$$('#checks input').forEach(c=>{c.checked=!!cs[c.value];c.onchange=()=>{cs[c.value]=c.checked;set('v22-checks',JSON.stringify(cs));ready()}});function ready(){const a=$$('#checks input'),p=Math.round(a.filter(x=>x.checked).length/a.length*100);$('#bar').style.width=p+'%';$('#ready').textContent=`Готовность: ${p}%.`}ready();

const NS='http://www.w3.org/2000/svg', W=640,H=440, state={mode:'turn',u:0,playing:false,showTrail:true,showVector:true,showGrid:true,custom:[],customLen:0};let raf=0,lastTime=0,lastFocus=null;
const cfg={
 turn:{name:'Разворот на прямой',max:12,presets:[['Старт',0],['До разворота',.68],['После разворота',.84],['Финиш',1]]},
 circle:{name:'Движение по окружности',max:2*Math.PI*3,presets:[['Старт',0],['¼ круга',.25],['½ круга',.5],['¾ круга',.75],['Полный круг',1]]},
 poly:{name:'Ломаная траектория',max:18,presets:[['A',0],['B',6/18],['C',14/18],['D',1]]},
 custom:{name:'Свободный путь',max:12,presets:[]}
};
function el(tag,attrs={},text=''){const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text)n.textContent=text;return n}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function fmt(v){if(v<.005)return '0 м';return (v<10?v.toFixed(2):v.toFixed(1)).replace('.',',').replace(/,00$/, '').replace(/,0$/, '')+' м'}
function coordToSvg(p){return{x:90+p.x*46,y:360-p.y*46}}
function scenario(u=state.u){
 if(state.mode==='turn'){
   const A={x:2,y:0},B={x:10,y:0},C={x:6,y:0};const ab=8,bc=4,total=12;let p,path;
   if(u<=ab/total){const q=u/(ab/total);p={x:A.x+(B.x-A.x)*q,y:0};path=total*u}else{const q=(u-ab/total)/(bc/total);p={x:B.x+(C.x-B.x)*q,y:0};path=total*u}
   return{start:A,pos:p,path,disp:dist(A,p),base:[A,B,C],unit:'м'};
 }
 if(state.mode==='circle'){
   const R=3,c={x:6,y:4},ang=-Math.PI/2+u*2*Math.PI,start={x:c.x,y:c.y-R},p={x:c.x+R*Math.cos(ang),y:c.y+R*Math.sin(ang)};
   return{start,pos:p,path:R*u*2*Math.PI,disp:dist(start,p),center:c,R,angle:ang};
 }
 if(state.mode==='poly'){
   const pts=[{x:2,y:1},{x:2,y:7},{x:10,y:7},{x:10,y:3}],lens=[6,8,4],total=18,target=u*total;let acc=0,p=pts[0];
   for(let i=0;i<lens.length;i++){if(target<=acc+lens[i]||i===lens.length-1){const q=Math.max(0,Math.min(1,(target-acc)/lens[i]));p={x:pts[i].x+(pts[i+1].x-pts[i].x)*q,y:pts[i].y+(pts[i+1].y-pts[i].y)*q};break}acc+=lens[i]}
   return{start:pts[0],pos:p,path:target,disp:dist(pts[0],p),base:pts};
 }
 if(state.custom.length){const pts=state.custom,start=pts[0],pos=pts[pts.length-1];return{start,pos,path:state.customLen,disp:dist(start,pos),base:pts}}
 return{start:{x:2,y:2},pos:{x:2,y:2},path:0,disp:0,base:[]};
}
function grid(svg){if(!state.showGrid)return;const g=el('g',{'aria-hidden':'true'});for(let x=90;x<=596;x+=46)g.append(el('line',{x1:x,y1:36,x2:x,y2:390,class:'gridline'}));for(let y=38;y<=360;y+=46)g.append(el('line',{x1:68,y1:y,x2:600,y2:y,class:'gridline'}));svg.append(g)}
function arrowDefs(svg){const id='arr-'+svg.id,defs=el('defs');const m=el('marker',{id,viewBox:'0 0 10 10',refX:'8',refY:'5',markerWidth:'7',markerHeight:'7',orient:'auto-start-reverse'});m.append(el('path',{d:'M 0 0 L 10 5 L 0 10 z',fill:'var(--blue)'}));defs.append(m);svg.append(defs);return id}
function polylineD(pts){return pts.map((p,i)=>{const q=coordToSvg(p);return(i?'L':'M')+q.x+' '+q.y}).join(' ')}
function sampledCircle(center,R,u,steps=90){const a=[];for(let i=0;i<=Math.max(1,Math.round(steps*u));i++){const q=(i/steps)*u,ang=-Math.PI/2+q*2*Math.PI;a.push({x:center.x+R*Math.cos(ang),y:center.y+R*Math.sin(ang)})}return a}
function pathUntil(sc){
 if(state.mode==='turn'){const A=sc.base[0],B=sc.base[1],C=sc.base[2];if(state.u<=2/3)return[A,sc.pos];return[A,B,sc.pos]}
 if(state.mode==='circle')return sampledCircle(sc.center,sc.R,state.u);
 if(state.mode==='poly'){const full=sc.base,target=sc.path;let acc=0,out=[full[0]];for(let i=0;i<full.length-1;i++){const len=dist(full[i],full[i+1]);if(target>=acc+len){out.push(full[i+1]);acc+=len}else{out.push(sc.pos);break}}return out}
 return sc.base;
}
function basePath(sc){
 if(state.mode==='turn')return sc.base;
 if(state.mode==='circle'){const arr=[];for(let i=0;i<=100;i++){const a=-Math.PI/2+i/100*2*Math.PI;arr.push({x:sc.center.x+sc.R*Math.cos(a),y:sc.center.y+sc.R*Math.sin(a)})}return arr}
 if(state.mode==='poly')return sc.base;
 return sc.base;
}
function renderSvg(svg){svg.innerHTML='';const marker=arrowDefs(svg);grid(svg);const sc=scenario();
 const base=basePath(sc);if(base.length>1)svg.append(el('path',{d:polylineD(base),class:'trail-base'}));
 if(state.showTrail){const done=pathUntil(sc);if(done.length>1)svg.append(el('path',{d:polylineD(done),class:'trail-done'}));}
 const s=coordToSvg(sc.start),p=coordToSvg(sc.pos);
 if(state.showVector&&sc.disp>.02){svg.append(el('line',{x1:s.x,y1:s.y,x2:p.x,y2:p.y,class:'disp-line','marker-end':'url(#'+marker+')'}));const mx=(s.x+p.x)/2,my=(s.y+p.y)/2-11;svg.append(el('text',{x:mx,y:my,class:'vector-label',fill:'var(--blue)','text-anchor':'middle'},'|s| = '+fmt(sc.disp)))}
 svg.append(el('circle',{cx:s.x,cy:s.y,r:7,class:'start-dot'}));svg.append(el('text',{x:s.x+10,y:s.y+20,class:'svgstrong'},'Старт'));
 if(state.mode==='poly'){sc.base.forEach((pt,i)=>{const q=coordToSvg(pt);svg.append(el('circle',{cx:q.x,cy:q.y,r:6,class:'waypoint'}));svg.append(el('text',{x:q.x+9,y:q.y-9,class:'svgstrong'},String.fromCharCode(65+i)))})}
 if(state.mode==='turn'){const b=coordToSvg(sc.base[1]);svg.append(el('line',{x1:b.x,y1:b.y-38,x2:b.x,y2:b.y+38,stroke:'var(--gold)','stroke-width':2,'stroke-dasharray':'5 5'}));svg.append(el('text',{x:b.x,y:b.y-47,class:'svgstrong','text-anchor':'middle'},'разворот'))}
 if(state.mode==='circle'){const c=coordToSvg(sc.center);svg.append(el('circle',{cx:c.x,cy:c.y,r:5,fill:'var(--m)'}));svg.append(el('line',{x1:c.x,y1:c.y,x2:c.x,y2:c.y+sc.R*46,stroke:'var(--m)','stroke-width':2,'stroke-dasharray':'5 5'}));svg.append(el('text',{x:c.x+12,y:c.y+sc.R*23,class:'svgtext'},'R = 3 м'))}
 if(state.mode==='custom'&&state.custom.length<2)svg.append(el('text',{x:320,y:215,class:'custom-hint'},'Проведите собственную траекторию'));
 svg.append(el('circle',{cx:p.x,cy:p.y,r:14,class:'body-dot',tabindex:'0'}));svg.append(el('text',{x:p.x,y:p.y-23,class:'vector-label',fill:'var(--a)','text-anchor':'middle'},'тело'));svg.append(el('text',{x:594,y:32,class:'svgstrong','text-anchor':'end'},'l = '+fmt(sc.path)+'   |s| = '+fmt(sc.disp)));
 const axY=402;svg.append(el('line',{x1:68,y1:axY,x2:600,y2:axY,class:'axis'}));for(let i=0;i<=11;i+=2){const x=90+i*46;svg.append(el('line',{x1:x,y1:axY-5,x2:x,y2:axY+5,class:'axis'}));svg.append(el('text',{x,y:425,class:'svgtext','text-anchor':'middle'},i+' м'))}
}
function maxScale(sc){return Math.max(cfg[state.mode]?.max||1,sc.path,sc.disp,1)}
function insight(sc){const eps=.04;if(sc.path<eps)return'<strong>Наблюдение.</strong> Тело находится в стартовой точке: путь и перемещение равны нулю.';if(state.mode==='circle'&&state.u>.985)return'<strong>Полный оборот.</strong> Путь накопился до '+fmt(sc.path)+', а тело вернулось к старту, поэтому модуль перемещения стал равен нулю.';if(state.mode==='turn'&&state.u>2/3)return'<strong>После разворота.</strong> Путь продолжает расти, а модуль перемещения уменьшается: тело движется обратно к старту.';if(Math.abs(sc.path-sc.disp)<.04)return'<strong>Совпадение.</strong> Движение идёт по прямой в одном направлении, поэтому путь и модуль перемещения сейчас равны.';return'<strong>Сравнение.</strong> Путь равен '+fmt(sc.path)+', модуль перемещения — '+fmt(sc.disp)+'. Пройденная траектория длиннее прямой от старта до текущей точки.'}
function render(){const sc=scenario();renderSvg($('#model'));renderSvg($('#modelBig'));$('#pathValue').textContent=fmt(sc.path);$('#dispValue').textContent=fmt(sc.disp);$('#deltaValue').textContent=fmt(Math.max(0,sc.path-sc.disp));const max=maxScale(sc);$('#pathBar').style.width=Math.min(100,sc.path/max*100)+'%';$('#dispBar').style.width=Math.min(100,sc.disp/max*100)+'%';$('#pathMini').textContent=fmt(sc.path).replace(' м','');$('#dispMini').textContent=fmt(sc.disp).replace(' м','');$('#motion').value=Math.round(state.u*1000);$('#motion').disabled=state.mode==='custom';$('#play').disabled=state.mode==='custom';$('#insight').innerHTML=insight(sc);$('#modelBadge').textContent=state.mode==='custom'?'Рисуйте маршрут удерживая мышь или палец':cfg[state.mode].name;renderPresets();$('.model-shell')?.classList.toggle('custom-mode',state.mode==='custom')}
function renderPresets(){const box=$('#presets'),arr=cfg[state.mode].presets;box.innerHTML=arr.map(([n,u])=>`<button class="preset ${Math.abs(state.u-u)<.01?'on':''}" data-u="${u}">${n}</button>`).join('');box.querySelectorAll('.preset').forEach(b=>b.onclick=()=>{stop();state.u=+b.dataset.u;render()})}
function setMode(mode){stop();state.mode=mode;state.u=0;if(mode==='custom'){state.custom=[];state.customLen=0}$$('.mode[data-mode]').forEach(b=>b.classList.toggle('on',b.dataset.mode===mode));render()}
$$('.mode[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
$('#motion').oninput=e=>{if(state.mode==='custom')return;stop();state.u=+e.target.value/1000;render()};
function tick(t){if(!state.playing)return;if(!lastTime)lastTime=t;const dt=Math.min(50,t-lastTime);lastTime=t;state.u+=dt/7000;if(state.u>=1){state.u=1;stop()}render();if(state.playing)raf=requestAnimationFrame(tick)}
function play(){if(state.mode==='custom')return;if(state.u>=.999)state.u=0;state.playing=true;$('#play').textContent='❚❚';$('#play').setAttribute('aria-label','Пауза');lastTime=0;raf=requestAnimationFrame(tick)}
function stop(){state.playing=false;cancelAnimationFrame(raf);$('#play').textContent='▶';$('#play').setAttribute('aria-label','Запустить движение');lastTime=0}
$('#play').onclick=()=>state.playing?stop():play();$('#resetMotion').onclick=()=>{stop();state.u=0;if(state.mode==='custom'){state.custom=[];state.customLen=0}render()};
$('#trailToggle').onclick=e=>{state.showTrail=!state.showTrail;e.currentTarget.setAttribute('aria-pressed',String(state.showTrail));render()};$('#vectorToggle').onclick=e=>{state.showVector=!state.showVector;e.currentTarget.setAttribute('aria-pressed',String(state.showVector));render()};$('#gridToggle').onclick=e=>{state.showGrid=!state.showGrid;e.currentTarget.setAttribute('aria-pressed',String(state.showGrid));render()};
function svgPoint(svg,e){const r=svg.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H}}
function worldFromSvg(pt){return{x:(pt.x-90)/46,y:(360-pt.y)/46}}
function nearestProgress(world){if(state.mode==='circle'){const c={x:6,y:4},a=Math.atan2(world.y-c.y,world.x-c.x),start=-Math.PI/2;let d=a-start;while(d<0)d+=2*Math.PI;while(d>2*Math.PI)d-=2*Math.PI;return d/(2*Math.PI)}
 const samples=state.mode==='turn'?scenario(0).base:scenario(0).base;let best={d:Infinity,u:0};for(let i=0;i<=400;i++){const u=i/400,p=scenario(u).pos,d=dist(world,p);if(d<best.d)best={d,u}}return best.u}
let drag=false,customDraw=false;
[$('#model'),$('#modelBig')].forEach(svg=>{svg.addEventListener('pointerdown',e=>{stop();svg.setPointerCapture(e.pointerId);drag=true;const w=worldFromSvg(svgPoint(svg,e));if(state.mode==='custom'){customDraw=true;if(!state.custom.length){state.custom=[w];state.customLen=0}else{const prev=state.custom[state.custom.length-1];state.customLen+=dist(prev,w);state.custom.push(w)}state.u=1;render()}else{state.u=nearestProgress(w);render()}});svg.addEventListener('pointermove',e=>{if(!drag)return;const w=worldFromSvg(svgPoint(svg,e));if(state.mode==='custom'){const last=state.custom[state.custom.length-1];if(!last||dist(last,w)>.08){if(last)state.customLen+=dist(last,w);state.custom.push(w);render()}}else{state.u=nearestProgress(w);render()}});svg.addEventListener('pointerup',()=>{drag=false;customDraw=false});svg.addEventListener('pointercancel',()=>{drag=false;customDraw=false});});
function open(id,source){lastFocus=source;$('#'+id).classList.add('show');$('#'+id+' .close').focus();render()}function close(id){$('#'+id).classList.remove('show');lastFocus?.focus()}$$('[data-close]').forEach(b=>b.onclick=()=>close(b.dataset.close));$('#openLab').onclick=()=>open('labModal',$('#openLab'));$('#poster').onclick=()=>open('imgModal',$('#poster'));$$('.modal').forEach(m=>m.onclick=e=>{if(e.target===m)close(m.id)});document.addEventListener('keydown',e=>{if(e.key==='Escape')$$('.modal.show').forEach(m=>close(m.id));if(e.key===' '&&e.target.id==='model'){e.preventDefault();state.playing?stop():play()}});
render();
})();