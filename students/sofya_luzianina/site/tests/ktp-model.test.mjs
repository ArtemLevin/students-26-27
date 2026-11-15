import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSearch,matchesLesson,lessonStatus,scheduledDate,completionDate,selectTimeline} from '../ktp-model.mjs';
const l=(n,date,topic)=>({id:'ktp-'+String(n).padStart(3,'0'),stageId:'mechanics',stage:'Механика',topic,plannedDate:date,block:'Контроль',content:'Задача по физике',result:'Умение',check:'Проверка',homework:'Домашнее задание',targetCompetencies:[]});
test('normalized search understands number sign, whitespace and letters ё/е',()=>{
 assert.equal(normalizeSearch(' № 26 '),'№26');
 assert.equal(normalizeSearch('ОБЪЁМ'),'объем');
 const lesson=l(50,'2027-05-07','Сложная механика №26: модель и обоснование');
 assert.equal(matchesLesson(lesson,{}, {query:'№ 26'}),true);
 assert.equal(matchesLesson(lesson,{}, {query:'№26'}),true);
 assert.equal(matchesLesson(lesson,{}, {query:'Электростатика'}),false);
 assert.equal(matchesLesson(lesson,{}, {query:'  МЕХАНИКА ',stageId:'mechanics'}),true);
 assert.equal(matchesLesson(lesson,{}, {query:'механика',status:'done'}),false);
});
test('timeline excludes skipped and done from upcoming; uses actualDate for completion',()=>{
 const lessons=[l(1,'2026-11-16','Основы'),l(2,'2026-11-20','Пропуск'),l(3,'2026-11-23','Перенос'),l(4,'2026-11-27','После')];
 const records={
 'ktp-001':{status:'done',actualDate:'2026-11-18',coverage:'complete'},
 'ktp-002':{status:'skipped'},
 'ktp-003':{status:'moved',scheduledDate:'2026-12-01'},
 'ktp-004':{status:'planned'}
 };
 assert.equal(lessonStatus(lessons[0],records),'done');
 assert.equal(scheduledDate(lessons[2],records),'2026-12-01');
 assert.equal(completionDate(lessons[0],records),'2026-11-18');
 const timeline=selectTimeline(lessons,records,'2026-11-19');
 assert.equal(timeline.todayLesson,null);
 assert.equal(timeline.next.id,'ktp-004');
 assert.equal(timeline.lastDone.id,'ktp-001');
 assert.equal(selectTimeline(lessons,records,'2026-12-01').todayLesson.id,'ktp-003');
 assert.equal(selectTimeline(lessons,records,'2027-02-01').next,null);
});
test('filter matching is stable with shifted dates, stage and canonical records',()=>{
 const lesson=l(1,'2026-11-16','График движения');
 const records={'ktp-001':{status:'done',actualDate:'2026-11-19',coverage:'complete'}};
 assert.equal(matchesLesson(lesson,records,{query:'график',status:'done'}),true);
 assert.equal(matchesLesson(lesson,records,{query:'график',status:'planned'}),false);
 assert.equal(matchesLesson(lesson,records,{query:'график',stageId:'optics'}),false);
});
