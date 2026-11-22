(()=>{"use strict";
const data=window.COMPETENCY_MAP_DATA;
if(!data||!Array.isArray(data.groups))return;
const evidence={
  "ratio_01":["ratio","Рассмотрено отношение решённой части к целому и обратный порядок при сравнении площадей."],
  "frac_15":["ratio","Четыре выполненные задачи из пяти записаны как 4/5, 0,8 и 80%."],
  "dec_12":["units","Для сравнения масс 4,4 кг переведены в 4400 г; отношение масс проверено после согласования единиц."],
  "ratio_03":["parts","Количество 105 разделено в отношении 3:4, а число 12 — в отношении 1:2:4."],
  "ratio_05":["proportion","Пропорция определена как равенство отношений на примере 2/3=4/6."],
  "ratio_06":["proportion","Основное свойство пропорции проверено перемножением крайних и средних членов."],
  "ratio_07":["unknown","Неизвестный член находили через произведения крайних и средних, сохраняя составные скобки."],
  "alg_13":["formula","Выразили множитель m1 из формулы F=km1m2/r² при ненулевых знаменателях."]
};
for(const group of data.groups)for(const item of group.items||[]){
 const entry=evidence[item.id];if(!entry)continue;
 item.evidence=Array.isArray(item.evidence)?item.evidence.filter(x=>x&&x.date!=="21.11.26"):[];
 item.evidence.push({date:"21.11.26",text:entry[1],href:"21.11.26.html#"+entry[0]});
}
data.updated="21.11.26";
data.latestLesson={date:"21.11.26",title:"Отношения и пропорции",href:"21.11.26.html"};
})();
