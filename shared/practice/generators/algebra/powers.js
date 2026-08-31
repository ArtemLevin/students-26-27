import {context,numberSpec,fractionSpec} from '../shared.js';
export const powersGenerator={key:'algebra.powers',version:1,title:'Свойства степеней',competencyIds:['t7_power_values','t7_power_actions','t7_natural_power','t7_integer_power','powers_2','powers_5','powers_6','powers_7','calc_01','calc_03','calc_04','calc_07','calc_08','calc_12'],generate(args){return context(this,args,(random,difficulty,options)=>{
  const base=random.int(2,difficulty===3?5:4),a=random.int(2,3+difficulty),b=random.int(1,2+difficulty),mode=options.mode;
  if(mode==='meaning'){
    const value=base**a;
    return {topic:'Смысл степени',prompt:`Вычислите ${base}^${a}.`,answerSpec:numberSpec(value),hints:[`Степень ${base}^${a} — это произведение ${a} одинаковых множителей.`,'Запишите повторяющееся умножение.',`Получится ${value}.`],solution:[`${base}^${a}=${Array.from({length:a},()=>base).join('·')}=${value}.`],parameters:{base,a,value,mode}};
  }
  if(mode==='product'){
    const exponent=a+b,value=base**exponent,prompt=`Вычислите ${base}^${a}·${base}^${b}.`;
    return {topic:'Умножение степеней',prompt,answerSpec:numberSpec(value),hints:['При умножении степеней с одинаковым основанием показатели складываются.',`Сложите показатели: ${a}+${b}.`,`Получится ${base}^${exponent}.`],solution:[`${base}^${a}·${base}^${b}=${base}^${exponent}=${value}.`],parameters:{base,a,b,exponent,value,mode}};
  }
  if(mode==='quotient'){
    const exponent=a,value=base**exponent,prompt=`Вычислите ${base}^${a+b}:${base}^${b}.`;
    return {topic:'Деление степеней',prompt,answerSpec:numberSpec(value),hints:['При делении степеней с одинаковым основанием показатели вычитаются.',`Вычтите показатели: ${a+b}−${b}.`,`Получится ${base}^${exponent}.`],solution:[`${base}^${a+b}:${base}^${b}=${base}^${exponent}=${value}.`],parameters:{base,a,b,exponent,value,mode}};
  }
  if(mode==='power'){
    const exponent=a*b,value=base**exponent,prompt=`Вычислите (${base}^${a})^${b}.`;
    return {topic:'Степень степени',prompt,answerSpec:numberSpec(value),hints:['При возведении степени в степень показатели перемножаются.',`Перемножьте показатели: ${a}·${b}.`,`Получится ${base}^${exponent}.`],solution:[`(${base}^${a})^${b}=${base}^${exponent}=${value}.`],parameters:{base,a,b,exponent,value,mode}};
  }
  if(mode==='negative'){
    const denominator=base**a,prompt=`Вычислите ${base}^{-${a}}.`;
    return {topic:'Отрицательный показатель степени',prompt,answerSpec:fractionSpec(1,denominator),hints:['Отрицательный показатель означает переход к обратной величине.',`${base}^{-${a}}=1/${base}^${a}.`,`В знаменателе получится ${denominator}.`],solution:[`${base}^{-${a}}=1/${base}^${a}=1/${denominator}.`],parameters:{base,a,denominator,mode}};
  }
  if(mode==='common-base'){
    const exponent=2*a+b,value=2**exponent,prompt=`Вычислите 4^${a}·2^${b}.`;
    return {topic:'Приведение к общему основанию',prompt,answerSpec:numberSpec(value),hints:['Представьте 4 как степень двойки.',`4^${a}=(2^2)^${a}=2^${2*a}.`,`Сложите показатели ${2*a} и ${b}.`],solution:[`4^${a}·2^${b}=2^${2*a}·2^${b}=2^${exponent}=${value}.`],parameters:{a,b,exponent,value,mode}};
  }
  const operation=random.bool()?'product':'quotient',exponent=operation==='product'?a+b:a,value=base**exponent;
  const prompt=operation==='product'?`Вычислите ${base}^${a}·${base}^${b}.`:`Вычислите ${base}^${a+b}:${base}^${b}.`;
  return {topic:'Свойства степеней',prompt,answerSpec:numberSpec(value),hints:['При умножении показатели складываются, при делении — вычитаются.',`Сведите выражение к степени ${base} с одним показателем.`,`Получится ${base}^${exponent}.`],solution:[`${prompt.slice(10,-1)}=${base}^${exponent}=${value}.`],parameters:{base,a,b,operation,exponent,value}};
  });}};
export default powersGenerator;