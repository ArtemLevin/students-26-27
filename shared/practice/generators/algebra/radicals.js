import {context,numberSpec} from '../shared.js';
export const radicalsGenerator={key:'algebra.radicals',version:1,title:'Квадратные корни',competencyIds:['t7_radical_num','t7_nth_root','t6_irrational','calc_10','calc_11'],generate(args){return context(this,args,(random,difficulty,options)=>{
  const root=random.int(3,8+difficulty*4),radicand=root*root,mode=options.mode;
  if(mode==='root-as-power'){
    return {topic:'Корень как дробная степень',prompt:`Вычислите ${radicand}^(1/2).`,answerSpec:numberSpec(root),hints:['Показатель 1/2 означает квадратный корень.',`${radicand}^(1/2)=√${radicand}.`,`Проверьте: ${root}²=${radicand}.`],solution:[`${radicand}^(1/2)=√${radicand}=${root}.`],parameters:{root,radicand,mode}};
  }
  if(mode==='fractional-power'){
    const value=root**3;
    return {topic:'Дробный показатель степени',prompt:`Вычислите ${radicand}^(3/2).`,answerSpec:numberSpec(value),hints:['Знаменатель показателя задаёт корень, числитель — последующее возведение в степень.',`Сначала найдите √${radicand}=${root}.`,`Затем вычислите ${root}³.`],solution:[`${radicand}^(3/2)=(√${radicand})³=${root}³=${value}.`],parameters:{root,radicand,value,mode}};
  }
  return {topic:'Извлечение корня',prompt:`Вычислите √${radicand}.`,answerSpec:numberSpec(root),hints:['Найдите два соседних квадрата.',`Последняя цифра помогает проверить кандидата ${root}.`,`Проверьте: ${root}²=${radicand}.`],solution:[`${radicand}=${root}², поэтому √${radicand}=${root}.`],parameters:{root,radicand}};
  });}};
export default radicalsGenerator;