const {dateOf}=require('./billing');
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const id=v=>{const n=Number(v);if(!Number.isSafeInteger(n)||n<=0)fail('Invalid ID');return n;};
const text=(v,max,required=false)=>{if(v==null&&!required)return null;if(typeof v!=='string'||v.trim().length>max||(required&&!v.trim()))fail('Task text is missing or too long');return v.trim()||null;};
const statuses=['PENDING','IN_PROGRESS','COMPLETED'],priorities=['LOW','NORMAL','HIGH','URGENT'];
function taskData(b){
 const startDate=dateOf(b.startDate),dueDate=dateOf(b.dueDate);
 if(startDate>dueDate)fail('Due date must be on or after the start date');
 if(!statuses.includes(b.status)||!priorities.includes(b.priority))fail('Choose a valid task status and priority');
 if(!Array.isArray(b.reportIds)||b.reportIds.length>100)fail('Choose at most 100 daily reports');
 const reportIds=b.reportIds.map(id);if(new Set(reportIds).size!==reportIds.length)fail('Duplicate report links');
 return {data:{projectId:id(b.projectId),title:text(b.title,150,true),description:text(b.description,10000),blockers:text(b.blockers,5000),startDate,dueDate,status:b.status,priority:b.priority,responsibleId:b.responsibleId==null||b.responsibleId===''?null:id(b.responsibleId)},reportIds};
}
const person={select:{id:true,name:true}};
const include={project:{select:{id:true,name:true}},responsible:person,creator:person,editor:person,reports:{include:{report:{select:{id:true,title:true,reportDate:true,archivedAt:true}}},orderBy:{reportId:'asc'}}};
const today=()=>new Date(new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Dhaka'}));
function registerSiteTasks(app,prisma){
 const route=fn=>async(req,res,next)=>{try{await fn(req,res,next);}catch(e){res.status(e.status||(['P2003','P2034'].includes(e.code)?409:400)).json({success:false,message:e.code==='P2003'?'Choose valid project/users; task history protects deletion.':e.code==='P2034'?'Another request changed this task. Refresh and retry.':e.message});}};
 const tx=fn=>prisma.$transaction(fn,{isolationLevel:'Serializable',timeout:20000});
 async function locked(db,value,version){await db.$queryRaw`SELECT id FROM site_tasks WHERE id=${value} FOR UPDATE`;const r=await db.siteTask.findUnique({where:{id:value}});if(!r)fail('Site task not found',404);if(r.version!==id(version))fail('Task changed. Refresh and reopen before saving.',409);return r;}
 async function links(db,projectId,reportIds,oldIds=[]){
  for(const reportId of [...new Set([...reportIds,...oldIds])].sort((a,b)=>a-b)){
   await db.$queryRaw`SELECT id FROM site_reports WHERE id=${reportId} FOR UPDATE`;
   const r=await db.siteReport.findUnique({where:{id:reportId}});
   if(!r||r.projectId!==projectId)fail('Linked reports must belong to this project');
   if(r.archivedAt&&reportIds.includes(reportId)!==oldIds.includes(reportId))fail('Restore the daily report before changing its task links',409);
  }
 }
 async function responsible(db,value){if(value&&!await db.user.findFirst({where:{id:value,status:'ACTIVE'}}))fail('Choose an active responsible person');}
 app.get('/api/site-tasks',route(async(req,res)=>{
  const q=req.query,state=q.state||'ACTIVE';if(!['ACTIVE','ARCHIVED','ALL'].includes(state))fail('Invalid task state');
  const where={...(state==='ACTIVE'?{archivedAt:null}:state==='ARCHIVED'?{archivedAt:{not:null}}:{})};
  if(q.projectId)where.projectId=id(q.projectId);if(q.responsibleId)where.responsibleId=id(q.responsibleId);
  if(q.status){if(!statuses.includes(q.status))fail('Invalid task status');where.status=q.status;}
  if(q.priority){if(!priorities.includes(q.priority))fail('Invalid task priority');where.priority=q.priority;}
  if(q.overdue==='true'){where.dueDate={lt:today()};where.status=q.status?{equals:q.status,not:'COMPLETED'}:{not:'COMPLETED'};where.archivedAt=null;}
  const search=text(String(q.search||''),150);if(search)where.OR=['title','description','blockers'].map(k=>({[k]:{contains:search}}));
  const data=await prisma.siteTask.findMany({where,include,orderBy:[{dueDate:'asc'},{id:'desc'}]});res.json({success:true,data:data.map(r=>({...r,overdue:!r.archivedAt&&r.status!=='COMPLETED'&&r.dueDate<today()}))});
 }));
 app.post('/api/site-tasks',route(async(req,res)=>{
  const {data,reportIds}=taskData(req.body);const result=await tx(async db=>{await responsible(db,data.responsibleId);await links(db,data.projectId,reportIds);return db.siteTask.create({data:{...data,createdById:req.user.id,updatedById:req.user.id,completedAt:data.status==='COMPLETED'?new Date():null,reports:{create:reportIds.map(reportId=>({reportId}))}},include});});res.status(201).json({success:true,data:result});
 }));
 app.put('/api/site-tasks/:id',route(async(req,res)=>{
  const {data,reportIds}=taskData(req.body);const result=await tx(async db=>{
   const r=await locked(db,id(req.params.id),req.body.version);if(r.archivedAt)fail('Restore task before editing',409);if(r.projectId!==data.projectId)fail('Task project cannot be changed; archive it and create a task in the correct project');
   await responsible(db,data.responsibleId);const old=await db.siteTaskReport.findMany({where:{taskId:r.id}});await links(db,r.projectId,reportIds,old.map(l=>l.reportId));
   await db.siteTaskReport.deleteMany({where:{taskId:r.id}});
   return db.siteTask.update({where:{id:r.id},data:{...data,updatedById:req.user.id,version:{increment:1},completedAt:data.status==='COMPLETED'?(r.completedAt||new Date()):null,reports:{create:reportIds.map(reportId=>({reportId}))}},include});
  });res.json({success:true,data:result});
 }));
 for(const action of ['archive','restore'])app.post('/api/site-tasks/:id/'+action,route(async(req,res)=>{const data=await tx(async db=>{const r=await locked(db,id(req.params.id),req.body.version);if(action==='archive'?!!r.archivedAt:!r.archivedAt)fail('Task is already in that state');return db.siteTask.update({where:{id:r.id},data:{archivedAt:action==='archive'?new Date():null,version:{increment:1},updatedById:req.user.id},include});});res.json({success:true,data});}));
 app.use('/api/projects/:id',route(async(req,res,next)=>{if(req.method==='DELETE'&&req.path==='/'&&await prisma.siteTask.count({where:{projectId:id(req.params.id)}}))fail('This project has site task history and cannot be deleted',409);next();}));
}
module.exports={registerSiteTasks,taskData};
