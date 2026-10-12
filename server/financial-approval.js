const crypto=require('node:crypto');
const {cents,dateOf}=require('./billing');
const fail=(message,status=409)=>{throw Object.assign(new Error(message),{status});};
const id=v=>{const n=Number(v);if(!Number.isSafeInteger(n)||n<=0)fail('Invalid ID',400);return n;};
const include={creator:{select:{id:true,name:true}},events:{include:{actor:{select:{id:true,name:true}}},orderBy:{id:'asc'}}};
const transact=(prisma,fn)=>prisma.$transaction(fn,{isolationLevel:'Serializable',timeout:20000});
function canonical(kind,b){
 if(!['PAYROLL','EXPENSE'].includes(kind))fail('Choose Payroll or Expense',400);
 const amount=cents(b.amount)/100,paymentMethod=b.paymentMethod||'CASH';if(!['CASH','BANK','MOBILE_BANKING','OTHER'].includes(paymentMethod))fail('Choose a payment method',400);
 if(kind==='PAYROLL')return {accrualId:id(b.accrualId),amount,paymentDate:dateOf(b.paymentDate).toISOString().slice(0,10),paymentMethod};
 const value={amount,transactionDate:dateOf(b.transactionDate).toISOString().slice(0,10),paymentMethod};
 for(const k of ['projectId','categoryId','workerId','vendorId'])value[k]=b[k]==null||b[k]===''?null:id(b[k]);
 for(const k of ['description','notes']){if(b[k]!=null&&(typeof b[k]!=='string'||b[k].trim().length>2000))fail('Invalid '+k,400);value[k]=b[k]?.trim()||null;}
 if(!value.description)fail('An expense description is required',400);return value;
}
async function actor(db,user,review=false){await db.$queryRaw`SELECT id FROM users WHERE id=${user.id} FOR UPDATE`;const u=await db.user.findUnique({where:{id:user.id}});if(!u||u.status!=='ACTIVE'||!(review?['ADMIN']:['ADMIN','ACCOUNTS']).includes(u.role))fail('Current access does not allow this financial action',403);return u;}
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
async function validateTarget(db,kind,payload){
 if(kind==='PAYROLL'){
  const record=payload.accrualId;await db.$queryRaw`SELECT id FROM payroll_accruals WHERE id=${record} FOR UPDATE`;
  const p=await db.payrollAccrual.findUnique({where:{id:record},include:{worker:true,project:true,payments:{include:{transaction:true}},advanceAllocations:true}});if(!p)fail('Payroll no longer exists',400);
  const target={id:p.id,workerId:p.workerId,projectId:p.projectId,reference:p.reference,earnedDate:p.earnedDate.toISOString(),amount:String(p.amount)};
  const due=Math.round(Number(p.amount)*100)-p.payments.reduce((s,x)=>s+Math.round(Number(x.transaction.amount)*100),0)-p.advanceAllocations.reduce((s,x)=>s+Math.round(Number(x.amount)*100),0);
  if(new Date(payload.paymentDate)<p.earnedDate)fail('Payment cannot precede earned wages',400);if(cents(payload.amount)>due)fail('Payment exceeds wages after payments and advance allocations',400);
  return {fingerprint:hash(target),snapshot:{...target,worker:p.worker.name,project:p.project.name,dueAtSubmission:due/100}};
 }
 const snapshot={};for(const [key,model] of [['projectId','project'],['categoryId','category'],['workerId','worker'],['vendorId','vendor']])if(payload[key]){const record=payload[key];await db.$queryRawUnsafe('SELECT id FROM `'+({project:'projects',category:'categories',worker:'workers',vendor:'vendors'})[model]+'` WHERE id=? FOR UPDATE',record);const row=await db[model].findUnique({where:{id:record}});if(!row||(['worker','vendor'].includes(model)&&row.status!=='ACTIVE')||(model==='category'&&row.type!=='EXPENSE'))fail('Choose an available '+model,400);snapshot[model]=row.name;}
 return {fingerprint:null,snapshot};
}
async function locked(db,record){await db.$queryRaw`SELECT id FROM financial_requests WHERE id=${record} FOR UPDATE`;const r=await db.financialRequest.findUnique({where:{id:record},include});if(!r)fail('Financial request not found',404);return r;}
async function log(db,r,u,action,notes,extra={}){await db.financialEvent.create({data:{requestId:r.id,actorId:u.id,actorRole:u.role,action,notes:notes||null,snapshot:{...r.snapshot,payload:r.payload,...extra}}});}
async function check(db,r){const target=await validateTarget(db,r.kind,r.payload);if(target.fingerprint!==r.targetFingerprint)fail('Wage record changed. Cancel and submit a new request');return target;}
async function postApproved(prisma,user,requestId,version,kind,payload){
 if(requestId==null)fail('Submit a financial request and obtain independent approval before posting',400);
 return transact(prisma,async db=>{const r=await locked(db,id(requestId)),u=await actor(db,user);if(r.state!=='APPROVED'||r.version!==version)fail('An approved, unposted current request is required');if(kind&&(kind!==r.kind||JSON.stringify(canonical(kind,payload))!==JSON.stringify(canonical(kind,r.payload))))fail('Posting must match the approved request exactly');await check(db,r);
  let result,transactionId;
  if(r.kind==='PAYROLL'){result=await require('./job-costing').postPayrollPayment(db,r.payload.accrualId,r.payload);transactionId=result.transactionId;}
  else{const p=r.payload;result=await db.transaction.create({data:{...p,transactionDate:dateOf(p.transactionDate),type:'EXPENSE',source:'MANUAL'}});transactionId=result.id;}
  await log(db,r,u,'POST',null,{transactionId,payrollPaymentId:r.kind==='PAYROLL'?result.id:null});await db.financialRequest.update({where:{id:r.id},data:{state:'POSTED',transactionId,version:{increment:1}}});return result;
 });
}
async function recordReversal(db,user,transactionId,notes){const existing=await db.financialRequest.findUnique({where:{transactionId}});if(!existing)return;const r=await locked(db,existing.id),u=await actor(db,user,true);if(typeof notes!=='string'||!notes.trim()||notes.trim().length>2000)fail('A reversal reason is required',400);await log(db,r,u,'REVERSE',notes.trim(),{transactionId});await db.financialRequest.update({where:{id:r.id},data:{state:'REVERSED',transactionId:null,version:{increment:1}}});}
async function guardAccrualRemoval(db,accrualId){if(await db.financialRequest.count({where:{accrualId,state:{in:['SUBMITTED','APPROVED']}}}))fail('Cancel open payroll payment requests before undoing earned wages');}
function registerFinancialApproval(app,prisma){
 const route=fn=>async(req,res,next)=>{try{await fn(req,res,next);}catch(e){res.status(e.status||(['P2002','P2003','P2034'].includes(e.code)?409:500)).json({success:false,message:e.status?e.message:e.code==='P2034'?'Financial records changed concurrently. Refresh and retry.':'Unable to update financial approval'});}};
 app.get('/api/financial-requests',route(async(req,res)=>{const state=req.query.state||'ALL',kind=req.query.kind||'ALL';if(!['ALL','SUBMITTED','APPROVED','REJECTED','CANCELLED','POSTED','REVERSED'].includes(state)||!['ALL','PAYROLL','EXPENSE'].includes(kind))fail('Choose a valid request filter',400);res.json({success:true,data:await prisma.financialRequest.findMany({where:{...(state==='ALL'?{}:{state}),...(kind==='ALL'?{}:{kind})},include,orderBy:{id:'desc'}})});}));
 app.post('/api/financial-requests',route(async(req,res)=>{const kind=req.body.kind,payload=canonical(kind,req.body.payload||{});const data=await transact(prisma,async db=>{const u=await actor(db,req.user),target=await validateTarget(db,kind,payload);const r=await db.financialRequest.create({data:{kind,payload,creatorId:u.id,accrualId:kind==='PAYROLL'?payload.accrualId:null,snapshot:target.snapshot,targetFingerprint:target.fingerprint}});await log(db,r,u,'SUBMIT',null);return db.financialRequest.findUnique({where:{id:r.id},include});});res.status(201).json({success:true,data});}));
 for(const action of ['approve','reject','cancel'])app.post('/api/financial-requests/:id/'+action,route(async(req,res)=>{const record=id(req.params.id);if(req.body.notes!=null&&(typeof req.body.notes!=='string'||req.body.notes.length>2000))fail('Invalid reason',400);const notes=req.body.notes?.trim();if(action!=='approve'&&!notes)fail('A reason is required',400);const data=await transact(prisma,async db=>{const r=await locked(db,record),u=await actor(db,req.user,action!=='cancel');if(r.version!==req.body.version)fail('Request changed. Refresh before acting');if(action==='cancel'){if(!['SUBMITTED','APPROVED'].includes(r.state))fail('Only pending or approved requests can be cancelled');if(u.role!=='ADMIN'&&u.id!==r.creatorId)fail('Only requester or Admin can cancel',403);}else{if(r.state!=='SUBMITTED')fail('Request is not pending');if(r.creatorId===u.id)fail('Requester cannot review their own request',403);if(action==='approve')await check(db,r);}await log(db,r,u,action.toUpperCase(),notes);return db.financialRequest.update({where:{id:r.id},data:{state:action==='approve'?'APPROVED':action==='reject'?'REJECTED':'CANCELLED',version:{increment:1}},include});});res.json({success:true,data});}));
 app.post('/api/financial-requests/:id/post',route(async(req,res)=>{const data=await postApproved(prisma,req.user,id(req.params.id),req.body.version);res.status(201).json({success:true,data});}));
 app.post('/api/financial-requests/:id/reverse',route(async(req,res)=>{await transact(prisma,async db=>{const r=await locked(db,id(req.params.id));if(r.state!=='POSTED'||r.version!==req.body.version||!r.transactionId)fail('Choose a current posted request');if(r.kind==='PAYROLL'){const record=r.payload.accrualId;await db.$queryRaw`SELECT id FROM payroll_accruals WHERE id=${record} FOR UPDATE`;}await db.$queryRaw`SELECT id FROM transactions WHERE id=${r.transactionId} FOR UPDATE`;if(await db.overheadAllocation.count({where:{transactionId:r.transactionId}}))fail('Remove overhead allocations before reversal');await recordReversal(db,req.user,r.transactionId,req.body.notes);if(r.kind==='PAYROLL')await db.payrollPayment.delete({where:{transactionId:r.transactionId}});await db.transaction.delete({where:{id:r.transactionId}});});res.json({success:true});}));
 // Keep legacy posting endpoints guarded; the approval transaction owns the posting.
 app.post('/api/expenses',route(async(req,res)=>{const data=await postApproved(prisma,req.user,req.body.approvalRequestId,req.body.version,'EXPENSE',req.body);res.status(201).json({success:true,data,message:'Approved expense posted'});}));
 app.use(['/api/expenses/:id','/api/income/:id','/api/transactions/:id'],route(async(req,res,next)=>{if(['PUT','PATCH','DELETE'].includes(req.method)&&await prisma.financialRequest.count({where:{transactionId:id(req.params.id)}}))fail('Reverse this approved entry through Financial Requests, then submit a corrected request');next();}));
 app.use('/api/projects/:id',route(async(req,res,next)=>{if(req.method==='DELETE'&&req.path==='/'){const projectId=id(req.params.id);if(await prisma.financialRequest.count({where:{OR:[{payload:{path:'$.projectId',equals:projectId}},{snapshot:{path:'$.projectId',equals:projectId}}]}}))fail('Financial approval history protects project deletion');}next();}));
}
module.exports={registerFinancialApproval,canonical,postApproved,recordReversal,guardAccrualRemoval};
