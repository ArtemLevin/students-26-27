export const RECENT_LIMIT=3;
export const ARCHIVE_PAGE_SIZE=10;

const MONTHS_GENITIVE=[
  'января','февраля','марта','апреля','мая','июня',
  'июля','августа','сентября','октября','ноября','декабря'
];

export const LESSONS=Object.freeze([
  {
    date:'2026-09-04',
    href:'04.09.26.html',
    title:'Повторение алгебры и введение в производную',
    navTitle:'Алгебра и производная',
    navSubtitle:'дроби · степени · первые правила производной',
    summary:'На занятии разобраны ошибки в задачах на движение по воде, степенях, функциональных подстановках и алгебраических дробях. Затем введён первый вычислительный блок по производной: степенное правило, производная константы, постоянный множитель, сумма и разность.',
    topics:['движение по воде','алгебраические дроби','корни и степени','функциональная подстановка','производная','степенное правило'],
    outcomes:[
      {competencyId:'t8_derivative_rules',label:'Правила дифференцирования',level:2,tone:'process'},
      {competencyId:'t8_elementary_derivatives',label:'Производные элементарных функций',level:2,tone:'process'},
      {competencyId:'t10_water',label:'Движение по воде',level:2,tone:'process'},
      {label:'Алгебраические дроби и ОДЗ',level:2,tone:'alert'}
    ],
    materials:{
      pdf:'../pdf_docs/04.09.26.pdf',
      tex:'../tex_docs/04.09.26.tex'
    }
  },
  {
    date:'2026-08-25',
    href:'25.08.26.html',
    title:'Планиметрия: стратегия решения геометрических задач',
    navTitle:'Планиметрия: стратегия решения',
    navSubtitle:'высоты · площади · окружность · подобие',
    summary:'На занятии выстроена единая стратегия планиметрии: искать фигуру, которой принадлежит искомая величина, выделять прямоугольные треугольники и общие элементы, сравнивать методы Пифагора, тригонометрии и площадей, а также распознавать окружность и подобие.',
    topics:['планиметрия','высоты','площади','окружность','подобие','Пифагор и тригонометрия'],
    outcomes:[
      {label:'Стратегия планиметрии',level:2,tone:'process'},
      {label:'Прямоугольные треугольники',level:2,tone:'process'},
      {label:'Метод площадей',level:2,tone:'process'},
      {label:'Окружность и вписанные углы',level:2,tone:'process'},
      {label:'Подобие треугольников',level:2,tone:'process'}
    ],
    materials:{pdf:'../pdf_docs/25.08.26.pdf',tex:'../tex_docs/25.08.26.tex'}
  },
  {
    date:'2026-08-23',
    href:'23.08.26.html',
    title:'Повторение алгебры и базовой планиметрии',
    navTitle:'Алгебра и планиметрия',
    navSubtitle:'радикалы · площади · окружности',
    summary:'После занятия основной фокус сместился на самостоятельное применение формул планиметрии, аккуратность преобразований с радикалами и проверку корней в иррациональных уравнениях.',
    topics:['показательные','логарифмы','иррациональные','площади','окружности','синусы и косинусы'],
    outcomes:[
      {label:'Показательные уравнения',level:3,tone:'good'},
      {label:'Логарифмические уравнения',level:3,tone:'good'},
      {label:'Иррациональные уравнения',level:2,tone:'process'},
      {label:'Базовая планиметрия',level:2,tone:'process'},
      {competencyId:'t7_radical_num',label:'Преобразования радикалов',level:2,tone:'alert'}
    ],
    materials:{pdf:'../pdf_docs/23.08.26.pdf',tex:'../tex_docs/23.08.26.tex',review:'../review_docs/review_23.08.26.pdf'}
  },
  {date:'2026-08-18',href:'18.08.26.html',title:'Тригонометрические уравнения и смешанные неравенства',navTitle:'Тригонометрические уравнения',navSubtitle:'смешанные неравенства'},
  {date:'2026-08-15',href:'15.08.26.html',title:'Векторы и скалярное произведение',navTitle:'Векторы',navSubtitle:'скалярное произведение'},
  {date:'2026-08-11',href:'11.08.26.html',title:'Тригонометрия, теорема Безу и логарифмические неравенства',navTitle:'Тригонометрия, Безу и логарифмы',navSubtitle:'уравнения и неравенства'},
  {date:'2026-08-07',href:'07.08.26.html',title:'Смешанные схемы кредитования',navTitle:'Смешанные схемы кредитования',navSubtitle:'финансовые задачи'},
  {date:'2026-08-04',href:'04.08.26.html',title:'Дифференцированная схема кредитования',navTitle:'Дифференцированный кредит',navSubtitle:'финансовая модель'},
  {date:'2026-08-01',href:'01.08.26.html',title:'Комплексное повторение: формулы и связи',navTitle:'Комплексное повторение',navSubtitle:'формулы и связи'},
  {date:'2026-07-28',href:'28-07-26.html',title:'Кредиты: аннуитетная и дифференцированная схемы',navTitle:'Аннуитет и дифференцированный кредит',navSubtitle:'сравнение схем'},
  {date:'2026-07-25',href:'25-07-26.html',title:'Кредиты. Аннуитетная схема',navTitle:'Аннуитетный кредит',navSubtitle:'финансовая модель'},
  {date:'2026-07-21',href:'21-07-26.html',title:'Комплексное повторение ЕГЭ',navTitle:'Комплексное повторение ЕГЭ',navSubtitle:'смешанный блок'},
  {date:'2026-07-18',href:'18-07-26.html',title:'Сравнение вкладов и поиск ставки',navTitle:'Вклады и ставка',navSubtitle:'финансовые задачи'},
  {date:'2026-07-14',href:'14-07-26.html',title:'Вклады и сложные проценты',navTitle:'Вклады и сложные проценты',navSubtitle:'рекуррентная модель'},
  {date:'2026-07-11',href:'11-07-26.html',title:'Смешанные уравнения и неравенства',navTitle:'Смешанные уравнения и неравенства',navSubtitle:'алгебра'}
]);

export function compareLessonsNewestFirst(left,right){return right.date.localeCompare(left.date);}
export function sortedLessons(lessons=LESSONS){return [...lessons].sort(compareLessonsNewestFirst);}
export function getLatestLesson(lessons=LESSONS){return sortedLessons(lessons)[0]||null;}
export function getRecentLessons(lessons=LESSONS,limit=RECENT_LIMIT){return sortedLessons(lessons).slice(0,Math.max(0,limit));}
export function getArchiveLessons(lessons=LESSONS,limit=RECENT_LIMIT){return sortedLessons(lessons).slice(Math.max(0,limit));}
export function paginateArchive(lessons=LESSONS,pageIndex=0,pageSize=ARCHIVE_PAGE_SIZE){const archive=getArchiveLessons(lessons);const safeSize=Math.max(1,Number(pageSize)||ARCHIVE_PAGE_SIZE);const pageCount=Math.max(1,Math.ceil(archive.length/safeSize));const safeIndex=Math.max(0,Math.min(pageCount-1,Number(pageIndex)||0));const start=safeIndex*safeSize;return {items:archive.slice(start,start+safeSize),pageIndex:safeIndex,pageCount,total:archive.length};}
function parseIsoDate(isoDate){const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate));if(!match)throw new Error(`Invalid lesson date: ${isoDate}`);const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);if(month<1||month>12||day<1||day>31)throw new Error(`Invalid lesson date: ${isoDate}`);return {year,month,day};}
export function formatShortDate(isoDate){const {month,day}=parseIsoDate(isoDate);return `${String(day).padStart(2,'0')}.${String(month).padStart(2,'0')}`;}
export function formatLongDateRu(isoDate){const {year,month,day}=parseIsoDate(isoDate);return `${day} ${MONTHS_GENITIVE[month-1]} ${year}`;}
export function validateLessonRegistry(lessons=LESSONS){if(!Array.isArray(lessons)||lessons.length===0)throw new Error('Lesson registry is empty');const dates=new Set(),hrefs=new Set();let previousDate=null;lessons.forEach((lesson,index)=>{parseIsoDate(lesson.date);if(!lesson.href||!lesson.title||!lesson.navTitle)throw new Error(`Lesson ${index} is incomplete`);if(dates.has(lesson.date))throw new Error(`Duplicate lesson date: ${lesson.date}`);if(hrefs.has(lesson.href))throw new Error(`Duplicate lesson href: ${lesson.href}`);if(previousDate!==null&&lesson.date>previousDate)throw new Error('Lesson registry must be sorted newest-first');dates.add(lesson.date);hrefs.add(lesson.href);previousDate=lesson.date;});const latest=lessons[0];if(!latest.summary||!Array.isArray(latest.topics)||latest.topics.length===0)throw new Error('Latest lesson requires summary and topics');if(!Array.isArray(latest.outcomes)||latest.outcomes.length===0)throw new Error('Latest lesson requires outcomes');if(!latest.materials||!latest.materials.pdf||!latest.materials.tex)throw new Error('Latest lesson requires PDF and TeX materials');return {count:lessons.length,latest:latest.href};}
validateLessonRegistry();
