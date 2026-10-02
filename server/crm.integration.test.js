const {test} = require('node:test');
const assert = require('node:assert/strict');
require('dotenv').config();
const jwt = require('jsonwebtoken');

test('local CRM API: pipeline, conversion, quotation to project, receipts and linked deletion', {skip:process.env.CRM_INTEGRATION !== '1'}, async () => {
  assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname), 'Only run against local database');
  const {app,prisma} = require('./server');
  const server = app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  const prefix='crm_test_'+Date.now();
  let user, leadId, customerId, quotationId, projectId;
  try {
    user=await prisma.user.create({data:{name:prefix,username:prefix,passwordHash:'not-a-login-password'}});
    const token=jwt.sign({userId:user.id},process.env.JWT_SECRET,{expiresIn:'5m'});
    async function api(path,method='GET',body,expected=200) {
      const response=await fetch(`http://127.0.0.1:${server.address().port}/api${path}`,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
      const json=await response.json();
      assert.equal(response.status,expected,JSON.stringify(json)); return json;
    }
    assert.equal((await fetch(`http://127.0.0.1:${server.address().port}/api/customers`)).status,401);
    await api('/leads','POST',{name:12},400);
    leadId=(await api('/leads','POST',{name:prefix,source:'REFERRAL',assignedToId:user.id},201)).data.id;
    for(const status of ['CONTACTED','MEETING','SITE_VISIT','QUOTATION','NEGOTIATION','WON']) await api(`/leads/${leadId}`,'PUT',{status});
    assert.equal((await api(`/leads?search=${prefix}&status=WON`)).pagination.totalLeads,1);
    customerId=(await api(`/leads/${leadId}/convert`,'POST',{})).data.customer.id;
    await api(`/leads/${leadId}/convert`,'POST',{},400);
    await api(`/leads/${leadId}`,'PUT',{status:'NEW'},400);
    let customer=(await api(`/customers/${customerId}`)).data;
    assert.equal(customer.source,'REFERRAL');
    quotationId=(await api('/quotations','POST',{quotationNo:prefix,customerId,quotationDate:'2026-10-02',projectId:null},201)).data.id;
    await api(`/quotations/${quotationId}/project`,'POST',{name:prefix},400);
    // Seed line items and milestone; acceptance still exercises the application's validation.
    await prisma.quotationItem.create({data:{quotationId,description:'CRM test service',pricingType:'FIXED_AMOUNT',lineTotal:1000}});
    await prisma.quotationPaymentMilestone.create({data:{quotationId,milestoneNo:1,title:'Full payment',percentage:100,amount:1000}});
    await api(`/quotations/${quotationId}`,'PUT',{status:'ACCEPTED'});
    projectId=(await api(`/quotations/${quotationId}/project`,'POST',{name:prefix},201)).data.id;
    await api(`/quotations/${quotationId}/project`,'POST',{name:prefix+' duplicate'},409);
    await prisma.transaction.create({data:{projectId,type:'INCOME',amount:250,transactionDate:new Date()}});
    customer=(await api(`/customers/${customerId}`)).data;
    assert.equal(customer.financials.contractValue,1000);
    assert.equal(customer.financials.received,250);
    assert.equal(customer.financials.outstanding,750);
    assert.equal(customer.quotations[0].projectId,projectId);
    await api(`/customers/${customerId}`,'DELETE',undefined,400);
  } finally {
    if(projectId) await prisma.transaction.deleteMany({where:{projectId}});
    if(quotationId) await prisma.quotation.delete({where:{id:quotationId}});
    if(projectId) await prisma.project.delete({where:{id:projectId}});
    if(leadId) await prisma.lead.delete({where:{id:leadId}});
    if(customerId) await prisma.customer.delete({where:{id:customerId}});
    if(user) await prisma.user.delete({where:{id:user.id}});
    await new Promise(resolve=>server.close(resolve));
    await prisma.$disconnect();
  }
});
