const {cents,dateOf}=require('./billing');
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const id=v=>{const n=Number(v);if(!Number.isSafeInteger(n)||n<=0)fail('Invalid ID');return n;};
const money=v=>Math.round(Number(v||0)*100);
const sum=rows=>rows.reduce((s,r)=>s+money(r.amount),0);
function account(worker,projectId){
  const payroll=(worker.payrollAccruals||[]).filter(p=>!projectId||p.projectId===projectId).map(p=>{
    const paid=sum(p.payments.map(r=>r.transaction)),applied=sum(p.advanceAllocations);
    return {...p,cashPaid:paid/100,advanceApplied:applied/100,due:(money(p.amount)-paid-applied)/100};
  });
  const advances=(worker.advances||[]).filter(a=>!projectId||a.projectId===projectId).map(a=>({...a,applied:sum(a.allocations)/100,remaining:a.reversedAt?0:(money(a.amount)-sum(a.allocations))/100}));
  const live=advances.filter(a=>!a.reversedAt);
  return {id:worker.id,name:worker.name,status:worker.status,payroll,advances,legacy:(worker.transactions||[]).filter(t=>!projectId||t.projectId===projectId),earned:sum(payroll)/100,cashWages:payroll.reduce((s,p)=>s+money(p.cashPaid),0)/100,advanceGiven:sum(live)/100,advanceApplied:live.reduce((s,a)=>s+money(a.applied),0)/100,unappliedAdvance:live.reduce((s,a)=>s+money(a.remaining),0)/100,wageDue:payroll.reduce((s,p)=>s+money(p.due),0)/100};
}
function registerWorkerAdvances(app,prisma){
  const route=fn=>async(req,res,next)=>{try{await fn(req,res,next);}catch(e){res.status(e.status||(['P2002','P2003','P2034'].includes(e.code)?409:400)).json({success:false,message:e.code==='P2002'?'Reference already exists or this advance is already applied to those wages.':e.code==='P2003'?'This record has linked wage/advance history. Undo its allocations first.':e.code==='P2034'?'Concurrent change detected. Refresh and retry.':e.message});}};
  const tx=fn=>prisma.$transaction(fn,{isolationLevel:'Serializable',timeout:20000});
  app.get('/api/labour/accounts',route(async(req,res)=>{
    const projectId=req.query.projectId?id(req.query.projectId):null;
    const [workers,projects]=await Promise.all([prisma.worker.findMany({include:{payrollAccruals:{include:{project:true,payments:{include:{transaction:true}},advanceAllocations:{include:{advance:true}}}},advances:{include:{project:true,allocations:{include:{accrual:true}}}},transactions:{where:{type:'EXPENSE',source:'MANUAL',payrollPayment:null},include:{project:true,category:true}}},orderBy:{name:'asc'}}),prisma.project.findMany({orderBy:{name:'asc'}})]);
    res.json({success:true,data:{workers:workers.map(w=>account(w,projectId)),projects}});
  }));
  app.post('/api/labour/advances',route(async(req,res)=>{
    const b=req.body,amount=cents(b.amount),paymentDate=dateOf(b.paymentDate),workerId=id(b.workerId),projectId=id(b.projectId);
    if(b.paymentDate>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Dhaka'}))fail('Advance payment cannot have a future date');
    if(typeof b.reference!=='string'||!b.reference.trim()||b.reference.trim().length>100)fail('Enter a unique reference (maximum 100 characters)');
    if(b.notes!=null&&(typeof b.notes!=='string'||b.notes.length>500))fail('Notes must be at most 500 characters');
    if(!['CASH','BANK','MOBILE_BANKING','OTHER'].includes(b.paymentMethod))fail('Choose a payment method');
    const data=await require('./financial-approval').postApproved(prisma,req.user,b.approvalRequestId,b.version,'ADVANCE',b);res.status(201).json({success:true,data});
  }));
  app.post('/api/labour/advances/:id/allocations',route(async(req,res)=>{
    const advanceId=id(req.params.id),accrualId=id(req.body.accrualId),amount=cents(req.body.amount),allocationDate=dateOf(req.body.allocationDate);
    if(req.body.allocationDate>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Dhaka'}))fail('Allocation cannot have a future date');
    const data=await tx(async db=>{
      // Payroll payment and all allocation operations share the accrual lock first.
      await db.$queryRaw`SELECT id FROM payroll_accruals WHERE id=${accrualId} FOR UPDATE`;
      await db.$queryRaw`SELECT id FROM worker_advances WHERE id=${advanceId} FOR UPDATE`;
      const [a,p]=await Promise.all([db.workerAdvance.findUnique({where:{id:advanceId},include:{allocations:true}}),db.payrollAccrual.findUnique({where:{id:accrualId},include:{payments:{include:{transaction:true}},advanceAllocations:true}})]);
      if(!a||a.reversedAt||!a.transactionId)fail('Choose an active advance');if(!p)fail('Payroll not found');
      if(p.workerId!==a.workerId||p.projectId!==a.projectId)fail('Advance and wages must belong to the same worker and project');
      if(allocationDate<a.paymentDate||allocationDate<p.earnedDate)fail('Allocation date cannot precede the advance or earned wages');
      if(amount>money(a.amount)-sum(a.allocations))fail('Amount exceeds the remaining advance');
      if(amount>money(p.amount)-sum(p.payments.map(r=>r.transaction))-sum(p.advanceAllocations))fail('Amount exceeds unpaid wages');
      return db.workerAdvanceAllocation.create({data:{advanceId,accrualId,amount:amount/100,allocationDate}});
    });res.status(201).json({success:true,data});
  }));
  app.delete('/api/labour/advance-allocations/:id',route(async(req,res)=>{
    await tx(async db=>{const a=await db.workerAdvanceAllocation.findUnique({where:{id:id(req.params.id)}});if(!a)fail('Allocation not found',404);await db.$queryRaw`SELECT id FROM payroll_accruals WHERE id=${a.accrualId} FOR UPDATE`;await db.$queryRaw`SELECT id FROM worker_advances WHERE id=${a.advanceId} FOR UPDATE`;await db.workerAdvanceAllocation.delete({where:{id:a.id}});});res.json({success:true});
  }));
  app.post('/api/labour/advances/:id/reverse',route(async(req,res)=>{
    await tx(async db=>{const record=id(req.params.id);await db.$queryRaw`SELECT id FROM worker_advances WHERE id=${record} FOR UPDATE`;const a=await db.workerAdvance.findUnique({where:{id:record},include:{allocations:true}});if(!a||a.reversedAt||!a.transactionId)fail('Active advance not found');if(a.allocations.length)fail('Undo all advance allocations before reversing this entry',409);await require('./financial-approval').recordReversal(db,req.user,a.transactionId,req.body?.notes);await db.workerAdvance.update({where:{id:record},data:{reversedAt:new Date(),transactionId:null}});await db.transaction.delete({where:{id:a.transactionId}});});res.json({success:true});
  }));
  app.use(['/api/expenses/:id','/api/income/:id','/api/transactions/:id'],route(async(req,res,next)=>{if(!['PUT','PATCH','DELETE'].includes(req.method))return next();if(await prisma.workerAdvance.count({where:{transactionId:id(req.params.id)}}))fail('Correct worker advances through Workers → Advance & Statement',409);next();}));
}
async function postWorkerAdvance(db,b){
 const workerId=id(b.workerId),projectId=id(b.projectId),amount=cents(b.amount),paymentDate=dateOf(b.paymentDate);
 const worker=await db.worker.findUnique({where:{id:workerId}});if(!worker||worker.status!=='ACTIVE')fail('Choose an active worker');
 const transaction=await db.transaction.create({data:{type:'EXPENSE',source:'WORKER_ADVANCE',workerId,projectId,amount:amount/100,transactionDate:paymentDate,paymentMethod:b.paymentMethod,description:'Worker advance: '+b.reference}});
 return db.workerAdvance.create({data:{workerId,projectId,amount:amount/100,paymentDate,paymentMethod:b.paymentMethod,reference:b.reference,notes:b.notes,transactionId:transaction.id}});
}
module.exports={registerWorkerAdvances,account,postWorkerAdvance};
