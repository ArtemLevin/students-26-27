export const PRACTICE_DISPOSITIONS=Object.freeze([
  'generator','curated','manual','none','coverage-gap','competency-gap','ambiguous'
]);

export const EXPLICIT_COVERAGE_DISPOSITIONS=Object.freeze(['generator','curated','manual','none']);
export const GAP_DISPOSITIONS=Object.freeze(['coverage-gap','competency-gap']);
export const COVERAGE_STATUSES=Object.freeze([
  'covered-generator',
  'covered-curated',
  'manual-assessment',
  'excluded-explicitly',
  'missing-competency',
  'missing-practice-mapping',
  'missing-generator',
  'generator-does-not-declare-competency',
  'ambiguous'
]);
export const GAP_STATUSES=Object.freeze([
  'missing-competency',
  'missing-practice-mapping',
  'missing-generator',
  'generator-does-not-declare-competency',
  'ambiguous'
]);

export function isPracticeDisposition(value){return PRACTICE_DISPOSITIONS.includes(value);}
export function isExplicitCoverageDisposition(value){return EXPLICIT_COVERAGE_DISPOSITIONS.includes(value);}
export function isGapDisposition(value){return GAP_DISPOSITIONS.includes(value);}
export function isGapStatus(value){return GAP_STATUSES.includes(value);}

export function outcomeCoverageKey(lessonDate,label){
  if(typeof lessonDate!=='string'||!lessonDate)throw new Error('lessonDate is required for coverage key');
  if(typeof label!=='string'||!label.trim())throw new Error('outcome label is required for coverage key');
  return `${lessonDate}::${label.trim()}`;
}

export function validatePracticeGap(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return {valid:false,errors:['practiceGap must be an object']};
  const errors=[];
  if(typeof value.reason!=='string'||!value.reason.trim())errors.push('practiceGap.reason is required');
  if(typeof value.issue!=='string'||!value.issue.trim())errors.push('practiceGap.issue is required');
  return {valid:errors.length===0,errors};
}

export function hasMachineReadableGapWaiver(outcome){
  if(!isGapDisposition(outcome?.practiceDisposition))return false;
  return validatePracticeGap(outcome.practiceGap).valid;
}
