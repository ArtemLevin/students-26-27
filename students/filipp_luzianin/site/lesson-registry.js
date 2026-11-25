export const LESSONS=[
{
  "date": "2026-11-25",
  "ktpRefs": [
    "ktp-001"
  ],
  "href": "25.11.26.html",
  "title": "Динамика: силы и связанные тела",
  "navTitle": "Динамика: силы и связанные тела",
  "navSubtitle": "Силы, второй закон Ньютона, трение, связанные бруски и движение вдоль стены.",
  "summary": "Силы, второй закон Ньютона, трение, связанные бруски и движение вдоль стены.",
  "topics": [
    "Динамика",
    "Второй закон Ньютона",
    "Трение скольжения",
    "Связанные тела",
    "Движение вдоль стены"
  ],
  "outcomes": [
    {
      "competencyId": "phy9-dyn-01-03",
      "evidenceAnchor": "newton",
      "relation": "touched"
    },
    {
      "competencyId": "phy9-dyn-01-04",
      "evidenceAnchor": "newton",
      "relation": "touched"
    },
    {
      "competencyId": "phy9-dyn-01-05",
      "evidenceAnchor": "newton",
      "relation": "touched"
    },
    {
      "competencyId": "phy9-dyn-01-07",
      "evidenceAnchor": "projection",
      "relation": "touched"
    },
    {
      "competencyId": "phy9-dyn-02-01",
      "evidenceAnchor": "newton",
      "relation": "touched"
    },
    {
      "competencyId": "phy9-dyn-02-02",
      "evidenceAnchor": "horizontal",
      "relation": "touched"
    },
    {
      "competencyId": "phy9-dyn-02-04",
      "evidenceAnchor": "friction",
      "relation": "touched"
    },
    {
      "competencyId": "phy9-dyn-02-05",
      "evidenceAnchor": "friction",
      "relation": "touched"
    },
    {
      "competencyId": "phy9-dyn-02-06",
      "evidenceAnchor": "friction",
      "relation": "touched"
    },
    {
      "competencyId": "phy9-dyn-02-07",
      "evidenceAnchor": "coupled",
      "relation": "touched"
    },
    {
      "competencyId": "phy9-dyn-03-01",
      "evidenceAnchor": "horizontal",
      "relation": "touched"
    },
    {
      "competencyId": "phy9-dyn-03-02",
      "evidenceAnchor": "coupled",
      "relation": "touched"
    },
    {
      "competencyId": "phy9-dyn-03-03",
      "evidenceAnchor": "wall",
      "relation": "touched"
    },
    {
      "competencyId": "phy9-dyn-03-04",
      "evidenceAnchor": "check",
      "relation": "touched"
    }
  ],
  "materials": {
    "html": "25.11.26.html",
    "pdf": "../pdf_docs/25.11.26.pdf",
    "tex": "../tex_docs/25.11.26.tex",
    "lab": "25.11.26-lab.html"
  }
}];

export function compareLessonsNewestFirst(left,right){return right.date.localeCompare(left.date);}
export function sortedLessons(lessons=LESSONS){return [...lessons].sort(compareLessonsNewestFirst);}
export function getLatestLesson(lessons=LESSONS){return sortedLessons(lessons)[0]||null;}
export function getLessonByDate(date,lessons=LESSONS){return lessons.find(item=>item.date===date)||null;}
