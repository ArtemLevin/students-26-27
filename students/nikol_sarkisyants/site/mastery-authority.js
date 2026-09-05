(() => {
  'use strict';

  const STATE_KEY='nikol-competence-state-v2';
  const SCHEMA_VERSION=2;
  const teacherLevels=window.__nikolTeacherLevels||window.__nikolLevels||{};

  function readObject(key){
    try{
      const value=JSON.parse(localStorage.getItem(key)||'{}');
      return value&&typeof value==='object'&&!Array.isArray(value)?value:{};
    }catch(_){return {};}
  }

  try{
    const previous=readObject(STATE_KEY);
    const reviewQueue=previous.reviewQueue&&typeof previous.reviewQueue==='object'&&!Array.isArray(previous.reviewQueue)
      ? previous.reviewQueue
      : {};
    const state={
      schemaVersion:SCHEMA_VERSION,
      studentLevels:{...teacherLevels},
      reviewQueue,
      updatedAt:typeof previous.updatedAt==='string'?previous.updatedAt:new Date().toISOString()
    };
    localStorage.setItem(STATE_KEY,JSON.stringify(state));
  }catch(_){/* localStorage may be unavailable; the map still receives teacherLevels */}

  document.addEventListener('DOMContentLoaded',()=>{
    document.querySelectorAll('#levelPicker .level-btn').forEach(button=>{
      button.disabled=true;
      button.setAttribute('aria-disabled','true');
      button.title='Уровень обновляется по результатам занятия через Stage 04.';
    });
    const reset=document.getElementById('resetMap');
    if(reset){reset.hidden=true;reset.disabled=true;}
    const note=document.querySelector('.map-note');
    if(note&&note.firstChild)note.firstChild.textContent='Нажмите на сектор или тему, чтобы открыть подробности. Уровни публикуются после занятия через Stage 04. ';
  });
})();
