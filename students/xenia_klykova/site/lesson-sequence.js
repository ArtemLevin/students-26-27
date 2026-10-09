/**
 * Canonical registry owns lesson identity and chronology.
 * A reviewed historical snapshot may enrich that date, but cannot reorder new lessons.
 */
export function composeLessons(canonicalLessons,historicalSnapshots=[]){
  const overrides=new Map(historicalSnapshots.map(lesson=>[lesson.date,lesson]));
  const lessons=canonicalLessons.map(lesson=>overrides.get(lesson.date)||lesson);
  return lessons.sort((a,b)=>b.date.localeCompare(a.date));
}
