import {context,fractionSpec} from '../_shared.js';
const IDS=['t5_product'];
export const independentProductGenerator={key:'probability.independent-product',version:1,title:'Произведение вероятностей',competencyIds:IDS,generate(args){return context(this,args,(random,difficulty)=>{
  const denominators=difficulty===1?[2,3,4]:[3,4,5,6],denominator=random.pick(denominators),numerator=random.int(1,denominator-1),trials=random.int(2,difficulty+2);
  return {topic:'Независимые события',prompt:`Вероятность успеха в одном независимом испытании равна ${numerator}/${denominator}. Найдите вероятность того, что успех произойдёт во всех ${trials} испытаниях.`,
    answerSpec:fractionSpec(numerator**trials,denominator**trials),hints:['Союз «и» для независимых испытаний означает умножение вероятностей.',`Запишите (${numerator}/${denominator})^${trials}.`,'Вычислите степень числителя и знаменателя, затем сократите дробь.'],
    solution:[`P=(${numerator}/${denominator})^${trials}.`,`P=${numerator**trials}/${denominator**trials}.`],parameters:{numerator,denominator,trials}};
  });}};
export default independentProductGenerator;
