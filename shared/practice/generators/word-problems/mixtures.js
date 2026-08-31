import {context,numberSpec} from '../_shared.js';
const IDS=['oge_21_1_2','t10_percent','t10_alloys'];
export const mixturesGenerator={key:'word-problems.mixtures',version:1,title:'Смеси и сплавы',competencyIds:IDS,generate(args){return context(this,args,(random,difficulty)=>{
  const concentration=random.pick(difficulty===1?[10,20,25]:[5,10,15,20,25,30,40]),mass=random.int(2,8+difficulty*3)*20,substance=mass*concentration/100;
  return {topic:'Баланс вещества',prompt:`Раствор массой ${mass} г содержит ${concentration}% вещества. Сколько граммов вещества находится в растворе?`,answerSpec:numberSpec(substance),hints:['Концентрация показывает долю вещества в растворе.',`Переведите ${concentration}% в дробь ${concentration}/100.`,'Умножьте массу раствора на концентрацию.'],solution:[`m_вещ=${mass}·${concentration}/100=${substance} г.`],parameters:{concentration,mass,substance}};
  });}};
export default mixturesGenerator;
