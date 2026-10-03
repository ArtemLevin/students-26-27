export const LESSONS=[
{
  "date": "2026-10-02",
  "href": "02.10.26.html",
  "title": "Степени",
  "summary": "Занятие Анны Банновой по степеням: восемь свойств, границы применимости, перевод составных чисел, корней и дробей в степенной вид, алгоритм преобразований и тренировка.",
  "topics": [
    "степени",
    "свойства степеней",
    "нулевая и отрицательная степень",
    "дробный показатель",
    "корни",
    "перевод в степенной вид",
    "преобразование степенных выражений"
  ],
  "ktpRefs": [
    "ktp-027",
    "ktp-029",
    "ktp-030"
  ],
  "outcomes": [
    {
      "competencyId": "calc_09",
      "evidenceAnchor": "lesson-evidence",
      "relation": "assessed"
    },
    {
      "competencyId": "expr_12",
      "evidenceAnchor": "lesson-evidence",
      "relation": "assessed"
    },
    {
      "competencyId": "calc_10",
      "evidenceAnchor": "roots",
      "relation": "practiced"
    },
    {
      "competencyId": "calc_12",
      "evidenceAnchor": "roots",
      "relation": "practiced"
    },
    {
      "competencyId": "expr_13",
      "evidenceAnchor": "roots",
      "relation": "practiced"
    }
  ],
  "materials": {
    "html": "02.10.26.html",
    "pdf": "../pdf_docs/02.10.26.pdf",
    "tex": "../tex_docs/02.10.26.tex"
  }
}];

export function compareLessonsNewestFirst(left,right){return right.date.localeCompare(left.date);}
export function sortedLessons(lessons=LESSONS){return [...lessons].sort(compareLessonsNewestFirst);}
export function getLatestLesson(lessons=LESSONS){return sortedLessons(lessons)[0]||null;}
export function getLessonByDate(date,lessons=LESSONS){return lessons.find(item=>item.date===date)||null;}
