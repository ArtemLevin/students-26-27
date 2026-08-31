import {context,numberSpec,signed} from '../shared.js';
export const quadraticEquationsGenerator={key:'algebra.quadratic-equations',version:1,title:'Квадратные уравнения',competencyIds:['oge_9_2_2','t9_power'],generate(args){return context(this,args,(random,difficulty)=>{
  let x1=random.int(-5-difficulty,-1),x2=random.int(1,5+difficulty);if(x1>x2)[x1,x2]=[x2,x1];const b=-(x1+x2),c=x1*x2;
  return {topic:'Квадратное уравнение',prompt:`Найдите больший корень уравнения x² ${signed(b)}x ${signed(c)} = 0.`,answerSpec:numberSpec(x2),hints:['Подберите два числа по сумме и произведению.',`Их сумма равна ${-b}, произведение ${c}.`,'Разложите квадратный трёхчлен на множители.'],solution:[`x² ${signed(b)}x ${signed(c)}=(x−(${x1}))(x−${x2}).`,`Корни: ${x1} и ${x2}; больший корень ${x2}.`],parameters:{x1,x2,b,c}};
  });}};
export default quadraticEquationsGenerator;
