const test=require('node:test'),assert=require('node:assert/strict');
const {reconcile}=require('./reconcile');
test('reconciliation distinguishes missing payment history from valid ledgers without mutating inputs',()=>{
 const good={id:1,projectId:2,vendorId:3,grandTotal:100,subtotal:100,discount:0,transportCost:0,paidAmount:20,dueAmount:80,paymentStatus:'PARTIAL',items:[{total:100}],payments:[{id:1,amount:20,transactionId:4,transaction:{type:'EXPENSE',source:'PURCHASE_PAYMENT',amount:20,projectId:2,vendorId:3}}]};
 const input={purchases:[good,{...good,id:2,payments:[]}]},before=JSON.stringify(input);
 assert.deepEqual(reconcile(input).findings,[{code:'PURCHASE_PAYMENT_HISTORY_MISMATCH',id:2,storedPaid:20,historyPaid:0,storedDue:80,historyDue:100}]);assert.equal(JSON.stringify(input),before);
});
test('reconciliation reports invoice, payroll, overhead and chronological stock gaps',()=>{
 const r=reconcile({invoices:[{id:1,projectId:1,status:'ISSUED',amount:10,payments:[{id:1,amount:11,transaction:{type:'INCOME',amount:11,projectId:2}}]}],payroll:[{id:1,amount:10,payments:[],advanceAllocations:[{amount:11}]}],overheads:[{id:1,type:'EXPENSE',source:'MANUAL',amount:5,overheadAllocations:[{amount:6}]}],movements:[{id:1,materialId:1,unit:'pcs',movementDate:'2026-01-01',movementType:'PROJECT_USAGE',quantity:12,projectId:4},{id:2,materialId:1,unit:'pcs',movementDate:'2026-01-02',movementType:'PURCHASE',quantity:20}]});
 assert.deepEqual(r.findings.map(f=>f.code),['INVOICE_OVERPAYMENT','INVOICE_RECEIPT_MISMATCH','PAYROLL_OVERSETTLED','OVERHEAD_ALLOCATION_MISMATCH','STOCK_BEFORE_RECEIPT']);assert.equal(r.findings.at(-1).available,0);
});
