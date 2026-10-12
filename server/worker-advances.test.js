const {wrapFinancialCalls,cleanupFinancialTest}=require('./financial-test-helper');
const test=require('node:test'),assert=require('node:assert/strict');
const {account}=require('./worker-advances');
const {projectProfit}=require('./project-profit');
test('worker balances separate wage cash, advance allocations, unused advances and legacy records',()=>{
  const w={id:1,name:'Worker',payrollAccruals:[{projectId:1,amount:100,payments:[{transaction:{amount:20}}],advanceAllocations:[{amount:30}]},{projectId:2,amount:200,payments:[],advanceAllocations:[]}],advances:[{projectId:1,amount:70,allocations:[{amount:30}]},{projectId:1,amount:40,reversedAt:'date',allocations:[]}],transactions:[{projectId:1,amount:10}]};
  const a=account(w,1);assert.equal(a.earned,100);assert.equal(a.cashWages,20);assert.equal(a.advanceGiven,70);assert.equal(a.advanceApplied,30);assert.equal(a.unappliedAdvance,40);assert.equal(a.wageDue,50);assert.equal(a.legacy.length,1);
  const r=projectProfit({contractValue:500,transactions:[{type:'EXPENSE',source:'WORKER_ADVANCE',workerId:1,amount:70},{type:'EXPENSE',source:'MANUAL',workerId:1,amount:20,payrollPayment:{id:1}}],payrollAccruals:w.payrollAccruals.filter(p=>p.projectId===1)},{cost:0,items:[],incomplete:false});assert.equal(r.cost,100);assert.equal(r.cashOut,90);assert.equal(r.unpaidPayroll,50);
});
test('local advances, settlement caps, protections, statement and reversals',{skip:process.env.CRM_INTEGRATION!=='1'},async()=>{
  require('dotenv').config();assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname));
  const {app,prisma}=require('./server');const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const prefix='advance_'+Date.now();let user,worker,otherWorker,project,otherProject;
  try{
    user=await prisma.user.create({data:{name:prefix,username:prefix,role:'ADMIN',passwordHash:'test-only'}});worker=await prisma.worker.create({data:{name:prefix}});otherWorker=await prisma.worker.create({data:{name:prefix+'_other'}});project=await prisma.project.create({data:{name:prefix,contractValue:1000}});otherProject=await prisma.project.create({data:{name:prefix+'_other'}});
    const token=require('jsonwebtoken').sign({userId:user.id},process.env.JWT_SECRET,{expiresIn:'5m'});
    const raw=async(path,method='GET',body)=>{const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,...await r.json()};};
    const call=wrapFinancialCalls(prisma,user,server,raw);
    assert.equal((await fetch('http://127.0.0.1:'+server.address().port+'/api/labour/accounts')).status,401);
    const advance=await call('labour/advances','POST',{projectId:project.id,workerId:worker.id,amount:600,paymentDate:'2026-01-01',paymentMethod:'CASH',reference:prefix});assert.equal(advance.status,201);
    const report=async()=>(await call('reports/project-profit?basis=consumption')).data.find(p=>p.id===project.id);
    let r=await report();assert.equal(r.cost,0);assert.equal(r.cashOut,600);
    assert.equal((await call('transactions/'+advance.data.transactionId,'DELETE')).status,409);
    const before=await prisma.transaction.count({where:{workerId:worker.id}});
    assert.equal((await call('labour/advances','POST',{projectId:project.id,workerId:worker.id,amount:600,paymentDate:'2026-01-01',paymentMethod:'CASH',reference:prefix})).status,409);assert.equal(await prisma.transaction.count({where:{workerId:worker.id}}),before);
    const wage=await prisma.payrollAccrual.create({data:{projectId:project.id,workerId:worker.id,amount:1000,earnedDate:new Date('2026-01-02'),reference:prefix+'_wage',description:'test'}});
    const wrongProject=await prisma.payrollAccrual.create({data:{projectId:otherProject.id,workerId:worker.id,amount:1000,earnedDate:new Date('2026-01-02'),reference:prefix+'_project',description:'test'}});
    const wrongWorker=await prisma.payrollAccrual.create({data:{projectId:project.id,workerId:otherWorker.id,amount:1000,earnedDate:new Date('2026-01-02'),reference:prefix+'_worker',description:'test'}});
    const apply=(accrualId,amount)=>call('labour/advances/'+advance.data.id+'/allocations','POST',{accrualId,amount,allocationDate:'2026-01-03'});
    assert.equal((await apply(wrongProject.id,10)).status,400);assert.equal((await apply(wrongWorker.id,10)).status,400);assert.equal((await apply(wage.id,601)).status,400);
    const pair=await Promise.all([apply(wage.id,600),apply(wage.id,600)]);assert.equal(pair.filter(a=>a.status===201).length,1);const allocation=pair.find(a=>a.status===201).data;
    assert.equal((await call('labour/advances/'+advance.data.id+'/reverse','POST',{})).status,409);
    assert.equal((await call('job-costing/payroll/'+wage.id,'DELETE')).status,400);
    assert.equal((await call('job-costing/payroll/'+wage.id+'/payments','POST',{amount:401,paymentDate:'2026-01-03',paymentMethod:'CASH'})).status,400);
    const payment=await call('job-costing/payroll/'+wage.id+'/payments','POST',{amount:400,paymentDate:'2026-01-03',paymentMethod:'BANK'});assert.equal(payment.status,201);
    const statement=(await call('labour/accounts?projectId='+project.id)).data.workers.find(w=>w.id===worker.id);assert.equal(statement.earned,1000);assert.equal(statement.cashWages,400);assert.equal(statement.advanceApplied,600);assert.equal(statement.wageDue,0);assert.equal(statement.unappliedAdvance,0);
    r=await report();assert.equal(r.cost,2000);assert.equal(r.cashOut,1000);assert.equal(r.unpaidPayroll,1000);
    assert.equal((await call('labour/advance-allocations/'+allocation.id,'DELETE')).status,200);
    assert.equal((await call('labour/advances/'+advance.data.id+'/reverse','POST',{})).status,200);
    const reversed=(await call('labour/accounts?projectId='+project.id)).data.workers.find(w=>w.id===worker.id);assert.equal(reversed.advanceGiven,0);assert.equal(reversed.wageDue,600);assert.ok(reversed.advances[0].reversedAt);
    r=await report();assert.equal(r.cost,2000);assert.equal(r.cashOut,400);
    const concurrentWage=await prisma.payrollAccrual.create({data:{projectId:project.id,workerId:worker.id,amount:700,earnedDate:new Date('2026-01-02'),reference:prefix+'_concurrent',description:'test'}});
    const secondAdvance=await call('labour/advances','POST',{projectId:project.id,workerId:worker.id,amount:500,paymentDate:'2026-01-01',paymentMethod:'CASH',reference:prefix+'_second'});assert.equal(secondAdvance.status,201);
    const race=await Promise.all([call('labour/advances/'+secondAdvance.data.id+'/allocations','POST',{accrualId:concurrentWage.id,amount:500,allocationDate:'2026-01-03'}),call('job-costing/payroll/'+concurrentWage.id+'/payments','POST',{amount:500,paymentDate:'2026-01-03',paymentMethod:'CASH'})]);assert.equal(race.filter(x=>x.status===201).length,1);
    const locked=await prisma.payrollAccrual.findUnique({where:{id:concurrentWage.id},include:{payments:{include:{transaction:true}},advanceAllocations:true}});assert.equal(locked.payments.reduce((s,p)=>s+Number(p.transaction.amount),0)+locked.advanceAllocations.reduce((s,a)=>s+Number(a.amount),0),500);
  }finally{
    await cleanupFinancialTest(prisma,user);
    const workerIds=[worker?.id,otherWorker?.id].filter(Boolean);const advances=await prisma.workerAdvance.findMany({where:{workerId:{in:workerIds}}});const accruals=await prisma.payrollAccrual.findMany({where:{workerId:{in:workerIds}}});const payments=await prisma.payrollPayment.findMany({where:{accrualId:{in:accruals.map(a=>a.id)}}});
    await prisma.workerAdvanceAllocation.deleteMany({where:{advanceId:{in:advances.map(a=>a.id)}}});await prisma.workerAdvance.deleteMany({where:{id:{in:advances.map(a=>a.id)}}});await prisma.payrollPayment.deleteMany({where:{id:{in:payments.map(p=>p.id)}}});await prisma.transaction.deleteMany({where:{workerId:{in:workerIds}}});await prisma.payrollAccrual.deleteMany({where:{id:{in:accruals.map(a=>a.id)}}});await prisma.worker.deleteMany({where:{id:{in:workerIds}}});if(project)await prisma.project.delete({where:{id:project.id}});if(otherProject)await prisma.project.delete({where:{id:otherProject.id}});if(user)await prisma.user.delete({where:{id:user.id}});await new Promise(r=>server.close(r));await prisma.$disconnect();
  }
});
