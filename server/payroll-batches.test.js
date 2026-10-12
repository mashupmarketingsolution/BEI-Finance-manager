const {wrapFinancialCalls,cleanupFinancialTest}=require('./financial-test-helper');
const test=require('node:test'),assert=require('node:assert/strict');
const {preview,presentBatch}=require('./payroll-batches');
test('batch preview separates pending wages, posted settlements and unused advances',()=>{
  const base={workerId:1,projectId:2,worker:{name:'Worker'},project:{name:'Site'}};
  const p=preview([{...base,id:1,amount:200,payrollAccrualId:1,payrollAccrual:{amount:200,payments:[{transaction:{amount:50}}],advanceAllocations:[{amount:20}]}},{...base,id:2,amount:150},{...base,id:3,amount:0}],[{workerId:1,projectId:2,amount:100,allocations:[{amount:20}]}]);
  assert.deepEqual(p.rows.map(a=>a.state),['POSTED','PENDING','ABSENT']);assert.deepEqual(p.groups[0],{workerId:1,projectId:2,worker:'Worker',project:'Site',pendingGross:150,postedGross:200,cashPaid:50,advanceApplied:20,unusedAdvance:80,postedDue:130});
  const b=presentBatch({snapshot:[{amount:'100.10'},{amount:'200.20'}],accruals:[{amount:'100.10',payments:[{transaction:{amount:20}}],advanceAllocations:[{amount:30}]},{amount:'200.20',payments:[],advanceAllocations:[]}]});assert.equal(b.gross,300.3);assert.equal(b.due,250.3);
});
test('local payroll batches are atomic, race-safe and reversible with preserved snapshots',{skip:process.env.CRM_INTEGRATION!=='1'},async()=>{
  require('dotenv').config();assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname));
  const {app,prisma}=require('./server');const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const prefix='batch_'+Date.now();let user,project,worker,other;
  try{
    user=await prisma.user.create({data:{name:prefix,username:prefix,role:'ADMIN',passwordHash:'test-only'}});project=await prisma.project.create({data:{name:prefix,contractValue:1000}});worker=await prisma.worker.create({data:{name:prefix}});other=await prisma.worker.create({data:{name:prefix+'_other'}});
    const token=require('jsonwebtoken').sign({userId:user.id},process.env.JWT_SECRET,{expiresIn:'5m'});
    const raw=async(path,method='GET',body)=>{const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,...await r.json()};};
    const call=wrapFinancialCalls(prisma,user,server,raw);
    assert.equal((await fetch('http://127.0.0.1:'+server.address().port+'/api/labour/payroll-batches')).status,401);
    const attend=(day,amount,workerId=worker.id)=>prisma.workerAttendance.create({data:{workerId,projectId:project.id,workDate:new Date('2026-01-0'+day),dayUnits:amount?1:0,overtimeHours:0,dailyRate:amount||100,overtimeRate:0,amount}});
    const [a1,a2,a3,a4,a5]=await Promise.all([attend(1,200),attend(2,300),attend(3,150),attend(4,0),attend(2,400,other.id)]);
    const prior=await call('labour/attendance/'+a1.id+'/payroll','POST',{});assert.equal(prior.status,201);
    await call('job-costing/payroll/'+prior.data.id+'/payments','POST',{amount:50,paymentDate:'2026-01-02',paymentMethod:'CASH'});
    const advance=await call('labour/advances','POST',{workerId:worker.id,projectId:project.id,reference:prefix+'_advance',amount:100,paymentDate:'2026-01-01',paymentMethod:'CASH'});assert.equal(advance.status,201);
    await call('labour/advances/'+advance.data.id+'/allocations','POST',{accrualId:prior.data.id,amount:20,allocationDate:'2026-01-02'});
    const filters={from:'2026-01-01',to:'2026-01-04',projectId:project.id,workerId:worker.id};
    assert.equal((await call('labour/payroll-batches/preview','POST',{...filters,from:'2026-01-05'})).status,400);
    const pre=await call('labour/payroll-batches/preview','POST',filters);assert.equal(pre.status,200);assert.equal(pre.data.rows.length,4);assert.equal(pre.data.groups[0].pendingGross,450);assert.equal(pre.data.groups[0].unusedAdvance,80);
    const make=(ids,reference=prefix,extra={})=>call('labour/payroll-batches','POST',{...filters,reference,attendanceIds:ids,...extra});
    assert.equal((await make([a2.id,a2.id])).status,400);assert.equal((await make([a4.id])).status,409);assert.equal((await make([a2.id,a1.id])).status,409);assert.equal((await prisma.workerAttendance.findUnique({where:{id:a2.id}})).payrollAccrualId,null);
    const made=await make([a2.id,a3.id]);assert.equal(made.status,201);const batchId=made.data.id;
    const list=async()=>(await call('labour/payroll-batches')).data;
    let batch=(await list()).find(b=>b.id===batchId);assert.equal(batch.gross,450);assert.equal(batch.accruals.length,2);assert.equal(batch.due,450);
    assert.equal((await make([a5.id],prefix,{workerId:''})).status,409);assert.equal((await prisma.workerAttendance.findUnique({where:{id:a5.id}})).payrollAccrualId,null);
    const race=await Promise.all([make([a5.id],prefix+'_race1',{workerId:''}),make([a5.id],prefix+'_race2',{workerId:''})]);assert.equal(race.filter(r=>r.status===201).length,1);
    const p=batch.accruals.find(p=>p.reference==='ATT-'+a2.id);
    const pending=await call('financial-requests','POST',{kind:'PAYROLL',payload:{accrualId:p.id,amount:10,paymentDate:'2026-01-04',paymentMethod:'CASH'}});assert.equal(pending.status,201);
    assert.equal((await call('labour/payroll-batches/'+batchId+'/reverse','POST',{})).status,409);
    assert.equal((await call('financial-requests/'+pending.data.id+'/cancel','POST',{version:pending.data.version,notes:'Cancel before test batch correction'})).status,200);
    assert.equal((await call('labour/attendance/'+a2.id+'/payroll','DELETE')).status,409);assert.equal((await call('job-costing/payroll/'+p.id,'DELETE')).status,400);
    const payment=await call('job-costing/payroll/'+p.id+'/payments','POST',{amount:100,paymentDate:'2026-01-04',paymentMethod:'CASH'});assert.equal(payment.status,201);
    const allocation=await call('labour/advances/'+advance.data.id+'/allocations','POST',{accrualId:p.id,amount:50,allocationDate:'2026-01-04'});assert.equal(allocation.status,201);
    batch=(await list()).find(b=>b.id===batchId);assert.equal(batch.cashPaid,100);assert.equal(batch.advanceApplied,50);assert.equal(batch.due,300);
    assert.equal((await call('labour/payroll-batches/'+batchId+'/reverse','POST',{})).status,409);
    await call('job-costing/payments/'+payment.data.id,'DELETE');assert.equal((await call('labour/payroll-batches/'+batchId+'/reverse','POST',{})).status,409);
    await call('labour/advance-allocations/'+allocation.data.id,'DELETE');assert.equal((await call('labour/payroll-batches/'+batchId+'/reverse','POST',{})).status,200);
    const undone=(await list()).find(b=>b.id===batchId);assert.ok(undone.reversedAt);assert.equal(undone.gross,450);assert.equal(undone.snapshot.length,2);assert.equal(undone.accruals.length,0);assert.equal(undone.due,0);
    assert.equal((await prisma.workerAttendance.findUnique({where:{id:a2.id}})).payrollAccrualId,null);assert.equal((await call('labour/attendance/'+a2.id+'/payroll','POST',{})).status,201);
    const projectReport=(await call('reports/project-profit?basis=consumption')).data.find(p=>p.id===project.id);assert.equal(projectReport.cost,900);assert.equal(projectReport.cashOut,150);assert.equal(projectReport.unpaidPayroll,830);
  }finally{
    await cleanupFinancialTest(prisma,user);
    const ids=[worker?.id,other?.id].filter(Boolean);const accruals=await prisma.payrollAccrual.findMany({where:{workerId:{in:ids}}});const advances=await prisma.workerAdvance.findMany({where:{workerId:{in:ids}}});
    await prisma.workerAttendance.deleteMany({where:{workerId:{in:ids}}});await prisma.workerAdvanceAllocation.deleteMany({where:{advanceId:{in:advances.map(a=>a.id)}}});await prisma.workerAdvance.deleteMany({where:{id:{in:advances.map(a=>a.id)}}});await prisma.payrollPayment.deleteMany({where:{accrualId:{in:accruals.map(a=>a.id)}}});await prisma.transaction.deleteMany({where:{workerId:{in:ids}}});await prisma.payrollAccrual.deleteMany({where:{workerId:{in:ids}}});await prisma.payrollBatch.deleteMany({where:{reference:{startsWith:prefix}}});await prisma.worker.deleteMany({where:{id:{in:ids}}});if(project)await prisma.project.delete({where:{id:project.id}});if(user)await prisma.user.delete({where:{id:user.id}});await new Promise(r=>server.close(r));await prisma.$disconnect();
  }
});
