(()=>{"use strict";
const data=window.COMPETENCY_MAP_DATA;
if(!data||!Array.isArray(data.groups))return;
const evidence={
  "ratio_05": [
    "proportion",
    "Проверка равенства отношений с помощью основного свойства пропорции."
  ],
  "ratio_06": [
    "proportion",
    "Перекрёстное умножение при составлении и проверке пропорции."
  ],
  "ratio_07": [
    "unknown",
    "Нахождение неизвестного члена с дробными числами."
  ],
  "ratio_08": [
    "direct",
    "Определение прямой зависимости на задачах о выходе масла и процентах."
  ],
  "ratio_09": [
    "inverse",
    "Составление уравнения для постоянного пути по скорости и времени."
  ],
  "ratio_10": [
    "percent",
    "Выбор целого как базы 100%."
  ],
  "ratio_11": [
    "percent",
    "Нахождение массы примесей по заданному проценту."
  ],
  "ratio_12": [
    "whole",
    "Восстановление массы оливок и раствора по массе части и проценту."
  ],
  "ratio_13": [
    "percent",
    "Нахождение процента по числу выпускников и отношению масс."
  ]
};
for(const group of data.groups)for(const item of group.items||[]){
 const entry=evidence[item.id];if(!entry)continue;
 item.evidence=Array.isArray(item.evidence)?item.evidence.filter(x=>x&&x.date!=="25.11.26"):[];
 item.evidence.push({date:"25.11.26",text:entry[1],href:"25.11.26.html#"+entry[0]});
}
data.updated="25.11.26";
data.latestLesson={date:"25.11.26",title:"Прямая и обратная пропорциональность. Задачи на проценты",href:"25.11.26.html"};
})();
