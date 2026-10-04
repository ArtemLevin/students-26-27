(() => {
  "use strict";
  const data=window.COMPETENCY_MAP_DATA;
  if(!data||!Array.isArray(data.groups)){
    throw new Error("Matvey Gorbachev mastery authority requires loaded competency catalog");
  }
  const expectedTitleToId={
  "Алгебраические дроби и общий знаменатель": "algebra_17",
  "Анализ размерностей": "modeling_09",
  "Вектор и его координаты": "vectors_06",
  "Векторный метод в геометрии": "vectors_14",
  "Выбор переменной в прикладной модели": "modeling_01",
  "Высота треугольника": "plan_basic_13",
  "Граничные точки и строгие знаки": "inequalities_17",
  "Действия с рациональными показателями": "powers_15",
  "Десятичные дроби": "numbers_06",
  "Десятичные показатели степени": "powers_16",
  "Длина вектора": "vectors_07",
  "Дробная степень": "powers_08",
  "Задачи на проценты": "text_10",
  "Задачи на физические формулы": "text_13",
  "Интерпретация математического результата": "modeling_15",
  "Интерпретация ответа в условиях задачи": "text_17",
  "Квадратные неравенства": "inequalities_02",
  "Квадратные уравнения по дискриминанту": "equations_07",
  "Коллинеарность векторов": "vectors_12",
  "Координатный метод в планиметрии": "vectors_13",
  "Координаты середины отрезка": "vectors_03",
  "Координаты точки на плоскости": "vectors_01",
  "Корень в знаменателе": "powers_12",
  "Корень как дробная степень": "powers_09",
  "Корни чётной степени и ОДЗ": "powers_10",
  "Линейная функция и коэффициенты": "functions_08",
  "Медиана треугольника": "plan_basic_11",
  "Определение допустимого диапазона параметра": "modeling_05",
  "Отбор корней и проверка": "equations_20",
  "Отрицательная степень": "powers_07",
  "Перевод условия в формулы": "modeling_02",
  "Подстановка одной формулы в другую": "modeling_03",
  "Показательная функция": "functions_13",
  "Показательные уравнения с общим основанием": "equations_14",
  "Преобразование составных чисел в степени простых": "powers_13",
  "Преобразования графика y=f(x)+b": "functions_16",
  "Приведение степеней к общему основанию": "powers_14",
  "Проверка граничных значений": "modeling_12",
  "Проверка реалистичности ответа": "modeling_14",
  "Произведение степеней с одинаковым основанием": "powers_01",
  "Проценты и доли": "numbers_07",
  "Прямоугольник": "plan_basic_17",
  "Равносильные преобразования уравнений": "equations_19",
  "Расстояние между точками": "vectors_02",
  "Скалярное произведение": "vectors_10",
  "Сложение и вычитание векторов": "vectors_08",
  "Составление неравенства из ограничения": "modeling_07",
  "Составление уравнения из физической модели": "modeling_06",
  "Составление уравнения по тексту": "text_15",
  "Степень степени": "powers_03",
  "Теорема Пифагора": "plan_basic_09",
  "Угол между векторами": "vectors_11",
  "Умножение вектора на число": "vectors_09",
  "Уравнения с дробями": "equations_03",
  "Частное степеней с одинаковым основанием": "powers_02"
};
  const byTitle=new Map();
  for(const group of data.groups){
    for(const item of group.items||[]){
      if(!byTitle.has(item.title))byTitle.set(item.title,[]);
      byTitle.get(item.title).push(item.id);
    }
  }
  for(const [title,expectedId] of Object.entries(expectedTitleToId)){
    const ids=byTitle.get(title)||[];
    if(ids.length!==1||ids[0]!==expectedId){
      throw new Error("Matvey mastery title mapping changed: "+title+" -> "+ids.join(","));
    }
  }
})();

(()=>{"use strict";const d=window.COMPETENCY_MAP_DATA;if(!d)return;const covered=new Set(["Показательные уравнения с общим основанием","Равносильные преобразования уравнений","Отбор корней и проверка","Задачи на физические формулы","Перевод условия в формулы","Подстановка одной формулы в другую","Составление уравнения из физической модели","Составление неравенства из ограничения","Проверка граничных значений","Интерпретация математического результата"]);const reinforced=new Set(["Произведение степеней с одинаковым основанием","Частное степеней с одинаковым основанием","Степень степени","Отрицательная степень","Дробная степень","Корень как дробная степень","Корни чётной степени и ОДЗ","Корень в знаменателе","Преобразование составных чисел в степени простых","Приведение степеней к общему основанию","Действия с рациональными показателями","Десятичные показатели степени"]);for(const g of d.groups)for(const item of g.items){if(covered.has(item.title)){item.level=Math.max(2,item.level||0);item.status="covered"}if(covered.has(item.title)||reinforced.has(item.title)){item.evidence=Array.isArray(item.evidence)?item.evidence:[];if(!item.evidence.some(e=>e.date==="17.09.26"))item.evidence.push({date:"17.09.26",text:"Навык разбирался и закреплялся на занятии по показательным уравнениям и прикладным задачам.",href:"17.09.26.html"})}}const graphCovered=new Set(["Линейная функция и коэффициенты","Показательная функция","Преобразования графика y=f(x)+b"]);const graphReinforced=new Set(["Степень степени","Отрицательная степень","Дробная степень","Корень как дробная степень","Действия с рациональными показателями"]);for(const g of d.groups)for(const item of g.items){if(graphCovered.has(item.title)){item.level=Math.max(2,item.level||0);item.status="covered"}if(graphCovered.has(item.title)||graphReinforced.has(item.title)){item.evidence=Array.isArray(item.evidence)?item.evidence:[];if(!item.evidence.some(e=>e.date==="20.09.26"))item.evidence.push({date:"20.09.26",text:"Навык разбирался или применялся на занятии по графикам функций и методу узловых точек.",href:"20.09.26.html"})}}const vectorCovered=new Set(["Вектор и его координаты","Длина вектора","Сложение и вычитание векторов","Умножение вектора на число","Скалярное произведение","Угол между векторами","Коллинеарность векторов","Координатный метод в планиметрии","Векторный метод в геометрии"]);const vectorReinforced=new Set(["Координаты точки на плоскости","Расстояние между точками","Координаты середины отрезка","Теорема Пифагора","Прямоугольник","Высота треугольника","Медиана треугольника"]);for(const g of d.groups)for(const item of g.items){if(vectorCovered.has(item.title)){item.level=Math.max(2,item.level||0);item.status="covered"}if(vectorCovered.has(item.title)||vectorReinforced.has(item.title)){item.evidence=Array.isArray(item.evidence)?item.evidence:[];if(!item.evidence.some(e=>e.date==="24.09.26"))item.evidence.push({date:"24.09.26",text:"Навык разбирался или применялся на занятии по векторам и координатному методу.",href:"24.09.26.html"})}}const appliedEvidence=new Map([
["Квадратные уравнения по дискриминанту","27.09.26.html#roots"],
["Отбор корней и проверка","27.09.26.html#roots"],
["Квадратные неравенства","27.09.26.html#practice"],
["Задачи на проценты","27.09.26.html#models"],
["Задачи на физические формулы","27.09.26.html#models"],
["Составление уравнения по тексту","27.09.26.html#route"],
["Интерпретация ответа в условиях задачи","27.09.26.html#route"],
["Выбор переменной в прикладной модели","27.09.26.html#route"],
["Перевод условия в формулы","27.09.26.html#route"],
["Подстановка одной формулы в другую","27.09.26.html#models"],
["Определение допустимого диапазона параметра","27.09.26.html#dependence"],
["Составление уравнения из физической модели","27.09.26.html#models"],
["Составление неравенства из ограничения","27.09.26.html#route"],
["Анализ размерностей","27.09.26.html#route"],
["Проверка граничных значений","27.09.26.html#dependence"],
["Проверка реалистичности ответа","27.09.26.html#roots"],
["Интерпретация математического результата","27.09.26.html#roots"]
]);const appliedReinforced=new Map([
["Десятичные дроби","27.09.26.html#models"],
["Проценты и доли","27.09.26.html#models"],
["Алгебраические дроби и общий знаменатель","27.09.26.html#models"],
["Уравнения с дробями","27.09.26.html#models"],
["Равносильные преобразования уравнений","27.09.26.html#roots"],
["Граничные точки и строгие знаки","27.09.26.html#practice"]
]);for(const g of d.groups)for(const item of g.items){const href=appliedEvidence.get(item.title)||appliedReinforced.get(item.title);if(href){item.evidence=Array.isArray(item.evidence)?item.evidence:[];if(!item.evidence.some(e=>e.date==="27.09.26"))item.evidence.push({date:"27.09.26",text:"Навык разбирался или применялся на занятии по прикладным формулам, единицам, квадратным уравнениям и отбору корней.",href})}}

const motionEvidence=new Map([
["Задачи на движение по прямой","04.10.26.html#types"],
["Задачи на движение навстречу","04.10.26.html#meeting"],
["Задачи на движение вдогонку","04.10.26.html#chase"],
["Задачи на движение по воде","04.10.26.html#water"],
["Задачи на среднюю скорость","04.10.26.html#average"],
["Составление уравнения по тексту","04.10.26.html#route"],
["Интерпретация ответа в условиях задачи","04.10.26.html#errors"],
["Выбор переменной в прикладной модели","04.10.26.html#route"],
["Перевод условия в формулы","04.10.26.html#route"],
["Анализ размерностей","04.10.26.html#route"],
["Проверка реалистичности ответа","04.10.26.html#errors"],
["Интерпретация математического результата","04.10.26.html#errors"]
]);
const motionAssessed=new Set([
"Задачи на движение навстречу",
"Задачи на движение вдогонку",
"Задачи на движение по воде",
"Составление уравнения по тексту",
"Выбор переменной в прикладной модели",
"Анализ размерностей"
]);
for(const g of d.groups)for(const item of g.items){
  const href=motionEvidence.get(item.title);
  if(href){
    if(motionAssessed.has(item.title)){
      item.level=Math.max(2,item.level||0);
      item.status="covered";
    }
    item.evidence=Array.isArray(item.evidence)?item.evidence:[];
    if(!item.evidence.some(e=>e.date==="04.10.26")){
      item.evidence.push({date:"04.10.26",text:"Навык разбирался или проверялся на занятии по текстовым задачам на движение табличным методом v–t–S.",href});
    }
  }
}

const stablePrefix="matvey_gorbachev-ege-profile-math";try{const suffixes=["-competency-map","-repeat","-theme"],legacyPrefixes=["matvey_gorbachev-ege-profile-math-20260927","matvey_gorbachev-ege-profile-math-20260924","matvey_gorbachev-ege-profile-math-20260920","matvey_gorbachev-ege-profile-math-20260917"];for(const suffix of suffixes){const stableKey=stablePrefix+suffix;if(localStorage.getItem(stableKey)==null){for(const legacy of legacyPrefixes){const value=localStorage.getItem(legacy+suffix);if(value!=null){localStorage.setItem(stableKey,value);break}}}}}catch(e){}
d.student.name="Матвей Горбачев";d.updated="04.10.2026";d.storagePrefix=stablePrefix;d.nextAfterBaseline="functions_09";d.materials=[{date:"13.09.26",title:"Алгебраическая база и степени",pdf:"../pdf_docs/13.09.26.pdf",tex:"../tex_docs/13.09.26.tex"}]})();

(() => {
  "use strict";
  const data=window.COMPETENCY_MAP_DATA;
  const levels={};
  for(const group of data.groups){
    for(const item of group.items||[]){
      if(!item||typeof item.id!=="string"||!item.id){
        throw new Error("Matvey mastery authority found competency without stable id");
      }
      const level=Number(item.level);
      if(!Number.isInteger(level)||level<0||level>4){
        throw new Error("Matvey mastery authority found invalid level for "+item.id);
      }
      if(Object.prototype.hasOwnProperty.call(levels,item.id)){
        throw new Error("Matvey mastery authority found duplicate id: "+item.id);
      }
      levels[item.id]=level;
    }
  }
  window.STUDENT_MASTERY_AUTHORITY={
    version:1,
    basis:"Repository-authored baseline levels after ambiguity-checked lesson overlays through 04.10.",
    titleMappingCount:55,
    levels
  };
})();
