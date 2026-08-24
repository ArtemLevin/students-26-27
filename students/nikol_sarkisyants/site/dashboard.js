import {
  LESSONS,
  RECENT_LIMIT,
  ARCHIVE_PAGE_SIZE,
  getLatestLesson,
  getRecentLessons,
  paginateArchive,
  formatShortDate,
  formatLongDateRu
} from './lesson-registry.js';

const THEME_KEY='nikol-dashboard-theme-v1';
const MOBILE_QUERY='(max-width:900px)';
const FOCUSABLE_SELECTOR='a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

const byId=id=>document.getElementById(id);
const setText=(id,value)=>{const node=byId(id);if(node)node.textContent=value;};

function updateCompetenceSummary(summary){
  if(!summary)return;
  setText('totalCount',summary.total);
  setText('evaluatedCount',summary.evaluated);
  setText('confidentCount',summary.confident);
  setText('confidentCountMain',summary.confident);
  setText('processCount',summary.process);
  setText('processCountMain',summary.process);
  setText('masteredCount',summary.mastered);
  setText('masteredCountMain',summary.mastered);
}
window.addEventListener('nikol:competence-summary',event=>updateCompetenceSummary(event.detail));

function applyTheme(theme){
  if(theme==='light')document.body.dataset.theme='light';
  else delete document.body.dataset.theme;
  localStorage.setItem(THEME_KEY,theme);
}
if(localStorage.getItem(THEME_KEY)==='light')document.body.dataset.theme='light';
document.querySelectorAll('#themeToggle,#mobileThemeToggle').forEach(button=>{
  button.addEventListener('click',()=>applyTheme(document.body.dataset.theme==='light'?'dark':'light'));
});

function configureMaterialLink(id,href,{newTab=false}={}){
  const link=byId(id);
  if(!link)return;
  link.hidden=!href;
  if(!href){link.removeAttribute('href');return;}
  link.href=href;
  if(newTab){
    link.target='_blank';
    link.rel='noopener';
  }else{
    link.removeAttribute('target');
    link.removeAttribute('rel');
  }
}

function renderLatestLesson(){
  const lesson=getLatestLesson(LESSONS);
  if(!lesson)return;

  setText('latestLessonEyebrow',`Последнее занятие · ${formatLongDateRu(lesson.date)}`);
  setText('lesson-title',lesson.title);
  setText('lessonLead',lesson.summary||'');
  setText('mapUpdatedDate',`Кабинет обновлён ${formatLongDateRu(lesson.date)}`);

  const topics=byId('lessonTopics');
  if(topics){
    topics.replaceChildren(...lesson.topics.map(topic=>{
      const chip=document.createElement('span');
      chip.className='chip';
      chip.textContent=topic;
      return chip;
    }));
  }

  const status=byId('latestLessonStatus');
  if(status){
    const title=document.createElement('p');
    title.className='status-title';
    title.textContent='После урока';
    const outcomes=(lesson.outcomes||[]).map(outcome=>{
      const row=document.createElement('div');
      row.className=`outcome ${outcome.tone||'process'}`;
      const mark=document.createElement('span');
      mark.className='outcome-mark';
      mark.textContent=outcome.tone==='good'?'✓':outcome.tone==='alert'?'!':'◐';
      const label=document.createElement('span');
      label.textContent=outcome.label;
      const level=document.createElement('b');
      level.textContent=`${outcome.level}/4`;
      row.append(mark,label,level);
      return row;
    });
    status.replaceChildren(title,...outcomes);
  }

  const cta=byId('latestLessonCta');
  if(cta){
    cta.href=lesson.href;
    cta.hidden=false;
  }

  const materials=lesson.materials||{};
  configureMaterialLink('latestReviewLink',materials.review,{newTab:true});
  configureMaterialLink('latestPdfLink',materials.pdf);
  configureMaterialLink('latestTexLink',materials.tex);
}

function createLessonLink(lesson,index){
  const link=document.createElement('a');
  link.className=`lesson-link${index===0?' active':''}`;
  link.href=lesson.href;

  const date=document.createElement('span');
  date.className='lesson-date';
  date.textContent=formatShortDate(lesson.date);

  const copy=document.createElement('span');
  const title=document.createElement('strong');
  title.textContent=lesson.navTitle;
  const subtitle=document.createElement('small');
  subtitle.textContent=index===0?'последнее занятие':lesson.navSubtitle||lesson.title;
  copy.append(title,subtitle);

  const arrow=document.createElement('span');
  arrow.className='lesson-arrow';
  arrow.setAttribute('aria-hidden','true');
  arrow.textContent='→';

  link.append(date,copy,arrow);
  return link;
}

function renderRecentLessons(){
  const recent=getRecentLessons(LESSONS,RECENT_LIMIT);
  const container=byId('recentLessons');
  if(container)container.replaceChildren(...recent.map(createLessonLink));
  setText('recentLessonCount',`${recent.length} свежих`);
}

let archivePageIndex=0;
function renderArchive(){
  const page=paginateArchive(LESSONS,archivePageIndex,ARCHIVE_PAGE_SIZE);
  archivePageIndex=page.pageIndex;
  const archivePage=byId('archivePage');
  const archivePrev=byId('archivePrev');
  const archiveNext=byId('archiveNext');
  const archivePageInfo=byId('archivePageInfo');
  const archiveToggle=byId('archiveToggle');
  const archivePagination=byId('archivePagination');

  if(archivePage){
    const rows=page.items.map(lesson=>{
      const link=document.createElement('a');
      link.className='archive-link';
      link.href=lesson.href;
      const time=document.createElement('time');
      time.dateTime=lesson.date;
      time.textContent=formatShortDate(lesson.date);
      const copy=document.createElement('span');
      const title=document.createElement('strong');
      title.textContent=lesson.title;
      copy.append(title);
      link.append(time,copy);
      return link;
    });
    archivePage.replaceChildren(...rows);
    archivePage.setAttribute('aria-label',`Страница ${page.pageIndex+1} из ${page.pageCount}`);
  }
  if(archivePageInfo)archivePageInfo.textContent=`${page.pageIndex+1} / ${page.pageCount}`;
  if(archivePrev)archivePrev.disabled=page.pageIndex===0;
  if(archiveNext)archiveNext.disabled=page.pageIndex>=page.pageCount-1;
  if(archiveToggle)archiveToggle.hidden=page.total===0;
  if(archivePagination)archivePagination.hidden=page.total===0;
  setText('archiveToggleMeta',`Ещё ${page.total} · по ${ARCHIVE_PAGE_SIZE} на странице`);
}

function bindArchive(){
  const archiveToggle=byId('archiveToggle');
  const archiveMore=byId('archiveMore');
  const archivePrev=byId('archivePrev');
  const archiveNext=byId('archiveNext');

  renderArchive();

  if(archiveToggle&&archiveMore)archiveToggle.addEventListener('click',()=>{
    const expanded=archiveToggle.getAttribute('aria-expanded')==='true';
    archiveToggle.setAttribute('aria-expanded',String(!expanded));
    archiveMore.hidden=expanded;
  });
  if(archivePrev)archivePrev.addEventListener('click',()=>{
    if(archivePageIndex>0){archivePageIndex-=1;renderArchive();}
  });
  if(archiveNext)archiveNext.addEventListener('click',()=>{
    const page=paginateArchive(LESSONS,archivePageIndex,ARCHIVE_PAGE_SIZE);
    if(archivePageIndex<page.pageCount-1){archivePageIndex+=1;renderArchive();}
  });
}

function setInert(element,value){
  if(!element)return;
  element.inert=Boolean(value);
  if(value)element.setAttribute('inert','');
  else element.removeAttribute('inert');
}

function setupMobileDrawer(){
  const menuButton=byId('menuButton');
  const sidebar=byId('sidebar');
  const sidebarClose=byId('sidebarClose');
  const sidebarBackdrop=byId('sidebarBackdrop');
  const content=byId('content');
  const mobileBar=document.querySelector('.mobile-bar');
  if(!menuButton||!sidebar||!sidebarBackdrop)return;

  const media=window.matchMedia(MOBILE_QUERY);
  let opener=menuButton;

  const isOpen=()=>document.body.classList.contains('sidebar-open');
  const focusables=()=>[...sidebar.querySelectorAll(FOCUSABLE_SELECTOR)].filter(node=>{
    if(node.hasAttribute('disabled')||node.getAttribute('aria-hidden')==='true')return false;
    if(node.closest('[hidden]'))return false;
    return node.getClientRects().length>0;
  });

  const normalizeViewport=()=>{
    document.body.classList.remove('sidebar-open');
    menuButton.setAttribute('aria-expanded','false');
    sidebarBackdrop.hidden=true;
    setInert(content,false);
    setInert(mobileBar,false);

    if(media.matches){
      setInert(sidebar,true);
      sidebar.setAttribute('aria-hidden','true');
    }else{
      setInert(sidebar,false);
      sidebar.removeAttribute('aria-hidden');
    }
  };

  const setSidebar=(open,{restoreFocus=true}={})=>{
    if(!media.matches){normalizeViewport();return;}
    if(open){
      opener=document.activeElement instanceof HTMLElement?document.activeElement:menuButton;
      setInert(sidebar,false);
      sidebar.setAttribute('aria-hidden','false');
      setInert(content,true);
      setInert(mobileBar,true);
      document.body.classList.add('sidebar-open');
      menuButton.setAttribute('aria-expanded','true');
      sidebarBackdrop.hidden=false;
      requestAnimationFrame(()=>{
        const target=sidebarClose||focusables()[0];
        if(target)target.focus();
      });
      return;
    }

    document.body.classList.remove('sidebar-open');
    menuButton.setAttribute('aria-expanded','false');
    sidebarBackdrop.hidden=true;
    setInert(content,false);
    setInert(mobileBar,false);
    setInert(sidebar,true);
    sidebar.setAttribute('aria-hidden','true');
    if(restoreFocus){
      requestAnimationFrame(()=>{
        const target=opener&&typeof opener.focus==='function'?opener:menuButton;
        target.focus();
      });
    }
  };

  menuButton.addEventListener('click',()=>setSidebar(!isOpen()));
  if(sidebarClose)sidebarClose.addEventListener('click',()=>setSidebar(false));
  sidebarBackdrop.addEventListener('click',()=>setSidebar(false));

  sidebar.addEventListener('click',event=>{
    const link=event.target.closest&&event.target.closest('a[href]');
    if(link&&media.matches&&isOpen())setTimeout(()=>setSidebar(false,{restoreFocus:false}),0);
  });

  document.addEventListener('keydown',event=>{
    if(!media.matches||!isOpen())return;
    if(event.key==='Escape'){
      event.preventDefault();
      setSidebar(false);
      return;
    }
    if(event.key!=='Tab')return;
    const nodes=focusables();
    if(nodes.length===0){event.preventDefault();return;}
    const first=nodes[0];
    const last=nodes[nodes.length-1];
    const active=document.activeElement;
    if(event.shiftKey&&(active===first||!sidebar.contains(active))){
      event.preventDefault();
      last.focus();
    }else if(!event.shiftKey&&(active===last||!sidebar.contains(active))){
      event.preventDefault();
      first.focus();
    }
  });

  if(typeof media.addEventListener==='function')media.addEventListener('change',normalizeViewport);
  else if(typeof media.addListener==='function')media.addListener(normalizeViewport);
  normalizeViewport();
}

renderLatestLesson();
renderRecentLessons();
bindArchive();
setupMobileDrawer();
