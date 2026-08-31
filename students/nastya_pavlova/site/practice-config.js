export const PRACTICE_CONFIG={
  enabled:true,studentId:'nastya_pavlova',storageKey:'nastya-practice-state-v1',dailyTarget:5,dailyMax:7,maxPerGroup:2,remediationMax:1,
  features:{remediation:true,competencyDialogStatus:true,lessonAutoActivation:true},
  competencies:{
    calc_01:{generator:'algebra.powers',difficulty:[1],active:true,masteryLevel:2,group:'powers-meaning'},
    calc_03:{generator:'algebra.powers',difficulty:[1,2],active:true,masteryLevel:2,group:'powers-product'},
    calc_04:{generator:'algebra.powers',difficulty:[1,2],active:true,masteryLevel:2,group:'powers-quotient'},
    calc_07:{generator:'algebra.powers',difficulty:[1,2],active:true,masteryLevel:2,group:'powers-power'},
    calc_08:{generator:'algebra.powers',difficulty:[1,2],active:true,masteryLevel:2,group:'powers-integer'},
    calc_10:{generator:'algebra.radicals',difficulty:[1,2],active:true,masteryLevel:2,group:'radicals-meaning'},
    calc_11:{generator:'algebra.radicals',difficulty:[1,2],active:true,masteryLevel:2,group:'radicals-fractional'},
    calc_12:{generator:'algebra.powers',difficulty:[1,2],active:true,masteryLevel:2,group:'powers-common-base'}
  }
};
