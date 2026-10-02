const {test}=require('node:test');
const assert=require('node:assert/strict');
require('dotenv').config();
const jwt=require('jsonwebtoken');
test('quotation API: pricing, milestones, SENT decision, revision snapshot and project linkage', {skip:process.env.CRM_INTEGRATION!=='1'},async()=>{
  assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname));
  const {app,prisma}=require('./server');
  const server=app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  const prefix='quote_test_'+Date.now();
  let user,customer,projectId; const ids=[];
  try {
    user=await prisma.user.create({data:{name:prefix,username:prefix,passwordHash:'test-only'}});
    customer=await prisma.customer.create({data:{name:prefix}});
    const base=`http://127.0.0.1:${server.address().port}/api`;
    const token=jwt.sign({userId:user.id},process.env.JWT_SECRET,{expiresIn:'5m'});
    const api=async(path,method='GET',body,expected=200)=>{
      const response=await fetch(base+path,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
      const result=await response.json();assert.equal(response.status,expected,JSON.stringify(result));return result.data;
    };
    assert.equal((await fetch(base+'/quotations')).status,401);
    await api('/quotations','POST',{quotationNo:prefix,customerId:customer.id,quotationDate:'2026-10-03',status:'ACCEPTED'},400);
    const quote=await api('/quotations','POST',{quotationNo:prefix,customerId:customer.id,quotationDate:'2026-10-03'},201);ids.push(quote.id);
    await api(`/quotations/${quote.id}/status`,'PATCH',{status:'SENT'},400);
    const item=await api(`/quotations/${quote.id}/items`,'POST',{description:'Design',category:'DESIGN',pricingType:'UNIT_PRICE',quantity:2,unit:'job',unitPrice:500},201);
    await api(`/quotations/${quote.id}/items`,'POST',{description:'Labour',category:'LABOUR',pricingType:'FIXED_AMOUNT',lineTotal:200},201);
    await api(`/quotations/${quote.id}`,'PUT',{discountType:'PERCENT',discountValue:10,taxType:'PERCENT',taxRate:5});
    let detail=await api(`/quotations/${quote.id}`);
    assert.equal(Number(detail.grandTotal),1134);
    await api(`/quotations/${quote.id}`,'PUT',{discountValue:101},400);
    assert.equal(Number((await api(`/quotations/${quote.id}`)).discountValue),10);
    await api(`/quotations/${quote.id}/payment-milestones`,'POST',{milestoneNo:1,title:'Full',percentage:100,amount:1134,sortOrder:1},201);
    await api(`/quotations/${quote.id}/status`,'PATCH',{status:'SENT'});
    await api(`/quotation-items/${item.id}`,'PUT',{description:'Locked',pricingType:'FIXED_AMOUNT',lineTotal:500},400);
    const rev=await api(`/quotations/${quote.id}/revisions`,'POST',{},201);ids.push(rev.id);
    await api(`/quotations/${quote.id}/status`,'PATCH',{status:'ACCEPTED'},409);
    await api(`/quotations/${quote.id}/revisions`,'POST',{},400);
    detail=await api(`/quotations/${rev.id}`);
    assert.equal(detail.revisionNo,2);
    assert.equal(detail.items.length,2);
    assert.equal(detail.items[0].category,'DESIGN');
    assert.equal(Number(detail.paymentMilestones[0].amount),1134);
    assert.equal(detail.revisionHistory.length,2);
    await api(`/quotations/${rev.id}/status`,'PATCH',{status:'SENT'});
    await api(`/quotations/${rev.id}/status`,'PATCH',{status:'ACCEPTED'});
    projectId=(await api(`/quotations/${rev.id}/project`,'POST',{name:prefix},201)).id;
    assert.equal(Number((await prisma.project.findUnique({where:{id:projectId}})).contractValue),1134);
    await api(`/quotations/${rev.id}/status`,'PATCH',{status:'DRAFT'},400);
    const reject=await api('/quotations','POST',{quotationNo:prefix+'-reject',customerId:customer.id,quotationDate:'2026-10-03'},201);ids.push(reject.id);
    await api(`/quotations/${reject.id}/status`,'PATCH',{status:'REJECTED'});
  } finally {
    for(const id of ids.reverse()) await prisma.quotation.delete({where:{id}});
    if(projectId) await prisma.project.delete({where:{id:projectId}});
    if(customer) await prisma.customer.delete({where:{id:customer.id}});
    if(user) await prisma.user.delete({where:{id:user.id}});
    await new Promise(resolve=>server.close(resolve));await prisma.$disconnect();
  }
});
