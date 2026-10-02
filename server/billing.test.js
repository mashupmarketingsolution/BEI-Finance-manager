const {test}=require('node:test');
const assert=require('node:assert/strict');
const {cents,dateOf,present}=require('./billing');
test('billing rejects invalid money and impossible dates',()=>{
  for(const value of [0,-1,'1.001','NaN',true,'',Infinity]) assert.throws(()=>cents(value));
  assert.equal(cents('303600.01'),30360001);
  assert.throws(()=>dateOf('2026-02-30'));assert.throws(()=>dateOf('bad'));
  assert.equal(dateOf('2026-10-03').toISOString().slice(0,10),'2026-10-03');
});
test('invoice partial/paid/void amounts are exact to cents',()=>{
  const invoice={status:'ISSUED',amount:'100.10',dueDate:new Date('2020-01-01'),payments:[{amount:'30.05'}]};
  assert.equal(present(invoice).dueAmount,70.05);assert.equal(present(invoice).paymentStatus,'PARTIAL');assert.equal(present(invoice).overdue,true);
  invoice.payments.push({amount:'70.05'});assert.equal(present(invoice).paymentStatus,'PAID');assert.equal(present(invoice).overdue,false);
  invoice.status='VOID';assert.equal(present(invoice).dueAmount,0);
});
