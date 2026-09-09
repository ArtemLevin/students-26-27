(() => {
'use strict';

const groupDefs = window.EKATERINA_EGE_GROUP_DEFS || [];
if (groupDefs.length !== 20) throw new Error(`Ожидалось 20 секторов, получено ${groupDefs.length}`);

const coveredTitles = new Set(["Десятичные показатели степени","Дробная степень","Нулевая степень","ОДЗ выражений с корнями и степенями","Отрицательная степень","Переход от корня к дробной степени","Преобразование корней","Приведение оснований к единому степенному виду","Разложение чисел на простые множители","Свойство произведения степеней с одинаковым основанием","Свойство частного степеней с одинаковым основанием","Степень произведения","Степень степени","Степень частного"]);

const evidence = {
  date:'08.09.26',
  text:'Тема явно отработана в чек-листе и web-конспекте занятия 08.09.26 «Степени, корни и приведение к единому степенному виду».',
  web:'08.09.26.html',
  pdf:'../pdf_docs/08.09.26.pdf',
  tex:'../tex_docs/08.09.26.tex'
};

const groups = groupDefs.map((def, groupIndex) => {
  const number = groupIndex + 1;
  const groupId = `ege27_${String(number).padStart(2,'0')}`;
  return {
    id: groupId,
    short: def.short,
    title: def.title,
    summary: def.summary,
    items: def.titles.map((title, itemIndex) => {
      const level = number === 8 && coveredTitles.has(title) ? 2 : 0;
      const id = `${groupId}_${String(itemIndex + 1).padStart(3,'0')}`;
      return {
        id,
        title,
        description: `${title}. Конкретный навык сектора «${def.title}»: распознать тип задачи, выбрать корректный метод и получить проверяемый результат.`,
        diagnostic: def.diagnosticTemplate.replace('{title}', title),
        level,
        ...(level ? {evidence:[{...evidence}]} : {})
      };
    })
  };
});

window.COMPETENCY_MAP_DATA = {
  meta:{
    student:'ekaterina_gnedkova',
    studentName:'Екатерина Гнедкова',
    teacher:'Лёвин Артём Александрович',
    program:'подготовка к ЕГЭ по профильной математике',
    examVersion:'проект ЕГЭ-2027',
    updated:'09.09.26',
    sourceNote:'Структура актуализирована по проектам документов ФИПИ ЕГЭ-2027; в 2027 году предусмотрено 20 заданий, включая новые линии 6, 13 и 17.'
  },
  storage:{
    levels:'ekaterina_gnedkova-ege_profile_2027-competency-map',
    repeat:'ekaterina_gnedkova-ege_profile_2027-repeat',
    theme:'ekaterina_gnedkova-ege_profile_2027-theme'
  },
  materials:[{
    date:'08.09.26',
    title:'Степени, корни и приведение к единому степенному виду',
    summary:'Вычисления и преобразования: свойства степеней, дробные и отрицательные показатели, корни, приведение оснований к общему виду и ОДЗ.',
    web:'08.09.26.html',
    pdf:'../pdf_docs/08.09.26.pdf',
    tex:'../tex_docs/08.09.26.tex'
  }],
  repeatTopics:[],
  groups
};

delete window.EKATERINA_EGE_GROUP_DEFS;
})();