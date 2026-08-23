(() => {
  const THEME_KEY='nikol-dashboard-theme-v1';
  const setText=(id,value)=>{const node=document.getElementById(id);if(node)node.textContent=value;};

  const updateCompetenceSummary=summary=>{
    if(!summary)return;
    setText('totalCount',summary.total);
    setText('evaluatedCount',summary.evaluated);
    setText('confidentCount',summary.confident);
    setText('confidentCountMain',summary.confident);
    setText('processCount',summary.process);
    setText('processCountMain',summary.process);
  };
  window.addEventListener('nikol:competence-summary',event=>updateCompetenceSummary(event.detail));

  const applyTheme=theme=>{
    if(theme==='light')document.body.dataset.theme='light';
    else delete document.body.dataset.theme;
    localStorage.setItem(THEME_KEY,theme);
  };
  if(localStorage.getItem(THEME_KEY)==='light')document.body.dataset.theme='light';
  document.querySelectorAll('#themeToggle,#mobileThemeToggle').forEach(button=>{
    button.addEventListener('click',()=>applyTheme(document.body.dataset.theme==='light'?'dark':'light'));
  });

  const menuButton=document.getElementById('menuButton');
  const sidebarClose=document.getElementById('sidebarClose');
  const sidebarBackdrop=document.getElementById('sidebarBackdrop');
  const setSidebar=open=>{
    document.body.classList.toggle('sidebar-open',open);
    if(menuButton)menuButton.setAttribute('aria-expanded',String(open));
    if(sidebarBackdrop)sidebarBackdrop.hidden=!open;
  };
  if(menuButton)menuButton.addEventListener('click',()=>setSidebar(!document.body.classList.contains('sidebar-open')));
  if(sidebarClose)sidebarClose.addEventListener('click',()=>setSidebar(false));
  if(sidebarBackdrop)sidebarBackdrop.addEventListener('click',()=>setSidebar(false));
  document.addEventListener('keydown',event=>{if(event.key==='Escape')setSidebar(false);});
  document.querySelectorAll('.sidebar a').forEach(link=>link.addEventListener('click',()=>{
    if(window.matchMedia('(max-width:900px)').matches)setSidebar(false);
  }));

  const archiveLessons=[
    {date:'11.08',href:'11.08.26.html',title:'Тригонометрия, Безу и логарифмические неравенства'},
    {date:'07.08',href:'07.08.26.html',title:'Смешанные схемы кредитования'},
    {date:'04.08',href:'04.08.26.html',title:'Дифференцированная схема кредитования'},
    {date:'01.08',href:'01.08.26.html',title:'Комплексное повторение: формулы и связи'},
    {date:'28.07',href:'28-07-26.html',title:'Кредиты: аннуитетная и дифференцированная схемы'},
    {date:'25.07',href:'25-07-26.html',title:'Кредиты. Аннуитетная схема'},
    {date:'21.07',href:'21-07-26.html',title:'Комплексное повторение ЕГЭ'},
    {date:'18.07',href:'18-07-26.html',title:'Сравнение вкладов и поиск ставки'},
    {date:'14.07',href:'14-07-26.html',title:'Вклады и сложные проценты'},
    {date:'11.07',href:'11-07-26.html',title:'Смешанные уравнения и неравенства'}
  ];
  const PAGE_SIZE=10;
  let pageIndex=0;
  const archiveToggle=document.getElementById('archiveToggle');
  const archiveMore=document.getElementById('archiveMore');
  const archivePage=document.getElementById('archivePage');
  const archivePrev=document.getElementById('archivePrev');
  const archiveNext=document.getElementById('archiveNext');
  const archivePageInfo=document.getElementById('archivePageInfo');
  const archiveToggleMeta=document.getElementById('archiveToggleMeta');
  const pageCount=Math.max(1,Math.ceil(archiveLessons.length/PAGE_SIZE));

  const renderArchive=()=>{
    if(!archivePage)return;
    const start=pageIndex*PAGE_SIZE;
    archivePage.innerHTML=archiveLessons.slice(start,start+PAGE_SIZE).map(item=>`
      <a class="archive-link" href="${item.href}">
        <time>${item.date}</time>
        <span><strong>${item.title}</strong></span>
      </a>`).join('');
    if(archivePageInfo)archivePageInfo.textContent=`${pageIndex+1} / ${pageCount}`;
    if(archivePrev)archivePrev.disabled=pageIndex===0;
    if(archiveNext)archiveNext.disabled=pageIndex>=pageCount-1;
  };
  if(archiveToggleMeta)archiveToggleMeta.textContent=`Ещё ${archiveLessons.length} · по ${PAGE_SIZE} на странице`;
  renderArchive();

  if(archiveToggle&&archiveMore)archiveToggle.addEventListener('click',()=>{
    const expanded=archiveToggle.getAttribute('aria-expanded')==='true';
    archiveToggle.setAttribute('aria-expanded',String(!expanded));
    archiveMore.hidden=expanded;
  });
  if(archivePrev)archivePrev.addEventListener('click',()=>{if(pageIndex>0){pageIndex-=1;renderArchive();}});
  if(archiveNext)archiveNext.addEventListener('click',()=>{if(pageIndex<pageCount-1){pageIndex+=1;renderArchive();}});
})();
