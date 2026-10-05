(() => {
    const data = window.COMPETENCY_MAP_DATA;
    if (!data) return;

    const evidence1009 = "На занятии 10.09.26 отработаны прикладные степенные и показательные модели, граничные значения, выражение неизвестной из формулы, дробные степени, приведение к одному основанию и проверка допустимости результата.";
    const ids1009 = new Set(["eq_09","eq_10","calc_07","calc_08","calc_09","calc_10","calc_11","calc_12","calc_14","app_01","app_02","app_12","app_15"]);
    data.groups.flatMap(group => group.items).forEach(item => {
      if (!ids1009.has(item.id)) return;
      item.status = "covered";
      item.level = Math.max(Number(item.level || 0), 2);
      item.evidence = item.evidence || {};
      item.evidence.text = item.evidence.text || evidence1009;
      item.evidence.href = item.evidence.href || "10.09.26.html";
      item.evidence.texHref = item.evidence.texHref || "../tex_docs/10.09.26.tex";
    });

    const evidence1409 = "На занятии 14.09.26 отработан метод узловых точек: чтение координат, восстановление параметров показательной функции, решение системы, ограничения на основание, нулевая, отрицательная и дробная степени, а также переход от графика к вычислению f(c) или поиску x при f(x)=c.";
    const ids1409 = new Set([
      "dg_01",
      "func_06","func_15","func_18",
      "eq_09","eq_10","eq_20",
      "calc_02","calc_07","calc_08","calc_09","calc_10","calc_11","calc_12","calc_14",
      "app_01","app_15"
    ]);
    data.groups.flatMap(group => group.items).forEach(item => {
      if (!ids1409.has(item.id)) return;
      item.status = "covered";
      item.level = Math.max(Number(item.level || 0), 2);
      item.evidence = item.evidence || {};
      item.evidence.text = evidence1409;
      item.evidence.href = "14.09.26.html";
      item.evidence.texHref = "../tex_docs/14.09.26.tex";
    });

    data.lesson.date = "17.09.26";
    data.lesson.title = "Узловые точки и пересечения графиков";
    data.lesson.evidence = "На занятии 17.09.26 метод узловых точек перенесён на линейную, квадратичную, корневую и дробно-рациональную функции; отработаны восстановление формулы по координатам, ОДЗ, информативность точки, решение систем и поиск общей точки графиков из равенства f₁(x)=f₂(x).";
    data.lesson.pdf = "site/17.09.26.html";
    data.lesson.tex = "tex_docs/17.09.26.tex";

    const currentIds = new Set([
      "dg_01",
      "func_01","func_02","func_04","func_05","func_11","func_17","func_18",
      "eq_06","eq_07","eq_20","eq_21","eq_22",
      "app_01"
    ]);
    data.groups.flatMap(group => group.items).forEach(item => {
      if (!currentIds.has(item.id)) return;
      item.status = "covered";
      item.level = Math.max(Number(item.level || 0), 2);
      item.evidence = item.evidence || {};
      item.evidence.text = data.lesson.evidence;
      item.evidence.href = "17.09.26.html";
      item.evidence.texHref = "../tex_docs/17.09.26.tex";
    });

    const evidence2109 = "На занятии 21.09.26 отработаны координаты и длина вектора, сложение и вычитание, умножение вектора на число, скалярное произведение, косинус угла между ненулевыми векторами и признак перпендикулярности.";
    const ids2109 = new Set([
      "vec_01","vec_02","vec_03","vec_04","vec_05","vec_07","vec_08","vec_09"
    ]);
    data.groups.flatMap(group => group.items).forEach(item => {
      if (!ids2109.has(item.id)) return;
      item.status = "covered";
      item.level = Math.max(Number(item.level || 0), 2);
      item.evidence = item.evidence || {};
      item.evidence.text = evidence2109;
      item.evidence.href = "21.09.26.html";
      item.evidence.texHref = "../tex_docs/21.09.26.tex";
    });

    data.lesson.date = "21.09.26";
    data.lesson.title = "Векторы на координатной плоскости";
    data.lesson.evidence = evidence2109;
    data.lesson.pdf = "site/21.09.26.html";
    data.lesson.tex = "tex_docs/21.09.26.tex";

    const evidence2409 = "На занятии 24.09.26 отработано составление математической модели задач на движение через таблицу v–t–S: равномерное и встречное движение, неодновременный старт, догонка, движение с разворотом, перевод единиц и проверка ответа по смыслу.";
    const ids2409 = new Set([
      "text_01","text_02","text_03","text_20","text_22","app_03"
    ]);
    data.groups.flatMap(group => group.items).forEach(item => {
      if (!ids2409.has(item.id)) return;
      item.status = "covered";
      item.level = Math.max(Number(item.level || 0), 2);
      item.evidence = item.evidence || {};
      item.evidence.text = evidence2409;
      item.evidence.href = "24.09.26.html";
      item.evidence.texHref = "../tex_docs/24.09.26.tex";
    });

    data.lesson.date = "24.09.26";
    data.lesson.title = "Текстовые задачи на движение";
    data.lesson.evidence = evidence2409;
    data.lesson.pdf = "site/24.09.26.html";
    data.lesson.tex = "tex_docs/24.09.26.tex";

    const evidence2809 = "На занятии 28.09.26 отработаны движение по круговой трассе через разность путей, движение по воде с собственной скоростью и течением, задачи с плотом и стоянкой, а также средняя скорость как отношение всего пути ко всему времени; отдельно сопоставлены случаи равного времени и равного пути.";
    const ids2809 = new Set([
      "text_05","text_06","text_07","text_20","text_22"
    ]);
    data.groups.flatMap(group => group.items).forEach(item => {
      if (!ids2809.has(item.id)) return;
      item.status = "covered";
      item.level = Math.max(Number(item.level || 0), 2);
      item.evidence = item.evidence || {};
      item.evidence.text = evidence2809;
      item.evidence.href = "28.09.26.html";
      item.evidence.texHref = "../tex_docs/28.09.26.tex";
    });

    data.lesson.date = "28.09.26";
    data.lesson.title = "Круговая трасса, движение по воде и средняя скорость";
    data.lesson.evidence = evidence2809;
    data.lesson.pdf = "site/28.09.26.html";
    data.lesson.tex = "tex_docs/28.09.26.tex";

    const evidence0510 = "На занятии 05.10.26 отработаны задачи на производительность через модель A=pt и таблицу «производительность — время — работа»: совместная работа, трубы и резервуары, противоположные процессы, изменение состава бригад и составление смыслового уравнения; отдельно разобран приём поиска суммы производительностей трёх исполнителей по попарным условиям.";
    const ids0510 = new Set(["text_09","text_10","text_11","text_12","text_20","text_22"]);
    data.groups.flatMap(group => group.items).forEach(item => {
      if (!ids0510.has(item.id)) return;
      item.status = "covered";
      item.level = Math.max(Number(item.level || 0), 2);
      item.evidence = item.evidence || {};
      item.evidence.text = evidence0510;
      item.evidence.href = "05.10.26.html";
      item.evidence.texHref = "../tex_docs/05.10.26.tex";
    });

    data.lesson.date = "05.10.26";
    data.lesson.title = "Задачи на производительность";
    data.lesson.evidence = evidence0510;
    data.lesson.pdf = "site/05.10.26.html";
    data.lesson.tex = "tex_docs/05.10.26.tex";
  })();

(() => {
  'use strict';
  const data=window.COMPETENCY_MAP_DATA;
  if(!data||!Array.isArray(data.groups)){
    throw new Error('Nastya Pavlova mastery authority requires loaded competency catalog');
  }
  const levels={};
  for(const group of data.groups){
    if(!group||!Array.isArray(group.items))continue;
    for(const item of group.items){
      if(!item||typeof item.id!=='string'||!item.id){
        throw new Error('Nastya Pavlova mastery authority found competency without stable id');
      }
      const level=Number(item.level);
      if(!Number.isInteger(level)||level<0||level>4){
        throw new Error('Nastya Pavlova mastery authority found invalid level for '+item.id);
      }
      if(Object.prototype.hasOwnProperty.call(levels,item.id)){
        throw new Error('Nastya Pavlova mastery authority found duplicate id: '+item.id);
      }
      levels[item.id]=level;
    }
  }
  window.STUDENT_MASTERY_AUTHORITY={
    version:1,
    basis:'Repository-authored baseline levels after dated lesson overlays 10.09–28.09 and before the EGE-2027 runtime catalog transform.',
    levels
  };
})();
