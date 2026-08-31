import {context} from '../_shared.js';
export const vectorOperationsGenerator={key:'vectors.operations',version:1,title:'Действия с векторами',competencyIds:['t2_operations','t2_linear_combo'],generate(args){return context(this,args,(random,difficulty)=>{
  const bound=2+difficulty,a=[random.int(-bound,bound),random.int(-bound,bound)],b=[random.int(-bound,bound),random.int(-bound,bound)],m=random.int(1,difficulty+1),n=random.int(1,difficulty+1),value=[m*a[0]-n*b[0],m*a[1]-n*b[1]];
  return {topic:'Линейная комбинация векторов',prompt:`Даны a=(${a.join('; ')}) и b=(${b.join('; ')}). Найдите ${m}a−${n}b.`,answerSpec:{type:'vector',values:value},hints:['Выполняйте действие отдельно для каждой координаты.',`Первая координата: ${m}·${a[0]}−${n}·${b[0]}.`,`Вторая координата: ${m}·${a[1]}−${n}·${b[1]}.`],solution:[`${m}a−${n}b=(${value.join('; ')}).`],parameters:{a,b,m,n,value}};
  });}};
export default vectorOperationsGenerator;
