    (() => {
      const levels=window.__nikolLevels||{};
      const evidence=window.__nikolEvidence||{};
      const KEY=window.__nikolKey||'nikol-competence-map-v1';
      const CHECK_KEY='nikol-next-steps-v1';
      const THEME_KEY='nikol-dashboard-theme-v1';

      const vals=Object.values(levels);
      const tracked=vals.length;
      const confident=vals.filter(v=>v>=3).length;
      const process=vals.filter(v=>v===2).length;

      const setText=(id,value)=>{ const node=document.getElementById(id); if(node) node.textContent=value; };
      setText('trackedCount',tracked);
      setText('confidentCount',confident);
      setText('processCount',process);
      setText('confidentRatio',confident);
      setText('processRatio',process);
      document.querySelectorAll('.trackedCopy').forEach(n=>n.textContent=tracked);
      const confidentBar=document.getElementById('confidentBar');
      const processBar=document.getElementById('processBar');
      if(confidentBar) confidentBar.style.width=(tracked ? confident/tracked*100 : 0)+'%';
      if(processBar) processBar.style.width=(tracked ? process/tracked*100 : 0)+'%';

      const themeToggle=document.getElementById('themeToggle');
      const storedTheme=localStorage.getItem(THEME_KEY);
      if(storedTheme==='light') document.body.dataset.theme='light';
      if(themeToggle) themeToggle.addEventListener('click',()=>{
        const next=document.body.dataset.theme==='light' ? 'dark' : 'light';
        if(next==='dark') delete document.body.dataset.theme;
        else document.body.dataset.theme='light';
        localStorage.setItem(THEME_KEY,next);
      });

      let checks={};
      try { checks=JSON.parse(localStorage.getItem(CHECK_KEY)||'{}')||{}; } catch (_) {}
      document.querySelectorAll('#checklist input[data-task]').forEach(input=>{
        input.checked=Boolean(checks[input.dataset.task]);
        input.addEventListener('change',()=>{
          checks[input.dataset.task]=input.checked;
          localStorage.setItem(CHECK_KEY,JSON.stringify(checks));
        });
      });

      const archiveLessons=[
        {date:'11.08.26',href:'11.08.26.html',title:'Тригонометрия, теорема Безу и логарифмические неравенства',desc:'Повторение повышенного уровня, ОДЗ и отбор корней.'},
        {date:'07.08.26',href:'07.08.26.html',title:'Смешанные схемы кредитования',desc:'Остатки долга, платежи, переплата и неизвестная ставка.'},
        {date:'04.08.26',href:'04.08.26.html',title:'Дифференцированная схема кредитования',desc:'Равные доли тела кредита, убывающие платежи и арифметическая прогрессия.'},
        {date:'01.08.26',href:'01.08.26.html',title:'Комплексное повторение: формулы и связи',desc:'Геометрия, векторы, вероятность, степени, логарифмы, работа и тригонометрия.'},
        {date:'28.07.26',href:'28-07-26.html',title:'Кредиты: аннуитетная и дифференцированная схемы',desc:'Сравнение двух схем кредитования и выбор корректной математической модели.'},
        {date:'25.07.26',href:'25-07-26.html',title:'Кредиты. Аннуитетная схема',desc:'Пошаговая модель аннуитетного кредита, платежи и самопроверка.'},
        {date:'21.07.26',href:'21-07-26.html',title:'Комплексное повторение ЕГЭ',desc:'Систематизация тестовой части и ключевых связей между темами.'},
        {date:'18.07.26',href:'18-07-26.html',title:'Сравнение вкладов и поиск ставки',desc:'Операции со вкладами, сравнение сценариев и вычисление процентной ставки.'},
        {date:'14.07.26',href:'14-07-26.html',title:'Вклады и сложные проценты',desc:'Сложные проценты, пополнения, снятия и финансовая модель вклада.'},
        {date:'11.07.26',href:'11-07-26.html',title:'Смешанные уравнения и неравенства',desc:'Комбинированные алгебраические конструкции и выбор метода решения.'}
      ];
      const ARCHIVE_PAGE_SIZE=10;
      let archivePageIndex=0;
      const archiveToggle=document.getElementById('archiveToggle');
      const archiveMore=document.getElementById('archiveMore');
      const archivePage=document.getElementById('archivePage');
      const archivePrev=document.getElementById('archivePrev');
      const archiveNext=document.getElementById('archiveNext');
      const archivePageInfo=document.getElementById('archivePageInfo');
      const archiveToggleMeta=document.getElementById('archiveToggleMeta');
      const archivePages=Math.max(1,Math.ceil(archiveLessons.length/ARCHIVE_PAGE_SIZE));

      const renderArchive=()=>{
        if(!archivePage) return;
        const start=archivePageIndex*ARCHIVE_PAGE_SIZE;
        const items=archiveLessons.slice(start,start+ARCHIVE_PAGE_SIZE);
        archivePage.innerHTML=items.map(item=>`
          <article class="timeline-item">
            <div class="timeline-date">${item.date}</div>
            <div><h3>${item.title}</h3><p>${item.desc}</p></div>
            <a class="timeline-link" href="${item.href}" aria-label="Открыть занятие от ${item.date}">→</a>
          </article>`).join('');
        if(archivePageInfo) archivePageInfo.textContent=`Страница ${archivePageIndex+1} из ${archivePages} · по ${ARCHIVE_PAGE_SIZE}`;
        if(archivePrev) archivePrev.disabled=archivePageIndex===0;
        if(archiveNext) archiveNext.disabled=archivePageIndex>=archivePages-1;
      };
      if(archiveToggleMeta) archiveToggleMeta.textContent=`Ещё ${archiveLessons.length} занятий · по ${ARCHIVE_PAGE_SIZE} на странице`;
      renderArchive();
      if(archiveToggle && archiveMore) archiveToggle.addEventListener('click',()=>{
        const expanded=archiveToggle.getAttribute('aria-expanded')==='true';
        archiveToggle.setAttribute('aria-expanded',String(!expanded));
        archiveMore.hidden=expanded;
        const strong=archiveToggle.querySelector('strong');
        if(strong) strong.textContent=expanded?'Показать остальные занятия':'Скрыть остальные занятия';
      });
      if(archivePrev) archivePrev.addEventListener('click',()=>{
        if(archivePageIndex===0) return;
        archivePageIndex-=1; renderArchive();
        archivePage?.scrollIntoView({block:'nearest'});
      });
      if(archiveNext) archiveNext.addEventListener('click',()=>{
        if(archivePageIndex>=archivePages-1) return;
        archivePageIndex+=1; renderArchive();
        archivePage?.scrollIntoView({block:'nearest'});
      });

      const frame=document.getElementById('base');
      function patchEvidence(doc,id) {
        if(!evidence[id]) return;
        setTimeout(()=>{
          const note=doc.getElementById('dialogEvidence');
          const link=doc.getElementById('dialogLink');
          if(note) note.textContent=evidence[id].text;
          if(link) link.href=evidence[id].href;
        },0);
      }
      if(frame) frame.addEventListener('load',()=>{
        let doc,win;
        try {
          doc=frame.contentDocument;
          win=frame.contentWindow;
          if(!doc||!win) return;
          if(window.__nikolSync) window.__nikolSync(win.localStorage);
        } catch (_) { return; }
        doc.addEventListener('click',e=>{
          const cell=e.target.closest&&e.target.closest('.radial-cell,.topic-row');
          if(cell) patchEvidence(doc,cell.dataset.id);
        });
        doc.addEventListener('keydown',e=>{
          if(e.key!=='Enter'&&e.key!==' ') return;
          const cell=e.target.closest&&e.target.closest('.radial-cell,.topic-row');
          if(cell) patchEvidence(doc,cell.dataset.id);
        });
        const reset=doc.getElementById('resetMap');
        if(reset) reset.addEventListener('click',()=>setTimeout(()=>{
          try {
            if(window.__nikolSync) window.__nikolSync(win.localStorage);
            win.location.reload();
          } catch (_) {}
        },120),true);
      });
    })();
