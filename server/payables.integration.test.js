const {test}=require('node:test');const assert=require('node:assert/strict');require('dotenv').config();const jwt=require('jsonwebtoken');
test('payables statements, metadata, concurrent partial payments, protections and reversals',{skip:process.env.CRM_INTEGRATION!=='1'},async()=>{
  assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname));
  const {app,prisma}=require('./server');const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const prefix='ap_test_'+Date.now();let user,vendor;const ids=[];
  try{
    user=await prisma.user.create({data:{name:prefix,username:prefix,role:'ADMIN',passwordHash:'test-only'}});vendor=await prisma.vendor.create({data:{name:prefix}});
    const base=`http://127.0.0.1:${server.address().port}/api`,token=jwt.sign({userId:user.id},process.env.JWT_SECRET,{expiresIn:'5m'});
    const request=async(path,method='GET',body)=>{const res=await fetch(base+path,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:res.status,...await res.json()};};
    const api=async(path,method,body,expected=200)=>{const r=await request(path,method,body);assert.equal(r.status,expected,JSON.stringify(r));return r.data;};
    assert.equal((await fetch(base+'/payables')).status,401);
    for(let n=0;n<2;n++){const b=await prisma.purchase.create({data:{purchaseNo:prefix+'-'+n,purchaseDate:new Date('2026-10-01'),vendorId:vendor.id,subtotal:100,grandTotal:100,dueAmount:100}});ids.push(b.id);}
    await api('/payables/bills/'+ids[0],'PUT',{vendorBillNo:prefix,dueDate:'2026-10-03'});
    await api('/payables/bills/'+ids[1],'PUT',{vendorBillNo:prefix,dueDate:'2026-10-03'},409);
    const payment={amount:60,paymentDate:'2026-10-03',paymentMethod:'BANK',referenceNo:'test-reference'};
    const concurrent=await Promise.all([request(`/purchases/${ids[0]}/payments`,'POST',payment),request(`/purchases/${ids[0]}/payments`,'POST',payment)]);
    assert.equal(concurrent.filter(r=>r.status===201).length,1,JSON.stringify(concurrent));
    assert.ok(concurrent.some(r=>[400,409].includes(r.status)));
    const paid=concurrent.find(r=>r.status===201).data;
    assert.equal(await prisma.transaction.count({where:{vendorId:vendor.id,source:'PURCHASE_PAYMENT'}}),1);
    await api('/expenses/'+paid.transaction.id,'DELETE',undefined,409);
    await api('/transactions/'+paid.transaction.id,'PUT',{amount:1},409);
    await api('/purchases/'+ids[0],'DELETE',undefined,409);
    await api('/purchases/'+ids[0],'PUT',{},409);
    let statement=(await api('/payables')).find(v=>v.id===vendor.id);assert.equal(statement.totalPurchase,200);assert.equal(statement.totalPaid,60);assert.equal(statement.totalDue,140);assert.equal(statement.lastPayment.referenceNo,'test-reference');
    await api(`/purchases/${ids[0]}/payments`,'POST',{...payment,amount:41},400);
    await api('/payables/payments/'+paid.payment.id,'DELETE');
    assert.equal(await prisma.transaction.count({where:{vendorId:vendor.id}}),0);
    const full=await api(`/purchases/${ids[0]}/payments`,'POST',{...payment,amount:100},201);assert.equal(full.updatedPurchase.paymentStatus,'PAID');
    const historical=await prisma.purchasePayment.create({data:{purchaseId:ids[1],paymentDate:new Date('2026-10-02'),amount:10}});
    await api('/payables/payments/'+historical.id,'DELETE',undefined,409);
    statement=(await api('/payables')).find(v=>v.id===vendor.id);assert.equal(statement.totalPaid,110);assert.equal(statement.totalDue,90);assert.equal(statement.outstandingBills,1);
  }finally{
    if(ids.length){await prisma.purchasePayment.deleteMany({where:{purchaseId:{in:ids}}});await prisma.purchase.deleteMany({where:{id:{in:ids}}});}
    if(vendor){await prisma.transaction.deleteMany({where:{vendorId:vendor.id}});await prisma.vendor.delete({where:{id:vendor.id}});}
    if(user)await prisma.user.delete({where:{id:user.id}});await new Promise(r=>server.close(r));await prisma.$disconnect();
  }
});
