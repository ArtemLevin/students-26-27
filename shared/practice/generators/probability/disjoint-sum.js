import {context,fractionSpec} from '../shared.js';
export const disjointSumGenerator={key:'probability.disjoint-sum',version:1,title:'Сумма несовместимых вариантов',competencyIds:['t5_sum'],generate(args){return context(this,args,(random,difficulty)=>{
  const denominator=random.pick(difficulty===1?[2,3,4]:[3,4,5]),numerator=random.int(1,denominator-1),trials=random.int(2,difficulty+2),fail=denominator-numerator;
  return {topic:'Несовместимые сценарии',prompt:`В ${trials} независимых испытаниях вероятность успеха равна ${numerator}/${denominator}. Найдите вероятность ровно одного успеха, сложив несовместимые варианты его позиции.`,
    answerSpec:fractionSpec(trials*numerator*fail**(trials-1),denominator**trials),hints:[`У единственного успеха ${trials} возможных позиций.`,'Вероятность каждого варианта одинакова: успех на одной позиции и неуспех на остальных.','Умножьте вероятность одного варианта на число позиций.'],
    solution:[`Один вариант: ${numerator}/${denominator}·(${fail}/${denominator})^${trials-1}.`,`Всего ${trials} несовместимых вариантов, поэтому вероятности складываются.`],parameters:{numerator,denominator,trials}};
  });}};
export default disjointSumGenerator;
