const {wrapFinancialCalls,cleanupFinancialTest}=require('./financial-test-helper');
const test=require('node:test'),assert=require('node:assert/strict');
const {consumptionCosts}=require('./consumption-cost');
const {projectProfit}=require('./project-profit');
test('weighted receipts, landed cost, project returns and central stock',()=>{
  const m=(id,type,quantity,unitCost,projectId=null)=>({id,materialId:1,unit:'pcs',movementDate:'2026-01-'+String(id).padStart(2,'0'),movementType:type,quantity,unitCost,projectId});
  const result=consumptionCosts([
    {...m(1,'PURCHASE',10,10),referenceType:'PURCHASE_RECEIVE',referenceId:1},
    m(2,'PROJECT_USAGE',4,null,7),m(3,'PURCHASE',10,20),m(4,'PROJECT_USAGE',4,null,8),m(5,'RETURN',2,null,7)
  ],[{id:1,grandTotal:120,items:[{materialId:1,unit:'pcs',quantity:10,total:100}]}]);
  assert.equal(result.get(7).cost,24);assert.equal(result.get(7).items[0].quantity,2);assert.equal(result.get(8).cost,68);assert.equal(result.get(7).incomplete,false);
  const unknown=consumptionCosts([m(1,'ADJUSTMENT',5,null),m(2,'PROJECT_USAGE',2,null,7)]);
  assert.equal(unknown.get(7).incomplete,true);
});
test('unpaid payroll and allocated overhead affect cost once, settlements affect cash',()=>{
  const p={contractValue:1000,purchases:[{grandTotal:500,transportCost:20,payments:[{amount:100}]}],transactions:[{type:'EXPENSE',source:'MANUAL',amount:30,workerId:1,payrollPayment:{id:1}},{type:'EXPENSE',source:'MANUAL',amount:10}],payrollAccruals:[{amount:80,payments:[{transaction:{amount:30}}]}],overheadAllocations:[{amount:20}]};
  const r=projectProfit(p,{cost:150,incomplete:false,items:[]});
  assert.equal(r.cost,260);assert.equal(r.cashOut,160);assert.equal(r.unpaidPayroll,50);assert.equal(r.projectedProfit,740);
  assert.equal(Object.values(r.breakdown).reduce((s,n)=>s+n,0),260);
  assert.equal(projectProfit(p).cost,610);
});
test('local payroll lifecycle, over-allocation and transaction protections',{skip:process.env.CRM_INTEGRATION!=='1'},async()=>{
  require('dotenv').config();assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname));
  const {app,prisma}=require('./server');const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  let user,project,worker,expense,accrual;const stamp=Date.now();
  try{
    user=await prisma.user.create({data:{name:'Job cost test',username:'jc_'+stamp,role:'ADMIN',passwordHash:'test'}});
    project=await prisma.project.create({data:{name:'jc_'+stamp,contractValue:1000}});
    worker=await prisma.worker.create({data:{name:'jc_'+stamp}});
    expense=await prisma.transaction.create({data:{type:'EXPENSE',amount:100,transactionDate:new Date('2026-01-01'),description:'test overhead'}});
    const token=require('jsonwebtoken').sign({userId:user.id},process.env.JWT_SECRET,{expiresIn:'5m'});
    const raw=async(path,method='GET',body)=>{const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,...await r.json()};};
    const call=wrapFinancialCalls(prisma,user,server,raw);
    const a=await call('job-costing/payroll','POST',{projectId:project.id,workerId:worker.id,reference:'jc_'+stamp,description:'Earned wages',earnedDate:'2026-01-01',amount:80});assert.equal(a.status,201);accrual=a.data;
    const pay=()=>call('job-costing/payroll/'+accrual.id+'/payments','POST',{amount:50,paymentDate:'2026-01-02',paymentMethod:'CASH'});
    const payments=await Promise.all([pay(),pay()]);assert.equal(payments.filter(p=>p.status===201).length,1);
    const paid=payments.find(p=>p.status===201).data;
    assert.equal((await call('expenses/'+paid.transactionId,'DELETE')).status,409);
    assert.equal((await call('job-costing/payroll/'+accrual.id,'DELETE')).status,400);
    assert.equal((await call('job-costing/overheads/'+expense.id,'PUT',{allocations:[{projectId:project.id,amount:101}]})).status,400);
    assert.equal((await call('job-costing/overheads/'+expense.id,'PUT',{allocations:[{projectId:project.id,amount:25}]})).status,200);
    assert.equal((await call('expenses/'+expense.id,'PUT',{amount:5,transactionDate:'2026-01-01'})).status,409);
    const report=(await call('reports/project-profit?basis=consumption')).data.find(p=>p.id===project.id);
    assert.equal(report.cost,105);assert.equal(report.cashOut,75);assert.equal(report.unpaidPayroll,30);
    assert.equal((await call('job-costing/payments/'+paid.id,'DELETE')).status,200);
    const open=(await call('financial-requests')).data.filter(r=>r.accrualId===accrual.id&&['SUBMITTED','APPROVED'].includes(r.state));
    for(const r of open)assert.equal((await call('financial-requests/'+r.id+'/cancel','POST',{version:r.version,notes:'Test cancellation before wage removal'})).status,200);
    assert.equal((await call('job-costing/payroll/'+accrual.id,'DELETE')).status,200);accrual=null;
    assert.equal((await call('job-costing/overheads/'+expense.id,'PUT',{allocations:[]})).status,200);
  }finally{
    await cleanupFinancialTest(prisma,user);
    if(project){const ps=await prisma.payrollPayment.findMany({where:{accrual:{projectId:project.id}}});await prisma.payrollPayment.deleteMany({where:{id:{in:ps.map(p=>p.id)}}});await prisma.transaction.deleteMany({where:{id:{in:ps.map(p=>p.transactionId)}}});await prisma.payrollAccrual.deleteMany({where:{projectId:project.id}});await prisma.overheadAllocation.deleteMany({where:{projectId:project.id}});await prisma.project.delete({where:{id:project.id}});}
    if(expense)await prisma.transaction.delete({where:{id:expense.id}});if(worker)await prisma.worker.delete({where:{id:worker.id}});if(user)await prisma.user.delete({where:{id:user.id}});
    await new Promise(r=>server.close(r));await prisma.$disconnect();
  }
});
