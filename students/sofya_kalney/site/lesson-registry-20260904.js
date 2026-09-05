import {LESSONS as BASE_LESSONS,RECENT_LIMIT,ARCHIVE_PAGE_SIZE} from './lesson-registry.js?v=20260828-1';
export {RECENT_LIMIT,ARCHIVE_PAGE_SIZE};
export const LESSONS=[
  {
    date:'2026-09-04',
    href:'04.09.26.html',
    title:'Планиметрия повышенной сложности: четырёхугольники',
    navTitle:'Четырёхугольники и прямоугольные треугольники',
    navSubtitle:'подобие, биссектрисы, ромб и площади',
    summary:'Стратегия сложной планиметрии: прямоугольные треугольники, подобие по двум углам, тангенс, биссектрисы в параллелограмме, свойства ромба, высоты и площади.',
    topics:['прямоугольный треугольник','подобие','параллелограмм','биссектрисы','ромб','площади'],
    outcomes:[
      {competencyId:'oge_17_1_2',label:'Свойства диагоналей ромба',level:2,tone:'process'},
      {competencyId:'oge_17_3_3',label:'Параллелограмм: длины и отношения',level:2,tone:'process'},
      {competencyId:'oge_24_3_4',label:'Полная геометрическая аргументация',level:2,tone:'process'}
    ],
    materials:{tex:'../tex_docs/04.09.26.tex'}
  },
  ...BASE_LESSONS
];
