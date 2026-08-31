export const PRACTICE_CONFIG={
  enabled:true,studentId:'nastya_pavlova',storageKey:'nastya-practice-state-v1',dailyTarget:5,dailyMax:7,maxPerGroup:2,remediationMax:1,
  features:{remediation:true,competencyDialogStatus:true,lessonAutoActivation:true},
  competencies:{
    calc_01:{generator:'algebra.powers',difficulty:[1],active:true,masteryLevel:2,group:'powers-meaning',options:{mode:'meaning'}},
    calc_03:{generator:'algebra.powers',difficulty:[1,2],active:true,masteryLevel:2,group:'powers-product',options:{mode:'product'}},
    calc_04:{generator:'algebra.powers',difficulty:[1,2],active:true,masteryLevel:2,group:'powers-quotient',options:{mode:'quotient'}},
    calc_07:{generator:'algebra.powers',difficulty:[1,2],active:true,masteryLevel:2,group:'powers-power',options:{mode:'power'}},
    calc_08:{generator:'algebra.powers',difficulty:[1,2],active:true,masteryLevel:2,group:'powers-integer',options:{mode:'negative'}},
    calc_10:{generator:'algebra.radicals',difficulty:[1,2],active:true,masteryLevel:2,group:'radicals-meaning',options:{mode:'root-as-power'}},
    calc_11:{generator:'algebra.radicals',difficulty:[1,2],active:true,masteryLevel:2,group:'radicals-fractional',options:{mode:'fractional-power'}},
    calc_12:{generator:'algebra.powers',difficulty:[1,2],active:true,masteryLevel:2,group:'powers-common-base',options:{mode:'common-base'}}
  }
};