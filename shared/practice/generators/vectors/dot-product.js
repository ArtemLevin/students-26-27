import {context,numberSpec} from '../_shared.js';
export const dotProductGenerator={key:'vectors.dot-product',version:1,title:'Скалярное произведение',competencyIds:['t2_dot','t2_angle'],generate(args){return context(this,args,(random,difficulty)=>{
  const bound=2+difficulty,a=[random.int(-bound,bound),random.int(-bound,bound)],b=[random.int(-bound,bound),random.int(-bound,bound)],value=a[0]*b[0]+a[1]*b[1];
  return {topic:'Скалярное произведение',prompt:`Даны векторы a=(${a.join('; ')}) и b=(${b.join('; ')}). Найдите a·b.`,answerSpec:numberSpec(value),hints:['Перемножьте соответствующие координаты.',`${a[0]}·${b[0]} и ${a[1]}·${b[1]}.`,'Сложите два произведения.'],solution:[`a·b=${a[0]}·${b[0]}+${a[1]}·${b[1]}=${value}.`],parameters:{a,b,value}};
  });}};
export default dotProductGenerator;
