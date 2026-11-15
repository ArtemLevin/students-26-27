export const LESSONS=[];
export function compareLessonsNewestFirst(a,b){return b.date.localeCompare(a.date)}
export function sortedLessons(lessons=LESSONS){return [...lessons].sort(compareLessonsNewestFirst)}
export function getLatestLesson(lessons=LESSONS){return sortedLessons(lessons)[0]||null}
export function getLessonByDate(date,lessons=LESSONS){return lessons.find(item=>item.date===date)||null}
