import {context,numberSpec,signed} from '../shared.js';
export const linearEquationsGenerator={key:'algebra.linear-equations',version:1,title:'Линейные уравнения',competencyIds:['equations_4','equations_5','equations_6','equations_7','equations_8','t9_linear'],generate(args){return context(this,args,(random,difficulty)=>{
  const root=random.int(-4-difficulty*2,5+difficulty*2),a=random.int(2,3+difficulty),b=random.int(-8,8),right=a*root+b;
  return {topic:'Линейное уравнение',prompt:`Решите уравнение ${a}x ${signed(b)} = ${right}.`,answerSpec:numberSpec(root),hints:['Перенесите свободное слагаемое в правую часть.',`Получите ${a}x=${right-b}.`,'Разделите обе части на коэффициент при x.'],solution:[`${a}x=${right}−(${b})=${right-b}.`,`x=${root}.`],parameters:{a,b,right,root}};
  });}};
export default linearEquationsGenerator;
