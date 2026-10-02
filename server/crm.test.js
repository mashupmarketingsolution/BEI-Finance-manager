const {test} = require('node:test');
const assert = require('node:assert/strict');
const {validateContact, customerFinancials} = require('./crm');

test('reject malformed contact data before database access', () => {
  for (const body of [{name:12},{phone:{}},{email:'bad'},{name:'x'.repeat(151)},{source:'unknown'}]) {
    assert.ok(validateContact(body));
  }
  assert.equal(validateContact({name:'Client',email:'client@example.com',source:'REFERRAL',phone:null}),null);
});

test('receipts exclude expenses and credits do not erase another project outstanding', () => {
  const result = customerFinancials([
    {name:'A',contractValue:'100.10',transactions:[{id:1,type:'INCOME',amount:'120.20',transactionDate:'2026-10-01'},{id:3,type:'EXPENSE',amount:'500'}]},
    {name:'B',contractValue:'50.20',transactions:[{id:2,type:'INCOME',amount:'10.10',transactionDate:'2026-10-02'}]},
  ]);
  assert.equal(result.contractValue,150.30);
  assert.equal(result.received,130.30);
  assert.equal(result.outstanding,40.10);
  assert.equal(result.credit,20.10);
  assert.deepEqual(result.payments.map(p=>p.id),[2,1]);
  assert.equal(result.payments[0].projectName,'B');
});

test('empty client has zero financial totals', () => {
  assert.deepEqual(customerFinancials([]),{contractValue:0,received:0,outstanding:0,credit:0,payments:[]});
});
