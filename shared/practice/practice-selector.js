import {stableHash} from './random.js';
import {isDue,overdueDays} from './practice-scheduler.js';

export const DEFAULT_SELECTOR_WEIGHTS=Object.freeze({manual:1000,overdueDay:10,overdueCap:300,levels:{1:80,2:50,3:20,4:10},recentLapse:60,neverPracticed:40,sameGroupPenalty:35});

function groupFor(id,mapping){return mapping.group||id.split('_').slice(0,2).join('_');}
function candidateScore({id,mapping,entry,level,manual,today,weights,tieSeed}){
  let score=manual?weights.manual:0;
  score+=Math.min(weights.overdueCap,overdueDays(entry,today)*weights.overdueDay);
  score+=weights.levels[level]||0;
  if(entry?.repeatedLapse||entry?.lastRating==='again')score+=weights.recentLapse;
  if(!entry?.attempts)score+=weights.neverPracticed;
  return {competencyId:id,mapping,entry,masteryLevel:level,manual,group:groupFor(id,mapping),score,tie:stableHash(`${tieSeed}|${id}`)};
}

export function selectDailyCompetencies({config,state,studentLevels={},reviewQueue={},today,target=config.dailyTarget||5,weights={...DEFAULT_SELECTOR_WEIGHTS,...(config.selectorWeights||{})},seed=`${config.studentId}:${today}`}={}){
  const candidates=[];
  for(const [id,mapping] of Object.entries(config.competencies||{})){
    const entry=state.competencies?.[id],level=Math.max(0,Math.min(4,Math.round(Number(studentLevels[id]??mapping.masteryLevel??0)))),manual=Boolean(reviewQueue[id]);
    if(mapping.active===false&&!manual)continue;
    const active=entry?.status==='active'||mapping.active===true||manual;
    if(!active||(!manual&&level===0&&!entry?.activatedAt))continue;
    if(!manual&&!isDue(entry,today))continue;
    candidates.push(candidateScore({id,mapping,entry,level,manual,today,weights,tieSeed:seed}));
  }
  const selected=[],groupCounts=new Map(),remaining=[...candidates];
  while(remaining.length&&selected.length<Math.min(config.dailyMax||7,target)){
    remaining.sort((a,b)=>{
      const adjustedA=a.score-(groupCounts.get(a.group)||0)*weights.sameGroupPenalty,adjustedB=b.score-(groupCounts.get(b.group)||0)*weights.sameGroupPenalty;
      return adjustedB-adjustedA||a.tie-b.tie||a.competencyId.localeCompare(b.competencyId);
    });
    const index=remaining.findIndex(item=>(groupCounts.get(item.group)||0)<(config.maxPerGroup||2));
    if(index<0)break;
    const [chosen]=remaining.splice(index,1);selected.push(chosen);groupCounts.set(chosen.group,(groupCounts.get(chosen.group)||0)+1);
  }
  return selected;
}

export function summarizeSelection(items=[],today=null){
  return {total:items.length,manual:items.filter(item=>item.manual).length,overdue:items.filter(item=>today&&item.entry?.dueAt&&item.entry.dueAt<today).length,weak:items.filter(item=>item.masteryLevel<=2).length,control:items.filter(item=>item.masteryLevel>=3).length};
}
