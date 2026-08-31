import {context,numberSpec} from '../shared.js';
export const radicalsGenerator={key:'algebra.radicals',version:1,title:'Квадратные корни',competencyIds:['t7_radical_num','t7_nth_root','t6_irrational'],generate(args){return context(this,args,(random,difficulty)=>{
  const root=random.int(3,8+difficulty*4),radicand=root*root;
  return {topic:'Извлечение корня',prompt:`Вычислите √${radicand}.`,answerSpec:numberSpec(root),hints:['Найдите два соседних квадрата.',`Последняя цифра помогает проверить кандидата ${root}.`,`Проверьте: ${root}²=${radicand}.`],solution:[`${radicand}=${root}², поэтому √${radicand}=${root}.`],parameters:{root,radicand}};
  });}};
export default radicalsGenerator;
