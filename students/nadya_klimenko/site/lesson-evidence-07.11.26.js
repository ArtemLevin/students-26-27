(()=>{"use strict";
const data=window.COMPETENCY_MAP_DATA;
if(!data||!Array.isArray(data.groups))return;
const evidence={
  "frac_16": [
    "whole",
    "Разобран поиск целого по известной части 84 и доле 3/5."
  ],
  "frac_15": [
    "whole",
    "Повторено нахождение части целого через умножение на долю."
  ],
  "ratio_10": [
    "whole",
    "Проценты переведены в десятичные доли от целого."
  ],
  "ratio_11": [
    "increase",
    "По фактической площади 432 тыс. м² и превышению 8% восстановлена плановая."
  ],
  "ratio_12": [
    "increase",
    "Целое найдено по числу, которому соответствуют 108%."
  ],
  "ratio_14": [
    "remainder",
    "Задача с последовательной отгрузкой зерна по проценту от остатка."
  ],
  "model_12": [
    "parts",
    "Доли трёх участков приведены к одному целому: 0,45, 0,36 и 0,19."
  ],
  "model_14": [
    "remainder",
    "Многошаговая модель процентов от остатка: 40%, затем 60% остатка."
  ],
  "model_01": [
    "parts",
    "Текстовая связь «второй составляет 0,8 первого» выражена произведением долей."
  ],
  "model_15": [
    "fraction",
    "Для задачи об израсходованных запасах выполнена проверка суммой частей."
  ]
};
for(const group of data.groups){for(const item of group.items||[]){
 const e=evidence[item.id];if(!e)continue;
 item.evidence=Array.isArray(item.evidence)?item.evidence.filter(x=>x&&x.date!=="07.11.26"):[];
 item.evidence.push({date:"07.11.26",text:e[1],href:"07.11.26.html#"+e[0]});
}}
data.updated="07.11.26";
data.latestLesson={date:"07.11.26",title:"Проценты, доли и нахождение целого",href:"07.11.26.html"};
})();
