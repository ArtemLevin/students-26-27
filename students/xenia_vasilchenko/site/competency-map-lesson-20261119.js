(() => {
  'use strict';
  const data=window.COMPETENCY_MAP_DATA;
  if(!data||!Array.isArray(data.groups))return;
  const byId=new Map(data.groups.flatMap(group=>(group.items||[]).map(item=>[item.id,item])));
  const sources=[
    ['frac_base_01','divide','Разбирали смысл отношения и одной доли на примерах деления числа в отношении.'],
    ['frac_ops_14','divide','Находили две части числа через сумму коэффициентов отношения.'],
    ['frac_ops_16','several','Разбивали число на три части в отношении 1:2:3.'],
    ['dec_14','unknown','Находили неизвестный член пропорции с десятичными дробями.'],
    ['word_02','unknown','Составляли уравнение для неизвестного среднего члена.'],
    ['dec_04','percent','Составляли пропорцию 8,4:24=x:100 и находили 35%.'],
    ['word_17','percent','В задаче о световом дне соотносили часть, целое и процент.'],
    ['word_16','pitfalls','Проверяли разумность и равносильность вычислений; отработали ограничения.']
  ];
  for(const [id,anchor,description] of sources){
    const item=byId.get(id);
    if(!item)continue;
    item.evidence={
      date:'19.11.26',
      text:description+' Практика проходила с преподавателем; повышение уровня освоения не подтверждено.',
      href:'19.11.26.html#'+anchor,
      texHref:'../tex_docs/19.11.26.tex'
    };
  }
  data.meta.updated='19.11.2026';
  data.meta.sourceNote='Добавлено занятие 19.11.26 об отношениях, пропорциях и процентах. Подтверждённые уровни освоения сохранены.';
  data.meta.material={title:'Отношения, пропорции и проценты',date:'19.11.26',pdf:'../pdf_docs/19.11.26.pdf'};
})();
