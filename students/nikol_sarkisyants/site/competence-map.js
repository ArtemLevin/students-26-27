const STORAGE_KEY='nikol-competence-map-v1';
const CATALOG_URL='index-original.html';
const LEVEL_LABELS=['Не изучено','Нужна помощь','В процессе','Почти уверенно','Освоено'];

export {STORAGE_KEY, CATALOG_URL, LEVEL_LABELS};

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

export function mergeCompetencyState(groups,storage,seedOverrides={}){
  const allItems=flattenGroups(groups);
  const saved=readObject(storage,STORAGE_KEY);
  const merged={...saved};
  let changed=storage.getItem(STORAGE_KEY)===null;

  for(const item of allItems){
    if(Object.prototype.hasOwnProperty.call(merged,item.id))continue;
    const aliases=item.legacyIds||(item.legacyId?[item.legacyId]:[]);
    const migrated=aliases.map(alias=>saved[alias]).find(value=>value!==undefined);
    merged[item.id]=migrated??seedOverrides[item.id]??item.level??0;
    changed=true;
  }

  if(changed)storage.setItem(STORAGE_KEY,JSON.stringify(merged));
  return merged;
}

export function clampLevel(value){
  const numeric=Number(value);
  if(!Number.isFinite(numeric))return 0;
  return Math.max(0,Math.min(4,Math.round(numeric)));
}

export function computeSummary(groups,state){
  const items=flattenGroups(groups);
  const values=items.map(item=>clampLevel(state[item.id]??item.level??0));
  const total=values.length;
  const evaluated=values.filter(value=>value>0).length;
  const confident=values.filter(value=>value>=3).length;
  const process=values.filter(value=>value===2).length;
  const repeat=values.filter(value=>value<=1).length;
  const mastered=values.filter(value=>value===4).length;
  const average=total?Math.round(values.reduce((sum,value)=>sum+value,0)/(total*4)*100):0;
  return {total,evaluated,confident,process,repeat,mastered,average};
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
  constructor(root,groups,{storage=localStorage,teacherSeed={},evidence={}}={}){
    this.root=root;
    this.groups=groups;
    this.items=flattenGroups(groups);
    this.storage=storage;
    this.teacherSeed=teacherSeed;
    this.evidence=evidence;
    this.state=mergeCompetencyState(groups,storage,teacherSeed);
    this.currentFilter='all';
    this.activeId=null;

    this.svg=root.querySelector('#radialMap');
    this.topicIndex=root.querySelector('#topicIndex');
    this.dialog=document.getElementById('competencyDialog');
    this.status=root.querySelector('#mapLoadStatus');
    this.bindStaticControls();
    this.render();
  }

  itemState(item){
    return clampLevel(this.state[item.id]??this.teacherSeed[item.id]??item.level??0);
  }

  matchesFilter(level){
    if(this.currentFilter==='repeat')return level<=1;
    if(this.currentFilter==='progress')return level===2||level===3;
    if(this.currentFilter==='mastered')return level===4;
    return true;
  }

  save(){
    this.storage.setItem(STORAGE_KEY,JSON.stringify(this.state));
  }

  render(){
    this.renderRadial();
    this.renderIndex();
    const summary=computeSummary(this.groups,this.state);
    const percent=this.root.querySelector('#radialPercent');
    const count=this.root.querySelector('#radialTopicCount');
    if(percent)percent.textContent=`${summary.average}%`;
    if(count)count.textContent=`${summary.total} компетенций`;
    if(this.status){
      this.status.textContent=`Карта готова: ${summary.total} компетенций, оценено ${summary.evaluated}.`;
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
    let content='';

    this.groups.forEach((group,groupIndex)=>{
      const start=groupIndex*sectorSize+sectorGap;
      const end=(groupIndex+1)*sectorSize-sectorGap;
      const groupTarget=[...group.items].sort((a,b)=>this.itemState(a)-this.itemState(b))[0];
      content+=`<path class="radial-group-arc" data-id="${groupTarget.id}" d="${arcPath(112,137,start,end)}" tabindex="0" role="button" aria-label="${group.title}"><title>${group.title}</title></path>`;
      group.items.forEach((item,itemIndex)=>{
        const level=this.itemState(item);
        const ringInner=innerRadius+itemIndex*ringWidth;
        const ringOuter=ringInner+ringWidth-ringGap;
        const muted=this.matchesFilter(level)?'':' is-muted';
        content+=`<path class="radial-cell${muted}" data-id="${item.id}" data-level="${level}" fill="var(--heat-${level})" d="${arcPath(ringInner,ringOuter,start,end)}" tabindex="0" role="button" aria-label="Кольцо ${itemIndex+1}. ${item.title}. ${item.exam}. Уровень: ${LEVEL_LABELS[level]}"><title>Кольцо ${itemIndex+1} · ${group.title} · ${item.title} · ${item.exam} · ${LEVEL_LABELS[level]}</title></path>`;
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
    this.topicIndex.innerHTML=this.groups.map((group,index)=>`
      <details class="topic-group" ${index===0?'open':''}>
        <summary><span>${group.title}</span><small>${group.items.length} колец</small></summary>
        <div class="topic-list">
          ${group.items.map((item,itemIndex)=>{
            const level=this.itemState(item);
            return `<button class="topic-row" type="button" data-id="${item.id}" ${this.matchesFilter(level)?'':'hidden'}>
              <i class="topic-dot" style="background:var(--heat-${level})" aria-hidden="true"></i>
              <span class="topic-label"><span>${item.title}</span><small>${item.exam}</small></span>
              <span class="ring-badge" title="Кольцо ${itemIndex+1}">К${itemIndex+1}</span>
              <span class="topic-level">${level}/4</span>
            </button>`;
          }).join('')}
        </div>
      </details>`).join('');
    this.bindDynamicCells(this.topicIndex);
  }

  bindDynamicCells(container){
    container.querySelectorAll('[data-id]').forEach(cell=>{
      cell.addEventListener('click',()=>this.openCompetency(cell.dataset.id));
      cell.addEventListener('keydown',event=>{
        if(event.key==='Enter'||event.key===' '){
          event.preventDefault();
          this.openCompetency(cell.dataset.id);
        }
      });
    });
  }

  openCompetency(id){
    const item=this.items.find(candidate=>candidate.id===id);
    if(!item||!this.dialog)return;
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
    this.dialog.showModal();
  }

  setDialogText(id,value){
    const node=this.dialog?.querySelector(`#${id}`);
    if(node)node.textContent=value||'';
  }

  updateLevelPicker(){
    if(!this.activeId||!this.dialog)return;
    const current=clampLevel(this.state[this.activeId]??0);
    this.dialog.querySelectorAll('.level-btn').forEach(button=>{
      button.setAttribute('aria-pressed',String(Number(button.dataset.level)===current));
    });
  }

  setActiveLevel(level){
    if(!this.activeId)return;
    this.state[this.activeId]=clampLevel(level);
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
      this.state=mergeCompetencyState(this.groups,this.storage,this.teacherSeed);
      this.render();
      if(this.dialog?.open)this.dialog.close();
    });

    if(this.dialog){
      this.dialog.querySelectorAll('.level-btn').forEach(button=>button.addEventListener('click',()=>this.setActiveLevel(button.dataset.level)));
      this.dialog.querySelector('#markRepeat')?.addEventListener('click',()=>this.setActiveLevel(1));
      this.dialog.querySelector('#closeDialog')?.addEventListener('click',()=>this.dialog.close());
      this.dialog.addEventListener('click',event=>{if(event.target===this.dialog)this.dialog.close();});
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
