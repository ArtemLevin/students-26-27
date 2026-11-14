(()=>{"use strict";
const data=window.COMPETENCY_MAP_DATA;
if(!data||!Array.isArray(data.groups))return;
const evidence={
  "ratio_13": [
    "percentage",
    "Разобрана формула процентного увеличения от исходной положительной величины."
  ],
  "nat_12": [
    "distribute",
    "Отрабатывался выбор удобного порядка вычислений на основе распределительного закона."
  ],
  "nat_09": [
    "brackets",
    "Закреплено сохранение скобок при вычитании смешанного числа и разности выражений."
  ],
  "frac_04": [
    "mixed",
    "Смешанные числа раскладывались на целую и дробную части для удобного умножения."
  ],
  "frac_13": [
    "mixed",
    "Применялось сокращение множителей и умножение дробной части на целое число."
  ],
  "alg_03": [
    "factor",
    "Распределительное свойство записано буквами в обоих направлениях."
  ],
  "alg_04": [
    "distribute",
    "Упражнения на раскрытие скобок и вынесение общего множителя."
  ],
  "alg_05": [
    "like",
    "Приведение подобных дробных коэффициентов, включая минус перед скобками."
  ],
  "alg_13": [
    "equations",
    "Пошагово разобрано линейное уравнение с дробным множителем перед скобками."
  ]
};
for(const group of data.groups)for(const item of group.items||[]){
 const e=evidence[item.id];if(!e)continue;
 item.evidence=Array.isArray(item.evidence)?item.evidence.filter(x=>x&&x.date!=="14.11.26"):[];
 item.evidence.push({date:"14.11.26",text:e[1],href:"14.11.26.html#"+e[0]});
}
data.updated="14.11.26";
data.latestLesson={date:"14.11.26",title:"Проценты и распределительный закон",href:"14.11.26.html"};
})();
