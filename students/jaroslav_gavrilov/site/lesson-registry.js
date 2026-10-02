export const RECENT_LIMIT=3;
export const ARCHIVE_PAGE_SIZE=10;

const MONTHS_GENITIVE=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];

export const LESSONS=[
  {
    "date": "2026-09-28",
    "ktpRefs": [],
    "href": "28.09.26.html",
    "title": "Тригонометри&shy;ческие функции",
    "navTitle": "Тригонометри&shy;ческие функции",
    "summary": "Интерактивный конспект Ярослава Гаврилова: периодичность тригонометрических функций, области значений, графики, неравенства и отбор корней.",
    "topics": [],
    "outcomes": [],
    "materials": {
      "html": "28.09.26.html",
      "pdf": "../pdf_docs/28.09.26.pdf",
      "tex": "../tex_docs/28.09.26.tex"
    }
  },
  {
    "date": "2026-09-24",
    "ktpRefs": [],
    "href": "24.09.26.html",
    "title": "Увидеть структуру уравнения",
    "navTitle": "Увидеть структуру уравнения",
    "summary": "Интерактивный конспект Ярослава Гаврилова: тригонометрические уравнения, вынесение общего множителя, группировка, однородные уравнения первой степени и отбор корней.",
    "topics": [],
    "outcomes": [],
    "materials": {
      "html": "24.09.26.html",
      "pdf": "../pdf_docs/24.09.26.pdf",
      "tex": "../tex_docs/24.09.26.tex",
      "lab": "24.09.26-lab.html"
    }
  },
  {
    "date": "2026-09-21",
    "ktpRefs": [],
    "href": "21.09.26.html",
    "title": "Формулы как инструмент решения",
    "navTitle": "Формулы как инструмент решения",
    "summary": "Интерактивный конспект Ярослава Гаврилова: тригонометрические формулы и приведение уравнений к одной функции и одному аргументу.",
    "topics": [],
    "outcomes": [],
    "materials": {
      "html": "21.09.26.html",
      "pdf": "../pdf_docs/21.09.26.pdf",
      "tex": "../tex_docs/21.09.26.tex"
    }
  },
  {
    "date": "2026-09-19",
    "ktpRefs": [],
    "href": "19.09.26.html",
    "title": "Тригонометрические уравнения",
    "navTitle": "Тригонометрические уравнения",
    "summary": "Тригонометрические уравнения: персональный материал Ярослава Гаврилова, 19.09.2026.",
    "topics": [],
    "outcomes": [],
    "materials": {
      "html": "19.09.26.html",
      "pdf": "../pdf_docs/19.09.26.pdf",
      "tex": "../tex_docs/19.09.26.tex",
      "lab": "19.09.26-lab.html"
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
