const {test}=require('node:test');
const assert=require('node:assert/strict');
const {validateFinalization,transitions}=require('./quotation-workflow');
test('finalization requires items, positive total and complete payment schedule',()=>{
  assert.ok(validateFinalization([],[],0));
  assert.ok(validateFinalization([{}],[{percentage:100,amount:0}],0));
  assert.ok(validateFinalization([{}],[{percentage:50,amount:100}],100));
  assert.ok(validateFinalization([{}],[{percentage:100,amount:99.99}],100));
  assert.equal(validateFinalization([{}],[{percentage:50,amount:50},{percentage:50,amount:50}],100),null);
  assert.deepEqual(transitions.SENT,['ACCEPTED','REJECTED','EXPIRED','CANCELLED']);
});
test('milestone autofill handles percentages, rounding and cleared input',async()=>{
  const {milestoneAmount}=await import('../client/src/quotation-utils.js');
  assert.equal(milestoneAmount(303600,100),'303600.00');
  assert.equal(milestoneAmount(303600,25),'75900.00');
  assert.equal(milestoneAmount(100.01,50),'50.01');
  assert.equal(milestoneAmount(100,''),'');
  assert.equal(milestoneAmount(100,101),'');
});
