import {context,numberSpec} from '../_shared.js';
export const powersGenerator={key:'algebra.powers',version:1,title:'Свойства степеней',competencyIds:['t7_power_values','t7_power_actions','t7_natural_power','t7_integer_power','powers_2','powers_5','powers_6','powers_7'],generate(args){return context(this,args,(random,difficulty)=>{
  const base=random.int(2,difficulty===3?5:4),a=random.int(2,3+difficulty),b=random.int(1,2+difficulty),operation=random.bool()?'product':'quotient',exponent=operation==='product'?a+b:a,value=base**exponent;
  const prompt=operation==='product'?`Вычислите ${base}^${a}·${base}^${b}.`:`Вычислите ${base}^${a+b}:${base}^${b}.`;
  return {topic:'Свойства степеней',prompt,answerSpec:numberSpec(value),hints:['При умножении показатели складываются, при делении — вычитаются.',`Сведите выражение к степени ${base} с одним показателем.`,`Получится ${base}^${exponent}.`],solution:[`${prompt.slice(10,-1)}=${base}^${exponent}=${value}.`],parameters:{base,a,b,operation,exponent,value}};
  });}};
export default powersGenerator;
