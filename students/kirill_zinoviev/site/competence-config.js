(()=>{
const groups=window.KIRILL_GRADE7_GROUPS||[];
const lessons=[
{date:'08.08.26',href:'08.08.26.html',ids:window.KIRILL_GRADE7_EVIDENCE||[]},
{date:'12.08.26',href:'12.08.26.html',ids:['percent_8','percent_9','percent_11','percent_12','percent_14','models_12']},
{date:'15.08.26',href:'15.08.26.html',ids:['expr_5','expr_6','equations_4','equations_5','equations_6','equations_12','models_1','models_2','models_3','models_4','models_5','models_6','models_7','models_8','models_14']},
{date:'19.08.26',href:'19.08.26.html',ids:['expr_5','expr_6','expr_7','equations_2','equations_3','equations_4','equations_5','equations_6','equations_8','equations_12','models_1','models_2','models_3','models_4','models_5','models_9','models_10','models_14']},
{date:'22.08.26',href:'22.08.26.html',ids:['fractions_14','fractions_15','fractions_16','percent_8','percent_9','percent_11','percent_12','percent_14','expr_1','expr_2','expr_3','models_1','models_2','models_3','models_4','models_5','models_12','models_14']},
{date:'26.08.26',href:'26.08.26.html',ids:['percent_3','percent_4','percent_9','percent_11','percent_12','percent_13','models_12']},
{date:'29.08.26',href:'29.08.26.html',ids:['calc_3','calc_4','calc_5','calc_6','fractions_8','fractions_9','rational_1','rational_2','rational_3','rational_6','rational_7','rational_10','rational_11','expr_8']}
];
const teacherSeed={},evidence={};for(const lesson of lessons)for(const id of lesson.ids){teacherSeed[id]=Math.max(teacherSeed[id]||0,2);evidence[id]={text:`Тема подтверждена материалом занятия ${lesson.date}.`,href:lesson.href};}
const source=URL.createObjectURL(new Blob([`const groups=${JSON.stringify(groups)};`],{type:'text/javascript'}));
window.STUDENT_COMPETENCE_CONFIG={stateKey:'kirill-competence-state-v2',storageKey:'kirill-competence-map-v2',baselineKey:'kirill-competence-teacher-baseline-v1',legacyStorageKeys:[],legacyRepeatKeys:['kirill-competence-repeat-v1'],legacyUrl:source,fallbackHref:'competency-map-data.js',catalogNames:['groups'],summaryEvent:'kirill:competence-summary',teacherSeed,evidence};
})();
