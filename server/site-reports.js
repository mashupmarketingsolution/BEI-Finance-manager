const express=require('express');
const {dateOf}=require('./billing');
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const id=v=>{const n=Number(v);if(!Number.isSafeInteger(n)||n<=0)fail('Invalid ID');return n;};
const note=(v,max,required=false)=>{if(v==null&&!required)return null;if(typeof v!=='string'||v.trim().length>max||(required&&!v.trim()))fail('Required report text is missing or exceeds its length limit');return v.trim()||null;};
function reportData(b){
  const reportDate=dateOf(b.reportDate);
  if(b.reportDate>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Dhaka'}))fail('Site report cannot have a future date');
  if(!['string','number'].includes(typeof b.progress)||!/^\d+(\.\d{1,2})?$/.test(String(b.progress))||Number(b.progress)>100)fail('Progress must be between 0 and 100 with at most two decimals');
  return {projectId:id(b.projectId),reportDate,title:note(b.title,150,true),workSummary:note(b.workSummary,10000,true),progress:Number(b.progress),issues:note(b.issues,5000),nextPlan:note(b.nextPlan,5000),responsibleId:b.responsibleId==null||b.responsibleId===''?null:id(b.responsibleId)};
}
function validImage(data,mime){
  if(!Buffer.isBuffer(data))return false;
  if(mime==='image/png')return data.length>=8&&data.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'));
  if(mime==='image/jpeg')return data.length>=3&&data[0]===255&&data[1]===216&&data[2]===255;
  if(mime==='image/webp')return data.length>=12&&data.toString('ascii',0,4)==='RIFF'&&data.toString('ascii',8,12)==='WEBP';
  return false;
}
const user={select:{id:true,name:true}};
const include={project:{select:{id:true,name:true}},responsible:user,creator:user,editor:user,photos:{select:{id:true,name:true,mime:true,size:true,createdAt:true},orderBy:{id:'asc'}}};
const total=rows=>rows.reduce((s,r)=>s+Math.round(Number(r.amount||0)*100),0)/100;
async function photoLimit(db){const rows=await db.$queryRawUnsafe('SELECT @@max_allowed_packet AS packet');return Math.max(1,Math.min(5*1024*1024,Number(rows[0].packet)-65536));}
function registerSiteReports(app,prisma){
  const route=fn=>async(req,res,next)=>{try{await fn(req,res,next);}catch(e){res.status(e.status||(['P2002','P2003','P2034'].includes(e.code)?409:400)).json({success:false,message:e.code==='P2002'?'A report already exists for this project/date. Restore and edit an archived report instead.':e.code==='P2003'?'Choose valid linked project/users. Site history protects project deletion.':e.code==='P2034'?'Another request changed the report. Refresh and retry.':e.message});}};
  const tx=fn=>prisma.$transaction(fn,{isolationLevel:'Serializable',timeout:20000});
  async function responsible(db,value){if(value&&!await db.user.findFirst({where:{id:value,status:'ACTIVE'}}))fail('Choose an active responsible person');}
  async function locked(db,record){await db.$queryRaw`SELECT id FROM site_reports WHERE id=${record} FOR UPDATE`;const r=await db.siteReport.findUnique({where:{id:record}});if(!r)fail('Site report not found',404);return r;}
  const version=(r,v)=>{if(r.version!==id(v))fail('Report changed. Refresh and reopen it before saving.',409);};
  app.get('/api/site-reports/context',route(async(req,res)=>{const [projects,users,maxPhotoBytes]=await Promise.all([prisma.project.findMany({select:{id:true,name:true},orderBy:{name:'asc'}}),prisma.user.findMany({where:{status:'ACTIVE'},select:{id:true,name:true},orderBy:{name:'asc'}}),photoLimit(prisma)]);res.json({success:true,data:{projects,users,currentUserId:req.user.id,maxPhotoBytes}});}));
  app.get('/api/site-reports',route(async(req,res)=>{
    const state=req.query.state||'ACTIVE';if(!['ACTIVE','ARCHIVED','ALL'].includes(state))fail('Invalid report filter');
    const where={...(state==='ACTIVE'?{archivedAt:null}:state==='ARCHIVED'?{archivedAt:{not:null}}:{}),...(req.query.projectId?{projectId:id(req.query.projectId)}:{})};
    if(req.query.from||req.query.to){where.reportDate={};if(req.query.from)where.reportDate.gte=dateOf(req.query.from);if(req.query.to)where.reportDate.lte=dateOf(req.query.to);if(where.reportDate.gte>where.reportDate.lte)fail('Invalid date range');}
    const search=String(req.query.search||'').trim();if(search)where.OR=['title','workSummary','issues','nextPlan'].map(field=>({[field]:{contains:search}}));
    const data=await prisma.siteReport.findMany({where,include,orderBy:[{reportDate:'desc'},{id:'desc'}]});res.json({success:true,data});
  }));
  app.get('/api/site-reports/:id',route(async(req,res)=>{
    const r=await prisma.siteReport.findUnique({where:{id:id(req.params.id)},include:{...include,tasks:{include:{task:{select:{id:true,title:true,status:true,priority:true,dueDate:true,archivedAt:true}}}}}});if(!r)fail('Site report not found',404);
    const end=new Date(r.reportDate);end.setUTCDate(end.getUTCDate()+1);const day={gte:r.reportDate,lt:end};
    const [attendance,transactions,purchases,payments]=await Promise.all([prisma.workerAttendance.findMany({where:{projectId:r.projectId,workDate:day},include:{worker:{select:{name:true}}}}),prisma.transaction.findMany({where:{projectId:r.projectId,transactionDate:day}}),prisma.purchase.findMany({where:{projectId:r.projectId,purchaseDate:day},select:{grandTotal:true}}),prisma.purchasePayment.findMany({where:{purchase:{projectId:r.projectId},paymentDate:day}})]);
    res.json({success:true,data:{...r,activity:{attendance,attendanceWagePreview:attendance.reduce((s,a)=>s+Math.round(Number(a.amount)*100),0)/100,purchasesRecorded:purchases.reduce((s,p)=>s+Math.round(Number(p.grandTotal)*100),0)/100,cashReceived:total(transactions.filter(t=>t.type==='INCOME')),cashPaid:total(transactions.filter(t=>t.type==='EXPENSE'&&!['PURCHASE','PURCHASE_PAYMENT'].includes(t.source)))+total(payments)}}});
  }));
  app.post('/api/site-reports',route(async(req,res)=>{const data=reportData(req.body);const result=await tx(async db=>{await responsible(db,data.responsibleId);return db.siteReport.create({data:{...data,createdById:req.user.id,updatedById:req.user.id},include});});res.status(201).json({success:true,data:result});}));
  app.put('/api/site-reports/:id',route(async(req,res)=>{const data=reportData(req.body);const result=await tx(async db=>{const r=await locked(db,id(req.params.id));version(r,req.body.version);if(r.archivedAt)fail('Restore this report before editing',409);if(r.projectId!==data.projectId&&await db.siteTaskReport.count({where:{reportId:r.id}}))fail('Unlink site tasks before changing the report project',409);await responsible(db,data.responsibleId);return db.siteReport.update({where:{id:r.id},data:{...data,updatedById:req.user.id,version:{increment:1}},include});});res.json({success:true,data:result});}));
  for(const action of ['archive','restore'])app.post('/api/site-reports/:id/'+action,route(async(req,res)=>{const data=await tx(async db=>{const r=await locked(db,id(req.params.id));version(r,req.body.version);if(action==='archive'?!!r.archivedAt:!r.archivedAt)fail('Report is already in that state');return db.siteReport.update({where:{id:r.id},data:{archivedAt:action==='archive'?new Date():null,updatedById:req.user.id,version:{increment:1}},include});});res.json({success:true,data});}));
  const raw=express.raw({type:['image/png','image/jpeg','image/webp'],limit:'5mb'});
  app.post('/api/site-reports/:id/photos',(req,res,next)=>raw(req,res,e=>e?res.status(e.status||400).json({success:false,message:'Photo exceeds the 5 MB upload limit'}):next()),route(async(req,res)=>{
    const mime=String(req.headers['content-type']||'').split(';')[0],data=req.body;
    if(!validImage(data,mime))fail('Upload a valid JPEG, PNG or WebP photo');
    let name;try{name=decodeURIComponent(String(req.headers['x-file-name']||''));}catch{fail('Invalid photo name');}
    name=name.split(/[\\/]/).pop();if(!name?.trim()||name.length>150||/[\x00-\x1f\x7f]/.test(name))fail('Photo name must have 1–150 characters');
    const result=await tx(async db=>{const r=await locked(db,id(req.params.id));if(r.archivedAt)fail('Restore report before adding photos',409);const max=await photoLimit(db);if(data.length>max)fail('Photo exceeds this server limit of '+(max/1024/1024).toFixed(2)+' MB',413);if(await db.sitePhoto.count({where:{reportId:r.id}})>=10)fail('Maximum 10 photos per report');const photo=await db.sitePhoto.create({data:{reportId:r.id,name:name.trim(),mime,size:data.length,data},select:{id:true,name:true,mime:true,size:true}});await db.siteReport.update({where:{id:r.id},data:{updatedById:req.user.id,version:{increment:1}}});return photo;});res.status(201).json({success:true,data:result});
  }));
  app.get('/api/site-photos/:id',route(async(req,res)=>{const p=await prisma.sitePhoto.findUnique({where:{id:id(req.params.id)}});if(!p)fail('Photo not found',404);res.set({'Content-Type':p.mime,'X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store','Content-Disposition':"inline; filename*=UTF-8''"+encodeURIComponent(p.name)});res.send(Buffer.from(p.data));}));
  app.delete('/api/site-reports/:id/photos/:photoId',route(async(req,res)=>{await tx(async db=>{const r=await locked(db,id(req.params.id));if(r.archivedAt)fail('Restore report before removing photos',409);const photo=await db.sitePhoto.findFirst({where:{id:id(req.params.photoId),reportId:r.id}});if(!photo)fail('Photo not found',404);await db.sitePhoto.delete({where:{id:photo.id}});await db.siteReport.update({where:{id:r.id},data:{version:{increment:1},updatedById:req.user.id}});});res.json({success:true});}));
  app.use('/api/projects/:id',route(async(req,res,next)=>{if(req.method==='DELETE'&&req.path==='/'&&await prisma.siteReport.count({where:{projectId:id(req.params.id)}}))fail('This project has site report history and cannot be deleted. Keep it for its history.',409);next();}));
}
module.exports={registerSiteReports,reportData,validImage};
