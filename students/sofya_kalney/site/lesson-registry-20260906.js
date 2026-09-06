import {LESSONS as BASE_LESSONS,RECENT_LIMIT,ARCHIVE_PAGE_SIZE} from './lesson-registry-20260904.js?v=20260904-1';
export {RECENT_LIMIT,ARCHIVE_PAGE_SIZE};
export const LESSONS=[
  {
    date:'2026-09-06',
    href:'06.09.26.html',
    title:'Рациональные неравенства, радикалы и графики с модулем',
    navTitle:'Неравенства, радикалы и модуль',
    navSubtitle:'метод интервалов, ОДЗ, движение и параметры',
    summary:'Метод интервалов с кратностями и запретом нулей знаменателя; ОДЗ при радикалах; модель движения; извлечение больших квадратных корней; кусочные графики с модулем и параметры y=m, y=kx.',
    topics:['метод интервалов','ОДЗ и радикалы','задачи на движение','квадратные корни','графики с модулем','параметры'],
    outcomes:[
      {competencyId:'oge_13_2_3',label:'Метод интервалов: знаки и кратности',level:2,tone:'process'},
      {competencyId:'oge_8_2_2',label:'Квадратные корни и преобразования',level:2,tone:'process'},
      {competencyId:'oge_22_3_5',label:'Параметр и число пересечений',level:3,tone:'confident'}
    ],
    materials:{tex:'../tex_docs/06.09.26.tex'}
  },
  ...BASE_LESSONS
];
