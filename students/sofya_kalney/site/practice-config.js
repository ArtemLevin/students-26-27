export const PRACTICE_CONFIG={
  enabled:true,studentId:'sofya_kalney',storageKey:'sofya-practice-state-v1',masteryStateKey:'sofya-competence-state-v2',dailyTarget:5,dailyMax:7,maxPerGroup:2,remediationMax:1,
  features:{remediation:true,competencyDialogStatus:true,lessonAutoActivation:true},
  competencies:{
    oge_9_2_2:{generator:'algebra.quadratic-equations',difficulty:[1,2],activation:'lesson',group:'algebra-equations'},
    oge_21_1_2:{generator:'word-problems.mixtures',difficulty:[1,2],activation:'always',group:'word-mixtures'},
    oge_21_2_2:{generator:'word-problems.motion',difficulty:[1,2],activation:'always',group:'word-motion'},
    oge_21_4_2:{generator:'word-problems.work',difficulty:[1,2],activation:'always',group:'word-work'},
    oge_20_3_5:{generator:'algebra.linear-systems',difficulty:[1,2],activation:'lesson',group:'linear-systems'}
  }
};
