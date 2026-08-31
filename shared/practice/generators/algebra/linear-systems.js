import {context} from '../shared.js';
export const linearSystemsGenerator={key:'algebra.linear-systems',version:1,title:'Системы линейных уравнений',competencyIds:['oge_20_3_5'],generate(args){return context(this,args,(random,difficulty)=>{
  const x=random.int(-3-difficulty,4+difficulty),y=random.int(-3-difficulty,4+difficulty),a=random.int(1,2+difficulty),b=random.int(1,2+difficulty),c=a*x+b*y,d=random.int(1,2+difficulty),e=-random.int(1,2+difficulty),f=d*x+e*y;
  return {topic:'Система уравнений',prompt:`Решите систему: ${a}x+${b}y=${c}; ${d}x${e<0?'−':'+'}${Math.abs(e)}y=${f}. Запишите пару (x; y).`,answerSpec:{type:'ordered-pair',values:[x,y]},
    hints:['Выберите способ подстановки или сложения.','Умножьте одно из уравнений так, чтобы коэффициенты при одной переменной стали противоположными.','После нахождения первой переменной подставьте её в любое исходное уравнение.'],
    solution:[`Проверка пары (${x}; ${y}): ${a}·${x}+${b}·${y}=${c}.`,`Во втором уравнении ${d}·${x}+(${e})·${y}=${f}. Ответ: (${x}; ${y}).`],parameters:{x,y,a,b,c,d,e,f}};
  });}};
export default linearSystemsGenerator;
