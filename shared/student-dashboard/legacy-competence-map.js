export const STATE_SCHEMA_VERSION=2;
export const LEVEL_LABELS=['Не изучено','Нужна помощь','В процессе','Уверенно','Освоено'];
export const LEVEL_DESCRIPTIONS=[
  'Тема ещё не проходилась',
  'Решение выполняется с подсказкой',
  'Алгоритм понятен, остаются ошибки',
  'Типовые задачи решаются самостоятельно',
  'Навык устойчив в смешанных задачах'
];

export function extractArrayExpression(html,names=['groups','GROUPS']){
  if(typeof html!=='string')throw new TypeError('catalog source must be text');
  for(const name of names){
    const re=new RegExp(`\\b(?:const|let|var)\\s+${name}\\s*=\\s*`,'g');
    const match=re.exec(html);
    if(!match)continue;
    const start=html.indexOf('[',match.index+match[0].length);
    if(start<0)continue;
    let depth=0,quote=null,escape=false,templateDepth=0;
    for(let index=start;index<html.length;index+=1){
      const char=html[index];
      if(quote){
        if(escape){escape=false;continue;}
        if(char==='\\'){escape=true;continue;}
        if(quote==='`'&&char==='$'&&html[index+1]==='{'){templateDepth+=1;index+=1;continue;}
        if(quote==='`'&&char==='}'&&templateDepth){templateDepth-=1;continue;}
        if(char===quote&&!templateDepth)quote=null;
        continue;
      }
      if(char==='"'||char==="'"||char==='`'){quote=char;continue;}
      if(char==='[')depth+=1;
      else if(char===']'){
        depth-=1;
        if(depth===0)return html.slice(start,index+1);
      }
    }
  }
  throw new Error('competency catalog array not found');
}

export function evaluateCatalogExpression(expression){
  const value=Function(`"use strict";return (${expression});`)();
  if(!Array.isArray(value)||!value.length)throw new Error('competency catalog is empty');
  return value;
}

export function normalizeGroups(raw){
  if(raw.every(group=>Array.isArray(group))){
    return raw.map(group=>{
      const [short,id,title,summary,diagnostic,items]=group;
      return {short,id,title,summary,diagnostic,items:String(items||'').split('|').filter(Boolean).map((itemTitle,index)=>({
        id:`${id}_${index+1}`,title:itemTitle,exam:'',description:summary||'',practice:diagnostic||'',catalog:title,level:0
      }))};
    });
  }
  return raw.map((group,index)=>({...group,id:group.id||`group_${index+1}`,short:group.short||group.code||String(index+1).padStart(2,'0'),title:group.title||`Раздел ${index+1}`,items:Array.isArray(group.items)?group.items:[]}));
}

export function flattenGroups(groups){return groups.flatMap(group=>group.items.map((item,index)=>({...item,ring:index+1,groupId:group.id,groupTitle:group.title,groupShort:group.short})));}

export function validateCatalog(groups){
  const items=flattenGroups(groups),ids=new Set();
  if(!items.length)throw new Error('catalog contains no skills');
  for(const item of items){
    if(!item.id)throw new Error('competency without id');
    if(ids.has(item.id))throw new Error(`duplicate competency id: ${item.id}`);
    ids.add(item.id);
  }
  return {groups:groups.length,items:items.length};
}

function readJson(storage,key,fallback){
  if(!key)return fallback;
  try{const value=JSON.parse(storage.getItem(key)||'null');return value??fallback;}catch(_){return fallback;}
}
function readObject(storage,key){const value=readJson(storage,key,{});return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}
function hasOwn(object,key){return Object.prototype.hasOwnProperty.call(object,key);}
export function clamp(value){const numeric=Number(value);return Number.isFinite(numeric)?Math.max(0,Math.min(4,Math.round(numeric))):0;}

function createSeededLevels(groups,saved={},teacherSeed={}){
  const levels={...saved};
  for(const item of flattenGroups(groups)){
    if(hasOwn(levels,item.id)){levels[item.id]=clamp(levels[item.id]);continue;}
    const aliases=[...(item.legacyIds||[]),...(item.legacyId?[item.legacyId]:[])];
    const migrated=aliases.map(id=>saved[id]).find(value=>value!==undefined);
    levels[item.id]=clamp(migrated??teacherSeed[item.id]??item.level??0);
  }
  return levels;
}

function normalizeReviewQueue(queue){
  if(!queue||typeof queue!=='object'||Array.isArray(queue))return {};
  return Object.fromEntries(Object.entries(queue).filter(([,entry])=>Boolean(entry)).map(([id,entry])=>[id,typeof entry==='object'&&!Array.isArray(entry)?{...entry}:{addedAt:null}]));
}

function readLegacyQueue(storage,keys=[],now=()=>new Date().toISOString()){
  const queue={};
  for(const key of keys){
    const value=readJson(storage,key,[]);
    const ids=Array.isArray(value)?value:Object.keys(value||{}).filter(id=>Boolean(value[id]));
    for(const id of ids)queue[id]={addedAt:null,migratedAt:now()};
  }
  return queue;
}

export function resolveStateKey(config){return config.stateKey||`${config.storageKey}-state-v2`;}

export function mergeState(groups,storage,config,now=()=>new Date().toISOString()){
  const {storageKey,baselineKey,teacherSeed={},legacyStorageKeys=[],legacyRepeatKeys=[]}=config;
  const stateKey=resolveStateKey(config),stored=readObject(storage,stateKey);
  const hasV2=stored.schemaVersion===STATE_SCHEMA_VERSION&&stored.studentLevels&&typeof stored.studentLevels==='object'&&!Array.isArray(stored.studentLevels);
  const legacyLevels={};
  if(!hasV2){
    for(const key of [...legacyStorageKeys,storageKey]){
      const candidate=readObject(storage,key);
      if(candidate.schemaVersion!==STATE_SCHEMA_VERSION)Object.assign(legacyLevels,candidate);
    }
  }
  const baseline=Object.fromEntries(flattenGroups(groups).map(item=>[item.id,clamp(teacherSeed[item.id]??item.level??0)]));
  const state={schemaVersion:STATE_SCHEMA_VERSION,studentLevels:createSeededLevels(groups,hasV2?stored.studentLevels:legacyLevels,teacherSeed),reviewQueue:hasV2?normalizeReviewQueue(stored.reviewQueue):readLegacyQueue(storage,legacyRepeatKeys,now),updatedAt:hasV2&&typeof stored.updatedAt==='string'?stored.updatedAt:now()};
  try{storage.setItem(baselineKey,JSON.stringify(baseline));storage.setItem(stateKey,JSON.stringify(state));}catch(_){}
  return {state,baseline,stateKey};
}

export function isInReviewQueue(reviewQueue,id){return Boolean(reviewQueue&&reviewQueue[id]);}
export function updateReviewQueue(reviewQueue,id,active,addedAt=new Date().toISOString()){
  const next=normalizeReviewQueue(reviewQueue);
  if(active)next[id]={addedAt};else delete next[id];
  return next;
}
export function matchesCompetencyFilter(filter,itemId,level,reviewQueue={}){
  if(filter==='repeat')return isInReviewQueue(reviewQueue,itemId);
  if(filter==='unseen')return level===0;
  if(filter==='help')return level===1;
  if(filter==='progress')return level===2;
  if(filter==='confident')return level===3;
  if(filter==='mastered')return level===4;
  return true;
}

export function computeSummary(groups,studentLevels,reviewQueue={}){
  const items=flattenGroups(groups),values=items.map(item=>clamp(studentLevels[item.id]??item.level??0)),total=values.length;
  return {total,unseen:values.filter(value=>value===0).length,evaluated:values.filter(value=>value>0).length,help:values.filter(value=>value===1).length,process:values.filter(value=>value===2).length,confident:values.filter(value=>value===3).length,mastered:values.filter(value=>value===4).length,repeat:items.filter(item=>isInReviewQueue(reviewQueue,item.id)).length,average:total?Math.round(values.reduce((sum,value)=>sum+value,0)/(total*4)*100):0};
}

export function normalizeLink(value){
  if(!value||typeof value!=='string')return null;
  const link=value.trim();
  if(!link||link==='#lessons'||link==='index.html#lessons')return null;
  if(link.startsWith('index.html#'))return link.slice('index.html'.length);
  return link;
}

export function getNextRovingIndex(currentIndex,length,key){
  if(!Number.isInteger(length)||length<1)return -1;
  if(key==='Home')return 0;
  if(key==='End')return length-1;
  const safe=Number.isInteger(currentIndex)&&currentIndex>=0&&currentIndex<length?currentIndex:0;
  if(key==='ArrowRight'||key==='ArrowDown')return (safe+1)%length;
  if(key==='ArrowLeft'||key==='ArrowUp')return (safe-1+length)%length;
  return safe;
}

function polar(radius,angle){const radians=(angle-90)*Math.PI/180;return{x:400+radius*Math.cos(radians),y:400+radius*Math.sin(radians)};}
function arc(inner,outer,start,end){const a=polar(outer,start),b=polar(outer,end),c=polar(inner,end),d=polar(inner,start),large=end-start>180?1:0;return`M ${a.x} ${a.y} A ${outer} ${outer} 0 ${large} 1 ${b.x} ${b.y} L ${c.x} ${c.y} A ${inner} ${inner} 0 ${large} 0 ${d.x} ${d.y} Z`;}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}

class MapController{
  constructor(root,groups,config){
    this.root=root;this.groups=groups;this.items=flattenGroups(groups);this.config=config;this.storage=config.storage||localStorage;
    const merged=mergeState(groups,this.storage,config);
    this.state=merged.state;this.baseline=merged.baseline;this.stateKey=merged.stateKey;this.filter='all';this.active=null;this.radialFocusId=null;this.dialogTrigger=null;
    this.svg=root.querySelector('#radialMap');this.index=root.querySelector('#topicIndex');this.dialog=document.getElementById('competencyDialog');this.bind();this.render();
  }
  level(item){return clamp(this.state.studentLevels[item.id]??this.baseline[item.id]??item.level??0);}
  inReview(id){return isInReviewQueue(this.state.reviewQueue,id);}
  matches(item,level=this.level(item)){return matchesCompetencyFilter(this.filter,item.id,level,this.state.reviewQueue);}
  save(){this.state.updatedAt=new Date().toISOString();try{this.storage.setItem(this.stateKey,JSON.stringify(this.state));}catch(_){}}
  render(){
    this.renderMap();this.renderIndex();
    const summary=computeSummary(this.groups,this.state.studentLevels,this.state.reviewQueue),visible=this.items.filter(item=>this.matches(item)).length;
    this.root.querySelector('#radialPercent')?.replaceChildren(document.createTextNode(`${summary.average}%`));
    this.root.querySelector('#radialTopicCount')?.replaceChildren(document.createTextNode(`${summary.total} компетенций`));
    const repeatFilter=this.root.querySelector('[data-filter="repeat"]');if(repeatFilter)repeatFilter.textContent=`В повторении · ${summary.repeat}`;
    const status=this.root.querySelector('#mapLoadStatus');if(status)status.textContent=this.filter==='all'?`Карта готова: ${summary.total} компетенций, оценено ${summary.evaluated}.`:`По выбранному фильтру: ${visible} из ${summary.total} компетенций.`;
    dispatchEvent(new CustomEvent(this.config.summaryEvent,{detail:summary}));
  }
  renderMap(){
    if(!this.svg)return;
    const sector=360/this.groups.length,inner=145,max=Math.max(...this.groups.map(group=>group.items.length)),width=(380-inner)/max,gap=Math.max(1.2,width*.14),focusable=this.items.filter(item=>this.matches(item));
    if(!focusable.some(item=>item.id===this.radialFocusId))this.radialFocusId=focusable[0]?.id||null;
    let html='';
    this.groups.forEach((group,groupIndex)=>{
      const start=groupIndex*sector+1.4,end=(groupIndex+1)*sector-1.4,hasMatches=group.items.some(item=>this.matches(item));
      html+=`<path class="radial-group-arc${hasMatches?'':' is-muted'}" d="${arc(112,137,start,end)}" tabindex="-1" aria-hidden="true"><title>${escapeHtml(group.title)}${hasMatches?'':' · нет совпадений'}</title></path>`;
      group.items.forEach((item,itemIndex)=>{
        const level=this.level(item),r1=inner+itemIndex*width,r2=r1+width-gap,matches=this.matches(item,level),review=this.inReview(item.id),levelText=`Уровень ${level}: ${LEVEL_LABELS[level]}. ${LEVEL_DESCRIPTIONS[level]}.`;
        html+=`<path class="radial-cell${matches?'':' is-muted'}${review?' is-review':''}" data-id="${escapeHtml(item.id)}" data-level="${level}" data-review="${review}" fill="var(--heat-${level})" d="${arc(r1,r2,start,end)}" tabindex="${matches&&item.id===this.radialFocusId?'0':'-1'}" role="button" aria-hidden="${!matches}" aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home End Enter Space" aria-label="Кольцо ${itemIndex+1}. ${escapeHtml(item.title)}. ${escapeHtml(item.exam||'')}. ${levelText}${review?' В повторении.':''}"><title>${escapeHtml(group.title)} · ${escapeHtml(item.title)} · ${level}: ${LEVEL_LABELS[level]} · ${LEVEL_DESCRIPTIONS[level]}${review?' · в повторении':''}</title></path>`;
      });
      const point=polar(388,start+(end-start)/2);html+=`<text class="radial-group-label" x="${point.x}" y="${point.y}" dy=".35em">${escapeHtml(group.short||group.title.slice(0,3))}</text>`;
    });
    this.svg.setAttribute('aria-labelledby','radialTitle radialDescription');
    this.svg.innerHTML=`<title id="radialTitle">Круговая тепловая карта компетенций</title><desc id="radialDescription">${this.groups.length} разделов, ${this.items.length} компетенций. Используйте стрелки для перемещения, Enter или пробел для открытия.</desc>${html}`;
    this.bindCells(this.svg);
  }
  renderIndex(){
    if(!this.index)return;let firstVisible=true;
    this.index.innerHTML=this.groups.map(group=>{
      const visible=group.items.some(item=>this.matches(item)),open=visible&&firstVisible;if(visible)firstVisible=false;
      return `<details class="topic-group" ${open?'open':''} ${visible?'':'hidden'}><summary><span>${escapeHtml(group.title)}</span><small>${group.items.length}</small></summary><div class="topic-list">${group.items.map((item,index)=>{
        const level=this.level(item),review=this.inReview(item.id),matches=this.matches(item,level),levelText=`Уровень ${level}: ${LEVEL_LABELS[level]}. ${LEVEL_DESCRIPTIONS[level]}.`;
        return `<button class="topic-row${review?' is-review':''}" type="button" data-id="${escapeHtml(item.id)}" data-review="${review}" aria-label="${escapeHtml(item.title)}. ${escapeHtml(item.exam||'')}. ${levelText}${review?' В повторении.':''}" ${matches?'':'hidden'}><i class="topic-dot" style="background:var(--heat-${level})" aria-hidden="true"></i><span class="topic-label"><span>${escapeHtml(item.title)}</span><small>${escapeHtml(item.exam||'')}</small></span><span class="ring-badge" title="Кольцо ${index+1}${review?' · в повторении':''}">${review?'↻ ':''}К${index+1}</span><span class="topic-level" title="${LEVEL_LABELS[level]} — ${LEVEL_DESCRIPTIONS[level]}">${level}/4</span></button>`;
      }).join('')}</div></details>`;
    }).join('');this.bindCells(this.index);
  }
  bindCells(container){
    container.querySelectorAll('[data-id]').forEach(cell=>{
      const radial=cell.classList.contains('radial-cell');
      cell.addEventListener('click',()=>{if(radial)this.setRadialFocus(cell.dataset.id);this.open(cell.dataset.id);});
      if(radial)cell.addEventListener('focus',()=>this.setRadialFocus(cell.dataset.id));
      cell.addEventListener('keydown',event=>{
        if(radial&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)){event.preventDefault();this.moveRadialFocus(cell.dataset.id,event.key);return;}
        if(event.key==='Enter'||event.key===' '){event.preventDefault();this.open(cell.dataset.id);}
      });
    });
  }
  setRadialFocus(id,{focus=false}={}){if(!this.svg)return;const cells=[...this.svg.querySelectorAll('.radial-cell:not(.is-muted)')],target=cells.find(cell=>cell.dataset.id===id);if(!target)return;this.radialFocusId=id;cells.forEach(cell=>cell.setAttribute('tabindex',cell===target?'0':'-1'));if(focus)target.focus();}
  moveRadialFocus(id,key){if(!this.svg)return;const cells=[...this.svg.querySelectorAll('.radial-cell:not(.is-muted)')],current=cells.findIndex(cell=>cell.dataset.id===id),next=getNextRovingIndex(current,cells.length,key);if(next>=0)this.setRadialFocus(cells[next].dataset.id,{focus:true});}
  open(id){
    const item=this.items.find(candidate=>candidate.id===id);if(!item||!this.dialog)return;
    this.dialogTrigger=document.activeElement&&document.activeElement!==document.body?document.activeElement:null;this.active=id;
    const evidence=this.config.evidence?.[id],text=evidence?.text||evidence?.evidence||item.evidence||'Подтверждение пока не добавлено.',href=normalizeLink(evidence?.href||evidence?.link||item.link);
    this.setDialogText('dialogGroup',item.groupTitle);this.setDialogText('dialogTitle',item.title);this.setDialogText('dialogRing',`Кольцо ${item.ring} из ${this.groups.find(group=>group.id===item.groupId).items.length}`);this.setDialogText('dialogExam',item.exam||'');this.setDialogText('dialogDescription',item.description||item.catalog||'');this.setDialogText('dialogExamDetail',[item.exam,item.description].filter(Boolean).join('. '));this.setDialogText('dialogPractice',item.practice||'');this.setDialogText('dialogCatalog',item.catalog||'');this.setDialogText('dialogEvidence',text);
    const link=this.dialog.querySelector('#dialogLink');if(link){link.hidden=!href;if(href)link.href=href;else link.removeAttribute('href');}
    this.updatePicker();this.updateReviewButton();this.dialog.showModal?.();this.dialog.querySelector('#closeDialog')?.focus();
  }
  setDialogText(id,value){const node=this.dialog?.querySelector(`#${id}`);if(node)node.textContent=value||'';}
  updatePicker(){
    const current=clamp(this.state.studentLevels[this.active]??0);
    this.dialog?.querySelectorAll('.level-btn').forEach(button=>{const level=clamp(button.dataset.level),label=`Уровень ${level}: ${LEVEL_LABELS[level]}. ${LEVEL_DESCRIPTIONS[level]}`;button.setAttribute('aria-pressed',String(level===current));button.setAttribute('aria-label',label);button.title=label;});
    this.setDialogText('levelExplanation',`${LEVEL_LABELS[current]} — ${LEVEL_DESCRIPTIONS[current]}.`);
  }
  updateReviewButton(){const button=this.dialog?.querySelector('#markRepeat');if(!button||!this.active)return;const active=this.inReview(this.active);button.textContent=active?'Убрать из повторения':'Добавить в повторение';button.setAttribute('aria-pressed',String(active));}
  toggleReview(){if(!this.active)return;this.state.reviewQueue=updateReviewQueue(this.state.reviewQueue,this.active,!this.inReview(this.active));this.save();this.render();this.updateReviewButton();}
  setLevel(level){if(!this.active)return;this.state.studentLevels[this.active]=clamp(level);this.save();this.updatePicker();this.render();}
  restoreDialogFocus(){const trigger=this.dialogTrigger;this.dialogTrigger=null;if(trigger?.isConnected&&typeof trigger.focus==='function'){trigger.focus();return;}const replacement=[...this.root.querySelectorAll('.radial-cell:not(.is-muted),.topic-row:not([hidden])')].find(cell=>cell.dataset.id===this.active);if(replacement){if(replacement.classList.contains('radial-cell'))this.setRadialFocus(replacement.dataset.id);replacement.focus();return;}this.root.querySelector('.filter[aria-pressed="true"]')?.focus();}
  bind(){
    this.root.querySelectorAll('.filter').forEach(button=>button.addEventListener('click',()=>{this.filter=button.dataset.filter||'all';this.root.querySelectorAll('.filter').forEach(candidate=>candidate.setAttribute('aria-pressed',String(candidate===button)));this.render();}));
    this.root.querySelector('#resetMap')?.addEventListener('click',()=>{if(!confirm('Вернуть опубликованную исходную оценку компетенций?'))return;try{this.storage.removeItem(this.stateKey);this.storage.removeItem(this.config.storageKey);for(const key of this.config.legacyStorageKeys||[])this.storage.removeItem(key);for(const key of this.config.legacyRepeatKeys||[])this.storage.removeItem(key);}catch(_){}const merged=mergeState(this.groups,this.storage,this.config);this.state=merged.state;this.render();this.dialog?.close?.();});
    this.dialog?.querySelectorAll('.level-btn').forEach(button=>button.addEventListener('click',()=>this.setLevel(button.dataset.level)));
    this.dialog?.querySelector('#markRepeat')?.addEventListener('click',()=>this.toggleReview());this.dialog?.querySelector('#closeDialog')?.addEventListener('click',()=>this.dialog.close());this.dialog?.addEventListener('click',event=>{if(event.target===this.dialog)this.dialog.close();});this.dialog?.addEventListener('close',()=>this.restoreDialogFocus());
  }
}

export async function initLegacyCompetenceMap(config=window.STUDENT_COMPETENCE_CONFIG){
  const root=document.getElementById('competenceMap');if(!root||!config)return null;const status=root.querySelector('#mapLoadStatus');
  try{
    if(status)status.textContent='Загружаю каталог компетенций…';
    const response=await fetch(config.legacyUrl,{cache:'no-cache'});if(!response.ok)throw new Error(`catalog HTTP ${response.status}`);
    const groups=normalizeGroups(evaluateCatalogExpression(extractArrayExpression(await response.text(),config.catalogNames||['groups','GROUPS'])));validateCatalog(groups);
    const controller=new MapController(root,groups,config);window.__studentCompetenceMap=controller;return controller;
  }catch(error){
    console.error('Failed to initialize competency map',error);if(status)status.textContent='Интерактивный каталог временно недоступен.';
    const fallback=document.getElementById('mapFallback');if(fallback){fallback.hidden=false;const link=fallback.querySelector('a');if(link)link.href=config.fallbackHref||config.legacyUrl;}return null;
  }
}
if(typeof document!=='undefined')initLegacyCompetenceMap();
