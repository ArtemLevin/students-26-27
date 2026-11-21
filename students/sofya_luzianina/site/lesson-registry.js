export const LESSONS=[
{
  "date": "2026-11-20",
  "ktpRefs": [
    "ktp-002",
    "ktp-005"
  ],
  "href": "20.11.26.html",
  "title": "Наклонная плоскость. Упругий удар",
  "navTitle": "Наклонная плоскость. Упругий удар",
  "navSubtitle": "София Лузянина: урок физики 20 ноября 2026 года. Кинематика шайбы на наклонной плоскости, упругий отскок от плиты, геометрия углов, энергия, 10 задач и цифровая лаборатория.",
  "summary": "София Лузянина: урок физики 20 ноября 2026 года. Кинематика шайбы на наклонной плоскости, упругий отскок от плиты, геометрия углов, энергия, 10 задач и цифровая лаборатория.",
  "topics": [
    "Кинематика шайбы на наклонной плоскости",
    "Уравнения движения и проекции скорости",
    "Абсолютно упругий удар о наклонную плиту",
    "Геометрия отражения относительно нормали",
    "Энергия и максимальная высота после отскока"
  ],
  "outcomes": [
    {
      "competencyId": "kinematics_03",
      "evidenceAnchor": "puck-axis",
      "relation": "practiced"
    },
    {
      "competencyId": "kinematics_08",
      "evidenceAnchor": "puck-laws",
      "relation": "practiced"
    },
    {
      "competencyId": "kinematics_09",
      "evidenceAnchor": "puck-return",
      "relation": "practiced"
    },
    {
      "competencyId": "kinematics_12",
      "evidenceAnchor": "reflection",
      "relation": "practiced"
    },
    {
      "competencyId": "dynamics_12",
      "evidenceAnchor": "puck-axis",
      "relation": "touched"
    },
    {
      "competencyId": "energy_03",
      "evidenceAnchor": "reflection",
      "relation": "touched"
    },
    {
      "competencyId": "energy_11",
      "evidenceAnchor": "bounce-height",
      "relation": "practiced"
    }
  ],
  "materials": {
    "html": "20.11.26.html",
    "pdf": "../pdf_docs/20.11.26.pdf",
    "tex": "../tex_docs/20.11.26.tex",
    "lab": "20.11.26-lab.html"
  }
},
{
  "date": "2026-11-16",
  "ktpRefs": [
    "ktp-002",
    "ktp-003",
    "ktp-004",
    "ktp-005"
  ],
  "href": "16.11.26.html",
  "title": "Кинематика. Движение по осям",
  "navTitle": "Кинематика. Движение по осям",
  "navSubtitle": "София Лузянина: урок физики 16 ноября 2026 года. Путь, перемещение, уравнения движения, графики, горизонтальный и наклонный бросок.",
  "summary": "София Лузянина: урок физики 16 ноября 2026 года. Путь, перемещение, уравнения движения, графики, горизонтальный и наклонный бросок.",
  "topics": [
    "Кинематика: путь, перемещение и проекции",
    "Уравнения и графики движения",
    "Равноускоренное движение и перемещение за n-ю секунду",
    "Горизонтальный бросок",
    "Бросок под углом к горизонту"
  ],
  "outcomes": [
    {
      "competencyId": "kinematics_02",
      "evidenceAnchor": "path",
      "relation": "practiced"
    },
    {
      "competencyId": "kinematics_03",
      "evidenceAnchor": "projections",
      "relation": "practiced"
    },
    {
      "competencyId": "kinematics_04",
      "evidenceAnchor": "coordinate",
      "relation": "practiced"
    },
    {
      "competencyId": "kinematics_05",
      "evidenceAnchor": "coordinate",
      "relation": "practiced"
    },
    {
      "competencyId": "kinematics_08",
      "evidenceAnchor": "coordinate",
      "relation": "practiced"
    },
    {
      "competencyId": "kinematics_09",
      "evidenceAnchor": "coordinate",
      "relation": "practiced"
    },
    {
      "competencyId": "kinematics_10",
      "evidenceAnchor": "graph",
      "relation": "practiced"
    },
    {
      "competencyId": "kinematics_14",
      "evidenceAnchor": "horizontal",
      "relation": "practiced"
    }
  ],
  "materials": {
    "html": "16.11.26.html",
    "pdf": "../pdf_docs/16.11.26.pdf",
    "tex": "../tex_docs/16.11.26.tex",
    "lab": "16.11.26-lab.html"
  }
}];
export function compareLessonsNewestFirst(a,b){return b.date.localeCompare(a.date)}
export function sortedLessons(lessons=LESSONS){return [...lessons].sort(compareLessonsNewestFirst)}
export function getLatestLesson(lessons=LESSONS){return sortedLessons(lessons)[0]||null}
export function getLessonByDate(date,lessons=LESSONS){return lessons.find(item=>item.date===date)||null}
