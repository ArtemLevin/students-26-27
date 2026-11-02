export const LESSONS=[
  {
    "date": "2026-11-02",
    "ktpRefs": [],
    "href": "02.11.26.html",
    "title": "Квадратные уравнения и преобразования",
    "navTitle": "Квадратные уравнения и преобразования",
    "navSubtitle": "Квадратные уравнения, дискриминант, вынесение общего множителя, неполные квадратные уравнения, подобные слагаемые и Путь Б: 60 заданий с 3 по 8 ноября.",
    "summary": "Квадратные уравнения, дискриминант, вынесение общего множителя, неполные квадратные уравнения, подобные слагаемые и Путь Б: 60 заданий с 3 по 8 ноября.",
    "topics": [
      "Квадратные уравнения и дискриминант",
      "Неполные квадратные уравнения",
      "Вынесение общего множителя",
      "Приведение подобных слагаемых",
      "Знаки, скобки и чётность степени"
    ],
    "outcomes": [
      {
        "competencyId": "oge_8_1_1",
        "evidenceAnchor": "signs",
        "relation": "practiced"
      },
      {
        "competencyId": "oge_9_1_3",
        "evidenceAnchor": "signs",
        "relation": "practiced"
      },
      {
        "competencyId": "oge_9_2_2",
        "evidenceAnchor": "method",
        "relation": "practiced"
      },
      {
        "competencyId": "oge_9_2_3",
        "evidenceAnchor": "discriminant",
        "relation": "practiced"
      },
      {
        "competencyId": "oge_9_2_4",
        "evidenceAnchor": "discriminant",
        "relation": "touched"
      },
      {
        "competencyId": "oge_8_3_2",
        "evidenceAnchor": "factoring",
        "relation": "practiced"
      },
      {
        "competencyId": "oge_8_2_1",
        "evidenceAnchor": "incomplete",
        "relation": "practiced"
      }
    ],
    "materials": {
      "html": "02.11.26.html",
      "pdf": "../pdf_docs/02.11.26.pdf",
      "tex": "../tex_docs/02.11.26.tex"
    }
  },
  {
    "date": "2026-10-26",
    "ktpRefs": [],
    "href": "26.10.26.html",
    "title": "От пропорции к уравнению .",
    "navTitle": "От пропорции к уравнению .",
    "navSubtitle": "Занятие Володи Хачатуряна от 26 октября 2026 года: пропорции, преобразование формул, дробные уравнения, минусы и правило ВУПС. Путь Б — 60 заданий за шесть дней.",
    "summary": "Занятие Володи Хачатуряна от 26 октября 2026 года: пропорции, преобразование формул, дробные уравнения, минусы и правило ВУПС. Путь Б — 60 заданий за шесть дней.",
    "topics": [
      "Пропорции и диагональный перенос",
      "Выражение величин из физических формул",
      "Линейные и дробные уравнения",
      "Работа с отрицательными коэффициентами",
      "Скобки и правило ВУПС"
    ],
    "outcomes": [
      {
        "competencyId": "oge_9_1_1",
        "evidenceAnchor": "linear",
        "relation": "practiced"
      },
      {
        "competencyId": "oge_9_1_2",
        "evidenceAnchor": "fraction-equations",
        "relation": "touched"
      },
      {
        "competencyId": "oge_9_1_3",
        "evidenceAnchor": "negative",
        "relation": "practiced"
      },
      {
        "competencyId": "oge_9_1_4",
        "evidenceAnchor": "fraction-equations",
        "relation": "touched"
      },
      {
        "competencyId": "oge_12_1_4",
        "evidenceAnchor": "physics",
        "relation": "practiced"
      },
      {
        "competencyId": "oge_8_3_2",
        "evidenceAnchor": "wups",
        "relation": "practiced"
      },
      {
        "competencyId": "oge_20_1_2",
        "evidenceAnchor": "denominator",
        "relation": "touched"
      },
      {
        "competencyId": "oge_6_1_3",
        "evidenceAnchor": "negative",
        "relation": "practiced"
      }
    ],
    "materials": {
      "html": "26.10.26.html",
      "pdf": "../pdf_docs/26.10.26.pdf",
      "tex": "../tex_docs/26.10.26.tex"
    }
  }
];

export function compareLessonsNewestFirst(left,right){return right.date.localeCompare(left.date);}
export function sortedLessons(lessons=LESSONS){return [...lessons].sort(compareLessonsNewestFirst);}
export function getLatestLesson(lessons=LESSONS){return sortedLessons(lessons)[0]||null;}
export function getLessonByDate(date,lessons=LESSONS){return lessons.find(item=>item.date===date)||null;}
