export const LESSONS=[
{
  "date": "2026-10-16",
  "ktpRefs": [],
  "href": "16.10.26.html",
  "title": "Степени. Практика.",
  "navTitle": "Степени. Практика.",
  "navSubtitle": "Степени и показательная функция: свойства, вычисления, прикладные задачи, метод опорных точек, тренировка из 10 заданий. Занятие Дениса Ермолаева от 16 октября 2026 года.",
  "summary": "Степени и показательная функция: свойства, вычисления, прикладные задачи, метод опорных точек, тренировка из 10 заданий. Занятие Дениса Ермолаева от 16 октября 2026 года.",
  "topics": [
    "Свойства степеней с целыми и дробными показателями",
    "Преобразование показательных выражений",
    "Прикладные задачи на степени и показательные уравнения",
    "Показательная функция и метод опорных точек"
  ],
  "outcomes": [
    {
      "competencyId": "calc_09",
      "evidenceAnchor": "theory",
      "relation": "touched"
    },
    {
      "competencyId": "calc_10",
      "evidenceAnchor": "calc-roots",
      "relation": "practiced"
    },
    {
      "competencyId": "expr_12",
      "evidenceAnchor": "calc-powers",
      "relation": "practiced"
    },
    {
      "competencyId": "expr_15",
      "evidenceAnchor": "calc-negative",
      "relation": "practiced"
    },
    {
      "competencyId": "eq_09",
      "evidenceAnchor": "decay",
      "relation": "touched"
    },
    {
      "competencyId": "text_17",
      "evidenceAnchor": "two-states",
      "relation": "practiced"
    },
    {
      "competencyId": "func_13",
      "evidenceAnchor": "graph-points",
      "relation": "touched"
    }
  ],
  "materials": {
    "html": "16.10.26.html",
    "pdf": "../pdf_docs/16.10.26.pdf",
    "tex": "../tex_docs/16.10.26.tex",
    "lab": "16.10.26-lab.html"
  }
}];

export function compareLessonsNewestFirst(left,right){return right.date.localeCompare(left.date);}
export function sortedLessons(lessons=LESSONS){return [...lessons].sort(compareLessonsNewestFirst);}
export function getLatestLesson(lessons=LESSONS){return sortedLessons(lessons)[0]||null;}
export function getLessonByDate(date,lessons=LESSONS){return lessons.find(item=>item.date===date)||null;}
