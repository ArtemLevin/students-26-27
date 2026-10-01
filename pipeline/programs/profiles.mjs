export const PROGRAM_PROFILES=Object.freeze({
  custom:Object.freeze({
    id:'custom',
    label:'Индивидуальная программа',
    defaultProgram:'Математика',
    planningMode:'rolling'
  }),
  'ege-profile-math':Object.freeze({
    id:'ege-profile-math',
    label:'ЕГЭ · профильная математика',
    defaultProgram:'ЕГЭ, профильная математика',
    planningMode:'fixed'
  }),
  'oge-math':Object.freeze({
    id:'oge-math',
    label:'ОГЭ · математика',
    defaultProgram:'ОГЭ, математика',
    planningMode:'fixed'
  }),
  'school-math':Object.freeze({
    id:'school-math',
    label:'Школьная математика',
    defaultProgram:'Школьная математика',
    planningMode:'rolling'
  }),
  'ege-physics':Object.freeze({
    id:'ege-physics',
    label:'ЕГЭ · физика',
    defaultProgram:'ЕГЭ, физика',
    planningMode:'fixed'
  }),
  'school-physics':Object.freeze({
    id:'school-physics',
    label:'Школьная физика',
    defaultProgram:'Школьная физика',
    planningMode:'rolling'
  }),
  chemistry:Object.freeze({
    id:'chemistry',
    label:'Химия',
    defaultProgram:'Химия',
    planningMode:'rolling'
  })
});

export function getProgramProfile(id='custom'){
  const profile=PROGRAM_PROFILES[id];
  if(!profile)throw new Error(
    'Unknown program profile: '+id+'. Available: '+Object.keys(PROGRAM_PROFILES).join(', ')
  );
  return profile;
}
