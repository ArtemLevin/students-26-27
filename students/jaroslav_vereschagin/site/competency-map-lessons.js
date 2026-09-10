// Подтверждённые занятия, добавленные после базовой генерации каталога.
(function () {
  'use strict';

  const data = window.JAROSLAV_OGE_PROGRAM;
  if (!data) return;

  data.updated = '10.09.2026';
  data.confirmedLessons = Array.isArray(data.confirmedLessons) ? data.confirmedLessons : [];

  const lessons = [
    {
      date: '07.09.26',
      title: 'Квадратные корни и преобразование выражений',
      href: '07.09.26.html',
      note: 'На занятии разобраны определение и свойства квадратного корня, преобразования выражений, степени, точное и приближённое сравнение чисел, сокращение и оценка. Базовый уровень подтверждённых навыков — 2 («пройдена с опорой»).',
      topicIds: [
        'oge_6_1_3',
        'oge_6_2_3',
        'oge_7_2_1',
        'oge_7_2_3',
        'oge_8_1_2',
        'oge_8_1_3',
        'oge_8_2_1',
        'oge_8_2_2',
        'oge_8_2_3',
        'oge_8_3_2',
        'oge_8_3_3'
      ]
    },
    {
      date: '10.09.26',
      title: 'Степени, квадратные корни, ФСУ и модуль',
      href: '10.09.26.html',
      note: 'Комплексное повторение: свойства степеней, нулевые и отрицательные показатели, преобразование квадратных корней, полный квадрат, связь √(U²)=|U|, раскрытие модуля по знаку выражения и сохранение исходных ограничений ОДЗ. Базовый уровень подтверждённых навыков — 2 («пройдена с опорой»).',
      topicIds: [
        'oge_7_1_2',
        'oge_7_2_2',
        'oge_8_1_1',
        'oge_8_1_2',
        'oge_8_1_3',
        'oge_8_2_1',
        'oge_8_2_2',
        'oge_8_2_3',
        'oge_8_3_1',
        'oge_8_3_2',
        'oge_8_3_3'
      ]
    }
  ];

  for (const lesson of lessons) {
    const existingIndex = data.confirmedLessons.findIndex((item) => item.date === lesson.date);
    if (existingIndex >= 0) data.confirmedLessons[existingIndex] = lesson;
    else data.confirmedLessons.push(lesson);
  }
})();
