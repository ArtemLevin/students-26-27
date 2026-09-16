'use strict';
const SVG_NS='http://www.w3.org/2000/svg';
const W=1000,H=620;
const EPS=1e-7;
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const snap=(v,step=.25)=>Math.round(v/step)*step;
const fmt=(v,d=2)=>{if(!Number.isFinite(v))return '—';const n=Math.abs(v)<1e-10?0:v;return n.toLocaleString('ru-RU',{maximumFractionDigits:d,minimumFractionDigits:0})};
const signTerm=(coef,name)=>{if(Math.abs(coef)<EPS)return '';const abs=Math.abs(coef);const mag=Math.abs(abs-1)<EPS&&name?'':fmt(abs);return `${coef>0?' + ':' − '}${mag}${name}`};

const MathModel={
  coeffs(s){const a=s.a,h=s.h,k=s.k;return {a,b:-2*a*h,c:a*h*h+k};},
  value(s,x){return s.a*(x-s.h)*(x-s.h)+s.k;},
  hole(s){if(s.mode!=='hole')return null;const x=-1;return {x,y:this.value(s,x)};},
  discriminant(s){const {a,b,c}=this.coeffs(s);return b*b-4*a*(c-s.m);},
  naiveRoots(s){
    const q=(s.m-s.k)/s.a;
    if(q<-EPS)return [];
    if(Math.abs(q)<=EPS)return [s.h];
    const r=Math.sqrt(Math.max(0,q));return [s.h-r,s.h+r].sort((x,y)=>x-y);
  },
  actualRoots(s){const roots=this.naiveRoots(s),hole=this.hole(s);if(!hole)return roots;return roots.filter(x=>Math.abs(x-hole.x)>1e-6);},
  derived(s){
    const coeff=this.coeffs(s),naive=this.naiveRoots(s),actual=this.actualRoots(s),hole=this.hole(s),D=this.discriminant(s);
    return {coeff,vertex:{x:s.h,y:s.k},naive,actual,hole,D,naiveCount:naive.length,count:actual.length};
  },
  formula(s){
    const {a,b,c}=this.coeffs(s);let lead=Math.abs(a-1)<EPS?'x²':Math.abs(a+1)<EPS?'−x²':`${fmt(a)}x²`;
    return `${lead}${signTerm(b,'x')}${signTerm(c,'')}`;
  },
  vertexFormula(s){const a=Math.abs(s.a-1)<EPS?'':Math.abs(s.a+1)<EPS?'−':fmt(s.a);const hx=s.h>=0?`(x − ${fmt(s.h)})`:`(x + ${fmt(-s.h)})`;return `y = ${a}${hx}² ${s.k>=0?'+':'−'} ${fmt(Math.abs(s.k))}`;}
};

const PRESETS={
  standard:{mode:'standard',a:1,h:.5,k:-6.25,m:-6.25,scenario:'tangent'},
  hole:{mode:'hole',a:1,h:-3,k:-1,m:3,scenario:'hole-surprise'},
  free:{mode:'free',a:1,h:.5,k:-6.25,m:-4,scenario:'free'}
};
const SCENARIOS=[
  {id:'tangent',label:'Касание вершины',mode:'standard',m:-6.25,note:'Граница: Δ = 0 и одна общая точка.'},
  {id:'two',label:'Две точки',mode:'standard',m:-4,note:'m выше минимума, поэтому Δ > 0.'},
  {id:'none',label:'Ниже минимума',mode:'standard',m:-8,note:'У функции нет значений на этом уровне.'},
  {id:'hole-surprise',label:'ОДЗ меняет ответ',mode:'hole',m:3,note:'Упрощённая парабола даёт 2 точки, исходная функция — 1.'},
  {id:'hole-vertex',label:'Вершина дробной',mode:'hole',m:-1,note:'Касание происходит в V(−3;−1); выколотая точка не участвует.'},
  {id:'free',label:'Свободный режим',mode:'free',m:-4,note:'Перемещайте вершину и меняйте a.'}
];
const PREDICTIONS=[
  {title:'Эксперимент 1 · ниже вершины',q:'Для y=x²−x−6 опустим y=m до m=−8. Сколько общих точек останется?',opts:['0','1','2'],ok:0,run:()=>applyScenario('none')},
  {title:'Эксперимент 2 · ОДЗ',q:'Для дробной функции поставим m=3. Сколько реальных общих точек останется после учёта x≠−1?',opts:['0','1','2'],ok:1,run:()=>applyScenario('hole-surprise')},
  {title:'Эксперимент 3 · ветви вниз',q:'В свободном режиме сделаем a<0. Если y=m окажется выше вершины, сколько пересечений будет?',opts:['0','1','2'],ok:0,run:()=>{setMode('free',{history:true});setState({a:-1,h:0,k:3,m:5},{history:true});}}
];
const CHALLENGES=[
  {id:'distance',title:'Вызов · расстояние 4',text:'Для y=x²−x−6 настройте m так, чтобы абсциссы двух пересечений отличались ровно на 4.',hint:'Следите за строкой абсцисс. Нужны две точки.',check:(s,d)=>s.mode==='standard'&&d.actual.length===2&&Math.abs((d.actual[1]-d.actual[0])-4)<.03},
  {id:'tangent',title:'Вызов · ровно одна точка',text:'В режиме «y=m и парабола» получите ровно одну общую точку.',hint:'Совместите y=m с ординатой вершины.',check:(s,d)=>s.mode==='standard'&&d.count===1},
  {id:'hole',title:'Вызов · одна точка из-за ОДЗ',text:'Получите одну реальную точку пересечения, хотя упрощённая парабола имеет две.',hint:'Перейдите к дробной функции и исследуйте уровень, проходящий через Q(−1;3).',check:(s,d)=>s.mode==='hole'&&d.count===1&&d.naiveCount===2}
];

const defaultView={scale:42,originX:500,originY:315};
let state={...PRESETS.standard,showGrid:true,showNaive:true,view:{...defaultView},highlight:null,ghosts:true,compareA:null,compareB:null,anim:{running:false,speed:1},predictionIndex:0,predictionChoice:null,challengeIndex:0,challengeDone:{}};
let history=[],historyIndex=-1,historyLock=false;
let raf=0,animLast=0;
const pointers=new Map();let gesture=null,drag=null;
