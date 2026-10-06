export const RECENT_LIMIT=3;
export const ARCHIVE_PAGE_SIZE=10;

const MONTHS_GENITIVE=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];

export const LESSONS=[
  {
    "date": "2026-10-06",
    "ktpRefs": [],
    "href": "06.10.26.html",
    "title": "Задачи про террасы",
    "navTitle": "Задачи про террасы",
    "navSubtitle": "София Хоменко: задачи ОГЭ про террасы — теорема Пифагора, уклон в процентах, площади до и после террасирования, процентное уменьшение и расчёт массы урожая.",
    "summary": "София Хоменко: задачи ОГЭ про террасы — теорема Пифагора, уклон в процентах, площади до и после террасирования, процентное уменьшение и расчёт массы урожая.",
    "topics": [
      "теорема Пифагора",
      "извлечение квадратного корня",
      "уклон в процентах",
      "площади террас",
      "процентное уменьшение",
      "проценты и масса"
    ],
    "outcomes": [
      {
        "competencyId": "oge_03_08",
        "evidenceAnchor": "geometry",
        "relation": "practiced"
      },
      {
        "competencyId": "oge_07_05",
        "evidenceAnchor": "square-root",
        "relation": "practiced"
      },
      {
        "competencyId": "oge_15_07",
        "evidenceAnchor": "slope",
        "relation": "practiced"
      },
      {
        "competencyId": "oge_17_11",
        "evidenceAnchor": "areas",
        "relation": "practiced"
      },
      {
        "competencyId": "oge_04_03",
        "evidenceAnchor": "percent-change",
        "relation": "practiced"
      },
      {
        "competencyId": "oge_12_05",
        "evidenceAnchor": "percent-change",
        "relation": "practiced"
      },
      {
        "competencyId": "oge_04_12",
        "evidenceAnchor": "harvest",
        "relation": "practiced"
      },
      {
        "competencyId": "oge_12_11",
        "evidenceAnchor": "harvest",
        "relation": "practiced"
      },
      {
        "competencyId": "oge_12_13",
        "evidenceAnchor": "slope",
        "relation": "practiced"
      }
    ],
    "materials": {
      "html": "06.10.26.html",
      "pdf": "../pdf_docs/06.10.26.pdf",
      "tex": "../tex_docs/06.10.26.tex"
    }
  },
  {
    "date": "2026-09-29",
    "ktpRefs": [],
    "href": "29.09.26.html",
    "title": "Шины, проценты и интервалы",
    "navTitle": "Шины, проценты и интервалы",
    "summary": "София Хоменко: маркировка автомобильных шин, диаметр колеса, проценты, пробег и повторение метода интервалов для ОГЭ.",
    "topics": [],
    "outcomes": [],
    "materials": {
      "html": "29.09.26.html",
      "pdf": "../pdf_docs/29.09.26.pdf",
      "tex": "../tex_docs/29.09.26.tex"
    }
  },
  {
    "date": "2026-09-22",
    "ktpRefs": [],
    "href": "22.09.26.html",
    "title": "Алгебра и метод интервалов",
    "navTitle": "Алгебра и метод интервалов",
    "summary": "София Хоменко: алгебраическое повторение, системы и метод интервалов для ОГЭ.",
    "topics": [],
    "outcomes": [],
    "materials": {
      "html": "22.09.26.html",
      "pdf": "../pdf_docs/22.09.26.pdf",
      "tex": "../tex_docs/22.09.26.tex"
    }
  },
  {
    "date": "2026-09-15",
    "ktpRefs": [],
    "href": "15.09.26.html",
    "title": "Тригонометрия и алгебраический минимум",
    "navTitle": "Тригонометрия и алгебраический минимум",
    "summary": "София Хоменко: тригонометрия, формулы приведения и алгебраический минимум для ОГЭ.",
    "topics": [],
    "outcomes": [],
    "materials": {
      "html": "15.09.26.html",
      "pdf": "../pdf_docs/15.09.26.pdf",
      "tex": "../tex_docs/15.09.26.tex",
      "lab": "15.09.26-lab.html"
    }
  },
  {
    "date": "2026-09-08",
    "ktpRefs": [],
    "href": "08.09.26.html",
    "title": "Дроби, числовая прямая и сравнение чисел",
    "navTitle": "Дроби, числовая прямая и сравнение чисел",
    "summary": "Интерактивное занятие Софии Хоменко: дроби, числовая прямая и сравнение чисел. 08.09.26.",
    "topics": [],
    "outcomes": [],
    "materials": {
      "html": "08.09.26.html",
      "pdf": "../pdf_docs/08.09.26.pdf",
      "tex": "../tex_docs/08.09.26.tex",
      "lab": "08.09.26-lab.html"
    }
  }
];

export function compareLessonsNewestFirst(left,right){return right.date.localeCompare(left.date);}
export function sortedLessons(lessons=LESSONS){return [...lessons].sort(compareLessonsNewestFirst);}
export function getLatestLesson(lessons=LESSONS){return sortedLessons(lessons)[0]||null;}
export function getLessonByDate(date,lessons=LESSONS){return lessons.find(item=>item.date===date)||null;}
export function getRecentLessons(lessons=LESSONS,limit=RECENT_LIMIT){return sortedLessons(lessons).slice(0,Math.max(0,limit));}
export function getArchiveLessons(lessons=LESSONS,limit=RECENT_LIMIT){return sortedLessons(lessons).slice(Math.max(0,limit));}
export function paginateArchive(lessons=LESSONS,pageIndex=0,pageSize=ARCHIVE_PAGE_SIZE){const archive=getArchiveLessons(lessons);const safeSize=Math.max(1,Number(pageSize)||ARCHIVE_PAGE_SIZE);const pageCount=Math.max(1,Math.ceil(archive.length/safeSize));const safeIndex=Math.max(0,Math.min(pageCount-1,Number(pageIndex)||0));const start=safeIndex*safeSize;return {items:archive.slice(start,start+safeSize),pageIndex:safeIndex,pageCount,total:archive.length};}
function parseIsoDate(isoDate){const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate));if(!match)throw new Error('Invalid lesson date: '+isoDate);const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);if(month<1||month>12||day<1||day>31)throw new Error('Invalid lesson date: '+isoDate);return {year,month,day};}
export function formatShortDate(isoDate){const {month,day}=parseIsoDate(isoDate);return String(day).padStart(2,'0')+'.'+String(month).padStart(2,'0');}
export function formatLongDateRu(isoDate){const {year,month,day}=parseIsoDate(isoDate);return day+' '+MONTHS_GENITIVE[month-1]+' '+year;}
export function validateLessonRegistry(lessons=LESSONS){if(!Array.isArray(lessons)||lessons.length===0)throw new Error('Lesson registry is empty');const dates=new Set(),hrefs=new Set();let previousDate=null;lessons.forEach((lesson,index)=>{parseIsoDate(lesson.date);if(!lesson.href||!lesson.title||!lesson.navTitle)throw new Error('Lesson '+index+' is incomplete');if(typeof lesson.summary!=='string'||!Array.isArray(lesson.topics)||!Array.isArray(lesson.outcomes))throw new Error('Lesson '+index+' has invalid metadata shape');if(!lesson.materials||typeof lesson.materials!=='object')throw new Error('Lesson '+index+' requires materials metadata');if(dates.has(lesson.date))throw new Error('Duplicate lesson date: '+lesson.date);if(hrefs.has(lesson.href))throw new Error('Duplicate lesson href: '+lesson.href);if(previousDate!==null&&lesson.date>previousDate)throw new Error('Lesson registry must be sorted newest-first');dates.add(lesson.date);hrefs.add(lesson.href);previousDate=lesson.date;});return {count:lessons.length,latest:lessons[0].href};}
