import {LESSONS} from './lesson-registry.js';

// Presentation only: canonical records own lesson dates, links and outcomes.
const latest=LESSONS[0];
const card=document.getElementById('materials');
if(latest&&card){
  card.querySelector('.start-card-label').textContent=`Материал · ${latest.date.split('-').reverse().join('.')}`;
  card.querySelector('strong').textContent=latest.title;
  card.querySelector('p').textContent=latest.summary;
  const links=card.querySelector('.material-links');
  links.replaceChildren();
  for(const [label,href] of [['Открыть занятие',latest.href],['Скачать пособие',latest.materials.pdf],['TeX',latest.materials.tex]]){
    if(!href)continue;
    const link=document.createElement('a');link.textContent=label;link.href=href;links.append(link);
  }
}
const archive=document.getElementById('lessonArchiveList');
if(archive){
  archive.replaceChildren(...LESSONS.map(lesson=>{
    const item=document.createElement('article');item.className='archive-lesson';
    const date=document.createElement('time');date.dateTime=lesson.date;date.textContent=lesson.date.split('-').reverse().join('.');
    const link=document.createElement('a');link.href=lesson.href;link.textContent=lesson.title;
    const summary=document.createElement('p');summary.textContent=lesson.summary;
    item.append(date,link,summary);return item;
  }));
}
const evidence=document.getElementById('latestEvidence');
if(latest&&evidence){
  const labels={'oge_11_2_1':'Вершина и опорные точки','oge_22_1_1':'Построение параболы','oge_22_1_2':'Область определения','oge_22_1_3':'Выколотые точки','oge_9_2_5':'Выбор корня по условию','oge_3_1_3':'Единицы времени'};
  evidence.replaceChildren(...latest.outcomes.map(outcome=>{
    const item=document.createElement('li');const link=document.createElement('a');
    link.href=`${latest.href}#${outcome.evidenceAnchor}`;
    link.textContent=labels[outcome.competencyId]||outcome.competencyId;
    item.append(link,document.createTextNode(outcome.relation==='practiced'?' · практика с опорой':' · разобрано'));
    return item;
  }));
}
