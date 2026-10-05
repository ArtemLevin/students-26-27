import {sortedLessons,formatLongDateRu} from './lesson-registry.js?v=20261005';

function node(tag,text,className){const el=document.createElement(tag);if(text)el.textContent=text;if(className)el.className=className;return el;}
function links(lesson){const row=node('div');row.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin-block:12px';
  const entries=[['html','Открыть занятие'],['lab','Лаборатория'],['pdf','PDF'],['tex','TEX'],['poster','Постер']];
  for(const [key,label] of entries){const href=key==='html'?lesson.href:lesson.materials?.[key];if(!href)continue;const a=node('a',label,'reset-btn');a.href=href;row.append(a);}return row;
}
const lessons=sortedLessons(),latest=lessons[0];
if(latest){const aside=document.getElementById('latestLessonSummary');aside.replaceChildren(node('p','Последнее занятие · '+formatLongDateRu(latest.date),'eyebrow'),node('h2',latest.navTitle||latest.title),node('p',latest.summary),links(latest));const nav=document.getElementById('latestLessonNav');nav.href=latest.href;nav.textContent='Последнее занятие';}
const list=document.getElementById('lessonJournal');
for(const lesson of lessons.slice(1)){const li=node('li');li.style.cssText='padding-block:16px;border-bottom:1px solid var(--border,#bac9c7)';li.append(node('p',formatLongDateRu(lesson.date),'eyebrow'),node('h3',lesson.navTitle||lesson.title),links(lesson));list.append(li);}
