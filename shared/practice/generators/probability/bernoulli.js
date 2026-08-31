import {combination,context,fractionSpec} from '../_shared.js';
export const bernoulliGenerator={key:'probability.bernoulli',version:1,title:'Схема Бернулли',competencyIds:['t5_bernoulli'],generate(args){return context(this,args,(random,difficulty)=>{
  const n=random.int(3,Math.min(7,4+difficulty)),k=random.int(1,n-1),denominator=random.pick(difficulty===1?[2,3]:[2,3,4,5]),success=random.int(1,denominator-1),fail=denominator-success,coefficient=combination(n,k);
  return {topic:'Схема Бернулли',expectedSeconds:120,prompt:`В ${n} независимых испытаниях вероятность успеха равна ${success}/${denominator}. Найдите вероятность ровно ${k} успехов.`,
    answerSpec:fractionSpec(coefficient*success**k*fail**(n-k),denominator**n),hints:[`Определите n=${n}, k=${k}, p=${success}/${denominator}.`,`Используйте C_${n}^${k}·p^${k}·(1−p)^${n-k}.`,`C_${n}^${k}=${coefficient}.`],
    solution:[`C_${n}^${k}=${coefficient}.`,`P=${coefficient}·(${success}/${denominator})^${k}·(${fail}/${denominator})^${n-k}.`],parameters:{n,k,success,fail,denominator,coefficient}};
  });}};
export default bernoulliGenerator;
