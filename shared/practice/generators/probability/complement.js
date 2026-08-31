import {context,fractionSpec} from '../_shared.js';
export const complementGenerator={key:'probability.complement',version:1,title:'Противоположное событие',competencyIds:['t5_complement'],generate(args){return context(this,args,(random,difficulty)=>{
  const denominator=random.pick(difficulty===1?[2,3,4]:[3,4,5,6]),success=random.int(1,denominator-1),fail=denominator-success,trials=random.int(2,difficulty+3);
  return {topic:'Хотя бы один успех',prompt:`Вероятность успеха в одном испытании равна ${success}/${denominator}. Испытание повторяют ${trials} раза независимо. Найдите вероятность хотя бы одного успеха.`,
    answerSpec:fractionSpec(denominator**trials-fail**trials,denominator**trials),hints:['Событию «хотя бы один» противоположно событие «ни одного».',`Вероятность неуспеха равна ${fail}/${denominator}.`,`Используйте 1−(${fail}/${denominator})^${trials}.`],
    solution:[`P(ни одного)=(${fail}/${denominator})^${trials}.`,`P(хотя бы одного)=1−P(ни одного).`],parameters:{success,denominator,trials}};
  });}};
export default complementGenerator;
