const {test}=require('node:test');const assert=require('node:assert/strict');const {billSummary}=require('./payables');
test('vendor balance uses payment history with exact cents and preserves historical credit',()=>{
  const bill={grandTotal:'100.10',dueDate:new Date('2020-01-01'),payments:[{amount:'30.05'}]};
  assert.equal(billSummary(bill).dueAmount,70.05);assert.equal(billSummary(bill).paymentStatus,'PARTIAL');assert.equal(billSummary(bill).overdue,true);
  bill.payments.push({amount:'70.05'});assert.equal(billSummary(bill).paymentStatus,'PAID');assert.equal(billSummary(bill).dueAmount,0);
  bill.payments.push({amount:'1'});assert.equal(billSummary(bill).creditAmount,1);
});
