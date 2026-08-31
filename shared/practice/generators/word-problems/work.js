import {context,numberSpec} from '../_shared.js';
const IDS=['models_9','models_10','oge_21_4_2','t10_work','t10_pipes'];
export const workGenerator={key:'word-problems.work',version:1,title:'Производительность и работа',competencyIds:IDS,generate(args){return context(this,args,(random,difficulty,options)=>{
  const mode=options.mode||'rate',time=random.int(2,5+difficulty),rate=random.int(3,8+difficulty*2),work=rate*time;
  if(mode==='time')return {topic:'Время работы',prompt:`Исполнитель выполняет по ${rate} деталей в час. За сколько часов он изготовит ${work} деталей?`,answerSpec:numberSpec(time),hints:['Используйте t=W/p.','Разделите объём работы на производительность.','Проверьте единицы.'],solution:[`t=${work}/${rate}=${time} ч.`],parameters:{mode,rate,time,work}};
  return {topic:'Производительность',prompt:`За ${time} ч выполнено ${work} одинаковых заданий. Найдите производительность в заданиях за час.`,answerSpec:numberSpec(rate),hints:['Производительность — работа за единицу времени.','Используйте p=W/t.','Разделите число заданий на число часов.'],solution:[`p=${work}/${time}=${rate} заданий/ч.`],parameters:{mode,rate,time,work}};
  });}};
export default workGenerator;
