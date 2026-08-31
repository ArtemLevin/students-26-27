import {normalizeCompetencyPractice} from './practice-state.js';

export const DEFAULT_INTERVALS=Object.freeze([1,3,7,14,30,60,120]);
export const MASTERY_POLICY=Object.freeze({0:{step:0,difficulty:[1]},1:{step:0,difficulty:[1]},2:{step:0,difficulty:[1,2]},3:{step:1,difficulty:[2]},4:{step:2,difficulty:[2,3]}});

export function localToday(now=new Date()){
  const year=now.getFullYear(),month=String(now.getMonth()+1).padStart(2,'0'),day=String(now.getDate()).padStart(2,'0');
  return `${year}-${month}-${day}`;
}
export function addCalendarDays(value,days){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new TypeError('Expected YYYY-MM-DD');
  const [year,month,day]=value.split('-').map(Number),date=new Date(Date.UTC(year,month-1,day+days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')}`;
}
export function calendarDayDifference(from,to){
  const parse=value=>{const [year,month,day]=value.split('-').map(Number);return Date.UTC(year,month-1,day)/86400000;};
  return Math.round(parse(to)-parse(from));
}
export function initialStepForMastery(level){return MASTERY_POLICY[Math.max(0,Math.min(4,Math.round(Number(level)||0)))].step;}
export function chooseDifficulty({masteryLevel=1,allowed=[1,2,3],seedValue=0,repeatedLapse=false,lastRating=null}={}){
  const policy=MASTERY_POLICY[Math.max(0,Math.min(4,Math.round(Number(masteryLevel)||0)))],valid=allowed.filter(value=>Number.isInteger(value)&&value>=1&&value<=3);
  let pool=(valid.length?valid:[1]).filter(value=>policy.difficulty.includes(value));if(!pool.length)pool=valid.length?valid:[1];
  let difficulty=pool[Math.abs(Number(seedValue)||0)%pool.length];
  if(repeatedLapse)difficulty=Math.max(Math.min(...valid),difficulty-1);
  if(lastRating==='easy'&&valid.includes(difficulty+1))difficulty+=1;
  return difficulty;
}

export function scheduleRating(current,{rating,outcome,hintsUsed=0,masteryLevel=1,today,now=()=>new Date().toISOString(),intervals=DEFAULT_INTERVALS}={}){
  if(!['again','hard','good','easy'].includes(rating))throw new TypeError('Unknown practice rating');
  if(!today)throw new TypeError('Today is required');
  const previous=normalizeCompetencyPractice(current),first=previous.attempts===0,start=initialStepForMastery(masteryLevel),last=intervals.length-1;
  let step=previous.intervalStep,intervalDays;
  if(rating==='again'){step=0;intervalDays=intervals[0];}
  else if(first){step=Math.min(last,start+(rating==='easy'?1:0));intervalDays=intervals[step];}
  else if(rating==='hard'){
    step=Math.max(0,Math.min(last,step<0?start:step));
    intervalDays=Math.max(1,Math.min(intervals[Math.min(last,step+1)],Math.round(Math.max(previous.intervalDays||intervals[step],1)*1.5)));
  }else{step=Math.min(last,Math.max(step,start-1)+(rating==='easy'?2:1));intervalDays=intervals[step];}
  const failed=rating==='again'||outcome==='incorrect',consecutiveLapses=failed?previous.consecutiveLapses+1:0;
  return {...previous,status:'active',dueAt:addCalendarDays(today,intervalDays),intervalStep:step,intervalDays,attempts:previous.attempts+1,
    correct:previous.correct+(outcome==='correct'?1:0),streak:failed?0:previous.streak+1,lapses:previous.lapses+(failed?1:0),consecutiveLapses,
    repeatedLapse:consecutiveLapses>=2,hintsUsedTotal:previous.hintsUsedTotal+Math.max(0,Number(hintsUsed)||0),lastAttemptAt:now(),lastRating:rating,lastOutcome:outcome==='correct'?'correct':'incorrect'};
}

export function isDue(entry,today){return !entry?.dueAt||entry.dueAt<=today;}
export function overdueDays(entry,today){return entry?.dueAt&&entry.dueAt<today?calendarDayDifference(entry.dueAt,today):0;}
