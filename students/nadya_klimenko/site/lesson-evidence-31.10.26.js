(()=>{
"use strict";
const data=window.COMPETENCY_MAP_DATA;
if(!data||!Array.isArray(data.groups))return;
const evidence={
"frac_15":"Нахождение части от целого через умножение на долю (одна треть от 120).",
"frac_16":"Нахождение целого через деление известной части на долю (треть числа равна 50).",
"frac_14":"При нахождении целого повторено деление на дробь.",
"model_01":"Текст о расходе топлива переведён в модель Q, S, r.",
"model_03":"Использованы связи r=Q/S, Q=rS и S=Q/r с единицами л/км.",
"model_04":"Разобрано различие между коэффициентами 1,3 и 4/3.",
"model_12":"Сопоставлены подземная и надземная части столба: 3/11 и 8/11.",
"model_15":"Проверена правдоподобность городской дальности по смыслу расхода.",
"model_16":"Длина столба найдена через оставшуюся долю и через уравнение.",
"strategy_01":"В условии выделены целое, часть, доля и неизвестная величина."
};
for(const group of data.groups){for(const item of group.items||[]){const t=evidence[item.id];if(!t)continue;item.evidence=Array.isArray(item.evidence)?item.evidence.filter(x=>x&&x.date!=="31.10.26"):[];item.evidence.push({date:"31.10.26",text:t,href:"31.10.26.html#"+({
frac_15:"part",frac_16:"part",frac_14:"part",model_01:"fuel",model_03:"fuel",model_04:"fuel",model_12:"pole",model_15:"fuel",model_16:"pole",strategy_01:"part"}[item.id]||"part")});}}
data.updated="31.10.26";data.latestLesson={date:"31.10.26",title:"Доли, целое и расход топлива",href:"31.10.26.html"};
})();