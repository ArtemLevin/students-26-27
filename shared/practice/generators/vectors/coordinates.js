import {context} from '../_shared.js';
export const vectorCoordinatesGenerator={key:'vectors.coordinates',version:1,title:'Координаты вектора',competencyIds:['t2_coordinates'],generate(args){return context(this,args,(random,difficulty)=>{
  const bound=4+difficulty*3,ax=random.int(-bound,bound),ay=random.int(-bound,bound),dx=random.int(-bound,bound)||1,dy=random.int(-bound,bound)||-1,bx=ax+dx,by=ay+dy;
  return {topic:'Координаты вектора',prompt:`Даны точки A(${ax}; ${ay}) и B(${bx}; ${by}). Найдите координаты вектора AB.`,answerSpec:{type:'vector',values:[dx,dy]},hints:['Координаты вектора — это «конец минус начало».',`Первая координата: ${bx}−(${ax}).`,`Вторая координата: ${by}−(${ay}).`],solution:[`AB=(${bx}−(${ax}); ${by}−(${ay}))=(${dx}; ${dy}).`],parameters:{ax,ay,bx,by,dx,dy}};
  });}};
export default vectorCoordinatesGenerator;
