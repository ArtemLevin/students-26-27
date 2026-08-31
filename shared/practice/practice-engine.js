import {resolveActivationPolicy} from './activation-policy.js';
import {appendPracticeEvent,activateCompetency,normalizePracticeState,saveSession,syncLessonActivations} from './practice-state.js';
import {LocalStoragePracticeStorage} from './practice-storage.js';
import {buildExerciseSeed,stableHash} from './random.js';
import {chooseDifficulty,localToday,scheduleRating} from './practice-scheduler.js';
import {selectDailyCompetencies} from './practice-selector.js';
import {GeneratorRegistry,validatePracticeConfig} from './generator-registry.js';
import {ALL_GENERATORS} from './generators/index.js';
import {validateAnswer} from './answer-engine.js';

const nowIso=()=>new Date().toISOString();
const emptySnapshot=()=>({studentLevels:{},reviewQueue:{}});

export function readCompetenceSnapshot(stateKey,storage=globalThis.localStorage){
  if(!stateKey||!storage)return emptySnapshot();
  try{
    const state=JSON.parse(storage.getItem(stateKey)||'null');
    return state&&typeof state==='object'?{studentLevels:state.studentLevels||{},reviewQueue:state.reviewQueue||{}}:emptySnapshot();
  }catch(_){return emptySnapshot();}
}

export class PracticeEngine{
  constructor({config,lessons=[],storage=null,registry=null,todayProvider=()=>localToday(),now=nowIso,competenceSnapshot=null}={}){
    this.config=config;this.lessons=lessons;this.todayProvider=todayProvider;this.now=now;
    this.registry=registry||new GeneratorRegistry(ALL_GENERATORS);validatePracticeConfig(config,this.registry);
    this.storage=storage||new LocalStoragePracticeStorage({key:config.storageKey,now});
    this.competenceSnapshot=competenceSnapshot||readCompetenceSnapshot(config.masteryStateKey);
    this.state=normalizePracticeState(this.storage.load(),now);this.lastValidation=null;
    this.activateConfigured();
    this.state=syncLessonActivations(this.state,lessons,config,this.today(),now);
    this.persist();
  }
  today(){return this.todayProvider();}
  persist(){this.storage.save(this.state);return this.state;}
  activateConfigured(){
    for(const [id,mapping] of Object.entries(this.config.competencies||{}))if(resolveActivationPolicy(mapping)==='always')this.state=activateCompetency(this.state,id,{today:this.today(),now:this.now});
  }
  updateCompetenceSnapshot(snapshot={}){this.competenceSnapshot={studentLevels:snapshot.studentLevels||{},reviewQueue:snapshot.reviewQueue||{}};return this.preview();}
  selection(){return selectDailyCompetencies({config:this.config,state:this.state,studentLevels:this.competenceSnapshot.studentLevels,reviewQueue:this.competenceSnapshot.reviewQueue,today:this.today()});}
  preview(){
    const session=this.state.sessions[this.today()];if(session?.status==='active'||session?.status==='completed')return {session,items:session.items,completed:session.status==='completed'};
    return {session:null,items:this.selection(),completed:false};
  }
  buildItem(candidate,ordinal,{remediation=false}={}){
    const mapping=candidate.mapping||this.config.competencies[candidate.competencyId],generator=this.registry.get(mapping.generator),entry=this.state.competencies[candidate.competencyId],masteryLevel=candidate.masteryLevel??Number(this.competenceSnapshot.studentLevels[candidate.competencyId]??mapping.masteryLevel??1);
    const seed=buildExerciseSeed({studentId:this.config.studentId,competencyId:candidate.competencyId,date:this.today(),ordinal,generatorVersion:generator.version});
    const difficulty=chooseDifficulty({masteryLevel,allowed:mapping.difficulty,seedValue:stableHash(seed),repeatedLapse:entry?.repeatedLapse,lastRating:entry?.lastRating});
    return {competencyId:candidate.competencyId,seed,generatorKey:generator.key,generatorVersion:generator.version,difficulty,status:'pending',attemptCount:0,hintsUsed:0,outcome:null,rating:null,startedAt:null,checkedAt:null,durationMs:0,remediation};
  }
  startSession(){
    const date=this.today(),existing=this.state.sessions[date];if(existing?.status==='active'||existing?.status==='completed')return existing;
    const selected=this.selection(),items=selected.map((candidate,index)=>this.buildItem(candidate,index));
    const session={sessionId:`${this.config.studentId}:${date}`,date,startedAt:this.now(),completedAt:null,status:items.length?'active':'completed',currentIndex:0,items};
    if(!items.length)session.completedAt=this.now();this.state=saveSession(this.state,session,this.now);this.persist();return this.state.sessions[date];
  }
  currentSession(){return this.state.sessions[this.today()]||null;}
  currentItem(){const session=this.currentSession();return session?.items[session.currentIndex]||null;}
  exerciseFor(item=this.currentItem()){
    if(!item)return null;const mapping=this.config.competencies[item.competencyId];
    return this.registry.generate(item.generatorKey,{seed:item.seed,difficulty:item.difficulty,competencyId:item.competencyId,options:mapping.options||{},locale:'ru-RU'});
  }
  updateSession(mutator){
    const session=structuredClone(this.currentSession());if(!session)throw new Error('Practice session is not started');mutator(session);this.state=saveSession(this.state,session,this.now);this.persist();return this.currentSession();
  }
  beginCurrent(){return this.updateSession(session=>{const item=session.items[session.currentIndex];if(item&&!item.startedAt){item.startedAt=this.now();item.status='answering';}});}
  submitAnswer(rawInput){
    const item=this.currentItem();if(!item)throw new Error('No current exercise');const exercise=this.exerciseFor(item),validation=validateAnswer(exercise.answerSpec,rawInput);this.lastValidation=validation;
    if(validation.status==='invalid')return validation;
    this.updateSession(session=>{
      const current=session.items[session.currentIndex];current.attemptCount+=1;current.checkedAt=this.now();current.outcome=validation.status==='correct'?'correct':'incorrect';
      current.status=validation.status==='correct'||current.attemptCount>=3?'awaiting-rating':'answering';
    });
    return {...validation,attemptCount:this.currentItem().attemptCount,awaitingRating:this.currentItem().status==='awaiting-rating'};
  }
  useHint(){
    const exercise=this.exerciseFor(),item=this.currentItem();if(!exercise||!item)return null;
    const index=Math.min(item.hintsUsed,exercise.hints.length-1),hint=exercise.hints[index];
    this.updateSession(session=>{session.items[session.currentIndex].hintsUsed=Math.min(exercise.hints.length,session.items[session.currentIndex].hintsUsed+1);});return hint;
  }
  revealSolution(){
    const exercise=this.exerciseFor();if(!exercise)return [];
    this.updateSession(session=>{const item=session.items[session.currentIndex];item.outcome='incorrect';item.status='awaiting-rating';item.checkedAt=this.now();});return exercise.solution;
  }
  rate(rating){
    const session=this.currentSession(),item=this.currentItem();if(!session||!item||item.status!=='awaiting-rating')throw new Error('Exercise must be checked before rating');
    const mapping=this.config.competencies[item.competencyId],masteryLevel=Number(this.competenceSnapshot.studentLevels[item.competencyId]??mapping.masteryLevel??1),outcome=item.outcome==='correct'?'correct':'incorrect';
    if(outcome==='incorrect'&&rating!=='again')rating='again';
    const scheduled=scheduleRating(this.state.competencies[item.competencyId],{rating,outcome,hintsUsed:item.hintsUsed,masteryLevel,today:this.today(),now:this.now});
    scheduled.lastExerciseSeed=item.seed;scheduled.lastGeneratorKey=item.generatorKey;scheduled.lastGeneratorVersion=item.generatorVersion;this.state.competencies[item.competencyId]=scheduled;
    const exerciseId=`${item.generatorKey}:v${item.generatorVersion}:${item.seed}`,timestamp=this.now(),durationMs=item.startedAt?Math.max(0,Date.parse(timestamp)-Date.parse(item.startedAt)):0;
    this.state=appendPracticeEvent(this.state,{eventVersion:1,timestamp,sessionId:session.sessionId,exerciseId,competencyId:item.competencyId,generatorKey:item.generatorKey,generatorVersion:item.generatorVersion,seed:item.seed,difficulty:item.difficulty,attemptCount:item.attemptCount,hintsUsed:item.hintsUsed,outcome,rating,durationMs},this.now);
    this.updateSession(current=>{
      const active=current.items[current.currentIndex];active.status='completed';active.rating=rating;active.durationMs=durationMs;
      const remediationLimit=this.config.remediationMax??1,remediations=current.items.filter(candidate=>candidate.competencyId===active.competencyId&&candidate.remediation).length;
      if(this.config.features?.remediation&&rating==='again'&&remediations<remediationLimit&&current.items.length<(this.config.dailyMax||7)+remediationLimit){
        current.items.push(this.buildItem({competencyId:active.competencyId,mapping,masteryLevel},current.items.length+100,{remediation:true}));
      }
      const next=current.items.findIndex((candidate,index)=>index>current.currentIndex&&candidate.status!=='completed');
      if(next>=0)current.currentIndex=next;else{current.status='completed';current.completedAt=this.now();current.currentIndex=Math.max(0,current.items.length-1);}
    });
    return {scheduled:this.state.competencies[item.competencyId],session:this.currentSession()};
  }
  startFocused(competencyId){
    const mapping=this.config.competencies[competencyId];if(!mapping)throw new Error('This competency has no exercise generator');
    if(resolveActivationPolicy(mapping)==='disabled')throw new Error('This competency is disabled for practice');
    this.state=activateCompetency(this.state,competencyId,{today:this.today(),now:this.now});let session=this.currentSession();
    if(!session)session=this.startSession();
    this.updateSession(current=>{
      const existing=current.items.findIndex(item=>item.competencyId===competencyId&&item.status!=='completed');
      if(existing>=0){current.currentIndex=existing;current.status='active';current.completedAt=null;return;}
      current.items.push(this.buildItem({competencyId,mapping,masteryLevel:Number(this.competenceSnapshot.studentLevels[competencyId]??mapping.masteryLevel??1)},current.items.length+200));current.currentIndex=current.items.length-1;current.status='active';current.completedAt=null;
    });
    return this.currentSession();
  }
  scheduleFor(competencyId){return this.state.competencies[competencyId]||null;}
}

export function getPracticeDiagnostics(state,config,today=localToday()){
  const entries=Object.values(state?.competencies||{}),due=entries.filter(entry=>entry.status==='active'&&(!entry.dueAt||entry.dueAt<=today));
  return {activeCount:entries.filter(entry=>entry.status==='active').length,dueCount:due.length,overdueCount:due.filter(entry=>entry.dueAt&&entry.dueAt<today).length,
    invalidConfigCount:Object.keys(config?.competencies||{}).filter(id=>!state?.competencies?.[id]).length,lastSession:Object.values(state?.sessions||{}).sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0]||null,storageSchemaVersion:state?.schemaVersion||null};
}
