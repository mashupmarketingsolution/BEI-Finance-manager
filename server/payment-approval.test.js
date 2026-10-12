const test=require('node:test'),assert=require('node:assert/strict');
const {allowed}=require('./access-control');
const {paymentInput}=require('./payment-approval');
test('vendor payment approval separates financial roles and validates money/date',()=>{
 assert.equal(allowed('ACCOUNTS','/payment-requests','POST'),true);
 assert.equal(allowed('ACCOUNTS','/payment-requests/1/approve','POST'),false);
 for(const role of ['PROJECT_MANAGER','PROCUREMENT_OFFICER','STOREKEEPER','SITE_SUPERVISOR','VIEWER'])assert.equal(allowed(role,'/payment-requests','GET'),false);
 assert.equal(allowed('ADMIN','/payment-requests/1/approve','POST'),true);
 for(const body of [{amount:0,paymentDate:'2026-01-01'},{amount:'1.001',paymentDate:'2026-01-01'},{amount:1,paymentDate:'2026-02-30'},{amount:1,paymentDate:'2026-01-01',paymentMethod:'UNKNOWN'}])assert.throws(()=>paymentInput(body));
});
test('local vendor requests need independent approval, exact posting and preserved reversal history',{skip:process.env.CRM_INTEGRATION!=='1'},async()=>{
 require('dotenv').config();assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname));const {app,prisma}=require('./server'),server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const prefix='payment_review_'+Date.now(),users=[];let vendor,bill,other;
 try{
  for(const role of ['ADMIN','ADMIN','ACCOUNTS','PROJECT_MANAGER'])users.push(await prisma.user.create({data:{name:prefix+users.length,username:prefix+users.length,role,passwordHash:'test-only'}}));const [admin,reviewer,accounts,manager]=users;
  vendor=await prisma.vendor.create({data:{name:prefix}});for(let n=0;n<2;n++){const b=await prisma.purchase.create({data:{purchaseNo:prefix+n,purchaseDate:new Date('2026-01-01'),vendorId:vendor.id,subtotal:100,grandTotal:100,dueAmount:100}});if(n)other=b;else bill=b;}
  const tokens=Object.fromEntries(users.map(u=>[u.id,require('jsonwebtoken').sign({userId:u.id},process.env.JWT_SECRET,{expiresIn:'5m'})])),base='http://127.0.0.1:'+server.address().port+'/api/';
  const call=async(u,path,method='GET',body)=>{const r=await fetch(base+path,{method,headers:{Authorization:'Bearer '+tokens[u.id],'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,...await r.json()};};
  const details={amount:60,paymentDate:'2026-01-02',paymentMethod:'BANK',referenceNo:'REF-1',notes:'Vendor settlement'};
  const submit=async(u=accounts,purchaseId=bill.id,extra={})=>{const r=await call(u,'payment-requests','POST',{purchaseId,...details,...extra});assert.equal(r.status,201,JSON.stringify(r));return r.data;};
  const action=(u,r,a,notes)=>call(u,'payment-requests/'+r.id+'/'+a,'POST',{version:r.version,notes});
  const post=(u,r,extra={})=>call(u,'purchases/'+r.purchaseId+'/payments','POST',{approvalRequestId:r.id,version:r.version,amount:Number(r.amount),paymentDate:r.paymentDate.slice(0,10),paymentMethod:r.paymentMethod,referenceNo:r.referenceNo,notes:r.notes,...extra});
  assert.equal((await fetch(base+'payment-requests')).status,401);assert.equal((await call(manager,'payment-requests')).status,403);
  assert.equal((await call(accounts,'purchases/'+bill.id+'/payments','POST',details)).status,400);
  let own=await submit(admin);assert.equal((await action(admin,own,'approve')).status,403);assert.equal((await action(reviewer,own,'reject')).status,400);own=(await action(reviewer,own,'reject','Check reference')).data;assert.equal(own.state,'REJECTED');assert.equal((await post(admin,own)).status,409);
  let r=await submit();assert.equal(await prisma.purchasePayment.count({where:{purchaseId:bill.id}}),0);assert.equal(Number((await prisma.purchase.findUnique({where:{id:bill.id}})).paidAmount),0);
  assert.equal((await action(accounts,r,'approve')).status,403);assert.equal((await call(admin,'purchases/'+bill.id,'PUT',{})).status,409);assert.equal((await post(accounts,r)).status,409);
  const decisions=await Promise.all([action(admin,r,'approve'),action(reviewer,r,'approve')]);assert.equal(decisions.filter(x=>x.status===200).length,1);assert.equal(decisions.filter(x=>x.status===409).length,1);r=decisions.find(x=>x.status===200).data;
  assert.equal((await action(admin,{...r,version:1},'cancel','Stale')).status,409);
  for(const extra of [{amount:61},{paymentMethod:'CASH'},{paymentDate:'2026-01-03'},{referenceNo:'CHANGED'},{notes:'CHANGED'}])assert.equal((await post(accounts,r,extra)).status,409);
  assert.equal((await call(accounts,'purchases/'+other.id+'/payments','POST',{...details,approvalRequestId:r.id,version:r.version})).status,409);
  const posts=await Promise.all([post(accounts,r),post(admin,r)]);assert.equal(posts.filter(x=>x.status===201).length,1,JSON.stringify(posts));assert.equal(posts.filter(x=>x.status===409).length,1);const paid=posts.find(x=>x.status===201).data;assert.equal(Number(paid.updatedPurchase.paidAmount),60);assert.equal(Number(paid.updatedPurchase.dueAmount),40);assert.equal(await prisma.transaction.count({where:{vendorId:vendor.id,source:'PURCHASE_PAYMENT'}}),1);
  assert.equal((await call(accounts,'payables/payments/'+paid.payment.id,'DELETE',{notes:'Correction'})).status,403);assert.equal((await call(admin,'payables/payments/'+paid.payment.id,'DELETE',{})).status,400);assert.equal((await call(admin,'payables/payments/'+paid.payment.id,'DELETE',{notes:'Corrected receipt'})).status,200);
  const history=(await call(accounts,'payment-requests')).data.find(x=>x.id===r.id);assert.equal(history.state,'REVERSED');assert.deepEqual(history.events.map(e=>e.action),['SUBMIT','APPROVE','POST','REVERSE']);assert.equal(history.events[2].snapshot.transactionId,paid.transaction.id);assert.equal((await post(accounts,history)).status,409);assert.equal(await prisma.transaction.count({where:{vendorId:vendor.id,source:'PURCHASE_PAYMENT'}}),0);
  let cancelled=await submit();cancelled=(await action(accounts,cancelled,'cancel','Wrong date')).data;assert.equal(cancelled.state,'CANCELLED');assert.equal((await action(admin,cancelled,'approve')).status,409);
  let changed=await submit();await prisma.purchase.update({where:{id:bill.id},data:{grandTotal:101}});assert.equal((await action(admin,changed,'approve')).status,409);assert.equal((await action(accounts,changed,'cancel','Bill corrected')).status,200);await prisma.purchase.update({where:{id:bill.id},data:{grandTotal:100}});
  let staleBill=await submit();staleBill=(await action(admin,staleBill,'approve')).data;await prisma.purchase.update({where:{id:bill.id},data:{vendorBillNo:'Changed after approval'}});assert.equal((await post(accounts,staleBill)).status,409);assert.equal((await action(accounts,staleBill,'cancel','Supplier bill changed')).status,200);await prisma.purchase.update({where:{id:bill.id},data:{vendorBillNo:null}});
  let first=await submit(),second=await submit();first=(await action(admin,first,'approve')).data;second=(await action(admin,second,'approve')).data;assert.equal((await post(accounts,first)).status,201);assert.equal((await post(accounts,second)).status,400);
  assert.equal((await call(admin,'purchases/'+bill.id,'DELETE')).status,409);
  await prisma.user.update({where:{id:accounts.id},data:{role:'VIEWER'}});assert.equal((await call(accounts,'payment-requests')).status,403);
 }finally{
  if(bill||other){const ids=[bill?.id,other?.id].filter(Boolean);await prisma.vendorPaymentRequest.deleteMany({where:{purchaseId:{in:ids}}});await prisma.purchasePayment.deleteMany({where:{purchaseId:{in:ids}}});await prisma.purchase.deleteMany({where:{id:{in:ids}}});}if(vendor){await prisma.transaction.deleteMany({where:{vendorId:vendor.id}});await prisma.vendor.delete({where:{id:vendor.id}});}await prisma.user.deleteMany({where:{id:{in:users.map(u=>u.id)}}});await new Promise(r=>server.close(r));await prisma.$disconnect();
 }
});
