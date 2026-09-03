export const EGE_PROFILE_2027_CATALOG_VERSION='project-2027-2026-08-28';

const TITLES={
  1:'Планиметрия',
  2:'Векторы',
  3:'Стереометрия',
  4:'Вероятность случайного события',
  5:'Теория вероятностей и комбинаторика',
  6:'Случайные величины и распределения',
  7:'Уравнения, неравенства и системы',
  8:'Преобразование выражений',
  9:'Функции и начала анализа',
  10:'Прикладная задача',
  11:'Текстовая задача',
  12:'Функции и графики',
  13:'Прикладная и финансовая задача',
  14:'Уравнение с развёрнутым решением',
  15:'Стереометрия с развёрнутым решением',
  16:'Неравенство с развёрнутым решением',
  17:'Математическое моделирование',
  18:'Планиметрия с развёрнутым решением',
  19:'Задача с параметром',
  20:'Теория чисел'
};

function cloneItem(item,examNumber){
  return {...item,exam:`№ ${examNumber}`};
}

function retargetGroup(group,examNumber,{title=TITLES[examNumber],items=group?.items||[]}={}){
  if(!group)throw new Error(`Missing source group for EGE-2027 task ${examNumber}`);
  return {
    ...group,
    short:`№${examNumber}`,
    title:`Задание № ${examNumber}. ${title}`,
    subtitle:`профильный ЕГЭ 2027 · задание № ${examNumber}`,
    egeCatalogVersion:EGE_PROFILE_2027_CATALOG_VERSION,
    items:items.map(item=>cloneItem(item,examNumber))
  };
}

function newItem(id,title,examNumber,catalog,description,practice){
  return {
    id,
    title,
    level:0,
    exam:`№ ${examNumber}`,
    catalog,
    description,
    practice,
    evidence:'Новая линия проекта ЕГЭ-2027; диагностика пока не проводилась.',
    link:'index.html#lessons'
  };
}

function randomVariablesGroup(){
  const n=6;
  return {
    id:'task_6_2027',
    short:'№6',
    title:'Задание № 6. Случайные величины и распределения',
    subtitle:'профильный ЕГЭ 2027 · новая линия · краткий ответ',
    egeCatalogVersion:EGE_PROFILE_2027_CATALOG_VERSION,
    items:[
      newItem('ege2027_t6_random_variable','Случайная величина и её значения',n,'Случайная величина','Выделять случайную величину в условии, перечислять её возможные значения и связывать их с исходами случайного эксперимента.','Определить эксперимент и случайную величину; выписать возможные значения; проверить, что учтены все исходы.'),
      newItem('ege2027_t6_distribution','Распределение вероятностей',n,'Распределение вероятностей','Читать и составлять таблицу распределения дискретной случайной величины, контролируя неотрицательность вероятностей и их сумму, равную 1.','Сопоставить значения и вероятности; проверить сумму вероятностей; восстановить пропущенную вероятность при необходимости.'),
      newItem('ege2027_t6_expectation','Математическое ожидание',n,'Математическое ожидание','Вычислять математическое ожидание дискретной случайной величины как взвешенную сумму её значений.','Записать E(X)=Σxᵢpᵢ; аккуратно вычислить произведения; проверить размерность и правдоподобие результата.'),
      newItem('ege2027_t6_variance','Дисперсия',n,'Дисперсия случайной величины','Вычислять дисперсию по распределению и использовать связь D(X)=E(X²)−E(X)².','Найти E(X) и E(X²); применить формулу дисперсии; проверить D(X)≥0.'),
      newItem('ege2027_t6_stddev','Стандартное отклонение',n,'Стандартное отклонение','Находить стандартное отклонение как квадратный корень из дисперсии и интерпретировать его как меру разброса.','Найти дисперсию; взять неотрицательный корень; сравнить разброс при необходимости.'),
      newItem('ege2027_t6_distributions','Типовые распределения',n,'Равномерное, показательное и нормальное распределения','Распознавать основные свойства равномерного, показательного и нормального распределений в пределах требований спецификации.','Определить тип модели; использовать заданные свойства или параметры; не подменять непрерывную модель дискретной без основания.')
    ]
  };
}

function modelingGroup(){
  const n=17;
  return {
    id:'task_17_2027',
    short:'№17',
    title:'Задание № 17. Математическое моделирование',
    subtitle:'профильный ЕГЭ 2027 · новая линия · развёрнутый ответ',
    egeCatalogVersion:EGE_PROFILE_2027_CATALOG_VERSION,
    items:[
      newItem('ege2027_t17_variables','Переменные и параметры модели',n,'Построение математической модели','Выбирать величины, переменные и параметры, которые описывают реальную ситуацию, и фиксировать их смысл и единицы измерения.','Ввести обозначения; записать единицы и ограничения; отделить данные от искомых величин.'),
      newItem('ege2027_t17_relations','Связи между величинами',n,'Выражения, уравнения, неравенства и системы','Переводить условия задачи в математические связи: выражения, уравнения, неравенства или системы.','Для каждого существенного условия записать математическое соотношение; проверить, что модель использует все данные.'),
      newItem('ege2027_t17_constraints','Ограничения и область допустимых значений',n,'Ограничения реальной модели','Учитывать физические, геометрические, финансовые и иные смысловые ограничения на переменные.','Выписать ОДЗ и смысловые ограничения; исключить невозможные значения до или после решения модели.'),
      newItem('ege2027_t17_analysis','Исследование модели',n,'Алгебра и начала математического анализа','Исследовать построенную модель средствами алгебры и начал анализа: преобразовывать выражения, решать уравнения и неравенства, анализировать функции.','Выбрать адекватный математический аппарат; обосновать переходы; контролировать эквивалентность преобразований.'),
      newItem('ege2027_t17_optimization','Оптимизация',n,'Наибольшее и наименьшее значение в прикладной модели','Находить оптимальное значение величины в реальной задаче, в том числе с помощью производной и анализа функции.','Задать целевую функцию и допустимый промежуток; найти критические точки и границы; сравнить значения.'),
      newItem('ege2027_t17_interpretation','Интерпретация результата',n,'Интерпретация математической модели','Возвращать математический результат к исходной ситуации, проверять единицы, ограничения и содержательный смысл ответа.','Отобрать допустимый результат; вернуть единицы; сформулировать ответ словами и проверить его реалистичность.')
    ]
  };
}

function findTaskGroups(groups){
  const map=new Map();
  for(const group of groups||[]){
    const match=/^task_(\d+)$/.exec(String(group?.id||''));
    if(match)map.set(Number(match[1]),group);
  }
  return map;
}

export function transformEgeProfile2027Catalog(groups){
  if(!Array.isArray(groups))throw new TypeError('EGE profile catalog must be an array');
  if(groups.some(group=>group?.id==='task_6_2027')&&groups.some(group=>group?.id==='task_17_2027')){
    return groups.map(group=>({...group,items:(group.items||[]).map(item=>({...item}))}));
  }

  const old=findTaskGroups(groups);
  for(let task=1;task<=19;task+=1){
    if(!old.has(task))throw new Error(`EGE-2026 source catalog is missing task_${task}`);
  }

  const mergedAnalysisItems=[...(old.get(8).items||[]),...(old.get(12).items||[])];
  const transformed=[
    retargetGroup(old.get(1),1),
    retargetGroup(old.get(2),2),
    retargetGroup(old.get(3),3),
    retargetGroup(old.get(4),4),
    retargetGroup(old.get(5),5),
    randomVariablesGroup(),
    retargetGroup(old.get(6),7),
    retargetGroup(old.get(7),8),
    retargetGroup(old.get(8),9,{items:mergedAnalysisItems}),
    retargetGroup(old.get(9),10),
    retargetGroup(old.get(10),11),
    retargetGroup(old.get(11),12),
    retargetGroup(old.get(16),13),
    retargetGroup(old.get(13),14),
    retargetGroup(old.get(14),15),
    retargetGroup(old.get(15),16),
    modelingGroup(),
    retargetGroup(old.get(17),18),
    retargetGroup(old.get(18),19),
    retargetGroup(old.get(19),20)
  ];

  const ids=new Set();
  for(const group of transformed){
    for(const item of group.items||[]){
      if(ids.has(item.id))throw new Error(`Duplicate competency id after EGE-2027 migration: ${item.id}`);
      ids.add(item.id);
    }
  }
  return transformed;
}

function flatten(groups){
  return groups.flatMap(group=>(group.items||[]).map((item,index)=>({...item,ring:index+1,groupId:group.id,groupTitle:group.title,groupShort:group.short})));
}

export function upgradeEgeProfile2027Controller(controller){
  if(!controller||controller.__egeProfile2027Applied)return controller;
  const groups=transformEgeProfile2027Catalog(controller.groups||[]);
  controller.groups=groups;
  controller.items=flatten(groups);
  if(controller.state?.studentLevels&&typeof controller.state.studentLevels==='object'){
    for(const item of controller.items){
      if(!Object.prototype.hasOwnProperty.call(controller.state.studentLevels,item.id))controller.state.studentLevels[item.id]=Number(item.level||0);
    }
  }
  controller.__egeProfile2027Applied=true;
  if(typeof controller.save==='function')controller.save();
  if(typeof controller.render==='function')controller.render();
  return controller;
}

export function installEgeProfile2027ControllerHook(globalName='__studentCompetenceMap',target=globalThis){
  if(!target)return null;
  const hookKey=`__ege2027Hook_${globalName}`;
  if(target[hookKey]){
    const existing=target[globalName];
    if(existing)upgradeEgeProfile2027Controller(existing);
    return target[hookKey];
  }
  let current=target[globalName];
  const descriptor=Object.getOwnPropertyDescriptor(target,globalName);
  if(descriptor&&!descriptor.configurable){
    if(current)upgradeEgeProfile2027Controller(current);
    return null;
  }
  Object.defineProperty(target,globalName,{
    configurable:true,
    enumerable:descriptor?.enumerable??true,
    get(){return current;},
    set(value){current=value;if(value)upgradeEgeProfile2027Controller(value);}
  });
  const hook={globalName,version:EGE_PROFILE_2027_CATALOG_VERSION};
  target[hookKey]=hook;
  if(current)upgradeEgeProfile2027Controller(current);
  return hook;
}
