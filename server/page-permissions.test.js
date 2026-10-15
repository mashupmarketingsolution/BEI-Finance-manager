const test=require('node:test'),assert=require('node:assert/strict'),express=require('express');
const {effectivePermissions,validate,registerPagePermissions}=require('./page-permissions');
const {permissions,allowed}=require('./access-control');
test('default policies are unchanged and user overrides win over role policies',async()=>{
 const user={id:8,role:'PROJECT_MANAGER'},db={pagePermission:{findMany:async()=>[]}};
 assert.deepEqual(await effectivePermissions(db,user),permissions(user.role));
 db.pagePermission.findMany=async()=>[{subject:'role:PROJECT_MANAGER',permissions:{pages:['customers','projects'],writePages:['customers']}},{subject:'user:8',permissions:{pages:['project-profit'],writePages:[]}}];
 const p=await effectivePermissions(db,user);assert.deepEqual(p.pages,['project-profit']);assert.equal(allowed(user.role,'/customers','GET',p),false);assert.equal(allowed(user.role,'/reports/project-profit','GET',p),true);assert.equal(allowed(user.role,'/projects/8','GET',p),false);assert.equal(allowed(user.role,'/projects','GET',p),true);
 assert.deepEqual(await effectivePermissions(db,{id:1,role:'ADMIN'}),permissions('ADMIN'));
});
test('local real database policy changes apply to an existing signed-in token',{skip:process.env.BEI_PAGE_ACCESS_INTEGRATION!=='true'},async()=>{
 require('dotenv').config({quiet:true});assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname),'Local integration only');
 const {app,prisma}=require('./server'),jwt=require('jsonwebtoken'),crypto=require('node:crypto'),tag='page_access_'+crypto.randomBytes(6).toString('hex'),users=[];
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 try{
  for(const role of ['ADMIN','STOREKEEPER'])users.push(await prisma.user.create({data:{name:tag,username:tag+'_'+role,role,passwordHash:'test-only'}}));
  const [admin,user]=users,tokens=Object.fromEntries(users.map(u=>[u.id,jwt.sign({userId:u.id},process.env.JWT_SECRET,{expiresIn:'5m'})]));
  const call=async(u,p,method='GET',body)=>{const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/'+p,{method,headers:{Authorization:'Bearer '+tokens[u.id],'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,...await r.json()};};
  assert.equal((await call(user,'customers')).status,403);
  const endpoint='access/page-permissions/user:'+user.id;
  assert.equal((await call(admin,endpoint,'PUT',{pages:['customers'],writePages:[],version:0})).status,200);
  assert.equal((await call(user,'customers')).status,200);assert.equal((await call(user,'customers','POST',{})).status,403);
  assert.deepEqual((await call(user,'auth/me')).data.user.permissions.pages,['customers']);
  assert.equal((await call(admin,endpoint,'PUT',{pages:[],writePages:[],version:1})).status,200);assert.equal((await call(user,'customers')).status,403);
  assert.equal((await call(admin,endpoint,'PUT',{reset:true,version:2})).status,200);assert.equal((await call(user,'stock-desk')).status,200);
 }finally{
  const ids=users.map(u=>u.id);await prisma.pagePermission.deleteMany({where:{subject:{in:ids.map(id=>'user:'+id)}}});await prisma.auditEvent.deleteMany({where:{actorId:{in:ids}}});await prisma.user.deleteMany({where:{id:{in:ids}}});await new Promise(r=>server.close(r));await prisma.$disconnect();
 }
});
test('custom pages enforce view/write, deny all, protected Admin pages and approval rules',()=>{
 for(const page of ['backups','user-access','audit-log','unknown'])assert.throws(()=>validate({pages:[page],writePages:[]}));
 assert.throws(()=>validate({pages:['customers'],writePages:['income']}));assert.throws(()=>validate({pages:['customers','customers'],writePages:[]}));
 const p={...validate({pages:['customers','income','site-reports'],writePages:['customers','site-reports']}),custom:true};
 assert.equal(allowed('VIEWER','/customers','POST',p),true);assert.equal(allowed('VIEWER','/income','POST',p),false);
 assert.equal(allowed('VIEWER','/site-inspections/1/approve','POST',p),false);assert.equal(allowed('PROJECT_MANAGER','/site-inspections/1/approve','POST',p),true);
 for(const path of ['/access/users','/audit-log','/backups/restore','/payment-requests/1/approve'])assert.equal(allowed('PROJECT_MANAGER',path,'POST',p),false);
 const empty={pages:[],writePages:[],custom:true};for(const path of ['/projects','/customers','/users','/labour/attendance'])assert.equal(allowed('ACCOUNTS',path,'GET',empty),false);assert.equal(allowed('ACCOUNTS','/auth/me','GET',empty),true);
});
test('Admin policy API rejects other roles, stale versions and Admin overrides, then supports reset',async()=>{
 let row=null;const db={user:{findUnique:async({where})=>({id:where.id,role:where.id===1?'ADMIN':'PROJECT_MANAGER',status:'ACTIVE'})},$queryRaw:async()=>[],pagePermission:{findMany:async()=>row?[row]:[],findUnique:async()=>row,upsert:async({create,update})=>(row=row?{...row,permissions:update.permissions,version:row.version+1}:create),delete:async()=>{row=null;}}};db.$transaction=async f=>f(db);
 const app=express();app.use(express.json());app.use((req,res,next)=>{req.user={id:1,role:req.headers['x-role']||'ADMIN'};next();});registerPagePermissions(app,db);const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port+'/api/access/page-permissions';
 const put=(subject,body,role='ADMIN')=>fetch(base+'/'+subject,{method:'PUT',headers:{'Content-Type':'application/json','x-role':role},body:JSON.stringify(body)});
 try{
  for(const role of ['VIEWER','ACCOUNTS','PROJECT_MANAGER','SITE_SUPERVISOR','PROCUREMENT_OFFICER','STOREKEEPER']){assert.equal((await fetch(base,{headers:{'x-role':role}})).status,403);assert.equal((await put('role:VIEWER',{},role)).status,403);}
  const policy={pages:['customers'],writePages:[],version:0};assert.equal((await put('role:ADMIN',policy)).status,400);assert.equal((await put('user:1',policy)).status,400);
  assert.equal((await put('role:VIEWER',policy)).status,200);assert.equal(row.version,1);assert.equal((await put('role:VIEWER',policy)).status,409);
  assert.equal((await put('role:VIEWER',{version:1,reset:true})).status,200);assert.equal(row,null);
 }finally{await new Promise(r=>server.close(r));}
});
