export const PRACTICE_CONFIG={
  enabled:true,studentId:'kirill_zinoviev',storageKey:'kirill-practice-state-v1',masteryStateKey:'kirill-competence-state-v2',dailyTarget:5,dailyMax:7,maxPerGroup:2,remediationMax:1,
  features:{remediation:true,competencyDialogStatus:true,lessonAutoActivation:true},
  competencies:{
    percent_11:{generator:'word-problems.percentages',difficulty:[1,2],active:true,group:'percent-part',options:{mode:'part'}},
    percent_12:{generator:'word-problems.percentages',difficulty:[1,2],active:true,group:'percent-whole',options:{mode:'whole'}},
    percent_13:{generator:'word-problems.percentages',difficulty:[1,2],active:true,group:'percent-ratio',options:{mode:'ratio'}},
    percent_14:{generator:'word-problems.percentages',difficulty:[1,2],active:true,group:'percent-change',options:{mode:'change'}},
    equations_6:{generator:'algebra.linear-equations',difficulty:[1,2],active:true,group:'linear-equation'},
    models_6:{generator:'word-problems.motion',difficulty:[1,2],active:true,group:'word-motion'},
    models_9:{generator:'word-problems.work',difficulty:[1,2],active:true,group:'word-work'}
  }
};
