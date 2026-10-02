const {test}=require('node:test');
const assert=require('node:assert/strict');
require('dotenv').config();
const jwt=require('jsonwebtoken');
test('billing lifecycle, partial receipts, linking, overpayment rollback, guards and reversal',{skip:process.env.CRM_INTEGRATION!=='1'},async()=>{
  assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname));
  const {app,prisma}=require('./server');
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  const prefix='billing_test_'+Date.now();let user,customer,project;const ids=[];
  try {
    user=await prisma.user.create({data:{name:prefix,username:prefix,passwordHash:'test-only'}});
    customer=await prisma.customer.create({data:{name:prefix}});
    project=await prisma.project.create({data:{name:prefix,customerId:customer.id,contractValue:1000}});
    const base=`http://127.0.0.1:${server.address().port}/api`,token=jwt.sign({userId:user.id},process.env.JWT_SECRET,{expiresIn:'5m'});
    const api=async(path,method='GET',body,expected=200)=>{
      const res=await fetch(base+path,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const json=await res.json();assert.equal(res.status,expected,JSON.stringify(json));return json;
    };
    assert.equal((await fetch(base+'/billing/invoices')).status,401);
    const form={invoiceNo:prefix,projectId:project.id,amount:600,description:'Phase one',invoiceDate:'2026-10-01',dueDate:'2026-10-02'};
    await api('/billing/invoices','POST',{...form,dueDate:'2026-09-01'},400);
    const inv=(await api('/billing/invoices','POST',form,201)).data;ids.push(inv.id);
    await api(`/billing/invoices/${inv.id}/payments`,'POST',{amount:100,paymentDate:'2026-10-03',paymentMethod:'CASH'},400);
    await api(`/billing/invoices/${inv.id}/issue`,'POST',{});
    let paid=(await api(`/billing/invoices/${inv.id}/payments`,'POST',{amount:100,paymentDate:'2026-10-03',paymentMethod:'CASH'},201)).data;
    assert.equal(paid.dueAmount,500);assert.equal(paid.paymentStatus,'PARTIAL');
    const generated=paid.payments[0];
    await api(`/transactions/${generated.transactionId}`,'DELETE',undefined,409);
    await api(`/income/${generated.transactionId}`,'PUT',{amount:1},409);
    await api(`/projects/${project.id}`,'PUT',{name:prefix,contractValue:500},409);
    await api(`/billing/invoices/${inv.id}/void`,'POST',{},400);
    await api(`/billing/invoices/${inv.id}/payments`,'POST',{amount:501,paymentDate:'2026-10-03',paymentMethod:'CASH'},400);
    assert.equal(await prisma.transaction.count({where:{projectId:project.id}}),1,'rejected payment rolls back income');
    const legacy=await prisma.transaction.create({data:{projectId:project.id,type:'INCOME',amount:200,transactionDate:new Date('2026-10-03')}});
    paid=(await api(`/billing/invoices/${inv.id}/payments`,'POST',{transactionId:legacy.id},201)).data;
    assert.equal(paid.dueAmount,300);assert.equal(await prisma.transaction.count({where:{projectId:project.id}}),2);
    await api(`/billing/invoices/${inv.id}/payments`,'POST',{transactionId:legacy.id},400);
    const linked=paid.payments.find(p=>p.transactionId===legacy.id);
    const crm=(await api(`/customers/${customer.id}`)).data;assert.equal(crm.financials.received,300);assert.equal(crm.invoices[0].paidAmount,300);
    const excess=(await api('/billing/invoices','POST',{...form,invoiceNo:prefix+'-extra',amount:500},201)).data;ids.push(excess.id);
    await api(`/billing/invoices/${excess.id}/issue`,'POST',{},400);
    await api(`/billing/payments/${linked.id}`,'DELETE');assert.ok(await prisma.transaction.findUnique({where:{id:legacy.id}}));
    await api(`/billing/payments/${generated.id}`,'DELETE');assert.equal(await prisma.transaction.findUnique({where:{id:generated.transactionId}}),null);
    await api(`/billing/invoices/${inv.id}/payments`,'POST',{amount:600,paymentDate:'2026-10-03',paymentMethod:'BANK'},201);
    const list=(await api(`/billing/invoices?projectId=${project.id}`));assert.equal(list.summary.received,600);assert.equal(list.summary.outstanding,0);
    assert.equal(list.data.find(i=>i.id===inv.id).paymentStatus,'PAID');
  } finally {
    if(ids.length){await prisma.invoicePayment.deleteMany({where:{invoiceId:{in:ids}}});await prisma.clientInvoice.deleteMany({where:{id:{in:ids}}});}
    if(project){await prisma.transaction.deleteMany({where:{projectId:project.id}});await prisma.project.delete({where:{id:project.id}});}
    if(customer)await prisma.customer.delete({where:{id:customer.id}});
    if(user)await prisma.user.delete({where:{id:user.id}});
    await new Promise(resolve=>server.close(resolve));await prisma.$disconnect();
  }
});
