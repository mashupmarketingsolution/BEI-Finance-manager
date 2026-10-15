const bcrypt=require('bcryptjs');
const roles=['ADMIN','ACCOUNTS','PROJECT_MANAGER','SITE_SUPERVISOR','PROCUREMENT_OFFICER','STOREKEEPER','VIEWER'];
function newUserData(body){
 const bad=message=>{throw Object.assign(new Error(message),{status:400});};
 if(!body||typeof body!=='object'||Array.isArray(body))bad('User account details are required');
 if(typeof body.name!=='string'||!body.name.trim()||body.name.trim().length>150||/[\x00-\x1f\x7f]/.test(body.name))bad('Name must have 1–150 characters without control characters');
 if(typeof body.username!=='string'||! /^[a-zA-Z0-9][a-zA-Z0-9._-]{2,49}$/.test(body.username.trim()))bad('Username must have 3–50 letters, numbers, dots, hyphens or underscores and start with a letter or number');
 if(typeof body.password!=='string'||Array.from(body.password).length<8||Buffer.byteLength(body.password,'utf8')>72||body.password.includes('\0'))bad('Password must have at least 8 characters and at most 72 UTF-8 bytes');
 if(body.password!==body.confirmPassword)bad('Passwords do not match');
 const role=body.role===undefined?'SITE_SUPERVISOR':body.role;if(!roles.includes(role))bad('Choose a valid user role');
 return {name:body.name.trim(),username:body.username.trim().toLowerCase(),role};
}
const pages=['dashboard','projects','site-reports','leads','customers','billing','project-profit','payables','quotations','boqs','income','expenses','transactions','workers','vendors','materials','purchases','purchase-requests','rfqs','purchase-orders','categories','stock-desk','approvals','procurement-review','payment-requests','financial-requests','audit-log','documents'];
pages.push('backups');
const operations=['projects','site-reports','leads','customers','quotations','boqs','workers','vendors','materials','purchases','purchase-requests','rfqs','purchase-orders','categories'];
const finance=['billing','payables','project-profit','income','expenses','transactions','workers','payment-requests','financial-requests'];
function basePermissions(role){
 if(!roles.includes(role))return {pages:[],writePages:[],financeWrite:false};
 if(role==='STOREKEEPER')return {pages:['stock-desk'],writePages:['stock-desk'],financeWrite:false};
 if(role==='PROCUREMENT_OFFICER')return {pages:['vendors','materials','purchases','purchase-requests','rfqs','purchase-orders','stock-desk','procurement-review'],writePages:['vendors','materials','purchases','purchase-requests','rfqs','purchase-orders','procurement-review'],financeWrite:false,projectLookup:true};
 if(role==='VIEWER')return {pages:['project-profit','site-reports','stock-desk'],writePages:[],financeWrite:false};
 return {pages:role==='SITE_SUPERVISOR'?['site-reports']:role==='ADMIN'?[...pages,'user-access']:role==='ACCOUNTS'?['dashboard',...finance,'categories']:[...operations,'stock-desk','project-profit','approvals','procurement-review'],
  writePages:role==='ADMIN'?[...pages,'user-access']:role==='PROJECT_MANAGER'?[...operations,'stock-desk','approvals','procurement-review']:role==='ACCOUNTS'?finance:['site-reports'],
  projectLookup:role==='ACCOUNTS',vendorLookup:role==='ACCOUNTS',
  financeWrite:['ADMIN','ACCOUNTS'].includes(role)};
}
function permissions(role){const p=basePermissions(role);if(roles.includes(role)){if(!p.pages.includes('documents'))p.pages.push('documents');if(role!=='VIEWER'&&!p.writePages.includes('documents'))p.writePages.push('documents');}return p;}
function resource(path,method){
 const parts=path.split('/').filter(Boolean),root=parts[0];
 if(root==='auth')return ((path==='/auth/me'&&method==='GET')||(path==='/auth/password'&&method==='POST'))?'self':null;
 if(root==='access')return 'user-access';
 if(root==='users')return method==='GET'&&parts.length===1?'people':null;
 if(['site-reports','site-photos','site-tasks','site-inspections'].includes(root))return 'site-reports';
 if(root==='reports')return ['/reports/project-profit','/reports/project-profit/export'].includes(path)?'project-profit':null;
 if(root==='job-costing')return 'project-profit';
 if(root==='labour'){
  if(root&&parts[1]==='attendance'&&!parts[3])return 'attendance';
  return 'payroll';
 }
 if(root==='purchases'&&parts[2]==='payments')return 'payables';
 if(root==='stock-movements'||root==='material-prices'||root==='material-categories')return 'materials';
 if(root==='boq-items')return 'boqs';
 if(root==='purchase-request-items')return 'purchase-requests';
 if(root==='rfq-items'||root==='rfq-vendors')return 'rfqs';
 if(root==='quotation-items'||root==='quotation-payment-milestones')return 'quotations';
 return pages.includes(root)?root:null;
}
function allowed(role,path,method,effective){
 if(!roles.includes(role))return false;
 const r=resource(path,method),p=effective||permissions(role),read=['GET','HEAD'].includes(method);
 if(r==='self')return roles.includes(role);
 if(!r)return false;
 if(role==='ADMIN')return r!=='audit-log'||read;
 if(['audit-log','backups','user-access'].includes(r))return false;
 if(/^\/(payment-requests|financial-requests)\/[^/]+\/(approve|reject|reverse)\/?$/.test(path))return false;
 if(/^\/procurement-review\/[^/]+\/[^/]+\/(approve|reject)\/?$/.test(path))return role==='PROJECT_MANAGER'&&p.writePages.includes('procurement-review');
 if(/^\/site-inspections\/[^/]+\/(approve|reject)\/?$/.test(path))return role==='PROJECT_MANAGER'&&p.writePages.includes('site-reports');
 if(p.custom){
  if(read&&path==='/projects'&&p.projectLookup)return true;
  if(read&&['/vendors','/categories','/categories/expense','/categories/paginated'].includes(path)&&p.pages.some(p=>['payables','purchases','income','expenses','transactions','quotations','rfqs','purchase-orders'].includes(p)))return true;
  if(r==='people')return read&&p.pages.some(p=>['workers','site-reports','projects'].includes(p));
  const page=r==='attendance'?'site-reports':r==='payroll'?'workers':r;
  return (read?p.pages:p.writePages).includes(page);
 }
 if(role==='STOREKEEPER')return (path==='/stock-desk'&&read)||(method==='POST'&&(/^\/purchases\/\d+\/receive\/?$/.test(path)||['/stock-movements/usage','/stock-movements/return'].includes(path)));
 if(['PROJECT_MANAGER','PROCUREMENT_OFFICER'].includes(role)&&method==='DELETE'&&!['site-reports','attendance'].includes(r))return false;
 if(role==='PROCUREMENT_OFFICER'&&read&&['/projects','/categories','/categories/expense','/categories/paginated'].includes(path))return true;
 if(role==='ACCOUNTS'&&read&&['/projects','/vendors'].includes(path))return true;
 if(role==='PROCUREMENT_OFFICER'&&!read&&(path.startsWith('/stock-movements/')||/^\/purchases\/[^/]+\/receive\/?$/.test(path)))return false;
 if(r==='people')return read&&['ACCOUNTS','PROJECT_MANAGER'].includes(role);
 if(r==='attendance')return ['PROJECT_MANAGER','ACCOUNTS'].includes(role);
 if(r==='payroll')return read?['ACCOUNTS','PROJECT_MANAGER'].includes(role):path==='/labour/payroll-batches/preview'&&method==='POST'?['ACCOUNTS','PROJECT_MANAGER'].includes(role):role==='ACCOUNTS';
 if(role==='SITE_SUPERVISOR'&&path==='/projects'&&read)return true; // minimal lookup only
 return (read?p.pages:p.writePages).includes(r);
}
function accessMiddleware(req,res,next){
 if((req.path==='/auth/login'&&req.method==='POST')||(req.path==='/health'&&req.method==='GET'))return next();
 if(!allowed(req.user?.role,req.path,req.method,req.user?.permissions))return res.status(403).json({success:false,message:'Your role does not allow this action',code:'ACCESS_DENIED'});
 if(req.user?.permissions?.custom&&!req.user.permissions.pages.includes('projects')&&req.path==='/projects'){
  const json=res.json.bind(res);res.json=payload=>json(Array.isArray(payload?.data)?{...payload,data:payload.data.map(p=>({id:p.id,name:p.name,status:p.status}))}:payload);
 }
 // Site supervisors receive only project lookup fields and no financial daily activity.
 if(['SITE_SUPERVISOR','PROCUREMENT_OFFICER','STOREKEEPER','ACCOUNTS'].includes(req.user.role)){
  const path=req.path,method=req.method;
  const json=res.json.bind(res);res.json=payload=>{
   if(path==='/projects'&&Array.isArray(payload.data))payload={...payload,data:payload.data.map(p=>({id:p.id,name:p.name,status:p.status}))};
   if(path.split('/').filter(Boolean)[0]==='site-reports'&&['GET','HEAD'].includes(method)&&payload.data?.activity){const a=payload.data.activity;payload={...payload,data:{...payload.data,activity:{attendance:a.attendance.map(x=>({id:x.id,worker:x.worker,dayUnits:x.dayUnits,overtimeHours:x.overtimeHours})),financialVisible:false}}};}
   if(req.user.role==='STOREKEEPER'&&payload.data){
    const movement=m=>({id:m.id,materialId:m.materialId,projectId:m.projectId,movementType:m.movementType,quantity:m.quantity,unit:m.unit,movementDate:m.movementDate});
    if(path.startsWith('/purchases/'))payload={...payload,data:{purchaseId:payload.data.purchaseId,purchaseNo:payload.data.purchaseNo,receiveDate:payload.data.receiveDate,items:payload.data.items?.map(i=>({purchaseItem:{id:i.purchaseItem.id,materialId:i.purchaseItem.materialId,quantity:i.purchaseItem.quantity,receivedQuantity:i.purchaseItem.receivedQuantity,unit:i.purchaseItem.unit},stockMovement:movement(i.stockMovement)}))}};
    if(path.startsWith('/stock-movements/'))payload={...payload,data:movement(payload.data)};
   }
   return json(payload);
  };
 }
 next();
}
function registerUserAccess(app,prisma){
 const select={id:true,name:true,username:true,status:true,role:true,accessVersion:true,projectAssignments:{select:{projectId:true,project:{select:{id:true,name:true}}}}};
 const idsOf=body=>{if(body.projectIds===undefined)return undefined;if(!Array.isArray(body.projectIds)||body.projectIds.some(v=>!Number.isSafeInteger(v)||v<=0)||new Set(body.projectIds).size!==body.projectIds.length)throw Object.assign(new Error('Choose valid assigned projects without duplicates'),{status:400});return body.projectIds;};
 const checkProjects=async(db,ids)=>{if(ids&&await db.project.count({where:{id:{in:ids}}})!==ids.length)throw Object.assign(new Error('Some selected projects no longer exist'),{status:400});};
 app.get('/api/access/users',async(req,res)=>{try{res.json({success:true,data:await prisma.user.findMany({select,orderBy:{name:'asc'}}),projects:await prisma.project.findMany({select:{id:true,name:true},orderBy:{name:'asc'}}),roles,rolePages:Object.fromEntries(roles.map(role=>[role,permissions(role).pages]))});}catch{res.status(500).json({success:false,message:'Unable to load user access'});}});
 app.post('/api/access/users',async(req,res)=>{
  try{
   const input=newUserData(req.body),projectIds=idsOf(req.body)||[],passwordHash=await bcrypt.hash(req.body.password,12);
   const data=await prisma.$transaction(async db=>{
    await db.$queryRaw`SELECT id FROM users ORDER BY id FOR UPDATE`;
    const actor=await db.user.findUnique({where:{id:req.user.id}});
    if(actor?.role!=='ADMIN'||actor.status!=='ACTIVE')throw Object.assign(new Error('Admin access changed. Sign in again.'),{status:403});
    await checkProjects(db,projectIds);
    return db.user.create({data:{...input,passwordHash,status:'ACTIVE',projectAssignments:{create:projectIds.map(projectId=>({projectId}))}},select});
   },{isolationLevel:'Serializable',timeout:20000});
   res.status(201).json({success:true,message:'User account created',data});
  }catch(e){res.status(e.status||(e.code==='P2002'||e.code==='P2034'?409:500)).json({success:false,message:e.status?e.message:e.code==='P2002'?'Username already exists. Choose another username.':e.code==='P2034'?'User access changed concurrently. Refresh and retry.':'Unable to create user'});}
 });
 app.put('/api/access/users/:id',async(req,res)=>{
  try{
   const target=Number(req.params.id),{role,status,accessVersion}=req.body,projectIds=idsOf(req.body);
   if(!Number.isSafeInteger(target)||target<=0||!roles.includes(role)||!['ACTIVE','INACTIVE'].includes(status)||!Number.isSafeInteger(accessVersion)||accessVersion<1)throw Object.assign(new Error('Choose valid role, status and version'),{status:400});
   const data=await prisma.$transaction(async db=>{
    await db.$queryRaw`SELECT id FROM users ORDER BY id FOR UPDATE`;
    const actor=await db.user.findUnique({where:{id:req.user.id}});
    if(actor?.role!=='ADMIN'||actor.status!=='ACTIVE')throw Object.assign(new Error('Admin access changed. Sign in again.'),{status:403});
    const u=await db.user.findUnique({where:{id:target}});if(!u)throw Object.assign(new Error('User not found'),{status:404});
    if(u.accessVersion!==accessVersion)throw Object.assign(new Error('User access changed. Refresh before saving.'),{status:409});
    if(target===actor.id&&(role!=='ADMIN'||status!=='ACTIVE'))throw Object.assign(new Error('You cannot remove your own active Admin access'),{status:409});
    if(u.role==='ADMIN'&&u.status==='ACTIVE'&&(role!=='ADMIN'||status!=='ACTIVE')&&await db.user.count({where:{role:'ADMIN',status:'ACTIVE'}})<=1)throw Object.assign(new Error('Keep at least one active Admin'),{status:409});
    await checkProjects(db,projectIds);
    if(projectIds!==undefined){await db.userProjectAssignment.deleteMany({where:{userId:target}});if(projectIds.length)await db.userProjectAssignment.createMany({data:projectIds.map(projectId=>({userId:target,projectId}))});}
    return db.user.update({where:{id:target},data:{role,status,accessVersion:{increment:1}},select});
   },{isolationLevel:'Serializable',timeout:20000});
   res.json({success:true,data});
  }catch(e){res.status(e.status||(e.code==='P2034'?409:500)).json({success:false,message:e.status?e.message:e.code==='P2034'?'Access changed concurrently. Refresh and retry.':'Unable to update access'});}
 });
}
module.exports={permissions,allowed,resource,accessMiddleware,registerUserAccess,newUserData,roles,pages};
