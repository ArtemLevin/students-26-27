import {context,numberSpec} from '../_shared.js';
const PAIRS=[[3,4,5],[5,12,13],[6,8,10],[8,15,17],[7,24,25]];
export const vectorLengthGenerator={key:'vectors.length',version:1,title:'Длина вектора',competencyIds:['t2_length'],generate(args){return context(this,args,(random,difficulty)=>{
  const [a,b,length]=random.pick(PAIRS.slice(0,2+difficulty)),x=random.bool()?a:-a,y=random.bool()?b:-b;
  return {topic:'Длина вектора',prompt:`Найдите длину вектора a=(${x}; ${y}).`,answerSpec:numberSpec(length),hints:['Используйте √(x²+y²).',`Знаки координат исчезают при возведении в квадрат.`,`Вычислите √(${x*x}+${y*y}).`],solution:[`|a|=√(${x}²+${y}²)=√${length*length}=${length}.`],parameters:{x,y,length}};
  });}};
export default vectorLengthGenerator;
