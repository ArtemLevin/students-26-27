(function(root){
'use strict';

const EPS=1e-9;
const LIMITS=Object.freeze({
  x:Object.freeze({min:-2.2,max:2.2}),
  a:Object.freeze({min:-0.75,max:1.75}),
  b:Object.freeze({min:-3,max:3}),
  speed:Object.freeze({min:0.25,max:2.5})
});

const SCENARIOS=Object.freeze({
  classic:Object.freeze({id:'classic',title:'Классический',a:1,b:0,x:0.35,description:'Пример из пособия: два экстремума и три промежутка монотонности.'}),
  boundary:Object.freeze({id:'boundary',title:'Граничный a = 0',a:0,b:0,x:0,description:'f′(0)=0, но экстремума нет: стационарная точка перегиба.'}),
  noExtrema:Object.freeze({id:'noExtrema',title:'Без экстремумов',a:-0.6,b:0,x:0,description:'Производная положительна при любом x, функция всюду возрастает.'}),
  shifted:Object.freeze({id:'shifted',title:'Сдвиг вверх',a:1,b:2.4,x:0.35,description:'График f поднимается, а f′ остаётся тем же.'}),
  strong:Object.freeze({id:'strong',title:'Контрастный',a:1.65,b:-0.8,x:1.7,description:'Критические точки расходятся, наклоны становятся нагляднее.'})
});

function clamp(value,min,max){
  const n=Number(value);
  if(!Number.isFinite(n))return min;
  return Math.min(max,Math.max(min,n));
}

function value(x,a=1,b=0){
  x=Number(x);a=Number(a);b=Number(b);
  return x*x*x-3*a*x+b;
}

function derivative(x,a=1){
  x=Number(x);a=Number(a);
  return 3*x*x-3*a;
}

function secondDerivative(x){
  return 6*Number(x);
}

function tangentValue(x,x0,a=1,b=0){
  const y0=value(x0,a,b);
  return y0+derivative(x0,a)*(Number(x)-Number(x0));
}

function criticalPoints(a){
  a=Number(a);
  if(a>EPS){
    const q=Math.sqrt(a);
    return [
      {x:-q,kind:'maximum',label:'локальный максимум'},
      {x:q,kind:'minimum',label:'локальный минимум'}
    ];
  }
  if(Math.abs(a)<=EPS){
    return [{x:0,kind:'stationary-inflection',label:'стационарная точка перегиба'}];
  }
  return [];
}

function extrema(a,b=0){
  return criticalPoints(a).filter(p=>p.kind==='maximum'||p.kind==='minimum').map(p=>({
    ...p,
    y:value(p.x,a,b)
  }));
}

function derivativeSign(x,a,tolerance=1e-7){
  const d=derivative(x,a);
  if(Math.abs(d)<=tolerance)return 0;
  return d>0?1:-1;
}

function trendAt(x,a,tolerance=1e-7){
  const sign=derivativeSign(x,a,tolerance);
  return sign>0?'increasing':sign<0?'decreasing':'stationary';
}

function classifyCriticalAt(x,a,tolerance=0.035){
  const pts=criticalPoints(a);
  for(const point of pts){
    if(Math.abs(Number(x)-point.x)<=tolerance)return point.kind;
  }
  return null;
}

function monotonicIntervals(a){
  a=Number(a);
  if(a>EPS){
    const q=Math.sqrt(a);
    return [
      {from:-Infinity,to:-q,trend:'increasing'},
      {from:-q,to:q,trend:'decreasing'},
      {from:q,to:Infinity,trend:'increasing'}
    ];
  }
  return [{from:-Infinity,to:Infinity,trend:'increasing',stationaryAt:Math.abs(a)<=EPS?0:null}];
}

function normalizeState(input={}){
  return {
    x:clamp(input.x??0,LIMITS.x.min,LIMITS.x.max),
    a:clamp(input.a??1,LIMITS.a.min,LIMITS.a.max),
    b:clamp(input.b??0,LIMITS.b.min,LIMITS.b.max),
    speed:clamp(input.speed??1,LIMITS.speed.min,LIMITS.speed.max),
    mode:['function','derivative','compare','sandbox'].includes(input.mode)?input.mode:'compare'
  };
}

function derive(input={}){
  const state=normalizeState(input);
  const y=value(state.x,state.a,state.b);
  const slope=derivative(state.x,state.a);
  const second=secondDerivative(state.x);
  const sign=derivativeSign(state.x,state.a,1e-6);
  const criticalKind=classifyCriticalAt(state.x,state.a);
  return {
    ...state,
    y,
    slope,
    second,
    sign,
    trend:sign>0?'increasing':sign<0?'decreasing':'stationary',
    angleDeg:Math.atan(slope)*180/Math.PI,
    criticalKind,
    criticalPoints:criticalPoints(state.a),
    extrema:extrema(state.a,state.b),
    intervals:monotonicIntervals(state.a)
  };
}

function scenario(id){
  const item=SCENARIOS[id]||SCENARIOS.classic;
  return normalizeState(item);
}

function sameDerivativeUnderVerticalShift(x,a,b1,b2){
  return derivative(x,a)===derivative(x,a) && Number.isFinite(Number(b1)) && Number.isFinite(Number(b2));
}

root.DerivativeLabModel=Object.freeze({
  EPS,LIMITS,SCENARIOS,clamp,value,derivative,secondDerivative,tangentValue,
  criticalPoints,extrema,derivativeSign,trendAt,classifyCriticalAt,monotonicIntervals,
  normalizeState,derive,scenario,sameDerivativeUnderVerticalShift
});
})(typeof window!=='undefined'?window:globalThis);
