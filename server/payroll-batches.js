const {dateOf}=require('./billing');
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const id=v=>{const n=Number(v);if(!Number.isSafeInteger(n)||n<=0)fail('Invalid ID');return n;};
const cents=v=>Math.round(Number(v||0)*100);
const sum=rows=>rows.reduce((s,r)=>s+cents(r.amount),0);
function scope(b){
  const fromDate=dateOf(b.from),toDate=dateOf(b.to);
  if(fromDate>toDate)fail('From date must not be after To date');
  if(b.to>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Dhaka'}))fail('Batch period cannot end in the future');
  return {fromDate,toDate,projectId:b.projectId==null||b.projectId===''?null:id(b.projectId),workerId:b.workerId==null||b.workerId===''?null:id(b.workerId)};
}
const include={worker:true,project:true,payrollAccrual:{include:{payments:{include:{transaction:true}},advanceAllocations:true}}};
function preview(rows,advances){
  const groups=new Map();
  for(const a of rows){
    const key=a.workerId+'|'+a.projectId;
    const g=groups.get(key)||{workerId:a.workerId,projectId:a.projectId,worker:a.worker.name,project:a.project.name,pendingGross:0,postedGross:0,cashPaid:0,advanceApplied:0,unusedAdvance:0};
    if(a.payrollAccrual){g.postedGross+=cents(a.payrollAccrual.amount);g.cashPaid+=sum(a.payrollAccrual.payments.map(p=>p.transaction));g.advanceApplied+=sum(a.payrollAccrual.advanceAllocations);}else if(Number(a.amount)>0)g.pendingGross+=cents(a.amount);
    groups.set(key,g);
  }
  for(const a of advances){const g=groups.get(a.workerId+'|'+a.projectId);if(g)g.unusedAdvance+=cents(a.amount)-sum(a.allocations);}
  return {rows:rows.map(a=>({...a,state:a.payrollAccrualId?'POSTED':Number(a.amount)>0?'PENDING':'ABSENT'})),groups:[...groups.values()].map(g=>({...g,pendingGross:g.pendingGross/100,postedGross:g.postedGross/100,cashPaid:g.cashPaid/100,advanceApplied:g.advanceApplied/100,unusedAdvance:g.unusedAdvance/100,postedDue:(g.postedGross-g.cashPaid-g.advanceApplied)/100}))};
}
function presentBatch(b){
  const earned=sum(b.accruals),paid=b.accruals.reduce((s,p)=>s+sum(p.payments.map(x=>x.transaction)),0),applied=b.accruals.reduce((s,p)=>s+sum(p.advanceAllocations),0);
  return {...b,gross:sum(b.snapshot)/100,earned:earned/100,cashPaid:paid/100,advanceApplied:applied/100,due:(earned-paid-applied)/100,accruals:b.accruals.map(p=>({...p,cashPaid:sum(p.payments.map(x=>x.transaction))/100,advanceApplied:sum(p.advanceAllocations)/100,due:(cents(p.amount)-sum(p.payments.map(x=>x.transaction))-sum(p.advanceAllocations))/100}))};
}
function registerPayrollBatches(app,prisma){
  const route=fn=>async(req,res)=>{try{await fn(req,res);}catch(e){res.status(e.status||(['P2002','P2003','P2034','P2028'].includes(e.code)?409:400)).json({success:false,message:e.code==='P2002'?'Batch reference or attendance payroll already exists.':e.code==='P2003'?'Batch payroll is linked to other records. Reverse settlements first.':['P2034','P2028'].includes(e.code)?'Attendance or wages changed concurrently. Refresh the preview and retry.':e.message});}};
  const tx=fn=>prisma.$transaction(fn,{isolationLevel:'Serializable',timeout:60000});
  app.post('/api/labour/payroll-batches/preview',route(async(req,res)=>{
    const s=scope(req.body),where={workDate:{gte:s.fromDate,lte:s.toDate},...(s.projectId?{projectId:s.projectId}:{}),...(s.workerId?{workerId:s.workerId}:{})};
    const [rows,advances]=await Promise.all([prisma.workerAttendance.findMany({where,include,orderBy:[{workDate:'asc'},{id:'asc'}]}),prisma.workerAdvance.findMany({where:{reversedAt:null,...(s.projectId?{projectId:s.projectId}:{}),...(s.workerId?{workerId:s.workerId}:{})},include:{allocations:true}})]);
    res.json({success:true,data:preview(rows,advances)});
  }));
  app.get('/api/labour/payroll-batches',route(async(req,res)=>{
    const batches=await prisma.payrollBatch.findMany({include:{accruals:{include:{worker:true,project:true,payments:{include:{transaction:true}},advanceAllocations:{include:{advance:true}}},orderBy:{id:'asc'}}},orderBy:{id:'desc'}});res.json({success:true,data:batches.map(presentBatch)});
  }));
  app.post('/api/labour/payroll-batches',route(async(req,res)=>{
    const b=req.body,s=scope(b);
    if(typeof b.reference!=='string'||!b.reference.trim()||b.reference.trim().length>100)fail('Enter a unique batch reference (maximum 100 characters)');
    if(!Array.isArray(b.attendanceIds)||!b.attendanceIds.length||b.attendanceIds.length>1000)fail('Select between 1 and 1000 attendance records');
    const ids=b.attendanceIds.map(id).sort((a,c)=>a-c);if(new Set(ids).size!==ids.length)fail('Each attendance may be selected only once');
    const data=await tx(async db=>{
      // The single-day payroll and attendance removal routes lock these same rows.
      for(const record of ids)await db.$queryRaw`SELECT id FROM worker_attendance WHERE id=${record} FOR UPDATE`;
      const rows=await db.workerAttendance.findMany({where:{id:{in:ids}},include:{worker:true,project:true},orderBy:{id:'asc'}});
      if(rows.length!==ids.length)fail('Selected attendance was removed. Refresh the preview.',409);
      for(const a of rows){if(a.workDate<s.fromDate||a.workDate>s.toDate||(s.projectId&&a.projectId!==s.projectId)||(s.workerId&&a.workerId!==s.workerId))fail('Selected attendance does not match the batch filters');if(a.payrollAccrualId||Number(a.amount)<=0)fail('Selected attendance is absent or already posted. Refresh the preview.',409);}
      if(!Number.isSafeInteger(sum(rows)))fail('Batch total exceeds the supported amount');
      const snapshot=rows.map(a=>({attendanceId:a.id,workerId:a.workerId,worker:a.worker.name,projectId:a.projectId,project:a.project.name,workDate:a.workDate.toISOString().slice(0,10),dayUnits:String(a.dayUnits),overtimeHours:String(a.overtimeHours),dailyRate:String(a.dailyRate),overtimeRate:String(a.overtimeRate),amount:String(a.amount),reference:'ATT-'+a.id}));
      const batch=await db.payrollBatch.create({data:{reference:b.reference.trim(),...s,snapshot}});
      for(const a of rows){const p=await db.payrollAccrual.create({data:{batchId:batch.id,workerId:a.workerId,projectId:a.projectId,reference:'ATT-'+a.id,description:'Attendance wages '+a.workDate.toISOString().slice(0,10)+' · Batch '+batch.reference,earnedDate:a.workDate,amount:a.amount}});await db.workerAttendance.update({where:{id:a.id},data:{payrollAccrualId:p.id}});}
      return batch;
    });res.status(201).json({success:true,data});
  }));
  app.post('/api/labour/payroll-batches/:id/reverse',route(async(req,res)=>{
    await tx(async db=>{
      const batchId=id(req.params.id);await db.$queryRaw`SELECT id FROM payroll_batches WHERE id=${batchId} FOR UPDATE`;
      const b=await db.payrollBatch.findUnique({where:{id:batchId}});if(!b||b.reversedAt)fail('Active batch not found');
      // Lock attendance first, then accruals, matching the single attendance undo route.
      for(const a of [...b.snapshot].sort((a,c)=>a.attendanceId-c.attendanceId))await db.$queryRaw`SELECT id FROM worker_attendance WHERE id=${a.attendanceId} FOR UPDATE`;
      const accruals=await db.payrollAccrual.findMany({where:{batchId},orderBy:{id:'asc'}});
      if(accruals.length!==b.snapshot.length)fail('Batch records no longer match its snapshot; review required',409);
      for(const p of accruals){await db.$queryRaw`SELECT id FROM payroll_accruals WHERE id=${p.id} FOR UPDATE`;if(await db.payrollPayment.count({where:{accrualId:p.id}})||await db.workerAdvanceAllocation.count({where:{accrualId:p.id}}))fail('Reverse all wage payments and undo advance allocations before undoing this batch',409);}
      await db.workerAttendance.updateMany({where:{payrollAccrualId:{in:accruals.map(p=>p.id)}},data:{payrollAccrualId:null}});
      await db.payrollAccrual.deleteMany({where:{batchId}});await db.payrollBatch.update({where:{id:batchId},data:{reversedAt:new Date()}});
    });res.json({success:true});
  }));
}
module.exports={registerPayrollBatches,preview,presentBatch};
