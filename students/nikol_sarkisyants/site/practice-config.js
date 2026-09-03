import {installEgeProfile2027ControllerHook} from '../../../shared/student-dashboard/ege-profile-2027.js?v=20260903';

if(typeof window!=='undefined')installEgeProfile2027ControllerHook('__nikolCompetenceMap',window);

export const PRACTICE_CONFIG={
  enabled:true,studentId:'nikol_sarkisyants',storageKey:'nikol-practice-state-v1',masteryStateKey:'nikol-competence-state-v2',dailyTarget:5,dailyMax:7,maxPerGroup:2,remediationMax:1,
  features:{remediation:true,competencyDialogStatus:true,lessonAutoActivation:true},
  competencies:{
    t2_coordinates:{generator:'vectors.coordinates',difficulty:[1,2],activation:'always',group:'vectors-coordinates'},
    t2_length:{generator:'vectors.length',difficulty:[1,2],activation:'always',group:'vectors-length'},
    t2_operations:{generator:'vectors.operations',difficulty:[1,2],activation:'always',group:'vectors-operations'},
    t2_dot:{generator:'vectors.dot-product',difficulty:[1,2],activation:'always',group:'vectors-dot'},
    t7_power_values:{generator:'algebra.powers',difficulty:[1,2],activation:'always',group:'powers-values'},
    t7_power_actions:{generator:'algebra.powers',difficulty:[1,2],activation:'always',group:'powers-actions'},
    t7_natural_power:{generator:'algebra.powers',difficulty:[1,2],activation:'always',group:'powers-natural'},
    t7_integer_power:{generator:'algebra.powers',difficulty:[1,2],activation:'always',group:'powers-integer'},
    t7_radical_num:{generator:'algebra.radicals',difficulty:[1,2],activation:'lesson',group:'radicals-number'},
    t10_line:{generator:'word-problems.motion',difficulty:[1,2],activation:'always',group:'word-motion'},
    t10_work:{generator:'word-problems.work',difficulty:[1,2],activation:'always',group:'word-work'},
    t10_alloys:{generator:'word-problems.mixtures',difficulty:[1,2],activation:'always',group:'word-mixtures'},
    t10_percent:{generator:'word-problems.percentages',difficulty:[1,2],activation:'always',group:'word-percent'}
  }
};
