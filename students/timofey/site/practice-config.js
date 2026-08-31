export const PRACTICE_CONFIG={
  enabled:true,studentId:'timofey',storageKey:'timofey-practice-state-v1',masteryStateKey:'timofey-competence-state-v2',dailyTarget:5,dailyMax:7,maxPerGroup:2,remediationMax:1,
  features:{remediation:true,competencyDialogStatus:true,lessonAutoActivation:true},
  competencies:{
    t7_power_actions:{generator:'algebra.powers',difficulty:[1,2],active:true,group:'algebra-powers'},
    t7_radical_num:{generator:'algebra.radicals',difficulty:[1,2],active:true,group:'algebra-radicals'},
    t9_linear:{generator:'algebra.linear-equations',difficulty:[1,2],active:true,group:'algebra-equations'},
    t9_power:{generator:'algebra.quadratic-equations',difficulty:[1,2],active:true,group:'algebra-quadratic'},
    t10_line:{generator:'word-problems.motion',difficulty:[1,2,3],active:true,group:'word-motion'},
    t10_work:{generator:'word-problems.work',difficulty:[1,2],active:true,group:'word-work'},
    t10_percent:{generator:'word-problems.mixtures',difficulty:[1,2],active:true,group:'word-mixtures'}
  }
};
