(()=>{
'use strict';
const root=document.documentElement;
const qs=selector=>document.querySelector(selector);
const qsa=selector=>[...document.querySelectorAll(selector)];
const fmt=(x,d=2)=>Number(x).toLocaleString('ru-RU',{minimumFractionDigits:d,maximumFractionDigits:d});
const storeGet=key=>{try{return localStorage.getItem(key);}catch{return null;}};
const storeSet=(key,value)=>{try{localStorage.setItem(key,value);}catch{/* Private browsing remains usable. */}};
const themeKey='volodia-20261112-theme';
const setTheme=theme=>{root.dataset.theme=theme==='dark'?'dark':'light';const t=qs('#themeToggle');t.setAttribute('aria-pressed',String(root.dataset.theme==='dark'));};
setTheme(storeGet(themeKey)||'light');
qs('#themeToggle').addEventListener('click',()=>{const next=root.dataset.theme==='dark'?'light':'dark';setTheme(next);storeSet(themeKey,next);});
qs('#printPage').addEventListener('click',()=>window.print());

const state={angle:30,mu:0.20,mass:2,mode:'down'};
const g=10;
const byId=id=>document.getElementById(id);
const svg=byId('inclineSvg'), svgNS='http://www.w3.org/2000/svg';
const setPath=(id,a,b)=>byId(id).setAttribute('d','M'+a.x.toFixed(2)+' '+a.y.toFixed(2)+'L'+b.x.toFixed(2)+' '+b.y.toFixed(2));
const setText=(id,text,x,y)=>{const node=byId(id);node.textContent=text;node.setAttribute('x',x.toFixed(1));node.setAttribute('y',y.toFixed(1));};
const p=(x,y)=>({x,y});
const add=(o,dx,dy)=>p(o.x+dx,o.y+dy);
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const output=(id,text)=>{byId(id).textContent=text;};
const parameter=()=>{const a=state.angle*Math.PI/180,s=Math.sin(a),c=Math.cos(a),weight=state.mass*g,normal=weight*c,parallel=weight*s,limit=state.mu*normal;return {a,s,c,weight,normal,parallel,limit};};
const updateLab=()=>{
 const t=parameter();
 const uphill=p(t.c,-t.s),downhill=p(-t.c,t.s),normalUnit=p(-t.s,-t.c);
 const origin=p(65,324),length=365,top=add(origin,length*t.c,-length*t.s);
 const center=add(add(origin,.59*length*t.c,-.59*length*t.s),normalUnit.x*29,normalUnit.y*29);
 byId('slopeArea').setAttribute('d','M'+origin.x+' '+origin.y+' L'+top.x.toFixed(2)+' '+top.y.toFixed(2)+' L'+top.x.toFixed(2)+' '+origin.y+' Z');
 byId('block').setAttribute('transform','translate('+center.x.toFixed(1)+' '+center.y.toFixed(1)+') rotate('+(-state.angle)+')');
 setPath('weightArrow',center,add(center,0,108));
 setPath('normalArrow',center,add(center,normalUnit.x*99,normalUnit.y*99));
 const frUnit=state.mode==='up'?downhill:uphill;
 const friction=state.mode==='rest'?Math.min(t.parallel,t.limit):t.limit;
 const showFriction=friction>0.001;
 const frEnd=add(center,frUnit.x*93,frUnit.y*93);
 byId('frictionArrow').style.display=showFriction?'':'none';
 byId('frictionLabel').style.display=showFriction?'':'none';
 setPath('frictionArrow',center,frEnd);
 const moving=state.mode!=='rest',velUnit=state.mode==='up'?uphill:downhill;
 const vEnd=add(center,velUnit.x*125,velUnit.y*125);
 byId('velocityArrow').style.display=moving?'':'none';
 byId('velocityLabel').style.display=moving?'':'none';
 setPath('velocityArrow',center,vEnd);
 setText('weightLabel','mg',clamp(center.x+12,25,505),clamp(center.y+111,25,370));
 const nEnd=add(center,normalUnit.x*99,normalUnit.y*99);
 setText('normalLabel','N',clamp(nEnd.x-12,12,540),clamp(nEnd.y-7,20,365));
 setText('frictionLabel',state.mode==='rest'?'Fтр,п':'Fтр',clamp(frEnd.x+6,14,505),clamp(frEnd.y-11,20,364));
 setText('velocityLabel','v',clamp(vEnd.x+6,12,520),clamp(vEnd.y-5,22,360));
 setText('angleLabel',state.angle+'°',clamp(origin.x+87,75,350),clamp(origin.y-15,40,313));
 const feasible=t.parallel<=t.limit+1e-9, downhillA=g*(t.s-state.mu*t.c),uphillA=-g*(t.s+state.mu*t.c);
 let acceleration=0,direction='Равновесие',explanation='',frictionDescription='';
 let title='';
 if(state.mode==='down'){
  acceleration=downhillA;direction=acceleration>1e-8?'Вниз по склону':acceleration< -1e-8?'Вверх по склону':'Без изменения скорости';
  frictionDescription=state.mu===0?'Гладкая плоскость':'Трение скольжения';
  title='Скользит вниз';
  explanation=acceleration>0?'Проекция тяжести больше силы трения: тело ускоряется при спуске.':acceleration<0?'Трение больше продольной составляющей тяжести: тело замедляется при движении вниз.':'Продольные силы уравновешены: тело скользит с постоянной скоростью.';
 }else if(state.mode==='up'){
  acceleration=uphillA;direction='Вниз по склону (ось x вверх)';
  frictionDescription=state.mu===0?'Гладкая плоскость':'Трение скольжения';
  title='Скользит вверх';
  explanation='Скорость направлена вверх, но и тяжесть, и трение направлены вниз. Ускорение отрицательно в оси, направленной вверх: тело замедляется.';
 }else{
  title=feasible?'Брусок покоится':'Покой невозможен';
  frictionDescription=feasible?'Фактическое трение покоя':'Предел трения покоя';
  direction=feasible?'Равно 0':'Равновесие невозможно';
  explanation=feasible?'Трение покоя равно mg sin α и не превышает μN: равновесие возможно. Оно НЕ обязано равняться μN.':'Для равновесия нужно '+fmt(t.parallel)+' Н трения, но максимум составляет '+fmt(t.limit)+' Н. Брусок не может оставаться в покое при этих параметрах.';
 }
 output('modeTitle',title);output('angleOutput',state.angle+'°');output('muOutput',fmt(state.mu));output('massOutput',fmt(state.mass,1)+' кг');
 output('parallelValue',fmt(t.parallel)+' Н');output('normalValue',fmt(t.normal)+' Н');output('frictionValue',fmt(friction)+' Н');
 output('frictionDetail',frictionDescription);
 output('accValue',state.mode==='rest'&&!feasible?'—':fmt(acceleration)+' м/с²');output('accDetail',direction);
 const message=byId('labInterpret');message.textContent=explanation;message.classList.toggle('warning',state.mode==='rest'&&!feasible);
 const description=byId('inclineDesc');description.textContent='Склон '+state.angle+'°, масса '+fmt(state.mass,1)+' кг, μ = '+fmt(state.mu)+'. '+title+'. Тяжесть направлена вертикально вниз, реакция опоры перпендикулярна плоскости, трение против движения или возможного скольжения.';
};
for(const [id,field] of [['angleRange','angle'],['muRange','mu'],['massRange','mass']]){
 byId(id).addEventListener('input',event=>{state[field]=Number(event.target.value);updateLab();});
}
for(const radio of qsa('input[name="motionMode"]'))radio.addEventListener('change',event=>{if(event.target.checked){state.mode=event.target.value;updateLab();}});
byId('resetLab').addEventListener('click',()=>{state.angle=30;state.mu=.2;state.mass=2;state.mode='down';byId('angleRange').value=30;byId('muRange').value=.2;byId('massRange').value=2;qs('input[name="motionMode"][value="down"]').checked=true;updateLab();});
const startingMode=new URLSearchParams(location.search).get('mode');
if(['up','down','rest'].includes(startingMode)){state.mode=startingMode;qs('input[name="motionMode"][value="'+startingMode+'"]').checked=true;}
updateLab();

const tasks=[
 {n:1,level:'basic',title:'Реакция опоры · гладкий склон',text:'Брусок массой 2 кг находится на гладкой наклонной плоскости под углом 30°. Найдите силу реакции опоры.',answer:'N = 10√3 Н ≈ 17,3 Н.'},
 {n:2,level:'basic',title:'Две составляющие тяжести',text:'Тело массой 4 кг находится на плоскости под углом 30°. Найдите модули составляющих тяжести вдоль и перпендикулярно плоскости.',answer:'Вдоль: 20 Н. Перпендикулярно: 20√3 Н ≈ 34,6 Н.'},
 {n:3,level:'basic',title:'Покой и предел трения',text:'Брусок массой 1 кг покоится на склоне 30°. Коэффициент трения покоя 0,6. Найдите фактическую силу трения и проверьте возможность равновесия.',answer:'Fтр,п = 5 Н; Fmax = 3√3 Н ≈ 5,20 Н. Покой возможен.'},
 {n:4,level:'middle',title:'Спуск из состояния покоя',text:'Тело скользит вниз по гладкому склону 30°, начиная движение из состояния покоя. Найдите скорость и путь через 3 секунды.',answer:'v = 15 м/с; s = 22,5 м.'},
 {n:5,level:'middle',title:'Лыжник · путь без времени',text:'Скорость лыжника на гладком склоне 30° возросла с 4 до 14 м/с. Определите путь вдоль склона.',answer:'s = 18 м.'},
 {n:6,level:'middle',title:'Подъём до остановки',text:'Шарик поднимается по гладкой плоскости 30° и останавливается после пути 0,9 м. Найдите начальную скорость.',answer:'v₀ = 3 м/с.'},
 {n:7,level:'middle',title:'Спуск с трением',text:'Брусок скользит вниз по плоскости 30°. Коэффициент трения скольжения 0,2. Найдите ускорение (ось вниз).',answer:'a = 5 − √3 ≈ 3,27 м/с².'},
 {n:8,level:'advanced',title:'Три результата в одной задаче',text:'Брусок массой 2 кг скользит вниз по плоскости 30° с коэффициентом трения 0,3. Найдите реакцию опоры N, силу трения и ускорение.',answer:'N = 10√3 Н; Fтр = 3√3 Н; a = 5 − 1,5√3 ≈ 2,40 м/с².'},
 {n:9,level:'advanced',title:'Подъём с трением',text:'Шайбе сообщили скорость 8 м/с вверх по плоскости 37°. Коэффициент трения скольжения 0,25. Определите путь до остановки. sin 37° ≈ 0,6, cos 37° ≈ 0,8.',answer:'aₓ = −8 м/с² (ось вверх); s = 4 м.'},
 {n:10,level:'advanced',title:'Найти коэффициент трения',text:'Тело скользит вниз по плоскости 30° с ускорением 2 м/с². Найдите коэффициент трения скольжения. Дополнительных сил вдоль плоскости нет.',answer:'μ = √3/5 ≈ 0,346.'}
];
const tasksList=byId('tasksList');
const taskKey='volodia-20261112-task-progress';
let completed=new Set();
try{const x=JSON.parse(storeGet(taskKey)||'[]');if(Array.isArray(x))completed=new Set(x.filter(v=>Number.isInteger(v)&&v>=1&&v<=10));}catch{/* use empty progress */}
const levelName={basic:'Базовый',middle:'Средний',advanced:'Повышенный'};
for(const task of tasks){
 const item=document.createElement('li');item.className='task';item.dataset.level=task.level;item.id='task-'+task.n;
 const num=document.createElement('div');num.className='task-no';num.textContent=String(task.n).padStart(2,'0');
 const body=document.createElement('div');
 const tag=document.createElement('span');tag.className='task-level';tag.textContent=levelName[task.level]+' · '+task.title;
 const text=document.createElement('p');text.className='task-text';text.textContent=task.text;
 const controls=document.createElement('div');controls.className='task-actions';
 const toggle=document.createElement('button');toggle.type='button';toggle.textContent='Показать ответ';toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','answer-'+task.n);
 const label=document.createElement('label');
 const check=document.createElement('input');check.type='checkbox';check.checked=completed.has(task.n);check.setAttribute('aria-label','Задание '+task.n+' выполнено');
 const labelText=document.createElement('span');labelText.textContent='Выполнено';label.append(check,labelText);
 const answer=document.createElement('div');answer.className='task-answer';answer.id='answer-'+task.n;answer.textContent='Ответ: '+task.answer;answer.hidden=true;
 toggle.addEventListener('click',()=>{const next=answer.hidden;answer.hidden=!next;toggle.textContent=next?'Скрыть ответ':'Показать ответ';toggle.setAttribute('aria-expanded',String(next));});
 check.addEventListener('change',()=>{if(check.checked)completed.add(task.n);else completed.delete(task.n);storeSet(taskKey,JSON.stringify([...completed]));updateProgress();});
 controls.append(toggle,label);body.append(tag,text,controls,answer);item.append(num,body);tasksList.append(item);
}
const updateProgress=()=>output('progressText','Выполнено: '+completed.size+' из 10');
updateProgress();
qsa('.task-filters button').forEach(button=>button.addEventListener('click',()=>{
 const filter=button.dataset.filter;
 qsa('.task-filters button').forEach(x=>x.setAttribute('aria-pressed',String(x===button)));
 qsa('.task').forEach(x=>{x.hidden=filter!=='all'&&x.dataset.level!==filter;});
}));
const choices={
 speed:{correct:'down',right:'Верно. При подъёме под действием тяжести тело замедляется: ускорение направлено вниз по склону.',wrong:'Скорость может быть направлена вверх, а ускорение — вниз. На гладкой плоскости ускорение создаёт составляющая силы тяжести.'},
 static:{correct:'balance',right:'Верно. Из равновесия Fтр,п = mg sin α. Значение μпN — лишь верхний предел.',wrong:'Фактическое трение покоя устанавливается из равновесия и может быть меньше μпN.'}
};
qsa('.question').forEach(box=>{
 const button=box.querySelector('button'),feedback=box.querySelector('.feedback');
 button.addEventListener('click',()=>{
  const selected=box.querySelector('input[type="radio"]:checked');
  if(!selected){feedback.textContent='Сначала выберите ответ.';feedback.className='feedback bad';return;}
  const info=choices[box.dataset.question],success=selected.value===info.correct;
  feedback.textContent=success?info.right:info.wrong;
  feedback.className='feedback '+(success?'good':'bad');
 });
});
})();
