import {
  LESSONS,
  RECENT_LIMIT,
  getLatestLesson,
  getRecentLessons,
  formatShortDate,
  formatLongDateRu
} from './lesson-registry.js?v=20260911-1';

const byId=id=>document.getElementById(id);

function createLessonLink(lesson,index){
  const link=document.createElement('a');
  link.className=`lesson-link${index===0?' active':''}`;
  link.href=lesson.href;
  const date=document.createElement('span');
  date.className='lesson-date';
  date.textContent=formatShortDate(lesson.date);
  const copy=document.createElement('span');
  const title=document.createElement('strong');
  title.textContent=lesson.navTitle;
  const subtitle=document.createElement('small');
  subtitle.textContent=index===0?'последнее занятие':lesson.navSubtitle||lesson.title;
  copy.append(title,subtitle);
  const arrow=document.createElement('span');
  arrow.className='lesson-arrow';
  arrow.setAttribute('aria-hidden','true');
  arrow.textContent='→';
  link.append(date,copy,arrow);
  return link;
}

function configure(id,href){
  const link=byId(id);
  if(!link)return;
  link.hidden=!href;
  if(href)link.href=href;
  else link.removeAttribute('href');
}

function render(){
  const lesson=getLatestLesson(LESSONS);
  if(!lesson)return;
  const eyebrow=byId('latestLessonEyebrow');
  const title=byId('lesson-title');
  const lead=byId('lessonLead');
  const topics=byId('lessonTopics');
  const status=byId('latestLessonStatus');
  const cta=byId('latestLessonCta');
  const updated=byId('mapUpdatedDate');
  if(eyebrow)eyebrow.textContent=`Последнее занятие · ${formatLongDateRu(lesson.date)}`;
  if(title)title.textContent=lesson.title;
  if(lead)lead.textContent=lesson.summary||'';
  if(updated)updated.textContent=`Кабинет обновлён ${formatLongDateRu(lesson.date)}`;
  if(topics)topics.replaceChildren(...lesson.topics.map(topic=>{const chip=document.createElement('span');chip.className='chip';chip.textContent=topic;return chip;}));
  if(status){
    const head=document.createElement('p');head.className='status-title';head.textContent='После урока';
    const rows=(lesson.outcomes||[]).map(outcome=>{
      const row=document.createElement('div');row.className=`outcome ${outcome.tone||'process'}`;
      const mark=document.createElement('span');mark.className='outcome-mark';mark.textContent=outcome.tone==='good'?'✓':outcome.tone==='alert'?'!':'◐';
      const label=document.createElement('span');label.textContent=outcome.label;
      const level=document.createElement('b');level.textContent=`${outcome.level}/4`;
      row.append(mark,label,level);return row;
    });
    status.replaceChildren(head,...rows);
  }
  if(cta){cta.href=lesson.href;cta.hidden=false;}
  const materials=lesson.materials||{};
  configure('latestReviewLink',materials.review);
  configure('latestPdfLink',materials.pdf);
  configure('latestTexLink',materials.tex);
  configure('latestLabLink',materials.lab);
  const recent=getRecentLessons(LESSONS,RECENT_LIMIT);
  const recentRoot=byId('recentLessons');
  if(recentRoot)recentRoot.replaceChildren(...recent.map(createLessonLink));
  const counter=byId('recentLessonCount');
  if(counter)counter.textContent=`${recent.length} свежих`;
}

render();
