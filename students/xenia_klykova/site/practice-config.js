export const PRACTICE_CONFIG={
  enabled:true,studentId:'xenia_klykova',storageKey:'xenia-practice-state-v1',masteryStateKey:'xenia-competence-state-v2',dailyTarget:5,dailyMax:7,maxPerGroup:2,remediationMax:1,
  features:{remediation:true,competencyDialogStatus:true,lessonAutoActivation:true},
  competencies:{
    t5_product:{generator:'probability.independent-product',difficulty:[1,2],activation:'lesson',group:'probability-product'},
    t5_sum:{generator:'probability.disjoint-sum',difficulty:[1,2],activation:'lesson',group:'probability-sum'},
    t5_complement:{generator:'probability.complement',difficulty:[1,2,3],activation:'lesson',group:'probability-complement'},
    t5_bernoulli:{generator:'probability.bernoulli',difficulty:[1,2,3],activation:'lesson',group:'probability-bernoulli'},
    t5_combinatorics:{generator:'probability.combinatorics',difficulty:[1,2],activation:'always',group:'probability-combinatorics'},
    t2_coordinates:{generator:'vectors.coordinates',difficulty:[1,2],activation:'lesson',group:'vectors-coordinates'},
    t2_length:{generator:'vectors.length',difficulty:[1,2],activation:'lesson',group:'vectors-length'},
    t2_operations:{generator:'vectors.operations',difficulty:[1,2],activation:'lesson',group:'vectors-operations'},
    t2_dot:{generator:'vectors.dot-product',difficulty:[1,2],activation:'lesson',group:'vectors-dot'},
    t10_line:{generator:'word-problems.motion',difficulty:[1,2],activation:'lesson',group:'word-motion'},
    t10_work:{generator:'word-problems.work',difficulty:[1,2],activation:'lesson',group:'word-work'},
    t10_alloys:{generator:'word-problems.mixtures',difficulty:[1,2],activation:'lesson',group:'word-mixtures'}
  }
};
