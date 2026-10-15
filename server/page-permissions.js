const {permissions,roles,pages}=require('./access-control');
const locked=new Set(['user-access','backups','audit-log']);
const editable=pages.filter(p=>!locked.has(p));
function validate(body){
 if(!body||!Array.isArray(body.pages)||!Array.isArray(body.writePages)||body.pages.some(p=>!editable.includes(p))||body.writePages.some(p=>!body.pages.includes(p))||new Set(body.pages).size!==body.pages.length||new Set(body.writePages).size!==body.writePages.length)throw Object.assign(Error('Choose valid pages; edit access also requires view access'),{status:400});
 return {pages:[...body.pages].sort(),writePages:[...body.writePages].sort()};
}
async function effectivePermissions(db,user){
 if(user.role==='ADMIN')return permissions('ADMIN');
 const rows=await db.pagePermission.findMany({where:{subject:{in:['role:'+user.role,'user:'+user.id]}}});
 const row=rows.find(r=>r.subject==='user:'+user.id)||rows.find(r=>r.subject==='role:'+user.role);
 if(!row)return permissions(user.role);
 const p=validate(row.permissions);return {...p,custom:true,financeWrite:p.writePages.some(p=>['billing','payables','income','expenses','transactions','workers','project-profit'].includes(p)),projectLookup:p.pages.length>0,vendorLookup:p.pages.some(p=>['payables','purchases','purchase-orders','rfqs'].includes(p))};
}
function registerPagePermissions(app,db){
 const admin=(req,res,next)=>req.user?.role==='ADMIN'?next():res.status(403).json({success:false,message:'Admin access required'});
 const subjectOf=value=>{
  if(value.startsWith('role:')&&roles.includes(value.slice(5))&&value!=='role:ADMIN')return value;
  if(/^user:[1-9]\d*$/.test(value)&&Number.isSafeInteger(Number(value.slice(5))))return value;
  throw Object.assign(Error('Choose a non-Admin role or user'),{status:400});
 };
 app.get('/api/access/page-permissions',admin,async(req,res)=>{try{
  const policies=await db.pagePermission.findMany({orderBy:{subject:'asc'}});
  res.json({success:true,data:{pages:editable,roles:roles.filter(r=>r!=='ADMIN'),defaults:Object.fromEntries(roles.map(r=>[r,permissions(r)])),policies}});
 }catch{res.status(503).json({success:false,message:'Page permissions are unavailable. Complete the database migration before using this feature'});}});
 app.put('/api/access/page-permissions/:subject',admin,async(req,res)=>{try{
  const subject=subjectOf(req.params.subject),reset=req.body?.reset===true,version=req.body?.version;
  if(!Number.isSafeInteger(version)||version<0)throw Object.assign(Error('Refresh permissions before saving'),{status:400});
  const policy=reset?null:validate(req.body);
  const data=await db.$transaction(async tx=>{
   await tx.$queryRaw`SELECT id FROM users ORDER BY id FOR UPDATE`;
   const actor=await tx.user.findUnique({where:{id:req.user.id}});if(actor?.role!=='ADMIN'||actor.status!=='ACTIVE')throw Object.assign(Error('Active Admin access required'),{status:403});
   if(subject.startsWith('user:')){const target=await tx.user.findUnique({where:{id:Number(subject.slice(5))}});if(!target)throw Object.assign(Error('User not found'),{status:404});if(target.role==='ADMIN')throw Object.assign(Error('Admin access cannot be restricted'),{status:400});}
   const current=await tx.pagePermission.findUnique({where:{subject}});if((current?.version||0)!==version)throw Object.assign(Error('Permissions changed. Refresh and review before saving'),{status:409});
   if(reset){if(current)await tx.pagePermission.delete({where:{subject}});return null;}
   return tx.pagePermission.upsert({where:{subject},create:{subject,permissions:policy,version:1},update:{permissions:policy,version:{increment:1}}});
  },{isolationLevel:'Serializable',timeout:20000});
  res.json({success:true,data,message:reset?'Default access restored':'Page access updated. It applies to the next API request'});
 }catch(e){res.status(e.status||(e.code==='P2034'?409:500)).json({success:false,message:e.status?e.message:'Unable to save permissions. Refresh and retry'});}});
}
module.exports={effectivePermissions,registerPagePermissions,validate,editable};
