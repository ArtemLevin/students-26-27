import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EGE_PROFILE_2027_CATALOG_VERSION,
  transformEgeProfile2027Catalog,
  upgradeEgeProfile2027Controller
} from '../../student-dashboard/ege-profile-2027.js';

function sourceCatalog(){
  return Array.from({length:19},(_,index)=>{
    const number=index+1;
    return {
      id:`task_${number}`,
      short:`№${number}`,
      title:`Старая линия ${number}`,
      subtitle:`ЕГЭ-2026 · № ${number}`,
      items:[{
        id:`t${number}_sample`,
        title:`Навык ${number}`,
        level:number===16?3:0,
        exam:`№ ${number}`,
        catalog:`Линия ${number}`,
        description:`Описание ${number}`,
        practice:`Практика ${number}`
      }]
    };
  });
}

test('EGE-2027 catalog has 20 lines with the new numbering and preserved IDs',()=>{
  const next=transformEgeProfile2027Catalog(sourceCatalog());
  assert.equal(next.length,20);
  assert.deepEqual(next.map(group=>group.short),Array.from({length:20},(_,index)=>`№${index+1}`));
  assert.ok(next.every(group=>group.egeCatalogVersion===EGE_PROFILE_2027_CATALOG_VERSION));

  assert.deepEqual(next[8].items.map(item=>item.id),['t8_sample','t12_sample']);
  assert.equal(next[12].items[0].id,'t16_sample');
  assert.equal(next[13].items[0].id,'t13_sample');
  assert.equal(next[14].items[0].id,'t14_sample');
  assert.equal(next[15].items[0].id,'t15_sample');
  assert.equal(next[17].items[0].id,'t17_sample');
  assert.equal(next[18].items[0].id,'t18_sample');
  assert.equal(next[19].items[0].id,'t19_sample');

  const ids=next.flatMap(group=>group.items.map(item=>item.id));
  assert.equal(new Set(ids).size,ids.length);
  assert.ok(ids.includes('ege2027_t6_expectation'));
  assert.ok(ids.includes('ege2027_t6_variance'));
  assert.ok(ids.includes('ege2027_t17_optimization'));
  assert.ok(ids.includes('ege2027_t17_interpretation'));
});

test('new EGE-2027 lines start at level zero and learner state survives migration',()=>{
  const controller={
    groups:sourceCatalog(),
    state:{studentLevels:{t16_sample:4,t13_sample:2}},
    saveCalls:0,
    renderCalls:0,
    save(){this.saveCalls+=1;},
    render(){this.renderCalls+=1;}
  };

  upgradeEgeProfile2027Controller(controller);
  assert.equal(controller.groups.length,20);
  assert.equal(controller.state.studentLevels.t16_sample,4);
  assert.equal(controller.state.studentLevels.t13_sample,2);
  assert.equal(controller.state.studentLevels.ege2027_t6_expectation,0);
  assert.equal(controller.state.studentLevels.ege2027_t17_variables,0);
  assert.equal(controller.saveCalls,1);
  assert.equal(controller.renderCalls,1);

  upgradeEgeProfile2027Controller(controller);
  assert.equal(controller.saveCalls,1);
  assert.equal(controller.renderCalls,1);
});
