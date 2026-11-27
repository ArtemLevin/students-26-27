// Read-only cumulative lesson coverage. Mastery remains an independent authority.
const RANK=Object.freeze({historical:1,touched:2,practiced:3,assessed:4});
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const ID=/^[A-Za-z0-9_.:-]+$/;
const ANCHOR=/^[A-Za-z][A-Za-z0-9_-]*$/;
export const COVERAGE_LABELS=Object.freeze({historical:'Историческая отметка',touched:'Рассмотрено',practiced:'Отработано',assessed:'Оценивалось'});
export function cumulativeCoverage(lessons,{knownIds=null,includeLegacy=false}={}){
  const recent=[...lessons].filter(l=>l&&typeof l.date==='string'&&DATE.test(l.date)).sort((a,b)=>b.date.localeCompare(a.date));
  const byId=new Map();
  let unlinked=0;
  for(const lesson of recent) for(const outcome of lesson.outcomes||[]){
    if(!outcome||typeof outcome!=='object')continue;
    const canonical=typeof outcome.evidenceAnchor==='string'&&ANCHOR.test(outcome.evidenceAnchor)&&['touched','practiced','assessed'].includes(outcome.relation);
    const legacy=includeLegacy&&typeof outcome.label==='string'&&outcome.label.trim()&&typeof outcome.level==='number'&&Number.isInteger(outcome.level)&&outcome.level>0&&outcome.level<=4;
    if(!canonical&&!legacy){unlinked++;continue;}
    const id=outcome.competencyId;
    if(typeof id!=='string'||!ID.test(id)||(knownIds&&!knownIds.has(id))){unlinked++;continue;}
    const relation=canonical?outcome.relation:'historical',anchor=canonical?outcome.evidenceAnchor:null;
    if(!byId.has(id))byId.set(id,{relation,entries:[]});
    const item=byId.get(id);
    if(RANK[relation]>RANK[item.relation])item.relation=relation;
    if(!item.entries.some(e=>e.date===lesson.date&&e.anchor===anchor&&e.relation===relation))
      item.entries.push({date:lesson.date,title:lesson.title,href:lesson.href,anchor,relation});
  }
  const latestDate=recent[0]?.date;
  const newIds=new Set([...byId].filter(([,item])=>item.entries.every(e=>e.date===latestDate)).map(([id])=>id));
  const counts={historical:0,touched:0,practiced:0,assessed:0};
  for(const item of byId.values())counts[item.relation]++;
  return {recent,byId,newIds,counts,unlinked};
}
export function normalizeCoverageCatalog(catalog){
  if(!catalog||!Array.isArray(catalog.groups))throw Error('Некорректный каталог компетенций');
  const ids=new Set();
  const groups=catalog.groups.map((g,i)=>({name:g.name||g.title||g.short||'Раздел '+(i+1),items:(g.items||[]).map(item=>{
    if(typeof item.id!=='string'||!ID.test(item.id)||ids.has(item.id)||typeof item.title!=='string'||!item.title.trim())throw Error('Некорректный идентификатор или название навыка');
    ids.add(item.id);return {id:item.id,title:item.title};
  })}));
  return {groups,ids};
}
