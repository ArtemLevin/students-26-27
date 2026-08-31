export const PRACTICE_CONFIG={
  enabled:true,studentId:'volodia_khachaturian',storageKey:'volodia-practice-state-v1',masteryStateKey:'volodia_khachaturian-oge-physics-competence-state-v2',dailyTarget:5,dailyMax:7,maxPerGroup:2,remediationMax:1,
  features:{remediation:true,competencyDialogStatus:true,lessonAutoActivation:true},
  competencies:{
    kin_04:{generator:'physics.kinematics',difficulty:[1],active:true,masteryLevel:2,group:'kin-path',options:{mode:'path'}},
    kin_06:{generator:'physics.kinematics',difficulty:[1],active:true,masteryLevel:2,group:'kin-average',options:{mode:'speed'}},
    kin_07:{generator:'word-problems.motion',difficulty:[1,2],active:true,masteryLevel:2,group:'kin-distance',options:{mode:'path'}},
    kin_08:{generator:'word-problems.motion',difficulty:[1,2],active:true,masteryLevel:2,group:'kin-time',options:{mode:'time'}},
    kin_12:{generator:'physics.kinematics',difficulty:[1,2],active:true,masteryLevel:2,group:'kin-coordinate',options:{mode:'coordinate'}},
    kin_13:{generator:'physics.kinematics',difficulty:[1,2],active:true,masteryLevel:2,group:'kin-direction',options:{mode:'direction'}}
  }
};
