const LESSONS=[];

function compareLessonsNewestFirst(left,right){return right.date.localeCompare(left.date);}
function sortedLessons(lessons=LESSONS){return [...lessons].sort(compareLessonsNewestFirst);}
function getLatestLesson(lessons=LESSONS){return sortedLessons(lessons)[0]||null;}
function getLessonByDate(date,lessons=LESSONS){return lessons.find(item=>item.date===date)||null;}
