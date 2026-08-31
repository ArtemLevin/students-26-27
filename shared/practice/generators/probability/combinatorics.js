import {combination,context,numberSpec} from '../shared.js';
export const combinatoricsGenerator={key:'probability.combinatorics',version:1,title:'Сочетания',competencyIds:['t5_combinatorics'],generate(args){return context(this,args,(random,difficulty)=>{
  const n=random.int(5,7+difficulty*2),k=random.int(2,Math.min(n-2,2+difficulty)),value=combination(n,k);
  return {topic:'Коэффициент сочетаний',prompt:`Вычислите число сочетаний C_${n}^${k}.`,answerSpec:numberSpec(value),hints:['Запишите формулу n!/(k!(n−k)!).',`Сократите ${n}! с ближайшим факториалом до умножения.`,`Проверьте симметрию: C_${n}^${k}=C_${n}^${n-k}.`],solution:[`C_${n}^${k}=${n}!/(${k}!·${n-k}!).`,`После сокращения получаем ${value}.`],parameters:{n,k,value}};
  });}};
export default combinatoricsGenerator;
