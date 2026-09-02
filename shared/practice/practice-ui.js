import {buildPracticeAnalyticsMetadata} from './practice-analytics-metadata.js';
import {PracticeEngine} from './practice-engine.js';
import {calendarDayDifference} from './practice-scheduler.js';
import {PracticeSyncCoordinator,PracticeSyncHttpTransport} from './practice-sync.js';
import {setMathText} from './mathml.js';

const byId=id=>document.getElementById(id);
const practiceDialog=()=>byId('competencyDialog')||byId('topicDialog')||document.querySelector('[data-practice-dialog]');
const element=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
const richElement=(tag,className,text)=>setMathText(element(tag,className),text);
const formatDate=value=>value?new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long'}).format(new Date(`${value}T12:00:00`)):'после первой попытки';

class PracticeDashboardController{
  constructor(root,engine){this.root=root;this.engine=engine;this.feedback='';this.hintText='';this.solution=[];this.sync=null;this.syncPending=false;this.syncStatus='local-only';this.bindExternal();this.render();}
  bindExternal(){
    addEventListener('student:competence-state',event=>{this.engine.updateCompetenceSnapshot(event.detail?.state||{});this.render();this.queueSync();});
    addEventListener('student:competency-open',event=>this.renderDialog(event.detail?.competencyId));
    this.ensureDialog();
  }
  attachSync(coordinator){this.sync=coordinator;this.syncStatus='connecting';return coordinator.syncNow().then(result=>{this.syncStatus=result.status;this.render();return result;});}
  queueSync(){if(!this.sync||this.syncPending)return;this.syncPending=true;queueMicrotask(async()=>{try{const result=await this.sync.syncNow();this.syncStatus=result.status;}catch(error){console.warn('Practice sync failed; local state remains authoritative for this device',error);this.syncStatus='offline';}finally{this.syncPending=false;}});}
  emit(){dispatchEvent(new CustomEvent('student:practice-state',{detail:{state:this.engine.state,config:this.engine.config,syncStatus:this.syncStatus}}));this.queueSync();}
  clear(){this.root.replaceChildren();}
  button(label,className='practice-button'){const button=element('button',className,label);button.type='button';return button;}
  render(){
    this.clear();const preview=this.engine.preview(),session=preview.session;
    if(session?.status==='active'){this.renderExercise();return;}
    if(session?.status==='completed'){this.renderCompletion(session);return;}
    this.renderOverview(preview.items);
  }
  renderOverview(items){
    const card=element('div','practice-card'),copy=element('div','practice-card-copy');
    if(!items.length){copy.append(element('h3','','На сегодня всё ✓'),element('p','','Активных заданий с наступившей датой повторения сейчас нет.'));card.append(copy);this.root.append(card);return;}
    const minutes=Math.max(5,Math.min(15,Math.round(items.length*1.7))),manual=items.filter(item=>item.manual).length,weak=items.filter(item=>item.masteryLevel<=2).length;
    copy.append(element('h3','',`${items.length} заданий · около ${minutes} минут`),element('p','',`${manual?`${manual} из ручной очереди · `:''}${weak} навыков требуют закрепления. Порядок сохранится при обновлении страницы.`));
    const start=this.button('Начать тренировку');start.id='practiceStart';start.addEventListener('click',()=>{this.engine.startSession();this.engine.beginCurrent();this.emit();this.render();this.focusPrompt();});card.append(copy,start);this.root.append(card);
  }
  renderExercise(){
    const session=this.engine.currentSession(),item=this.engine.currentItem(),exercise=this.engine.exerciseFor(item);if(!item||!exercise){this.renderCompletion(session);return;}
    if(!item.startedAt)this.engine.beginCurrent();
    const wrapper=element('div','practice-session'),top=element('div','practice-progress');top.append(element('span','',`Задание ${session.currentIndex+1} из ${session.items.length}`),element('span','',item.remediation?'Повторная попытка':exercise.metadata.topic));
    const title=richElement('h3','practice-prompt',exercise.prompt);title.id='practicePrompt';title.tabIndex=-1;
    const form=element('form','practice-answer'),label=element('label','','Ваш ответ');label.htmlFor='practiceAnswer';
    const input=element('input','practice-input');input.id='practiceAnswer';input.name='answer';input.autocomplete='off';input.inputMode=['integer','number','fraction'].includes(exercise.answerSpec.type)?'decimal':'text';input.setAttribute('aria-describedby','practiceFeedback');
    const submit=this.button('Проверить');submit.type='submit';form.append(label,input,submit);form.addEventListener('submit',event=>{event.preventDefault();this.check(input.value);});
    const actions=element('div','practice-actions'),hint=this.button('Подсказка','practice-button secondary'),reveal=this.button('Показать решение','practice-button ghost');hint.id='practiceHint';reveal.id='practiceReveal';
    hint.addEventListener('click',()=>{const value=this.engine.useHint();this.hintText=value?.text||'';this.emit();this.render();});reveal.addEventListener('click',()=>{this.solution=this.engine.revealSolution();this.feedback='Решение открыто. Оцените попытку и запланируйте повторение.';this.emit();this.render();});actions.append(hint,reveal);
    const feedback=richElement('div','practice-feedback',this.feedback);feedback.id='practiceFeedback';feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
    wrapper.append(top,title,form,actions,feedback);
    if(this.hintText)wrapper.append(this.note('Подсказка',this.hintText));
    if(this.solution.length)wrapper.append(this.note('Решение',this.solution.join(' ')));
    if(item.status==='awaiting-rating'){
      input.disabled=true;submit.disabled=true;hint.disabled=true;reveal.disabled=true;
      if(item.outcome==='incorrect'&&!this.solution.length){this.solution=exercise.solution;wrapper.append(this.note('Разбор',exercise.solution.join(' ')));}
      wrapper.append(this.ratingPanel(item));
    }
    this.root.append(wrapper);
  }
  note(title,text){const note=element('div','practice-note');note.append(element('b','',title),richElement('p','',text));return note;}
  check(raw){
    const result=this.engine.submitAnswer(raw);
    if(result.status==='invalid'){this.feedback=result.diagnostics||'Проверьте формат ответа.';this.render();byId('practiceAnswer')?.focus();return;}
    if(result.status==='correct'){this.feedback='Верно. Теперь оцените, насколько уверенно получилось решить.';}
    else if(result.awaitingRating){this.feedback=`Ответ пока не совпал. Верный ответ: ${result.expectedDisplay}.`;this.solution=this.engine.exerciseFor().solution;}
    else{this.feedback='Пока есть ошибка. Проверьте ход решения или откройте следующую подсказку.';}
    this.emit();this.render();if(!result.awaitingRating)byId('practiceAnswer')?.focus();
  }
  ratingPanel(item){
    const fieldset=element('fieldset','practice-rating'),legend=element('legend','','Как прошла попытка?');fieldset.append(legend);
    const options=item.outcome==='incorrect'?[['again','Повторить']]:[['again','Повторить'],['hard','Было сложно'],['good','Нормально'],['easy','Легко']];
    for(const [rating,label] of options){const button=this.button(label,rating==='good'?'practice-button':'practice-button secondary');button.dataset.rating=rating;button.addEventListener('click',()=>{this.engine.rate(rating);this.feedback='';this.hintText='';this.solution=[];this.emit();this.render();this.focusPrompt();});fieldset.append(button);}
    return fieldset;
  }
  renderCompletion(session){
    const card=element('div','practice-card completion'),correct=session.items.filter(item=>item.outcome==='correct').length,hints=session.items.reduce((sum,item)=>sum+item.hintsUsed,0),next=Object.values(this.engine.state.competencies).map(item=>item.dueAt).filter(Boolean).sort()[0];
    const copy=element('div','practice-card-copy');copy.append(element('h3','',`Тренировка завершена: ${correct} из ${session.items.length}`),element('p','',`${hints?`Использовано подсказок: ${hints}. `:''}Ближайшее повторение: ${formatDate(next)}.`));
    const mapLink=element('a','practice-button secondary','Перейти к карте');mapLink.href='#map';card.append(copy,mapLink);this.root.append(card);
  }
  focusPrompt(){requestAnimationFrame(()=>byId('practicePrompt')?.focus());}
  ensureDialog(){
    const dialog=practiceDialog();if(!dialog||byId('dialogPracticeSchedule'))return;
    const box=element('div','dialog-practice');box.id='dialogPracticeSchedule';box.hidden=true;const title=element('b','','Интервальное повторение'),status=element('p','');status.id='dialogPracticeStatus';
    const button=this.button('Решить сейчас','practice-button secondary');button.id='dialogPracticeNow';box.append(title,status,button);const actions=dialog.querySelector('.lesson-actions,.dialog-actions,[data-practice-actions]');if(actions)actions.before(box);else dialog.firstElementChild?.append(box);
  }
  renderDialog(competencyId){
    const box=byId('dialogPracticeSchedule'),button=byId('dialogPracticeNow'),status=byId('dialogPracticeStatus'),mapping=this.engine.config.competencies[competencyId];if(!box||!button||!status)return;
    box.hidden=!mapping;if(!mapping)return;const entry=this.engine.scheduleFor(competencyId),today=this.engine.today();
    if(!entry?.dueAt)status.textContent='Навык доступен для первой тренировки.';
    else{const delta=calendarDayDifference(today,entry.dueAt);status.textContent=delta<0?'Повторение просрочено.':delta===0?'Повторение запланировано на сегодня.':`Следующее повторение через ${delta} дн. — ${formatDate(entry.dueAt)}.`;}
    button.onclick=()=>{this.engine.startFocused(competencyId);practiceDialog()?.close?.();this.emit();this.render();byId('practiceSection')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});this.focusPrompt();};
  }
}

function practiceCsrfToken(){return document.querySelector('meta[name="csrf-token"]')?.content||window.__studentPracticeCsrf||null;}

export function initPracticeDashboard({config,lessons=[],competenceSnapshot=null}={}){
  const root=byId('practiceRoot'),section=byId('practiceSection');if(!root||!config?.enabled){if(section)section.hidden=true;return null;}
  try{
    const engine=new PracticeEngine({config,lessons,competenceSnapshot:competenceSnapshot||window.__studentCompetenceState||null}),controller=new PracticeDashboardController(root,engine);
    window.__studentPractice=controller;
    if(config.features?.serverSync===true){
      const transport=new PracticeSyncHttpTransport({baseUrl:config.syncBaseUrl||'',csrfToken:practiceCsrfToken});
      const coordinator=new PracticeSyncCoordinator({
        storage:engine.storage,
        transport,
        enabled:true,
        rehydrate:state=>{engine.state=state;engine.activateConfigured();engine.persist();controller.render();},
        metadataProvider:()=>buildPracticeAnalyticsMetadata({
          studentId:config.studentId,
          studentLevels:engine.competenceSnapshot.studentLevels,
          lessons:engine.lessons,
          config,
          sourceRevision:config.analyticsSourceRevision||''
        })
      });
      controller.attachSync(coordinator).catch(error=>console.warn('Practice sync bootstrap failed; local practice remains available',error));
    }
    return controller;
  }
  catch(error){console.error('Failed to initialize practice dashboard',error);root.replaceChildren(element('p','practice-warning','Тренировка временно недоступна. Остальные материалы кабинета продолжают работать.'));return null;}
}
