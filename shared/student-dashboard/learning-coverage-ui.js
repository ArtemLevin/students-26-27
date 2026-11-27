import {cumulativeCoverage,normalizeCoverageCatalog,COVERAGE_LABELS} from './learning-coverage.js';

const marker=document.querySelector('script[data-atlas-learning-coverage]');
const tag='atlas-learning-coverage';
const glyph={historical:'·',touched:'○',practiced:'✓',assessed:'◇'};
const dateText=date=>date.split('-').reverse().join('.');
function el(name,text,attrs={}){
  const node=document.createElement(name);
  if(text!==null&&text!==undefined)node.textContent=text;
  for(const [k,v] of Object.entries(attrs))node.setAttribute(k,String(v));
  return node;
}
async function json(url){
  const response=await fetch(url,{cache:'no-store'});
  if(!response.ok)throw Error('HTTP '+response.status);
  return response.json();
}
function resolveInside(root,relative){
  if(typeof relative!=='string'||!relative||relative.startsWith('/')||relative.split('/').includes('..'))throw Error('Некорректный путь контракта');
  const url=new URL(relative,root);
  if(url.origin!==root.origin||!url.pathname.startsWith(root.pathname))throw Error('Путь вне кабинета');
  return url;
}
function lessonLink(root,entry){
  if(typeof entry.href!=='string'||!entry.href||entry.href.startsWith('/')||entry.href.split('/').includes('..'))return null;
  try{
    const url=new URL(entry.href,new URL('site/',root));
    if(url.origin!==root.origin||!url.pathname.startsWith(new URL('site/',root).pathname)||!url.pathname.endsWith('.html'))return null;
    if(entry.anchor)url.hash=entry.anchor;
    return url.href;
  }catch{return null;}
}
const style=`
:host{display:block;min-width:0;margin:1.75rem 0 2.5rem;color:inherit;font:inherit;--c-none:#a2a7aa;--c-historical:#9c91b4;--c-touched:#d6bd7f;--c-practiced:#6c9b89;--c-assessed:#4c8198}
*{box-sizing:border-box}.frame{border-top:2px solid currentColor;border-bottom:1px solid currentColor;padding:1.2rem 0 1.6rem;min-width:0}.head{display:flex;align-items:baseline;gap:1rem;flex-wrap:wrap}.kicker{font:600 .72rem/1.5 ui-monospace,monospace;letter-spacing:.1em;opacity:.72}.head h2{font:inherit;font-family:Georgia,serif;font-size:clamp(1.55rem,3vw,2.4rem);line-height:1.15;margin:.3rem 0}.summary{font-size:.92rem;margin:.5rem 0;line-height:1.6}.meter{height:8px;display:flex;margin:.75rem 0;background:color-mix(in srgb,currentColor 14%,transparent);overflow:hidden}.meter span{height:100%}.legend{display:flex;gap:.45rem 1rem;flex-wrap:wrap;font-size:.75rem;margin:.75rem 0}.legend span{display:inline-flex;align-items:center;gap:.35rem}.swatch{width:14px;height:14px;display:inline-grid;place-items:center;background:var(--c-none);color:#182323;font-size:10px;font-weight:700}.swatch.historical,.cell.historical{background:var(--c-historical)}.swatch.touched,.cell.touched{background:var(--c-touched)}.swatch.practiced,.cell.practiced{background:var(--c-practiced)}.swatch.assessed,.cell.assessed{background:var(--c-assessed);color:#fff}.swatch.new{background:transparent;color:inherit;outline:2px solid currentColor;outline-offset:-2px}.controls{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;margin:1rem 0}label{font-size:.78rem;display:grid;gap:.2rem;flex:1;min-width:125px}input,select{font:inherit;color:inherit;background:transparent;border:1px solid currentColor;border-radius:2px;min-height:44px;padding:.45rem;min-width:0;width:100%}select option{color:#222;background:#fff}.matrix{display:grid;gap:.7rem}.group{display:grid;grid-template-columns:minmax(125px,1fr) 2fr;gap:.55rem;border-bottom:1px solid color-mix(in srgb,currentColor 20%,transparent);padding:.45rem 0}.group h3{font:600 .8rem/1.35 system-ui,sans-serif;margin:0}.group h3 small{display:block;font-weight:400;opacity:.75;margin-top:.2rem}.cells{display:flex;gap:4px;flex-wrap:wrap}.cell{display:grid;place-items:center;width:25px;height:25px;background:var(--c-none);color:#182323;border:1px solid transparent;cursor:pointer;font:700 13px/1 system-ui,sans-serif;padding:0;border-radius:2px}.cell.new{outline:2px solid currentColor;outline-offset:1px}.cell[aria-pressed=true]{box-shadow:0 0 0 2px currentColor;outline:2px solid currentColor;outline-offset:2px}.cell:focus-visible,input:focus-visible,select:focus-visible,a:focus-visible,summary:focus-visible{outline:3px solid currentColor;outline-offset:3px}.details{margin-top:1rem;border-left:3px solid currentColor;padding:.25rem .8rem;font-size:.88rem;line-height:1.55;overflow-wrap:anywhere}.details h3{font-size:1rem;margin:.4rem 0}.details a{color:inherit;text-decoration:underline;text-underline-offset:3px}.details ul{margin:.5rem 0;padding-left:1.2rem}.details li{margin:.25rem 0}.note{font-size:.78rem;opacity:.8;line-height:1.55}.error{border:1px solid currentColor;padding:.8rem}summary{cursor:pointer;font-size:.83rem;font-weight:600;min-height:40px;padding:.5rem 0}[hidden]{display:none!important}@media(max-width:600px){.group{grid-template-columns:1fr}.cell{width:34px;height:34px}.head{gap:.3rem}.frame{padding:1rem 0}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}
`;
function locateHost(){
  const main=document.querySelector('main')||document.querySelector('[role="main"]')||document.body;
  const known=[...document.querySelectorAll('#map,#competency-map,#competence-map,#mapSection,#heatmap,#radialMap')].find(n=>main.contains(n));
  const heading=[...main.querySelectorAll('h2,h3')].find(n=>/карт[аы] (?:компетенц|навык|умени|курса)|heatmap/i.test(n.textContent));
  let target=known||heading;
  while(target&&target.parentElement!==main)target=target.parentElement;
  const host=document.createElement(tag);
  if(target&&target.parentElement===main)main.insertBefore(host,target);
  else main.insertBefore(host,main.firstElementChild?.nextElementSibling||null);
  return host;
}
function render(host,model,catalog,root){
  const shadow=host.shadowRoot,frame=el('section',null,{class:'frame','aria-label':'Накопительная карта изучения'});
  const header=el('header',null,{class:'head'});header.append(el('span','LEVIN / ATLAS · ОХВАТ',{class:'kicker'}),el('h2','Накопительная карта изучения'));frame.append(header);
  const total=catalog.ids.size,covered=model.byId.size;
  const latest=model.recent[0]?.date;
  const percentage=total?(100*covered/total).toLocaleString('ru-RU',{maximumFractionDigits:1}):'0';
  const summary=el('p',covered+' из '+total+' компетенций ('+percentage+'%) · '+model.recent.length+' занятий'+(latest?' · '+model.newIds.size+' новых навыков на последнем уроке ('+dateText(latest)+')':''),{class:'summary','data-coverage-summary':'','aria-live':'polite'});
  frame.append(summary);
  const meter=el('div',null,{class:'meter','aria-hidden':'true'});
  for(const key of ['historical','touched','practiced','assessed']){const part=el('span');part.style.width=(total?100*model.counts[key]/total:0)+'%';part.style.background='var(--c-'+key+')';meter.append(part)}frame.append(meter);
  const legend=el('div',null,{class:'legend','aria-label':'Статусы изучения'});
  for(const [key,label] of [['none','Пока нет отметки'],...Object.entries(COVERAGE_LABELS),['new','Впервые на последнем уроке']]){
    const item=el('span'),icon=el('i',glyph[key]||'',{class:'swatch '+key,'aria-hidden':'true'});item.append(icon,document.createTextNode(label));legend.append(item);
  }frame.append(legend);
  frame.append(el('p','Охват обновляется по опубликованным занятиям. Педагогические оценки уровня 0–4 сохраняются в отдельной карте освоения.',{class:'note'}));
  if(model.unlinked)frame.append(el('p',model.unlinked+' записей истории без однозначной связи с каталогом не включены в расчёт.',{class:'note'}));
  const controls=el('div',null,{class:'controls'}),ql=el('label','Поиск навыка'),query=el('input',null,{type:'search',placeholder:'Название компетенции'}),fl=el('label','Показать'),filter=el('select');
  for(const [v,t] of [['all','Все навыки'],['covered','Изучались за курс'],['new','Новое на последнем уроке'],['practiced','Отработано'],['touched','Рассмотрено'],['assessed','Оценивалось'],['historical','Исторические отметки'],['none','Пока нет отметок']])filter.append(el('option',t,{value:v}));
  ql.append(query);fl.append(filter);controls.append(ql,fl);frame.append(controls);
  const found=el('p','',{class:'note','aria-live':'polite','data-coverage-count':''}),matrix=el('div',null,{class:'matrix'}),details=el('div',null,{class:'details','aria-live':'polite','data-coverage-detail':''});
  details.append(el('p','Выберите клетку, чтобы увидеть историю изучения и ссылки на материалы.'));
  frame.append(found,matrix,details);
  let selected=null;
  function select(item,group){
    selected=item.id;
    matrix.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.skill===selected)));
    const evidence=model.byId.get(item.id);
    details.replaceChildren(el('h3',item.title),el('p',group+' · '+(evidence?COVERAGE_LABELS[evidence.relation]:'Пока нет отметок')));
    if(evidence){const list=el('ul');for(const entry of evidence.entries){
      const li=el('li'),text=dateText(entry.date)+' · '+COVERAGE_LABELS[entry.relation]+' · '+(entry.title||'Занятие'),link=lessonLink(root,entry);
      li.append(link?el('a',text,{href:link}):el('span',text));list.append(li);
    }details.append(list)}
  }
  function paint(){
    matrix.replaceChildren();let visible=0;
    const value=filter.value,q=query.value.trim().toLocaleLowerCase('ru');
    for(const group of catalog.groups){
      const items=group.items.filter(item=>{
        const state=model.byId.get(item.id)?.relation||'none';
        return (!q||(item.title+' '+group.name).toLocaleLowerCase('ru').includes(q))&&(value==='all'||(value==='covered'&&state!=='none')||(value==='new'&&model.newIds.has(item.id))||state===value);
      });
      if(!items.length)continue;
      visible+=items.length;
      const row=el('section',null,{class:'group'}),heading=el('h3',group.name),cells=el('div',null,{class:'cells'});
      heading.append(el('small',group.items.filter(i=>model.byId.has(i.id)).length+' / '+group.items.length+' изучались'));
      for(const item of items){
        const state=model.byId.get(item.id)?.relation||'none',fresh=model.newIds.has(item.id);
        const label=item.title+' · '+(COVERAGE_LABELS[state]||'Пока нет отметок')+(fresh?' · новое на последнем уроке':'');
        const b=el('button',glyph[state]||'–',{type:'button',class:'cell '+state+(fresh?' new':''),'data-skill':item.id,'aria-label':label,title:label,'aria-pressed':String(selected===item.id)});
        b.addEventListener('click',()=>select(item,group.name));cells.append(b);
      }row.append(heading,cells);matrix.append(row);
    }
    found.textContent=visible+' из '+total+' навыков';
    if(!visible)matrix.append(el('p','Нет навыков по выбранному фильтру.'));
  }
  query.addEventListener('input',paint);filter.addEventListener('change',paint);paint();
  shadow.replaceChildren(el('style',style),frame);host.dataset.status='ready';host.dataset.covered=String(covered);host.dataset.total=String(total);host.dataset.newCount=String(model.newIds.size);
}
async function boot(){
  if(!marker||document.querySelector(tag))return;
  const host=locateHost();host.dataset.status='loading';host.attachShadow({mode:'open'});host.shadowRoot.append(el('style',style),el('p','Загрузка накопленной карты…',{role:'status'}));
  try{
    const contractUrl=new URL(marker.dataset.contract,document.baseURI),root=new URL('./',contractUrl);
    if(root.origin!==location.origin)throw Error('Некорректный источник кабинета');
    const contract=await json(contractUrl);
    if(contract.version!==2||!contract.competencies||!contract.lessons)throw Error('Некорректный контракт кабинета');
    const catalogUrl=resolveInside(root,contract.competencies.catalog),registryUrl=resolveInside(root,contract.lessons.registry);
    const registry=await import(registryUrl.href);
    let raw;
    if(catalogUrl.pathname.endsWith('.json'))raw=await json(catalogUrl);
    else {await import(catalogUrl.href);raw=window.COMPETENCY_MAP_DATA;}
    if(raw?.studentId&&raw.studentId!==contract.studentId)throw Error('Несогласованный каталог');
    const catalog=normalizeCoverageCatalog(raw);
    if(!Array.isArray(registry.LESSONS))throw Error('Некорректный реестр занятий');
    render(host,cumulativeCoverage(registry.LESSONS,{knownIds:catalog.ids,includeLegacy:true}),catalog,root);
  }catch(error){
    host.dataset.status='error';host.shadowRoot.replaceChildren(el('style',style),el('p','Накопительный охват временно недоступен. Остальные материалы кабинета остаются доступны.',{class:'error',role:'status'}));
    console.error('Atlas learning coverage:',error);
  }
}
void boot();
