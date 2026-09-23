(() => {
'use strict';
const groupDefs = window.EKATERINA_EGE_GROUP_DEFS || [];
if (groupDefs.length !== 20) throw new Error(`Ожидалось 20 секторов, получено ${groupDefs.length}`);

const coveredTitles = new Set([
  "Десятичные показатели степени","Дробная степень","Нулевая степень",
  "ОДЗ выражений с корнями и степенями","Отрицательная степень",
  "Переход от корня к дробной степени","Преобразование корней",
  "Приведение оснований к единому степенному виду","Разложение чисел на простые множители",
  "Свойство произведения степеней с одинаковым основанием",
  "Свойство частного степеней с одинаковым основанием","Степень произведения",
  "Степень степени","Степень частного"
]);
const masteredPowerTitles = new Set([
  "Десятичные показатели степени","Дробная степень","Отрицательная степень",
  "Приведение оснований к единому степенному виду","Разложение чисел на простые множители",
  "Свойство произведения степеней с одинаковым основанием",
  "Свойство частного степеней с одинаковым основанием","Степень произведения",
  "Степень степени","Степень частного"
]);
const equationTitles = new Set(["Показательные уравнения с одинаковыми основаниями"]);
const formulaTitles = new Set(["Подстановка чисел в формулу","Выражение неизвестной величины из формулы","Степенная зависимость в прикладной формуле"]);
const lesson1909PowerTitles = new Set([
  "Преобразование обыкновенных и десятичных дробей",
  "Десятичные показатели степени","Нулевая степень","Отрицательная степень",
  "Приведение оснований к единому степенному виду",
  "Свойство произведения степеней с одинаковым основанием",
  "Свойство частного степеней с одинаковым основанием",
  "Степень произведения","Степень степени","Степень частного"
]);
const graphTitles = new Set(["Чтение значения функции по графику","Графики показательных функций"]);
const vectorTitles = new Set([
  "Координаты вектора по координатам точек",
  "Длина вектора по координатам",
  "Сложение и вычитание векторов",
  "Умножение вектора на число",
  "Координаты линейной комбинации векторов",
  "Скалярное произведение в координатах",
  "Угол между векторами через скалярное произведение",
  "Перпендикулярность векторов"
]);
const vectorSupportTitles = new Set(["Векторный метод в планиметрии"]);

const evidence0809={date:'08.09.26',text:'Тема явно отработана в чек-листе и web-конспекте занятия 08.09.26 «Степени, корни и приведение к единому степенному виду».',web:'08.09.26.html',pdf:'../pdf_docs/08.09.26.pdf',tex:'../tex_docs/08.09.26.tex'};
const evidence1109={date:'11.09.26',text:'Навык закреплён в чек-листе и интерактивном занятии 11.09.26 «Степенные преобразования и показательные уравнения».',web:'11.09.26.html',pdf:'../pdf_docs/11.09.26.pdf',tex:'../tex_docs/11.09.26.tex'};
const evidence1509={date:'15.09.26',text:'Навык применён в прикладных задачах со степенями: перевод условия в формулу, факторизация, работа с порядком десятки, дробной и отрицательной степенью и проверка смысла ответа.',web:'15.09.26.html',lab:'15.09.26-lab.html',pdf:'../pdf_docs/15.09.26.pdf',tex:'../tex_docs/15.09.26.tex'};
const evidence1909={date:'19.09.26',text:'Навык отработан на занятии 19.09.26: свойства степеней и стандартный вид числа применялись в прикладных формулах; показательная функция восстанавливалась по узловым точкам с проверкой найденной формулы.',web:'19.09.26.html',lab:'19.09.26-lab.html',pdf:'../pdf_docs/19.09.26.pdf',tex:'../tex_docs/19.09.26.tex'};
const evidence2209={date:'22.09.26',text:'Навык отработан на занятии 22.09.26 «Векторы»: координаты и длина, покоординатные действия, линейная комбинация, скалярное произведение, угол и признак перпендикулярности; в геометрическом примере применено правило треугольника.',web:'22.09.26.html',tex:'../tex_docs/22.09.26.tex'};

const groups=groupDefs.map((def,groupIndex)=>{
  const number=groupIndex+1;
  const groupId=`ege27_${String(number).padStart(2,'0')}`;
  return{
    id:groupId,
    short:def.short,
    title:def.title,
    summary:def.summary,
    items:def.titles.map((title,itemIndex)=>{
      const isPowerSkill=number===8&&coveredTitles.has(title);
      const isMasteredPower=number===8&&masteredPowerTitles.has(title);
      const isEquationSkill=number===7&&equationTitles.has(title);
      const isFormulaSkill=number===10&&formulaTitles.has(title);
      const isLesson1909Power=number===8&&lesson1909PowerTitles.has(title);
      const isGraphSkill=number===12&&graphTitles.has(title);
      const isVectorSkill=number===2&&vectorTitles.has(title);
      const isVectorSupport=number===2&&vectorSupportTitles.has(title);

      const level=isMasteredPower?4:
        isVectorSkill?3:
        isPowerSkill?3:
        isLesson1909Power?3:
        isFormulaSkill?3:
        isGraphSkill?3:
        isVectorSupport?2:
        isEquationSkill?2:0;

      const evidence=[];
      if(isMasteredPower) evidence.push({...evidence0809},{...evidence1109},{...evidence1509});
      else if(isPowerSkill) evidence.push({...evidence0809},{...evidence1109});
      else if(isFormulaSkill) evidence.push({...evidence1509});
      else if(isEquationSkill) evidence.push({...evidence1109});

      if(isLesson1909Power||isGraphSkill||isFormulaSkill||isEquationSkill) evidence.push({...evidence1909});
      if(isVectorSkill||isVectorSupport) evidence.push({...evidence2209});

      const id=`${groupId}_${String(itemIndex+1).padStart(3,'0')}`;
      return{
        id,title,
        description:`${title}. Конкретный навык сектора «${def.title}»: распознать тип задачи, выбрать корректный метод и получить проверяемый результат.`,
        diagnostic:def.diagnosticTemplate.replace('{title}',title),
        level,
        ...(evidence.length?{evidence}:{})
      };
    })
  };
});

window.COMPETENCY_MAP_DATA={
  meta:{
    student:'ekaterina_gnedkova',
    studentName:'Екатерина Гнедкова',
    teacher:'Лёвин Артём Александрович',
    program:'подготовка к ЕГЭ по профильной математике',
    examVersion:'проект ЕГЭ-2027',
    updated:'22.09.26',
    sourceNote:'Структура актуализирована по проектам документов ФИПИ ЕГЭ-2027; подтверждённые уровни уточняются по материалам занятий.'
  },
  storage:{
    levels:'ekaterina_gnedkova-ege_profile_2027-competency-map',
    repeat:'ekaterina_gnedkova-ege_profile_2027-repeat',
    theme:'ekaterina_gnedkova-ege_profile_2027-theme'
  },
  materials:[
    {date:'22.09.26',title:'Векторы',summary:'Координаты и длина вектора, действия и линейная комбинация, скалярное произведение, угол, перпендикулярность и геометрическое сложение.',web:'22.09.26.html',tex:'../tex_docs/22.09.26.tex'},
    {date:'19.09.26',title:'Степени и показательная функция',summary:'Свойства степеней, стандартный вид числа, прикладные степенные зависимости, показательная функция и метод узловых точек.',web:'19.09.26.html',lab:'19.09.26-lab.html',pdf:'../pdf_docs/19.09.26.pdf',tex:'../tex_docs/19.09.26.tex'},
    {date:'15.09.26',title:'Степени в прикладных задачах',summary:'Перевод текста в формулу, степенной вид, факторизация, порядок десятки, обратные показатели и проверка допустимого ответа.',web:'15.09.26.html',lab:'15.09.26-lab.html',pdf:'../pdf_docs/15.09.26.pdf',tex:'../tex_docs/15.09.26.tex'},
    {date:'11.09.26',title:'Степенные преобразования и показательные уравнения',summary:'Единые основания и показатели, вынесение общей степени, обратный показатель, ОДЗ и четыре схемы показательных уравнений.',web:'11.09.26.html',lab:'11.09.26-lab.html',pdf:'../pdf_docs/11.09.26.pdf',tex:'../tex_docs/11.09.26.tex'},
    {date:'08.09.26',title:'Степени, корни и приведение к единому степенному виду',summary:'Вычисления и преобразования: свойства степеней, дробные и отрицательные показатели, корни, приведение оснований к общему виду и ОДЗ.',web:'08.09.26.html',pdf:'../pdf_docs/08.09.26.pdf',tex:'../tex_docs/08.09.26.tex'}
  ],
  repeatTopics:[],
  groups
};
delete window.EKATERINA_EGE_GROUP_DEFS;
})();