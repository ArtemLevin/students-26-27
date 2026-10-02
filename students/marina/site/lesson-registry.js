export const RECENT_LIMIT=3;
export const ARCHIVE_PAGE_SIZE=10;

const MONTHS_GENITIVE=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];

export const LESSONS=[
  {
    "date": "2026-09-28",
    "ktpRefs": [],
    "href": "28.09.26.html",
    "title": "Векторы",
    "navTitle": "Векторы",
    "summary": "Марина Селиверстова: векторы — правило треугольника, вычитание, умножение на число, правило многоугольника и выражение одного вектора через другие.",
    "topics": [],
    "outcomes": [],
    "materials": {
      "html": "28.09.26.html",
      "pdf": "../pdf_docs/28.09.26.pdf",
      "tex": "../tex_docs/28.09.26.tex"
    }
  },
  {
    "date": "2026-09-26",
    "ktpRefs": [],
    "href": "26.09.26.html",
    "title": "Рациональные функции и гипербола",
    "navTitle": "Рациональные функции и гипербола",
    "summary": "Марина Селиверстова: рациональные функции и гипербола — ОДЗ, асимптоты, точки пересечения, выколотые точки и прямая y=m.",
    "topics": [],
    "outcomes": [],
    "materials": {
      "html": "26.09.26.html",
      "pdf": "../pdf_docs/26.09.26.pdf",
      "tex": "../tex_docs/26.09.26.tex",
      "lab": "26.09.26-lab.html"
    }
  },
  {
    "date": "2026-09-23",
    "ktpRefs": [],
    "href": "23.09.26.html",
    "title": "Гипербола и обратная пропорциональность",
    "navTitle": "Гипербола и обратная пропорциональность",
    "summary": "Марина Селиверстова: гипербола, обратная пропорциональность, асимптоты, сдвиги, выколотые точки и параметры.",
    "topics": [],
    "outcomes": [],
    "materials": {
      "html": "23.09.26.html",
      "pdf": "../pdf_docs/23.09.26.pdf",
      "tex": "../tex_docs/23.09.26.tex",
      "lab": "23.09.26-lab.html"
    }
  },
  {
    "date": "2026-09-19",
    "ktpRefs": [],
    "href": "19.09.26.html",
    "title": "Рациональные функции, парабола и параметры",
    "navTitle": "Рациональные функции, парабола и параметры",
    "summary": "Марина Селиверстова: графики рациональных функций, ОДЗ, выколотые точки, парабола и параметр y=kx.",
    "topics": [],
    "outcomes": [],
    "materials": {
      "html": "19.09.26.html",
      "pdf": "../pdf_docs/19.09.26.pdf",
      "tex": "../tex_docs/19.09.26.tex",
      "lab": "19.09.26-lab.html"
    }
  },
  {
    "date": "2026-09-16",
    "ktpRefs": [],
    "href": "16.09.26.html",
    "title": "Парабола, прямая y = m и выколотая точка",
    "navTitle": "Парабола, прямая y = m и выколотая точка",
    "summary": "Интерактивное занятие Марины: парабола, прямая y=m, ОДЗ, сокращение алгебраических дробей и выколотая точка.",
    "topics": [],
    "outcomes": [],
    "materials": {
      "html": "16.09.26.html",
      "pdf": "../pdf_docs/16.09.26.pdf",
      "tex": "../tex_docs/16.09.26.tex",
      "lab": "16.09.26-lab.html"
    }
  },
  {
    "date": "2026-09-12",
    "ktpRefs": [],
    "href": "12.09.26.html",
    "title": "Графики функций: прямая и парабола",
    "navTitle": "Графики функций: прямая и парабола",
    "summary": "Интерактивное занятие Марины по графикам линейной и квадратичной функций: коэффициенты, пересечения и параметры.",
    "topics": [],
    "outcomes": [],
    "materials": {
      "html": "12.09.26.html",
      "pdf": "../pdf_docs/12.09.26.pdf",
      "tex": "../tex_docs/12.09.26.tex",
      "lab": "12.09.26-lab.html"
    }
  },
  {
    "date": "2026-09-09",
    "ktpRefs": [],
    "href": "09.09.26.html",
    "title": "Сложные функции, монотонность и прямая",
    "navTitle": "Сложные функции, монотонность и прямая",
    "summary": "Интерактивный конспект Марины: сложные функции, монотонность и линейная функция. Подготовка к ОГЭ по математике.",
    "topics": [],
    "outcomes": [],
    "materials": {
      "html": "09.09.26.html",
      "pdf": "../pdf_docs/09.09.26.pdf",
      "tex": "../tex_docs/09.09.26.tex",
      "lab": "09.09.26-lab.html"
    }
  },
  {
    "date": "2026-09-05",
    "ktpRefs": [],
    "href": "05.09.26.html",
    "title": "Входная диагностика и линейная функция",
    "navTitle": "Входная диагностика и линейная функция",
    "summary": "Марина · входная диагностика и линейная функция · подготовка к ОГЭ по математике",
    "topics": [],
    "outcomes": [],
    "materials": {
      "html": "05.09.26.html",
      "tex": "../tex_docs/05.09.26.tex",
      "lab": "05.09.26-lab.html"
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
