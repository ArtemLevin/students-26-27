/* 26.10.26 · Worksheet-based lesson interaction; never writes canonical mastery. */
'use strict';
const $=id=>document.getElementById(id);
const MATH_NS='http://www.w3.org/1998/Math/MathML';
const mathNode=(tag,content='')=>{
  const node=document.createElementNS(MATH_NS,tag);
  if(content)node.textContent=content;
  return node;
};
function mathRow(expression){
  const row=mathNode('mrow'),tokens=String(expression).match(/\d+(?:[.,]\d+)?|[A-Za-zА-Яа-яЁё][₀₁₂₃₄₅₆₇₈₉]*[²³]?|[^\s]/gu)||[];
  for(const token of tokens){
    let node;
    const superscript=token.match(/^([A-Za-zА-Яа-яЁё])([²³])$/u);
    const subscript=token.match(/^([A-Za-zА-Яа-яЁё])([₀₁₂₃₄₅₆₇₈₉]+)$/u);
    if(superscript){
      node=mathNode('msup');node.append(mathNode('mi',superscript[1]),mathNode('mn',superscript[2]==='²'?'2':'3'));
    }else if(subscript){
      node=mathNode('msub');
      const chars='₀₁₂₃₄₅₆₇₈₉';
      node.append(mathNode('mi',subscript[1]),mathNode('mn',Array.from(subscript[2]).map(c=>chars.indexOf(c)).join('')));
    }else if(/^\d+(?:[.,]\d+)?$/u.test(token)){node=mathNode('mn',token);}
    else if(/^[A-Za-zА-Яа-яЁё]$/u.test(token)){node=mathNode('mi',token);}
    else node=mathNode('mo',token);
    row.append(node);
  }
  return row;
}
function mathML(expression,label=expression){
  const math=mathNode('math');math.setAttribute('aria-label',String(label));
  math.append(mathRow(expression));return math;
}
function convertStaticMath(){
  document.querySelectorAll('.frac').forEach(frac=>{
    const [top,bottom]=Array.from(frac.children);
    if(!top||!bottom)return;
    const math=mathNode('math'),mfrac=mathNode('mfrac');
    math.setAttribute('aria-label',top.textContent+' делённое на '+bottom.textContent);
    mfrac.append(mathRow(top.textContent),mathRow(bottom.textContent));
    math.append(mfrac);frac.replaceWith(math);
  });
  document.querySelectorAll('.inline-math,.math-display,.math-spot,.solution-strip code,.result-line strong,.hero-math-small').forEach(host=>{
    if(host.children.length===0&&host.textContent.trim()){
      const expression=host.textContent.trim();
      host.replaceChildren(mathML(expression));
    }
  });
}
function appendFormattedQuestion(host,question){
  const patterns=[
    /^(Решите уравнение\s+)(.+)$/u,
    /^(Найдите x из пропорции\s+)(.+)$/u,
    /^(Найдите (?:вычитаемое|множитель|делимое|делитель) [ab]:\s+)(.+)$/u
  ];
  for(const pattern of patterns){
    const found=question.match(pattern);
    if(found){
      host.replaceChildren(document.createTextNode(found[1]),mathML(found[2].replace(/\.$/u,'')));
      return;
    }
  }
  host.textContent=question;
}

const methodTexts=[
  {tag:'СПОСОБ 01 · ПЕРЕВОРОТ ОБЕИХ ДРОБЕЙ',text:'(4x + 1)/3 = 1/10 → 4x + 1 = 3/10'},
  {tag:'СПОСОБ 02 · НАХОДИМ ЗНАМЕНАТЕЛЬ',text:'a/b = c  ⇒  b = a/c; поэтому 4x + 1 = 3/10'},
  {tag:'СПОСОБ 03 · УМНОЖЕНИЕ КРЕСТОМ',text:'3 = 10(4x + 1) → 3 = 40x + 10 → 40x = −7'}
];
const DAYS=[
  {
    date:'27.10',weekday:'Вторник',title:'День 1 · 27 октября',tasks:[
      ['Найдите вычитаемое b: 23 − b = 14.','b = 9'],
      ['Найдите x из пропорции 3/5 = x/20.','x = 12'],
      ['Из формулы F = Gm₁m₂/R² выразите m₂.','m₂ = FR²/(Gm₁)'],
      ['Решите уравнение 5x + 7 = 2x + 19.','x = 4'],
      ['Решите уравнение (3x + 2)/4 = 5.','x = 6'],
      ['Решите уравнение 6/(2x + 1) = 3.','x = 1/2'],
      ['Решите уравнение 8/(−3x + 5) = 4.','x = 1'],
      ['ВУПС · Вычитаемое. Запишите со скобками и упростите разность выражений 3x + 5 и 2x − 7.','(3x + 5) − (2x − 7) = x + 12'],
      ['ВУПС · Умножаемое. Запишите со скобками произведение выражений x + 2 и 3x − 1. Скобки раскрывать не нужно.','(x + 2)(3x − 1)'],
      ['ВУПС · Подставляемое. Подставьте x = 2y − 3 в 4x + 1 и упростите.','4(2y − 3) + 1 = 8y − 11']
    ]
  },
  {
    date:'28.10',weekday:'Среда',title:'День 2 · 28 октября',tasks:[
      ['Найдите множитель b: 8b = 56.','b = 7'],
      ['Найдите x из пропорции x/9 = 4/3.','x = 12'],
      ['Из формулы F = Gm₁m₂/R² выразите R².','R² = Gm₁m₂/F'],
      ['Решите уравнение 9x − 4 = 5x + 16.','x = 5'],
      ['Решите уравнение (6x − 7)/5 = 7.','x = 7'],
      ['Решите уравнение 12/(3x − 2) = 4.','x = 5/3'],
      ['Решите уравнение 10/(−2x + 9) = 2.','x = 2'],
      ['ВУПС · Вычитаемое. Запишите со скобками и упростите разность выражений 7x − 2 и 3x + 8.','(7x − 2) − (3x + 8) = 4x − 10'],
      ['ВУПС · Умножаемое. Запишите произведение числа 5 и выражения 2a − 3 со скобками, затем раскройте их.','5(2a − 3) = 10a − 15'],
      ['ВУПС · Подставляемое. Подставьте a = 3t + 2 в 2a − 5 и упростите.','2(3t + 2) − 5 = 6t − 1']
    ]
  },
  {
    date:'29.10',weekday:'Четверг',title:'День 3 · 29 октября',tasks:[
      ['Найдите делимое a: a/7 = 9.','a = 63'],
      ['Найдите x из пропорции 5/x = 10/18.','x = 9'],
      ['Из формулы 2R = Gm₁m₂/F выразите R.','R = Gm₁m₂/(2F)'],
      ['Решите уравнение 12 − 3x = 5x − 4.','x = 2'],
      ['Решите уравнение (7x + 3)/6 = 5.','x = 27/7'],
      ['Решите уравнение 9/(2x − 5) = 3.','x = 4'],
      ['Решите уравнение 15/(−5x + 10) = 3.','x = 1'],
      ['ВУПС · Вычитаемое. Запишите со скобками и упростите разность выражений 4x − 9 и −2x + 5.','(4x − 9) − (−2x + 5) = 6x − 14'],
      ['ВУПС · Умножаемое. Запишите со скобками произведение −3 и 2p − 7, затем раскройте скобки.','−3(2p − 7) = −6p + 21'],
      ['ВУПС · Подставляемое. Подставьте x = 5 − 2y в 3x − 4 и упростите.','3(5 − 2y) − 4 = 11 − 6y']
    ]
  },
  {
    date:'30.10',weekday:'Пятница',title:'День 4 · 30 октября',tasks:[
      ['Найдите делитель b: 42/b = 6.','b = 7'],
      ['Найдите x из пропорции 3/8 = 9/x.','x = 24'],
      ['Из формулы F = Gm₁m₂/R² выразите G.','G = FR²/(m₁m₂)'],
      ['Решите уравнение 7(x − 2) = 3x + 10.','x = 6'],
      ['Решите уравнение (5x − 3)/7 = 6.','x = 9'],
      ['Решите уравнение 8/(5x + 3) = 2.','x = 1/5'],
      ['Решите уравнение 12/(−4x − 2) = −3.','x = 1/2'],
      ['ВУПС · Вычитаемое. Запишите со скобками и упростите разность выражений 5x + 2 и x − 9.','(5x + 2) − (x − 9) = 4x + 11'],
      ['ВУПС · Умножаемое. Запишите со скобками произведение −4 и 3a − 2, затем раскройте скобки.','−4(3a − 2) = −12a + 8'],
      ['ВУПС · Подставляемое. Подставьте x = 3z − 4 в 5 − 2x и упростите.','5 − 2(3z − 4) = 13 − 6z']
    ]
  },
  {
    date:'31.10',weekday:'Суббота',title:'День 5 · 31 октября',tasks:[
      ['Найдите вычитаемое b: 50 − b = 17.','b = 33'],
      ['Найдите x из пропорции (x − 1)/6 = 5/4.','x = 17/2'],
      ['Из формулы F = Gm₁m₂/R² выразите R при положительных величинах.','R = √(Gm₁m₂/F)'],
      ['Решите уравнение −4x + 9 = 3x − 12.','x = 3'],
      ['Решите уравнение (2x − 5)/3 = 7.','x = 13'],
      ['Решите уравнение 7/(3x − 4) = 1.','x = 11/3'],
      ['Решите уравнение 6/(−2x + 1) = −3.','x = 3/2'],
      ['ВУПС · Вычитаемое. Запишите со скобками и упростите разность выражений 2x − 11 и 5 − 3x.','(2x − 11) − (5 − 3x) = 5x − 16'],
      ['ВУПС · Умножаемое. Запишите со скобками произведение 7 и 2t − 5, затем раскройте скобки.','7(2t − 5) = 14t − 35'],
      ['ВУПС · Подставляемое. Подставьте t = 1 − 4k в 6 − 3t и упростите.','6 − 3(1 − 4k) = 3 + 12k']
    ]
  },
  {
    date:'01.11',weekday:'Воскресенье',title:'День 6 · 1 ноября',tasks:[
      ['Найдите делитель b: 48/b = 12.','b = 4'],
      ['Найдите x из пропорции (2x + 1)/5 = 7/3.','x = 16/3'],
      ['Из формулы F = Gm₁m₂/R² выразите произведение m₁m₂.','m₁m₂ = FR²/G'],
      ['Решите уравнение 4(2x − 3) − 5 = 3(x + 1).','x = 4'],
      ['Решите уравнение (5x + 4)/6 = 7.','x = 38/5'],
      ['Решите уравнение 15/(4x − 1) = 5.','x = 1'],
      ['Решите уравнение 9/(−3x + 6) = −3.','x = 3'],
      ['ВУПС · Вычитаемое. Запишите со скобками и упростите разность выражений −x + 6 и 2x − 9.','(−x + 6) − (2x − 9) = −3x + 15'],
      ['ВУПС · Умножаемое. Запишите со скобками произведение −2 и 4a − 9, затем раскройте скобки.','−2(4a − 9) = −8a + 18'],
      ['ВУПС · Подставляемое. Подставьте x = 2y − 5 в 3(x − 1) − 2x и упростите.','3((2y − 5) − 1) − 2(2y − 5) = 2y − 8']
    ]
  }
];
const completed=new Set();
let currentDay=0;
function make(tag,cl,txt=''){const n=document.createElement(tag);if(cl)n.className=cl;n.textContent=txt;return n;}
function showMethod(index){
  const entry=methodTexts[index],output=$('methodOutput');
  if(!entry||!output)return;
  const formula=make('p','math-display');formula.append(mathML(entry.text));output.replaceChildren(make('p','index-label',entry.tag),formula);
  $('methodTabs').querySelectorAll('button[data-method]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.method)===index)));
}
function progress(){
  const count=DAYS[currentDay].tasks.filter((_,i)=>completed.has(currentDay+':'+i)).length;
  $('dayProgress').textContent=count+' из 10 отмечено';
}
function showDay(index){
  if(!DAYS[index])return;
  currentDay=index;
  const day=DAYS[index],host=$('exerciseList'),frag=document.createDocumentFragment();
  day.tasks.forEach(([question,answer],i)=>{
    const item=make('li','exercise');
    item.dataset.wups=String(i>=7);
    const inside=make('div','exercise-body');
    const questionNode=make('div','exercise-text');appendFormattedQuestion(questionNode,question);inside.append(questionNode);
    const actions=make('div','exercise-actions');
    const reveal=make('button','answer-toggle','Показать ответ');
    reveal.type='button';reveal.setAttribute('aria-expanded','false');
    const answerHost=make('div','answer');answerHost.append(mathML(answer));answerHost.hidden=true;
    answerHost.id='answer-'+index+'-'+i;
    reveal.setAttribute('aria-controls',answerHost.id);
    reveal.addEventListener('click',()=>{
      const open=answerHost.hidden;
      answerHost.hidden=!open;reveal.setAttribute('aria-expanded',String(open));
      reveal.textContent=open?'Скрыть ответ':'Показать ответ';
    });
    const done=make('button','completion-toggle',completed.has(index+':'+i)?'Отмечено':'Отметить выполненным');
    done.type='button';done.setAttribute('aria-pressed',String(completed.has(index+':'+i)));
    done.addEventListener('click',()=>{
      const key=index+':'+i;
      if(completed.has(key))completed.delete(key);else completed.add(key);
      done.setAttribute('aria-pressed',String(completed.has(key)));
      done.textContent=completed.has(key)?'Отмечено':'Отметить выполненным';
      progress();
    });
    actions.append(reveal,done);inside.append(actions,answerHost);item.append(inside);frag.append(item);
  });
  host.replaceChildren(frag);
  $('dayTitle').textContent=day.title;
  $('dayMeta').textContent='ДЕНЬ '+(index+1)+' / '+day.weekday.toLocaleUpperCase('ru')+' / '+day.date+'.2026';
  $('dayTabs').querySelectorAll('button[data-day]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.day)===index)));
  progress();
}
function start(){
  const themeKey='volodia-math-lesson-theme';
  try{const stored=localStorage.getItem(themeKey);if(stored==='dark'||stored==='light')document.documentElement.dataset.theme=stored;}catch(_){}
  $('themeToggle').addEventListener('click',()=>{
    const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';
    document.documentElement.dataset.theme=theme;
    try{localStorage.setItem(themeKey,theme);}catch(_){}
  });
  $('methodTabs').addEventListener('click',event=>{
    const button=event.target.closest('button[data-method]');if(button)showMethod(Number(button.dataset.method));
  });
  $('dayTabs').addEventListener('click',event=>{
    const button=event.target.closest('button[data-day]');if(button)showDay(Number(button.dataset.day));
  });
  $('resetDay').addEventListener('click',()=>{
    for(let i=0;i<10;i++)completed.delete(currentDay+':'+i);
    showDay(currentDay);
  });
  convertStaticMath();showMethod(0);showDay(0);
}
start();
