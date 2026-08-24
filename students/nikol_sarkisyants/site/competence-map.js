const LEGACY_STORAGE_KEY='nikol-competence-map-v1';
const STORAGE_KEY='nikol-competence-state-v2';
const STATE_SCHEMA_VERSION=2;
const CATALOG_URL='index-original.html';
const LEVEL_LABELS=['Не изучено','Нужна помощь','В процессе','Уверенно','Освоено'];
const LEVEL_DESCRIPTIONS=[
  'Тема ещё не проходилась',
  'Решение выполняется с подсказкой',
  'Алгоритм понятен, остаются ошибки',
  'Типовые задачи решаются самостоятельно',
  'Навык устойчив в смешанных задачах'
];

export {LEGACY_STORAGE_KEY, STORAGE_KEY, STATE_SCHEMA_VERSION, CATALOG_URL, LEVEL_LABELS, LEVEL_DESCRIPTIONS};

export function getNextRovingIndex(currentIndex,length,key){
  if(!Number.isInteger(length)||length<1)return -1;
  if(key==='Home')return 0;
  if(key==='End')return length-1;
  const safeIndex=Number.isInteger(currentIndex)&&currentIndex>=0&&currentIndex<length?currentIndex:0;
  if(key==='ArrowRight'||key==='ArrowDown')return (safeIndex+1)%length;
  if(key==='ArrowLeft'||key==='ArrowUp')return (safeIndex-1+length)%length;
  return safeIndex;
}

export function extractGroupsFromLegacy(html){
  if(typeof html!=='string')throw new TypeError('Legacy catalog source must be text');
  const marker=/\bconst\s+groups\s*=\s*/g;
  const match=marker.exec(html);
  if(!match)throw new Error('Competency catalog marker was not found');
  const start=html.indexOf('[',match.index+match[0].length);
  if(start<0)throw new Error('Competency catalog array was not found');

  let depth=0;
  let inString=false;
  let escaped=false;
  for(let index=start;index<html.length;index+=1){
    const char=html[index];
    if(inString){
      if(escaped){escaped=false;continue;}
      if(char==='\\'){escaped=true;continue;}
      if(char==='"')inString=false;
      continue;
    }
    if(char==='"'){inString=true;continue;}
    if(char==='[')depth+=1;
    if(char===']'){
      depth-=1;
      if(depth===0){
        const json=html.slice(start,index+1);
        const groups=JSON.parse(json);
        validateCatalog(groups);
        return groups;
      }
    }
  }
  throw new Error('Competency catalog array is incomplete');
}

export function flattenGroups(groups){
  return groups.flatMap(group=>group.items.map((item,itemIndex)=>({
    ...item,
    ring:itemIndex+1,
    groupId:group.id,
    groupTitle:group.title,
    groupShort:group.short
  })));
}

export function validateCatalog(groups){
  if(!Array.isArray(groups)||groups.length===0)throw new Error('Competency catalog is empty');
  const items=flattenGroups(groups);
  if(items.length===0)throw new Error('Competency catalog contains no skills');
  const ids=new Set();
  for(const item of items){
    if(!item.id||typeof item.id!=='string')throw new Error('Competency without a valid id');
    if(ids.has(item.id))throw new Error(`Duplicate competency id: ${item.id}`);
    ids.add(item.id);
  }
  return {groups:groups.length,items:items.length};
}

function readObject(storage,key){
  try{
    const value=JSON.parse(storage.getItem(key)||'{}');
    return value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  }catch(_){
    return {};
  }
}

function hasOwn(object,key){
  return Object.prototype.hasOwnProperty.call(object,key);
}

function createSeededLevels(groups,saved={},seedOverrides={}){
  const allItems=flattenGroups(groups);
  const merged={...saved};

  for(const item of allItems){
    if(hasOwn(merged,item.id)){
      merged[item.id]=clampLevel(merged[item.id]);
      continue;
    }
    const aliases=item.legacyIds||(item.legacyId?[item.legacyId]:[]);
    const migrated=aliases.map(alias=>saved[alias]).find(value=>value!==undefined);
    merged[item.id]=clampLevel(migrated??seedOverrides[item.id]??item.level??0);
  }

  return merged;
}

function normalizeReviewQueue(queue){
  if(!queue||typeof queue!=='object'||Array.isArray(queue))return {};
  return Object.fromEntries(Object.entries(queue).filter(([,entry])=>Boolean(entry)).map(([id,entry])=>[
    id,
    typeof entry==='object'&&!Array.isArray(entry)?{...entry}:{addedAt:null}
  ]));
}

export function migrateCompetencyState(groups,storage,seedOverrides={},now=()=>new Date().toISOString()){
  const stored=readObject(storage,STORAGE_KEY);
  const hasV2=stored.schemaVersion===STATE_SCHEMA_VERSION&&stored.studentLevels&&typeof stored.studentLevels==='object'&&!Array.isArray(stored.studentLevels);
  const legacyLevels=readObject(storage,LEGACY_STORAGE_KEY);
  const sourceLevels=hasV2?stored.studentLevels:legacyLevels;
  const state={
    schemaVersion:STATE_SCHEMA_VERSION,
    studentLevels:createSeededLevels(groups,sourceLevels,seedOverrides),
    reviewQueue:normalizeReviewQueue(hasV2?stored.reviewQueue:{}),
    updatedAt:hasV2&&typeof stored.updatedAt==='string'?stored.updatedAt:now()
  };

  storage.setItem(STORAGE_KEY,JSON.stringify(state));
  return state;
}

export function mergeCompetencyState(groups,storage,seedOverrides={},now){
  return migrateCompetencyState(groups,storage,seedOverrides,now);
}

export function isInReviewQueue(reviewQueue,id){
  return Boolean(reviewQueue&&reviewQueue[id]);
}

export function updateReviewQueue(reviewQueue,id,active,addedAt=new Date().toISOString()){
  const next=normalizeReviewQueue(reviewQueue);
  if(active)next[id]={addedAt};
  else delete next[id];
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

export function clampLevel(value){
  const numeric=Number(value);
  if(!Number.isFinite(numeric))return 0;
  return Math.max(0,Math.min(4,Math.round(numeric)));
}

export function computeSummary(groups,studentLevels,reviewQueue={}){
  const items=flattenGroups(groups);
  const values=items.map(item=>clampLevel(studentLevels[item.id]??item.level??0));
  const total=values.length;
  const unseen=values.filter(value=>value===0).length;
  const evaluated=values.filter(value=>value>0).length;
  const help=values.filter(value=>value===1).length;
  const process=values.filter(value=>value===2).length;
  const confident=values.filter(value=>value===3).length;
  const repeat=items.filter(item=>isInReviewQueue(reviewQueue,item.id)).length;
  const mastered=values.filter(value=>value===4).length;
  const average=total?Math.round(values.reduce((sum,value)=>sum+value,0)/(total*4)*100):0;
  return {total,unseen,evaluated,help,process,confident,mastered,repeat,average};
}

export function normalizeMaterialLink(link){
  if(!link||typeof link!=='string')return null;
  const trimmed=link.trim();
  if(!trimmed)return null;
  if(trimmed==='index.html#lessons'||trimmed==='#lessons')return null;
  if(trimmed.startsWith('index.html#'))return trimmed.slice('index.html'.length);
  return trimmed;
}

function polar(radius,angle){
  const radians=(angle-90)*Math.PI/180;
  return {x:400+radius*Math.cos(radians),y:400+radius*Math.sin(radians)};
}

function arcPath(innerRadius,outerRadius,startAngle,endAngle){
  const outerStart=polar(outerRadius,startAngle);
  const outerEnd=polar(outerRadius,endAngle);
  const innerEnd=polar(innerRadius,endAngle);
  const innerStart=polar(innerRadius,startAngle);
  const large=endAngle-startAngle>180?1:0;
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${large} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${large} 0 ${innerStart.x} ${innerStart.y}`,
    'Z'
  ].join(' ');
}

class CompetenceMapController{
  constructor(root,groups,{storage=localStorage,teacherSeed={},evidence={},now=()=>new Date().toISOString()}={}){
    this.root=root;
    this.groups=groups;
    this.items=flattenGroups(groups);
    this.storage=storage;
    this.teacherSeed=teacherSeed;
    this.evidence=evidence;
    this.now=now;
    this.state=mergeCompetencyState(groups,storage,teacherSeed,now);
    this.currentFilter='all';
    this.activeId=null;
    this.radialFocusId=null;
    this.dialogTrigger=null;

    this.svg=root.querySelector('#radialMap');
    this.topicIndex=root.querySelector('#topicIndex');
    this.dialog=document.getElementById('competencyDialog');
    this.status=root.querySelector('#mapLoadStatus');
    this.bindStaticControls();
    this.render();
  }

  itemState(item){
    return clampLevel(this.state.studentLevels[item.id]??this.teacherSeed[item.id]??item.level??0);
  }

  isInReviewQueue(id){
    return isInReviewQueue(this.state.reviewQueue,id);
  }

  matchesFilter(item,level=this.itemState(item)){
    return matchesCompetencyFilter(this.currentFilter,item.id,level,this.state.reviewQueue);
  }

  save(){
    this.state.updatedAt=this.now();
    this.storage.setItem(STORAGE_KEY,JSON.stringify(this.state));
  }

  render(){
    this.renderRadial();
    this.renderIndex();
    const summary=computeSummary(this.groups,this.state.studentLevels,this.state.reviewQueue);
    const percent=this.root.querySelector('#radialPercent');
    const count=this.root.querySelector('#radialTopicCount');
    const repeatFilter=this.root.querySelector('[data-filter="repeat"]');
    const visibleCount=this.items.filter(item=>this.matchesFilter(item)).length;
    if(percent)percent.textContent=`${summary.average}%`;
    if(count)count.textContent=`${summary.total} компетенций`;
    if(repeatFilter)repeatFilter.textContent=`В повторении · ${summary.repeat}`;
    if(this.status){
      this.status.textContent=this.currentFilter==='all'
        ?`Карта готова: ${summary.total} компетенций, оценено ${summary.evaluated}.`
        :`По выбранному фильтру: ${visibleCount} из ${summary.total} компетенций.`;
      this.status.dataset.state='ready';
    }
    this.publishSummary(summary);
  }

  renderRadial(){
    if(!this.svg)return;
    const sectorSize=360/this.groups.length;
    const innerRadius=145;
    const maxRings=Math.max(...this.groups.map(group=>group.items.length));
    const ringWidth=(380-innerRadius)/maxRings;
    const ringGap=Math.max(1.5,ringWidth*.14);
    const sectorGap=1.5;
    const focusableItems=this.items.filter(item=>this.matchesFilter(item));
    if(!focusableItems.some(item=>item.id===this.radialFocusId)){
      this.radialFocusId=focusableItems[0]?.id||null;
    }
    let content='';

    this.groups.forEach((group,groupIndex)=>{
      const start=groupIndex*sectorSize+sectorGap;
      const end=(groupIndex+1)*sectorSize-sectorGap;
      const sortedItems=[...group.items].sort((a,b)=>this.itemState(a)-this.itemState(b));
      const matchingTarget=sortedItems.find(item=>this.matchesFilter(item));
      const groupTarget=matchingTarget||sortedItems[0];
      const groupMuted=matchingTarget?'':' is-muted';
      content+=`<path class="radial-group-arc${groupMuted}" data-id="${groupTarget.id}" d="${arcPath(112,137,start,end)}" tabindex="-1" aria-hidden="true"><title>${group.title}${matchingTarget?'':' · нет совпадений'}</title></path>`;
      group.items.forEach((item,itemIndex)=>{
        const level=this.itemState(item);
        const inReview=this.isInReviewQueue(item.id);
        const matches=this.matchesFilter(item,level);
        const ringInner=innerRadius+itemIndex*ringWidth;
        const ringOuter=ringInner+ringWidth-ringGap;
        const muted=matches?'':' is-muted';
        const reviewClass=inReview?' is-review':'';
        const reviewLabel=inReview?' В повторении.':'';
        const levelDescription=`Уровень ${level}: ${LEVEL_LABELS[level]}. ${LEVEL_DESCRIPTIONS[level]}.`;
        const tabIndex=matches&&item.id===this.radialFocusId?'0':'-1';
        content+=`<path class="radial-cell${muted}${reviewClass}" data-id="${item.id}" data-level="${level}" data-review="${inReview}" fill="var(--heat-${level})" d="${arcPath(ringInner,ringOuter,start,end)}" tabindex="${tabIndex}" role="button" aria-hidden="${!matches}" aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home End Enter Space" aria-label="Кольцо ${itemIndex+1}. ${item.title}. ${item.exam}. ${levelDescription}${reviewLabel}"><title>Кольцо ${itemIndex+1} · ${group.title} · ${item.title} · ${item.exam} · ${level}: ${LEVEL_LABELS[level]} · ${LEVEL_DESCRIPTIONS[level]}${inReview?' · в повторении':''}</title></path>`;
      });
      const labelPoint=polar(382,start+(end-start)/2);
      content+=`<text class="radial-group-label" x="${labelPoint.x}" y="${labelPoint.y}" dy=".35em">${group.short}</text>`;
    });

    Array.from({length:maxRings},(_,index)=>index+1).forEach((ring,index)=>{
      const point=polar(innerRadius+index*ringWidth+ringWidth/2,0);
      content+=`<text class="radial-ring-label" x="${point.x}" y="${point.y}" dy=".35em">${ring}</text>`;
    });

    this.svg.innerHTML=`<title id="radialTitle">Круговая тепловая карта компетенций ЕГЭ</title><desc id="radialDescription">${this.groups.length} тематических секторов и ${this.items.length} компетенций.</desc>${content}`;
    this.bindDynamicCells(this.svg);
  }

  renderIndex(){
    if(!this.topicIndex)return;
    let firstVisibleGroup=true;
    this.topicIndex.innerHTML=this.groups.map(group=>{
      const hasMatches=group.items.some(item=>this.matchesFilter(item));
      const open=hasMatches&&firstVisibleGroup;
      if(hasMatches)firstVisibleGroup=false;
      return `
      <details class="topic-group" ${open?'open':''} ${hasMatches?'':'hidden'}>
        <summary><span>${group.title}</span><small>${group.items.length} колец</small></summary>
        <div class="topic-list">
          ${group.items.map((item,itemIndex)=>{
            const level=this.itemState(item);
            const inReview=this.isInReviewQueue(item.id);
            const levelDescription=`Уровень ${level}: ${LEVEL_LABELS[level]}. ${LEVEL_DESCRIPTIONS[level]}.`;
            return `<button class="topic-row${inReview?' is-review':''}" type="button" data-id="${item.id}" data-review="${inReview}" aria-label="${item.title}. ${item.exam}. ${levelDescription}${inReview?' В повторении.':''}" ${this.matchesFilter(item,level)?'':'hidden'}>
              <i class="topic-dot" style="background:var(--heat-${level})" aria-hidden="true"></i>
              <span class="topic-label"><span>${item.title}</span><small>${item.exam}</small></span>
              <span class="ring-badge" title="Кольцо ${itemIndex+1}${inReview?' · в повторении':''}">${inReview?'↻ ':''}К${itemIndex+1}</span>
              <span class="topic-level" title="${LEVEL_LABELS[level]} — ${LEVEL_DESCRIPTIONS[level]}">${level}/4</span>
            </button>`;
          }).join('')}
        </div>
      </details>`;
    }).join('');
    this.bindDynamicCells(this.topicIndex);
  }

  bindDynamicCells(container){
    container.querySelectorAll('[data-id]').forEach(cell=>{
      const isRadialCell=cell.classList.contains('radial-cell');
      cell.addEventListener('click',()=>{
        if(isRadialCell)this.setRadialFocus(cell.dataset.id);
        this.openCompetency(cell.dataset.id);
      });
      if(isRadialCell){
        cell.addEventListener('focus',()=>this.setRadialFocus(cell.dataset.id));
      }
      cell.addEventListener('keydown',event=>{
        if(isRadialCell&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)){
          event.preventDefault();
          this.moveRadialFocus(cell.dataset.id,event.key);
          return;
        }
        if(event.key==='Enter'||event.key===' '){
          event.preventDefault();
          this.openCompetency(cell.dataset.id);
        }
      });
    });
  }

  setRadialFocus(id,{focus=false}={}){
    if(!this.svg)return;
    const cells=[...this.svg.querySelectorAll('.radial-cell:not(.is-muted)')];
    const target=cells.find(cell=>cell.dataset.id===id);
    if(!target)return;
    this.radialFocusId=id;
    cells.forEach(cell=>cell.setAttribute('tabindex',cell===target?'0':'-1'));
    if(focus)target.focus();
  }

  moveRadialFocus(id,key){
    if(!this.svg)return;
    const cells=[...this.svg.querySelectorAll('.radial-cell:not(.is-muted)')];
    const currentIndex=cells.findIndex(cell=>cell.dataset.id===id);
    const nextIndex=getNextRovingIndex(currentIndex,cells.length,key);
    if(nextIndex>=0)this.setRadialFocus(cells[nextIndex].dataset.id,{focus:true});
  }

  openCompetency(id){
    const item=this.items.find(candidate=>candidate.id===id);
    if(!item||!this.dialog)return;
    this.dialogTrigger=document.activeElement&&document.activeElement!==document.body?document.activeElement:null;
    this.activeId=id;
    const override=this.evidence[id];
    const evidenceText=override?.text||item.evidence||'Подтверждение пока не добавлено.';
    const materialLink=normalizeMaterialLink(override?.href||item.link);

    this.setDialogText('dialogGroup',item.groupTitle);
    this.setDialogText('dialogTitle',item.title);
    this.setDialogText('dialogRing',`Кольцо ${item.ring} из ${this.groups.find(group=>group.id===item.groupId).items.length}`);
    this.setDialogText('dialogExam',item.exam);
    this.setDialogText('dialogDescription',item.description);
    this.setDialogText('dialogExamDetail',`${item.exam}. ${item.description}`);
    this.setDialogText('dialogPractice',item.practice);
    this.setDialogText('dialogCatalog',item.catalog);
    this.setDialogText('dialogEvidence',evidenceText);

    const link=this.dialog.querySelector('#dialogLink');
    if(link){
      link.hidden=!materialLink;
      if(materialLink)link.href=materialLink;
    }
    this.updateLevelPicker();
    this.updateReviewButton();
    this.dialog.showModal();
    this.dialog.querySelector('#closeDialog')?.focus();
  }

  restoreDialogFocus(){
    const trigger=this.dialogTrigger;
    this.dialogTrigger=null;
    if(trigger?.isConnected&&typeof trigger.focus==='function'){
      trigger.focus();
      return;
    }
    const replacement=[...this.root.querySelectorAll('.radial-cell:not(.is-muted),.topic-row:not([hidden])')]
      .find(cell=>cell.dataset.id===this.activeId);
    if(replacement){
      if(replacement.classList.contains('radial-cell'))this.setRadialFocus(replacement.dataset.id);
      replacement.focus();
      return;
    }
    this.root.querySelector('.filter[aria-pressed="true"]')?.focus();
  }

  setDialogText(id,value){
    const node=this.dialog?.querySelector(`#${id}`);
    if(node)node.textContent=value||'';
  }

  updateLevelPicker(){
    if(!this.activeId||!this.dialog)return;
    const current=clampLevel(this.state.studentLevels[this.activeId]??0);
    this.dialog.querySelectorAll('.level-btn').forEach(button=>{
      const level=clampLevel(button.dataset.level);
      const description=`Уровень ${level}: ${LEVEL_LABELS[level]}. ${LEVEL_DESCRIPTIONS[level]}`;
      button.setAttribute('aria-pressed',String(level===current));
      button.setAttribute('aria-label',description);
      button.title=description;
    });
    this.setDialogText('levelExplanation',`${LEVEL_LABELS[current]} — ${LEVEL_DESCRIPTIONS[current]}.`);
  }

  updateReviewButton(){
    if(!this.activeId||!this.dialog)return;
    const button=this.dialog.querySelector('#markRepeat');
    if(!button)return;
    const active=this.isInReviewQueue(this.activeId);
    button.textContent=active?'Убрать из повторения':'Добавить в повторение';
    button.setAttribute('aria-pressed',String(active));
    button.dataset.active=String(active);
  }

  addToReviewQueue(id=this.activeId){
    if(!id)return;
    this.state.reviewQueue=updateReviewQueue(this.state.reviewQueue,id,true,this.now());
    this.save();
    this.render();
    this.updateReviewButton();
  }

  removeFromReviewQueue(id=this.activeId){
    if(!id)return;
    this.state.reviewQueue=updateReviewQueue(this.state.reviewQueue,id,false,this.now());
    this.save();
    this.render();
    this.updateReviewButton();
  }

  toggleReviewQueue(id=this.activeId){
    if(!id)return;
    if(this.isInReviewQueue(id))this.removeFromReviewQueue(id);
    else this.addToReviewQueue(id);
  }

  setActiveLevel(level){
    if(!this.activeId)return;
    this.state.studentLevels[this.activeId]=clampLevel(level);
    this.save();
    this.updateLevelPicker();
    this.render();
  }

  bindStaticControls(){
    this.root.querySelectorAll('.filter').forEach(button=>button.addEventListener('click',()=>{
      this.currentFilter=button.dataset.filter||'all';
      this.root.querySelectorAll('.filter').forEach(candidate=>candidate.setAttribute('aria-pressed',String(candidate===button)));
      this.render();
    }));

    const reset=this.root.querySelector('#resetMap');
    if(reset)reset.addEventListener('click',()=>{
      if(!window.confirm('Вернуть опубликованную исходную оценку компетенций?'))return;
      this.storage.removeItem(STORAGE_KEY);
      this.storage.removeItem(LEGACY_STORAGE_KEY);
      this.state=mergeCompetencyState(this.groups,this.storage,this.teacherSeed,this.now);
      this.render();
      if(this.dialog?.open)this.dialog.close();
    });

    if(this.dialog){
      this.dialog.querySelectorAll('.level-btn').forEach(button=>button.addEventListener('click',()=>this.setActiveLevel(button.dataset.level)));
      this.dialog.querySelector('#markRepeat')?.addEventListener('click',()=>this.toggleReviewQueue());
      this.dialog.querySelector('#closeDialog')?.addEventListener('click',()=>this.dialog.close());
      this.dialog.addEventListener('click',event=>{if(event.target===this.dialog)this.dialog.close();});
      this.dialog.addEventListener('close',()=>this.restoreDialogFocus());
    }
  }

  publishSummary(summary){
    if(typeof window==='undefined'||typeof window.CustomEvent!=='function')return;
    window.dispatchEvent(new CustomEvent('nikol:competence-summary',{detail:summary}));
  }
}

export async function initCompetenceMap({fetchImpl=fetch}={}){
  const root=typeof document!=='undefined'?document.getElementById('competenceMap'):null;
  if(!root)return null;
  const status=root.querySelector('#mapLoadStatus');
  try{
    if(status){status.textContent='Загружаю каталог компетенций…';status.dataset.state='loading';}
    const response=await fetchImpl(CATALOG_URL,{cache:'no-cache'});
    if(!response.ok)throw new Error(`Catalog request failed: ${response.status}`);
    const html=await response.text();
    const groups=extractGroupsFromLegacy(html);
    const controller=new CompetenceMapController(root,groups,{
      storage:localStorage,
      teacherSeed:window.__nikolTeacherLevels||window.__nikolLevels||{},
      evidence:window.__nikolEvidence||{}
    });
    window.__nikolCompetenceMap=controller;
    return controller;
  }catch(error){
    console.error('Failed to initialize Nikol competency map',error);
    if(status){status.textContent='Не удалось загрузить интерактивную карту.';status.dataset.state='error';}
    const fallback=root.querySelector('#mapFallback');
    if(fallback)fallback.hidden=false;
    return null;
  }
}

if(typeof document!=='undefined')initCompetenceMap();
