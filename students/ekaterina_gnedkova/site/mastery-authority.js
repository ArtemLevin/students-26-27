(() => {
  'use strict';

  const data=window.COMPETENCY_MAP_DATA;
  if(!data||!Array.isArray(data.groups)){
    throw new Error('Ekaterina mastery authority requires loaded competency catalog');
  }

  const levels={};
  for(const group of data.groups){
    if(!group||!Array.isArray(group.items))continue;
    for(const item of group.items){
      if(!item||typeof item.id!=='string'||!item.id){
        throw new Error('Ekaterina mastery authority found competency without stable id');
      }
      const level=Number(item.level);
      if(!Number.isInteger(level)||level<0||level>4){
        throw new Error('Ekaterina mastery authority found invalid level for '+item.id);
      }
      if(Object.prototype.hasOwnProperty.call(levels,item.id)){
        throw new Error('Ekaterina mastery authority found duplicate id: '+item.id);
      }
      levels[item.id]=level;
    }
  }

  window.STUDENT_MASTERY_AUTHORITY={
    version:1,
    basis:'Repository-authored baseline levels rendered by the competency map.',
    levels
  };
})();
