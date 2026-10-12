const {cents,dateOf}=require('./billing');
const fail=message=>{throw Object.assign(new Error(message),{status:400});};
const id=value=>{const n=Number(value);if(!Number.isSafeInteger(n)||n<=0)fail('Invalid ID');return n;};
const money=value=>Math.round(Number(value)*100);
const text=(value,max)=>{if(typeof value!=='string'||!value.trim()||value.trim().length>max)fail('Reference and description are required and must fit their length limits');return value.trim();};
function registerJobCosting(app,prisma) {
  const route=fn=>async(req,res,next)=>{try{await fn(req,res,next);}catch(e){res.status(e.status||400).json({success:false,message:e.code?'Unable to save: check linked records, duplicate references or concurrent changes. Refresh and retry.':e.message});}};
  const tx=fn=>prisma.$transaction(fn,{isolationLevel:'Serializable',timeout:20000});
  app.get('/api/job-costing/context',route(async(req,res)=>{
    const [workers,payroll,overheads]=await Promise.all([
      prisma.worker.findMany({where:{status:'ACTIVE'},orderBy:{name:'asc'}}),
      prisma.payrollAccrual.findMany({include:{worker:true,advanceAllocations:{include:{advance:true}},payments:{include:{transaction:true}}},orderBy:{id:'desc'}}),
      prisma.transaction.findMany({where:{type:'EXPENSE',source:'MANUAL',projectId:null,workerId:null},include:{overheadAllocations:true},orderBy:{transactionDate:'desc'}})
    ]);res.json({success:true,data:{workers,payroll,overheads}});
  }));
  app.post('/api/job-costing/payroll',route(async(req,res)=>{
    const b=req.body;const data=await prisma.payrollAccrual.create({data:{projectId:id(b.projectId),workerId:id(b.workerId),reference:text(b.reference,100),description:text(b.description,500),earnedDate:dateOf(b.earnedDate),amount:cents(b.amount)/100}});
    res.status(201).json({success:true,data});
  }));
  app.delete('/api/job-costing/payroll/:id',route(async(req,res)=>{
    const batchPayroll=await prisma.payrollAccrual.findUnique({where:{id:id(req.params.id)},select:{batchId:true}});if(batchPayroll?.batchId)fail('Undo this payroll batch from Workers → Payroll Batches');
    if(await prisma.workerAttendance.count({where:{payrollAccrualId:id(req.params.id)}}))fail('Undo attendance-generated payroll from Workers → Attendance history');
    if(await prisma.workerAdvanceAllocation.count({where:{accrualId:id(req.params.id)}}))fail('Undo worker advance allocations before removing these wages');
    await tx(async db=>{const record=id(req.params.id);await db.$queryRaw`SELECT id FROM payroll_accruals WHERE id=${record} FOR UPDATE`;if(await db.payrollPayment.count({where:{accrualId:record}}))fail('Reverse payroll payments before removing this accrual');await db.payrollAccrual.delete({where:{id:record}});});res.json({success:true});
  }));
  app.post('/api/job-costing/payroll/:id/payments',route(async(req,res)=>{
    const record=id(req.params.id),b=req.body,amount=cents(b.amount),date=dateOf(b.paymentDate);
    if(!['CASH','BANK','MOBILE_BANKING','OTHER'].includes(b.paymentMethod))fail('Choose a payment method');
    const data=await tx(async db=>{
      await db.$queryRaw`SELECT id FROM payroll_accruals WHERE id=${record} FOR UPDATE`;
      const accrual=await db.payrollAccrual.findUnique({where:{id:record},include:{advanceAllocations:true,payments:{include:{transaction:true}}}});if(!accrual)fail('Payroll record not found');
      if(date<accrual.earnedDate)fail('Payment date cannot precede earned date');
      if(amount>money(accrual.amount)-accrual.payments.reduce((s,p)=>s+money(p.transaction.amount),0)-accrual.advanceAllocations.reduce((s,a)=>s+money(a.amount),0))fail('Payment exceeds payroll balance after advance allocations');
      const payment=await db.transaction.create({data:{type:'EXPENSE',source:'MANUAL',projectId:accrual.projectId,workerId:accrual.workerId,amount:amount/100,transactionDate:date,paymentMethod:b.paymentMethod,description:'Payroll: '+accrual.reference}});
      return db.payrollPayment.create({data:{accrualId:record,transactionId:payment.id}});
    });res.status(201).json({success:true,data});
  }));
  app.delete('/api/job-costing/payments/:id',route(async(req,res)=>{
    await tx(async db=>{const p=await db.payrollPayment.findUnique({where:{id:id(req.params.id)}});if(!p)fail('Payment not found');await db.$queryRaw`SELECT id FROM payroll_accruals WHERE id=${p.accrualId} FOR UPDATE`;await db.payrollPayment.delete({where:{id:p.id}});await db.transaction.delete({where:{id:p.transactionId}});});res.json({success:true});
  }));
  // Replace one expense's complete allocation atomically; any remainder stays unallocated.
  app.put('/api/job-costing/overheads/:id',route(async(req,res)=>{
    const record=id(req.params.id),rows=req.body.allocations;
    if(!Array.isArray(rows))fail('Allocations are required');
    const allocations=rows.map(r=>({projectId:id(r.projectId),amount:cents(r.amount)}));
    if(new Set(allocations.map(r=>r.projectId)).size!==allocations.length)fail('Use one allocation per project');
    await tx(async db=>{
      await db.$queryRaw`SELECT id FROM transactions WHERE id=${record} FOR UPDATE`;
      const source=await db.transaction.findUnique({where:{id:record}});
      if(!source||source.type!=='EXPENSE'||source.source!=='MANUAL'||source.projectId||source.workerId)fail('Select an unassigned general expense');
      if(allocations.reduce((s,r)=>s+r.amount,0)>money(source.amount))fail('Allocated amount exceeds the expense');
      await db.overheadAllocation.deleteMany({where:{transactionId:record}});
      if(allocations.length)await db.overheadAllocation.createMany({data:allocations.map(r=>({...r,amount:r.amount/100,transactionId:record}))});
    });res.json({success:true});
  }));
  // Share the source-row lock with allocations so an edit cannot race allocation creation.
  app.put('/api/expenses/:id',route(async(req,res)=>{
    const record=id(req.params.id),b=req.body,amount=cents(b.amount),transactionDate=dateOf(b.transactionDate);
    if(!['CASH','BANK','MOBILE_BANKING','OTHER'].includes(b.paymentMethod||'CASH'))fail('Choose a payment method');
    const data=await tx(async db=>{
      await db.$queryRaw`SELECT id FROM transactions WHERE id=${record} FOR UPDATE`;
      const existing=await db.transaction.findUnique({where:{id:record},include:{payrollPayment:true,overheadAllocations:true}});
      if(!existing||existing.type!=='EXPENSE')fail('Expense not found');
      if(existing.source!=='MANUAL'||existing.payrollPayment||existing.overheadAllocations.length)throw Object.assign(new Error('Remove allocations or reverse the managed payment before changing this expense'),{status:409});
      return db.transaction.update({where:{id:record},data:{transactionDate,amount:amount/100,paymentMethod:b.paymentMethod||'CASH',description:b.description||null,notes:b.notes||null,projectId:b.projectId?id(b.projectId):null,categoryId:b.categoryId?id(b.categoryId):null,workerId:b.workerId?id(b.workerId):null,vendorId:b.vendorId?id(b.vendorId):null},include:{project:true,category:true,worker:true,vendor:true}});
    });res.json({success:true,data,message:'Expense updated successfully'});
  }));
  app.use(['/api/expenses/:id','/api/income/:id','/api/transactions/:id'],route(async(req,res,next)=>{
    if(!['PUT','DELETE'].includes(req.method))return next();
    const record=Number(req.params.id);
    if(await prisma.payrollPayment.count({where:{transactionId:record}})||await prisma.overheadAllocation.count({where:{transactionId:record}}))return res.status(409).json({success:false,message:'Remove the overhead allocation or reverse the payroll payment in Job Costing before changing this expense.'});
    next();
  }));
}
module.exports={registerJobCosting};
