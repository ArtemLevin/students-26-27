export const RECENT_LIMIT=3;
export const ARCHIVE_PAGE_SIZE=10;

const MONTHS_GENITIVE=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];

export const LESSONS=[
  {
    "date": "2026-10-04",
    "ktpRefs": [],
    "href": "04.10.26.html",
    "title": "Текстовые задачи на движение",
    "navTitle": "Текстовые задачи на движение",
    "summary": "Табличный метод v–t–S: встречное движение, догонка, круговая трасса, движение по воде, средняя скорость и протяжённые тела.",
    "topics": ["табличный метод v–t–S","встречное движение","движение вдогонку","круговая трасса","движение по воде","средняя скорость","протяжённые тела"],
    "outcomes": ["составлять таблицу v–t–S","переводить словесную связь в уравнение","согласовывать единицы измерения","учитывать тип движения","проверять смысл и размерность ответа"],
    "materials": {
      "html": "04.10.26.html",
      "pdf": "../pdf_docs/04.10.26.pdf",
      "tex": "../tex_docs/04.10.26.tex",
      "image": "../images/04.10.26.png"
    }
  },
  {
    "date": "2026-09-27",
    "ktpRefs": [],
    "href": "27.09.26.html",
    "title": "Из текста — в математическую модель",
    "navTitle": "Из текста — в математическую модель",
    "summary": "Интерактивный конспект Матвея Горбачева: прикладные задачи, формулы, единицы измерения, квадратные уравнения и отбор корней.",
    "topics": [],
    "outcomes": [],
    "materials": {
      "html": "27.09.26.html",
      "pdf": "../pdf_docs/27.09.26.pdf",
      "tex": "../tex_docs/27.09.26.tex",
      "lab": "27.09.26-lab.html"
    }
  },
  {
    "date": "2026-09-24",
    "ktpRefs": [],
    "href": "24.09.26.html",
    "title": "Вектор как точное смещение",
    "navTitle": "Вектор как точное смещение",
    "summary": "Интерактивный конспект Матвея Горбачева: векторы на координатной плоскости, длина, операции, скалярное произведение и угол между векторами.",
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
    "date": "2026-09-20",
    "ktpRefs": [],
    "href": "20.09.26.html",
    "title": "Графики функций и узловые точки",
    "navTitle": "Графики функций и узловые точки",
    "summary": "Интерактивный конспект Матвея Горбачева: графики функций и метод узловых точек.",
    "topics": [],
    "outcomes": [],
    "materials": {
      "html": "20.09.26.html",
      "pdf": "../pdf_docs/20.09.26.pdf",
      "tex": "../tex_docs/20.09.26.tex",
      "lab": "20.09.26-lab.html"
    }
  },
  {
    "date": "2026-09-17",
    "ktpRefs": [],
    "href": "17.09.26.html",
    "title": "Показательные уравнения и прикладные задачи",
    "navTitle": "Показательные уравнения и прикладные задачи",
    "summary": "Интерактивный конспект Матвея Горбачева: показательные уравнения и задачи прикладного характера.",
    "topics": [],
    "outcomes": [],
    "materials": {
      "html": "17.09.26.html",
      "pdf": "../pdf_docs/17.09.26.pdf",
      "tex": "../tex_docs/17.09.26.tex",
      "lab": "17.09.26-lab.html"
    }
  },
  {
    "date": "2026-09-13",
    "ktpRefs": [],
    "href": "13.09.26.html",
    "title": "Алгебраическая база и степени",
    "navTitle": "Алгебраическая база и степени",
    "summary": "Интерактивный конспект Матвея Горбачёва: алгебраическая база, степени, корни, неравенства и исследовательский симулятор свойств степеней.",
    "topics": [],
    "outcomes": [],
    "materials": {
      "html": "13.09.26.html",
      "pdf": "../pdf_docs/13.09.26.pdf",
      "tex": "../tex_docs/13.09.26.tex"
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
