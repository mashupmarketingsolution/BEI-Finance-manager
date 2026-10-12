const {cents,dateOf}=require('./billing');
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const id=v=>{const n=Number(v);if(!Number.isSafeInteger(n)||n<=0)fail('Invalid ID');return n;};
function zeroMoney(v){if(v===0||v==='0'||v==='0.00')return 0;return cents(v);}
function earned(dayUnits,hours,dailyRate,overtimeRate){
  const days=Number(dayUnits),h=Number(hours);
  if(!['string','number'].includes(typeof dayUnits)||String(dayUnits).trim()===''||![0,0.5,1].includes(days))fail('Choose absent, half day or full day');
  if(!['string','number'].includes(typeof hours)||!/^\d+(\.\d{1,2})?$/.test(String(hours))||h<0||h+days*8>24||(!days&&h))fail('Invalid overtime hours (maximum total work time is 24 hours)');
  const amount=Math.round(days*dailyRate+h*overtimeRate);
  if(!Number.isSafeInteger(amount)||amount>999999999999999)fail('Calculated wage exceeds the supported amount');
  return amount;
}
function registerLabour(app,prisma){
  const route=fn=>async(req,res)=>{try{await fn(req,res);}catch(e){res.status(e.status||(['P2002','P2003','P2034'].includes(e.code)?409:400)).json({success:false,message:e.code==='P2002'?'This worker already has attendance for that date, or the rate date/reference already exists.':e.code==='P2003'?'This record is linked. Reverse its payroll before changing it.':e.code==='P2034'?'Another request changed this record. Refresh and retry.':e.message});}};
  const transaction=fn=>prisma.$transaction(fn,{isolationLevel:'Serializable',timeout:20000});
  const relations={worker:true,project:true,payrollAccrual:{include:{payments:{include:{transaction:true}}}}};
  app.get('/api/labour',route(async(req,res)=>{
    const [workers,projects,rates,attendance]=await Promise.all([prisma.worker.findMany({orderBy:{name:'asc'}}),prisma.project.findMany({orderBy:{name:'asc'}}),prisma.workerRate.findMany({include:{worker:true,project:true},orderBy:{effectiveDate:'desc'}}),prisma.workerAttendance.findMany({include:relations,orderBy:[{workDate:'desc'},{id:'desc'}]})]);res.json({success:true,data:{workers,projects,rates,attendance}});
  }));
  app.post('/api/labour/rates',route(async(req,res)=>{
    const b=req.body,data=await prisma.workerRate.create({data:{workerId:id(b.workerId),projectId:id(b.projectId),effectiveDate:dateOf(b.effectiveDate),dailyRate:cents(b.dailyRate)/100,overtimeRate:zeroMoney(b.overtimeRate)/100}});res.status(201).json({success:true,data});
  }));
  app.delete('/api/labour/rates/:id',route(async(req,res)=>{await prisma.workerRate.delete({where:{id:id(req.params.id)}});res.json({success:true});}));
  app.post('/api/labour/attendance',route(async(req,res)=>{
    const b=req.body,workerId=id(b.workerId),projectId=id(b.projectId),workDate=dateOf(b.workDate);
    if(b.workDate>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Dhaka'}))fail('Attendance cannot be recorded for a future date');
    if(b.notes!=null&&(typeof b.notes!=='string'||b.notes.length>500))fail('Notes must be at most 500 characters');
    const data=await transaction(async db=>{
      await db.$queryRaw`SELECT id FROM workers WHERE id=${workerId} FOR UPDATE`;
      const worker=await db.worker.findUnique({where:{id:workerId}});if(!worker||worker.status!=='ACTIVE')fail('Choose an active worker');
      const rate=await db.workerRate.findFirst({where:{workerId,projectId,effectiveDate:{lte:workDate}},orderBy:{effectiveDate:'desc'}});if(!rate)fail('Add a wage rate effective on or before the attendance date');
      const amount=earned(b.dayUnits,b.overtimeHours,Math.round(Number(rate.dailyRate)*100),Math.round(Number(rate.overtimeRate)*100));
      if(Number(b.overtimeHours)>0&&Number(rate.overtimeRate)===0)fail('Set a positive overtime rate before recording overtime');
      return db.workerAttendance.create({data:{workerId,projectId,workDate,dayUnits:Number(b.dayUnits),overtimeHours:Number(b.overtimeHours),dailyRate:rate.dailyRate,overtimeRate:rate.overtimeRate,amount:amount/100,notes:b.notes?.trim()||null},include:relations});
    });res.status(201).json({success:true,data});
  }));
  app.delete('/api/labour/attendance/:id',route(async(req,res)=>{
    await transaction(async db=>{const record=id(req.params.id);await db.$queryRaw`SELECT id FROM worker_attendance WHERE id=${record} FOR UPDATE`;const a=await db.workerAttendance.findUnique({where:{id:record}});if(!a)fail('Attendance not found',404);if(a.payrollAccrualId)fail('Undo payroll before removing attendance',409);await db.workerAttendance.delete({where:{id:record}});});res.json({success:true});
  }));
  app.post('/api/labour/attendance/:id/payroll',route(async(req,res)=>{
    const data=await transaction(async db=>{
      const record=id(req.params.id);await db.$queryRaw`SELECT id FROM worker_attendance WHERE id=${record} FOR UPDATE`;
      const a=await db.workerAttendance.findUnique({where:{id:record}});if(!a)fail('Attendance not found',404);if(a.payrollAccrualId)fail('Payroll already generated',409);if(Number(a.amount)<=0)fail('Absent days have no earned wages');
      const p=await db.payrollAccrual.create({data:{workerId:a.workerId,projectId:a.projectId,reference:'ATT-'+a.id,description:'Attendance wages '+a.workDate.toISOString().slice(0,10),earnedDate:a.workDate,amount:a.amount}});
      await db.workerAttendance.update({where:{id:record},data:{payrollAccrualId:p.id}});return p;
    });res.status(201).json({success:true,data});
  }));
  app.delete('/api/labour/attendance/:id/payroll',route(async(req,res)=>{
    await transaction(async db=>{
      const record=id(req.params.id);await db.$queryRaw`SELECT id FROM worker_attendance WHERE id=${record} FOR UPDATE`;
      const a=await db.workerAttendance.findUnique({where:{id:record}});if(!a?.payrollAccrualId)fail('Generated payroll not found');
      await db.$queryRaw`SELECT id FROM payroll_accruals WHERE id=${a.payrollAccrualId} FOR UPDATE`;
      const p=await db.payrollAccrual.findUnique({where:{id:a.payrollAccrualId}});if(p?.batchId)fail('Undo this payroll batch from Workers → Payroll Batches',409);
      if(await db.payrollPayment.count({where:{accrualId:a.payrollAccrualId}}))fail('Reverse wage payments in Project Profit & Loss before undoing payroll',409);
      if(await db.workerAdvanceAllocation.count({where:{accrualId:a.payrollAccrualId}}))fail('Undo advance allocations in Workers before undoing payroll',409);
      await db.workerAttendance.update({where:{id:record},data:{payrollAccrualId:null}});await db.payrollAccrual.delete({where:{id:a.payrollAccrualId}});
    });res.json({success:true});
  }));
}
module.exports={registerLabour,earned};
