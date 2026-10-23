export const LESSONS=[
{
  "date": "2026-10-23",
  "ktpRefs": [],
  "href": "23.10.26.html",
  "title": "Степени и их свойства",
  "navTitle": "Степени и их свойства",
  "navSubtitle": "Степени и их свойства: правила преобразования, показательные уравнения, дробные и отрицательные показатели, десять упражнений с ответами. Занятие Даниила Хрястова от 23 октября 2026 года.",
  "summary": "Степени и их свойства: правила преобразования, показательные уравнения, дробные и отрицательные показатели, десять упражнений с ответами. Занятие Даниила Хрястова от 23 октября 2026 года.",
  "topics": [
    "Степени с целыми и рациональными показателями",
    "Преобразование степенных и показательных выражений",
    "Показательные уравнения"
  ],
  "outcomes": [
    {
      "competencyId": "calc_09",
      "evidenceAnchor": "rules",
      "relation": "touched"
    },
    {
      "competencyId": "calc_10",
      "evidenceAnchor": "fractions",
      "relation": "touched"
    },
    {
      "competencyId": "expr_12",
      "evidenceAnchor": "common-base",
      "relation": "touched"
    },
    {
      "competencyId": "expr_13",
      "evidenceAnchor": "roots",
      "relation": "touched"
    },
    {
      "competencyId": "expr_15",
      "evidenceAnchor": "worked",
      "relation": "touched"
    },
    {
      "competencyId": "eq_09",
      "evidenceAnchor": "equations",
      "relation": "touched"
    }
  ],
  "materials": {
    "html": "23.10.26.html",
    "pdf": "../pdf_docs/23.10.26.pdf",
    "tex": "../tex_docs/23.10.26.tex"
  }
}];

export function compareLessonsNewestFirst(left,right){return right.date.localeCompare(left.date);}
export function sortedLessons(lessons=LESSONS){return [...lessons].sort(compareLessonsNewestFirst);}
export function getLatestLesson(lessons=LESSONS){return sortedLessons(lessons)[0]||null;}
export function getLessonByDate(date,lessons=LESSONS){return lessons.find(item=>item.date===date)||null;}
