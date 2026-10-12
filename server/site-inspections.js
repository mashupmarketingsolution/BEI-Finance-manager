const {dateOf}=require('./billing');
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const id=v=>{const n=Number(v);if(!Number.isSafeInteger(n)||n<=0)fail('Invalid ID');return n;};
const optionalId=v=>v==null||v===''?null:id(v);
const text=(v,max,required=false)=>{if(v==null&&!required)return null;if(typeof v!=='string'||v.trim().length>max||(required&&!v.trim()))fail('Inspection text is missing or too long');return v.trim()||null;};
const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Dhaka'});
function inspectionData(b){
 const inspectionDate=dateOf(b.inspectionDate);if(b.inspectionDate>today())fail('Inspection date cannot be in the future');
 if(!Array.isArray(b.checklist)||!b.checklist.length||b.checklist.length>100)fail('Include 1–100 checklist items');
 const keys=new Set();
 const checklist=b.checklist.map(i=>{
  if(!i||typeof i!=='object'||typeof i.key!=='string'||! /^[a-zA-Z0-9_-]{1,64}$/.test(i.key)||keys.has(i.key))fail('Checklist item keys must be unique');keys.add(i.key);
  if(!['PENDING','PASS','FAIL','NA'].includes(i.result))fail('Choose a valid checklist result');
  const item={key:i.key,label:text(i.label,250,true),result:i.result,issue:text(i.issue,2000),action:text(i.action,2000),ownerId:optionalId(i.ownerId),dueDate:i.dueDate?String(i.dueDate):null,correction:i.correction||'OPEN',verification:text(i.verification,2000)};
  if(!['OPEN','FIXED','VERIFIED'].includes(item.correction))fail('Invalid correction status');
  if(item.dueDate)dateOf(item.dueDate);
  if(item.result==='FAIL'){
   if(!item.issue)fail('Failed checks need an issue description');
   if(item.correction!=='OPEN'&&(!item.action||!item.ownerId||!item.dueDate))fail('Fixed issues need corrective action, owner and due date');
   if(item.correction==='VERIFIED'&&!item.verification)fail('Verified corrections need recheck notes');
  }else if(item.issue||item.action||item.ownerId||item.dueDate||item.verification||item.correction!=='OPEN')fail('Correction details belong only to failed checks');
  return item;
 });
 return {projectId:id(b.projectId),taskId:optionalId(b.taskId),reportId:optionalId(b.reportId),title:text(b.title,150,true),inspectionDate,inspectorId:id(b.inspectorId),notes:text(b.notes,5000),checklist};
}
function ready(checklist){return checklist.length>0&&checklist.every(i=>i.result==='PASS'||i.result==='NA'||(i.result==='FAIL'&&i.correction==='VERIFIED'&&i.issue&&i.action&&i.ownerId&&i.dueDate&&i.verification));}
function stamp(data,old,actor){
 for(const previous of old)if(previous.result==='FAIL'&&!data.checklist.some(i=>i.key===previous.key&&i.result==='FAIL'))fail('Recorded failed checks must be retained; use corrective action and recheck',409);
 data.checklist=data.checklist.map(i=>{
  if(i.result!=='FAIL'||i.correction!=='VERIFIED')return i;
  const previous=old.find(p=>p.key===i.key),unchanged=previous?.correction==='VERIFIED'&&['issue','action','ownerId','dueDate','verification'].every(k=>previous[k]===i[k]);
  return {...i,verifiedById:unchanged?previous.verifiedById:actor,verifiedAt:unchanged?previous.verifiedAt:new Date().toISOString()};
 });
}
const person={select:{id:true,name:true}};
const include={project:{select:{id:true,name:true}},task:{select:{id:true,title:true,archivedAt:true}},report:{select:{id:true,title:true,reportDate:true,archivedAt:true}},inspector:person,creator:person,editor:person,approvalEvents:{include:{actor:person},orderBy:{id:'asc'}}};
function registerSiteInspections(app,prisma){
 const route=fn=>async(req,res,next)=>{try{await fn(req,res,next);}catch(e){res.status(e.status||(['P2003','P2034'].includes(e.code)?409:400)).json({success:false,message:e.code==='P2003'?'Choose valid linked records; inspection history protects deletion.':e.code==='P2034'?'Inspection changed concurrently. Refresh and retry.':e.message});}};
 const tx=fn=>prisma.$transaction(fn,{isolationLevel:'Serializable',timeout:20000});
 async function locked(db,value,version){await db.$queryRaw`SELECT id FROM site_inspections WHERE id=${value} FOR UPDATE`;const r=await db.siteInspection.findUnique({where:{id:value}});if(!r)fail('Inspection not found',404);if(r.version!==id(version))fail('Inspection changed. Refresh and reopen before saving.',409);return r;}
 async function actor(db,req){await db.$queryRaw`SELECT id FROM users WHERE id=${req.user.id} FOR UPDATE`;const u=await db.user.findUnique({where:{id:req.user.id}});if(!u||u.status!=='ACTIVE'||!['ADMIN','PROJECT_MANAGER','SITE_SUPERVISOR'].includes(u.role))fail('Your access no longer allows inspection changes',403);return u;}
 const snapshot=r=>({title:r.title,projectId:r.projectId,inspectionDate:r.inspectionDate.toISOString(),inspectorId:r.inspectorId,taskId:r.taskId,reportId:r.reportId,checklist:r.checklist,notes:r.notes,version:r.version});
 const event=(db,r,u,action,notes=null)=>db.inspectionApproval.create({data:{inspectionId:r.id,actorId:u.id,actorRole:u.role,action,notes,snapshot:snapshot(r)}});
 async function validateLinks(db,data,old={}){
  for(const field of ['taskId','reportId'])for(const value of [...new Set([data[field],old[field]].filter(Boolean))].sort((a,b)=>a-b)){
   if(field==='taskId')await db.$queryRaw`SELECT id FROM site_tasks WHERE id=${value} FOR UPDATE`;else await db.$queryRaw`SELECT id FROM site_reports WHERE id=${value} FOR UPDATE`;
   const r=await db[field==='taskId'?'siteTask':'siteReport'].findUnique({where:{id:value}});
   if(!r||r.projectId!==data.projectId)fail('Linked task and report must belong to the inspection project');
   if(r.archivedAt&&data[field]!==old[field])fail('Restore linked records before changing inspection links',409);
  }
  const owners=[...new Set([data.inspectorId,...data.checklist.map(i=>i.ownerId).filter(Boolean)])];
  if(await db.user.count({where:{id:{in:owners},status:'ACTIVE'}})!==owners.length)fail('Choose active users for inspector and corrective action owners');
 }
 app.get('/api/site-inspections',route(async(req,res)=>{
  const q=req.query,state=q.state||'ACTIVE';if(!['ACTIVE','ARCHIVED','ALL'].includes(state))fail('Invalid inspection state');
  const where={...(state==='ACTIVE'?{archivedAt:null}:state==='ARCHIVED'?{archivedAt:{not:null}}:{})};
  if(q.projectId)where.projectId=id(q.projectId);if(q.inspectorId)where.inspectorId=id(q.inspectorId);
  if(q.status){if(!['DRAFT','COMPLETED'].includes(q.status))fail('Invalid inspection status');where.status=q.status;}
  const search=text(String(q.search||''),150);if(search)where.OR=[{title:{contains:search}},{notes:{contains:search}}];
  let data=await prisma.siteInspection.findMany({where,include,orderBy:[{inspectionDate:'desc'},{id:'desc'}]});
  data=data.map(r=>({...r,openIssues:r.checklist.filter(i=>i.result==='FAIL'&&i.correction!=='VERIFIED').length,overdueIssues:r.checklist.filter(i=>!r.archivedAt&&i.result==='FAIL'&&i.correction!=='VERIFIED'&&i.dueDate&&i.dueDate<today()).length}));
  if(q.issues==='OPEN')data=data.filter(r=>r.openIssues>0);else if(q.issues==='OVERDUE')data=data.filter(r=>r.overdueIssues>0);else if(q.issues)fail('Invalid issue filter');
  res.json({success:true,data});
 }));
 app.post('/api/site-inspections',route(async(req,res)=>{const data=inspectionData(req.body);const result=await tx(async db=>{await validateLinks(db,data);stamp(data,[],req.user.id);return db.siteInspection.create({data:{...data,createdById:req.user.id,updatedById:req.user.id},include});});res.status(201).json({success:true,data:result});}));
 app.put('/api/site-inspections/:id',route(async(req,res)=>{const data=inspectionData(req.body);const result=await tx(async db=>{const r=await locked(db,id(req.params.id),req.body.version);if(r.archivedAt||r.status==='COMPLETED')fail('Restore/reopen inspection before editing',409);if(r.projectId!==data.projectId)fail('Inspection project cannot be changed');await validateLinks(db,data,r);stamp(data,r.checklist,req.user.id);return db.siteInspection.update({where:{id:r.id},data:{...data,version:{increment:1},updatedById:req.user.id},include});});res.json({success:true,data:result});}));
 for(const action of ['complete','reopen','archive','restore'])app.post('/api/site-inspections/:id/'+action,route(async(req,res)=>{
  const data=await tx(async db=>{const r=await locked(db,id(req.params.id),req.body.version);const update={version:{increment:1},updatedById:req.user.id};
   if(action==='complete'||action==='reopen'){
    if(r.archivedAt)fail('Restore inspection first',409);
    if(action==='complete'){if(r.status!=='DRAFT')fail('Inspection already completed');if(!ready(r.checklist))fail('Finish all checklist items and verify every failed check before completing',409);update.status='COMPLETED';update.completedAt=new Date();}
    else{if(r.status!=='COMPLETED')fail('Only completed inspections can be reopened');if(r.approvalState==='SUBMITTED')fail('Pending inspections must be reviewed before reopening',409);const u=await actor(db,req);if(r.approvalState==='APPROVED'&&!['ADMIN','PROJECT_MANAGER'].includes(u.role))fail('Only a reviewer can reopen an approved inspection',403);const notes=text(req.body.notes,2000,r.approvalState!=='NOT_SUBMITTED');await event(db,r,u,'REOPEN',notes);update.status='DRAFT';update.completedAt=null;update.approvalState='NOT_SUBMITTED';}
   }else{if(r.approvalState==='SUBMITTED')fail('Pending inspections cannot be archived or restored',409);if(action==='archive'?!!r.archivedAt:!r.archivedAt)fail('Inspection already in that state');update.archivedAt=action==='archive'?new Date():null;}
   return db.siteInspection.update({where:{id:r.id},data:update,include});
  });res.json({success:true,data});
 }));
 app.get('/api/approvals/inspections',route(async(req,res)=>{const state=req.query.state||'SUBMITTED';if(!['SUBMITTED','APPROVED','REJECTED'].includes(state))fail('Invalid approval state');const data=await prisma.siteInspection.findMany({where:{approvalState:state,...(state==='SUBMITTED'?{archivedAt:null}:{})},include,orderBy:{updatedAt:'desc'}});res.json({success:true,data});}));
 for(const action of ['submit','approve','reject'])app.post('/api/site-inspections/:id/'+action,route(async(req,res)=>{
  const data=await tx(async db=>{
   const r=await locked(db,id(req.params.id),req.body.version),u=await actor(db,req);if(r.archivedAt||r.status!=='COMPLETED')fail('Complete and restore inspection before submitting/reviewing',409);
   const notes=text(req.body.notes,2000,action==='reject');
   if(action==='submit'){if(r.approvalState!=='NOT_SUBMITTED'||!ready(r.checklist))fail('Reopen rejected inspections, finish corrections and complete before submitting',409);}
   else{
    if(!['ADMIN','PROJECT_MANAGER'].includes(u.role))fail('Only Admin or Project Manager can review inspections',403);
    if(r.approvalState!=='SUBMITTED')fail('Inspection is not pending approval',409);
    const submitted=await db.inspectionApproval.findFirst({where:{inspectionId:r.id,action:'SUBMIT'},orderBy:{id:'desc'}});
    if(submitted?.actorId===u.id||r.createdById===u.id||r.inspectorId===u.id)fail('Creator, inspector and submitter cannot approve/reject their own inspection',403);
   }
   await event(db,r,u,action.toUpperCase(),notes);
   return db.siteInspection.update({where:{id:r.id},data:{approvalState:action==='submit'?'SUBMITTED':action==='approve'?'APPROVED':'REJECTED',version:{increment:1},updatedById:u.id},include});
  });res.json({success:true,data});
 }));
 app.use('/api/projects/:id',route(async(req,res,next)=>{if(req.method==='DELETE'&&req.path==='/'&&await prisma.siteInspection.count({where:{projectId:id(req.params.id)}}))fail('This project has inspection history and cannot be deleted',409);next();}));
}
module.exports={registerSiteInspections,inspectionData,ready};
