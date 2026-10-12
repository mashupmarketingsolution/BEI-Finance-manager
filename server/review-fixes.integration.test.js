const {test}=require('node:test');
const assert=require('node:assert/strict');
require('dotenv').config();
test('review fixes: auth, project ownership, receive consistency, concurrent stock and cash totals',{skip:process.env.CRM_INTEGRATION!=='1'},async()=>{
  assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname));
  const {app,prisma}=require('./server');const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const base=`http://127.0.0.1:${server.address().port}/api`,key='review_test_'+Date.now();
  let user,reviewer,customer,project,vendor,material,purchase;
  try{
    for(const path of ['/projects','/income','/expenses','/purchases','/materials','/stock-movements','/dashboard','/transactions','/vendors','/boqs'])assert.equal((await fetch(base+path)).status,401,path);
    assert.equal((await fetch(base+'/projects/1',{method:'PUT',headers:{'Content-Type':'application/json'},body:'{}'})).status,401);
    user=await prisma.user.create({data:{name:key,username:key,role:'ADMIN',passwordHash:'test-only'}});
    reviewer=await prisma.user.create({data:{name:key+'_reviewer',username:key+'_reviewer',role:'ADMIN',passwordHash:'test-only'}});
    const token=require('jsonwebtoken').sign({userId:user.id},process.env.JWT_SECRET,{expiresIn:'5m'});
    const request=async(path,method='GET',body)=>{const r=await fetch(base+path,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,...await r.json()};};
    customer=await prisma.customer.create({data:{name:key}});
    project=await prisma.project.create({data:{name:key,customerId:customer.id}});
    let r=await request('/projects/'+project.id,'PUT',{notes:'changed'});assert.equal(r.status,200);assert.equal(r.data.customerId,customer.id);
    vendor=await prisma.vendor.create({data:{name:key}});material=await prisma.material.create({data:{name:key,code:key,unit:'pcs'}});
    purchase=await prisma.purchase.create({data:{purchaseNo:key,purchaseDate:new Date('2026-10-01'),vendorId:vendor.id,projectId:project.id,subtotal:100,grandTotal:100,items:{create:{materialId:material.id,quantity:10,unit:'pcs',unitPrice:10,total:100}}},include:{items:true}});
    const item={purchaseItemId:purchase.items[0].id,quantity:6};
    r=await request('/purchases/'+purchase.id+'/receive','POST',{receiveDate:'2026-10-11',items:[item,item]});assert.equal(r.status,400);assert.equal(await prisma.stockMovement.count({where:{materialId:material.id}}),0);
    const receives=await Promise.all([1,2].map(()=>request('/purchases/'+purchase.id+'/receive','POST',{receiveDate:'2026-10-11',items:[item]})));
    assert.equal(receives.filter(r=>r.status===200).length,1,JSON.stringify(receives));
    assert.equal(Number((await prisma.purchaseItem.findUnique({where:{id:item.purchaseItemId}})).receivedQuantity),6);
    const uses=await Promise.all([1,2].map(()=>request('/stock-movements/usage','POST',{materialId:material.id,projectId:project.id,quantity:4})));
    assert.equal(uses.filter(r=>r.status===201).length,1,JSON.stringify(uses));
    const returns=await Promise.all([1,2].map(()=>request('/stock-movements/return','POST',{materialId:material.id,projectId:project.id,quantity:3})));
    assert.equal(returns.filter(r=>r.status===201).length,1,JSON.stringify(returns));
    r=await request('/stock-movements/damage','POST',{materialId:material.id,quantity:6});assert.equal(r.status,400);
    r=await request('/stock-movements/adjustment','POST',{materialId:material.id,quantity:-6});assert.equal(r.status,400);
    r=await request('/stock-movements/adjustment','POST',{materialId:material.id,quantity:0.0001});assert.equal(r.status,400);
    r=await request('/stock-movements/usage','POST',{materialId:material.id,projectId:project.id,quantity:1,unit:'kg'});assert.equal(r.status,400);
    await prisma.transaction.createMany({data:[{type:'INCOME',source:'MANUAL',amount:200,projectId:project.id,transactionDate:new Date()},{type:'EXPENSE',source:'PURCHASE',amount:100,projectId:project.id,transactionDate:new Date()},{type:'EXPENSE',source:'MANUAL',amount:10,projectId:project.id,transactionDate:new Date()}]});
    const paymentBody={amount:40,paymentDate:'2026-10-11',paymentMethod:'CASH'};
    const submitted=await request('/payment-requests','POST',{purchaseId:purchase.id,...paymentBody});assert.equal(submitted.status,201);
    const approvalResponse=await fetch(base+'/payment-requests/'+submitted.data.id+'/approve',{method:'POST',headers:{Authorization:'Bearer '+require('jsonwebtoken').sign({userId:reviewer.id},process.env.JWT_SECRET,{expiresIn:'5m'}),'Content-Type':'application/json'},body:JSON.stringify({version:submitted.data.version})});assert.equal(approvalResponse.status,200);const approved=await approvalResponse.json();
    r=await request('/purchases/'+purchase.id+'/payments','POST',{...paymentBody,approvalRequestId:approved.data.id,version:approved.data.version});assert.equal(r.status,201);
    r=await request('/transactions?projectId='+project.id);assert.equal(r.status,200);assert.equal(r.summary.totalExpenses,50);assert.equal(r.summary.currentBalance,150);
    r=await request('/transactions?search='+key);assert.equal(r.status,200);
    r=await request('/dashboard');assert.equal(r.status,200);
    const incomes=await prisma.transaction.aggregate({where:{type:'INCOME'},_sum:{amount:true}});
    const expenses=await prisma.transaction.aggregate({where:{type:'EXPENSE',source:{notIn:['PURCHASE','PURCHASE_PAYMENT']}},_sum:{amount:true}});
    const payments=await prisma.purchasePayment.aggregate({_sum:{amount:true}});
    assert.ok(Math.abs(r.data.currentBalance-(Number(incomes._sum.amount)-Number(expenses._sum.amount)-Number(payments._sum.amount)))<0.001);
  }finally{
    if(material)await prisma.stockMovement.deleteMany({where:{materialId:material.id}});
    if(purchase){await prisma.vendorPaymentRequest.deleteMany({where:{purchaseId:purchase.id}});await prisma.purchasePayment.deleteMany({where:{purchaseId:purchase.id}});await prisma.purchase.delete({where:{id:purchase.id}});}
    if(project)await prisma.transaction.deleteMany({where:{projectId:project.id}});
    if(material)await prisma.material.delete({where:{id:material.id}});
    if(vendor)await prisma.vendor.delete({where:{id:vendor.id}});
    if(project)await prisma.project.delete({where:{id:project.id}});
    if(customer)await prisma.customer.delete({where:{id:customer.id}});
    if(user)await prisma.user.delete({where:{id:user.id}});
    if(reviewer)await prisma.user.delete({where:{id:reviewer.id}});
    await new Promise(r=>server.close(r));await prisma.$disconnect();
  }
});
