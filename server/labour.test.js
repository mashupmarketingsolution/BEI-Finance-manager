const test=require('node:test'),assert=require('node:assert/strict');
const {earned}=require('./labour');
test('daily, half-day and overtime wages round once and reject invalid work time',()=>{
  assert.equal(earned('1','2',60000,10000),80000);
  assert.equal(earned('0.5','0.25',19999,1000),10250);
  assert.equal(earned('0','0',60000,10000),0);
  for(const [days,hours] of [['0','1'],['1','17'],['','0'],['0.6','0'],['1','-1'],['1','0.001']])assert.throws(()=>earned(days,hours,60000,10000));
});
test('attendance snapshots, duplicate protection and linked payroll lifecycle',{skip:process.env.CRM_INTEGRATION!=='1'},async()=>{
  require('dotenv').config();assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname));
  const {app,prisma}=require('./server');const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const prefix='labour_'+Date.now();let user,worker,project,other;
  try{
    user=await prisma.user.create({data:{name:prefix,username:prefix,passwordHash:'test-only'}});worker=await prisma.worker.create({data:{name:prefix}});project=await prisma.project.create({data:{name:prefix,contractValue:1000}});other=await prisma.project.create({data:{name:prefix+'_other'}});
    const token=require('jsonwebtoken').sign({userId:user.id},process.env.JWT_SECRET,{expiresIn:'5m'});
    const call=async(path,method='GET',body)=>{const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,...await r.json()};};
    assert.equal((await fetch('http://127.0.0.1:'+server.address().port+'/api/labour')).status,401);
    const base={projectId:project.id,workerId:worker.id,workDate:'2026-01-02',dayUnits:'0.5',overtimeHours:'2'};
    assert.equal((await call('labour/attendance','POST',base)).status,400);
    const rate=await call('labour/rates','POST',{projectId:project.id,workerId:worker.id,effectiveDate:'2026-01-01',dailyRate:600,overtimeRate:100});assert.equal(rate.status,201);
    const pair=await Promise.all([call('labour/attendance','POST',base),call('labour/attendance','POST',base)]);assert.equal(pair.filter(a=>a.status===201).length,1);
    const attendance=pair.find(a=>a.status===201).data;assert.equal(Number(attendance.amount),500);
    await call('labour/rates','POST',{projectId:other.id,workerId:worker.id,effectiveDate:'2026-01-01',dailyRate:600,overtimeRate:100});
    assert.equal((await call('labour/attendance','POST',{...base,projectId:other.id})).status,409);
    await call('labour/rates','POST',{projectId:project.id,workerId:worker.id,effectiveDate:'2026-01-02',dailyRate:1000,overtimeRate:150});
    let ctx=await call('labour');assert.equal(Number(ctx.data.attendance.find(a=>a.id===attendance.id).dailyRate),600);
    const absent=await call('labour/attendance','POST',{...base,workDate:'2026-01-03',dayUnits:'0',overtimeHours:'0'});assert.equal(absent.status,201);assert.equal(Number(absent.data.amount),0);
    assert.equal((await call('labour/attendance/'+absent.data.id+'/payroll','POST',{})).status,400);
    const posts=await Promise.all([call('labour/attendance/'+attendance.id+'/payroll','POST',{}),call('labour/attendance/'+attendance.id+'/payroll','POST',{})]);assert.equal(posts.filter(p=>p.status===201).length,1);
    const payroll=posts.find(p=>p.status===201).data;
    assert.equal((await call('labour/attendance/'+attendance.id,'DELETE')).status,409);
    assert.equal((await call('job-costing/payroll/'+payroll.id,'DELETE')).status,400);
    let report=(await call('reports/project-profit?basis=consumption')).data.find(p=>p.id===project.id);assert.equal(report.cost,500);assert.equal(report.cashOut,0);assert.equal(report.unpaidPayroll,500);
    const payment=await call('job-costing/payroll/'+payroll.id+'/payments','POST',{amount:200,paymentDate:'2026-01-04',paymentMethod:'CASH'});assert.equal(payment.status,201);
    report=(await call('reports/project-profit?basis=consumption')).data.find(p=>p.id===project.id);assert.equal(report.cost,500);assert.equal(report.cashOut,200);assert.equal(report.unpaidPayroll,300);
    assert.equal((await call('labour/attendance/'+attendance.id+'/payroll','DELETE')).status,409);
    assert.equal((await call('job-costing/payments/'+payment.data.id,'DELETE')).status,200);
    assert.equal((await call('labour/attendance/'+attendance.id+'/payroll','DELETE')).status,200);
    assert.equal((await call('labour/rates/'+rate.data.id,'DELETE')).status,200);
    ctx=await call('labour');assert.equal(Number(ctx.data.attendance.find(a=>a.id===attendance.id).amount),500);
    assert.equal((await call('labour/attendance/'+attendance.id,'DELETE')).status,200);
  }finally{
    if(worker){const accruals=await prisma.payrollAccrual.findMany({where:{workerId:worker.id}});const payments=await prisma.payrollPayment.findMany({where:{accrualId:{in:accruals.map(a=>a.id)}}});await prisma.workerAttendance.deleteMany({where:{workerId:worker.id}});await prisma.payrollPayment.deleteMany({where:{id:{in:payments.map(p=>p.id)}}});await prisma.transaction.deleteMany({where:{id:{in:payments.map(p=>p.transactionId)}}});await prisma.payrollAccrual.deleteMany({where:{workerId:worker.id}});await prisma.workerRate.deleteMany({where:{workerId:worker.id}});await prisma.worker.delete({where:{id:worker.id}});}
    if(project)await prisma.project.delete({where:{id:project.id}});if(other)await prisma.project.delete({where:{id:other.id}});if(user)await prisma.user.delete({where:{id:user.id}});
    await new Promise(r=>server.close(r));await prisma.$disconnect();
  }
});
