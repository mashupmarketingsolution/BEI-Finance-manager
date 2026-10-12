const test=require('node:test'),assert=require('node:assert/strict');
const {permissions,allowed}=require('./access-control');
test('role policy covers reads, writes, nested aliases and fails closed',()=>{
 assert.ok(permissions('ADMIN').pages.includes('user-access'));assert.deepEqual(permissions('SITE_SUPERVISOR').pages,['site-reports']);
 for(const role of ['ADMIN','ACCOUNTS','PROJECT_MANAGER','SITE_SUPERVISOR','PROCUREMENT_OFFICER','STOREKEEPER','VIEWER'])assert.equal(allowed(role,'/auth/me','GET'),true);
 for(const path of ['/billing/invoices','/payables','/income','/expenses','/transactions','/reports/project-profit','/labour/accounts','/users','/projects/1','/access/users'])assert.equal(allowed('SITE_SUPERVISOR',path,'GET'),false,path);
 for(const path of ['/site-tasks','/site-inspections','/site-reports/1/photos'])assert.equal(allowed('SITE_SUPERVISOR',path,'POST'),true);
 for(const path of ['/rfq-items/1','/rfq-vendors/1','/purchase-request-items/1','/quotation-items/1','/boq-items/1','/material-prices/1'])assert.equal(allowed('PROJECT_MANAGER',path,'PUT'),true,path);
 for(const path of ['/purchases/1/payments','/labour/attendance/1/payroll','/labour/rates','/job-costing/payroll','/billing/invoices'])assert.equal(allowed('PROJECT_MANAGER',path,'POST'),false,path);
 assert.equal(allowed('PROJECT_MANAGER','/purchases/1','DELETE'),false);assert.equal(allowed('PROJECT_MANAGER','/labour/attendance/1','DELETE'),true);
 assert.equal(allowed('ACCOUNTS','/labour/attendance/1/payroll','POST'),true);assert.equal(allowed('ACCOUNTS','/site-tasks','POST'),false);
 assert.equal(allowed('ADMIN','/unknown-business-route','POST'),false);assert.equal(allowed(undefined,'/projects','GET'),false);
 const fs=require('node:fs'),path=require('node:path');
 for(const file of ['server.js','billing.js','payables.js','project-profit.js','worker-advances.js','job-costing.js','labour.js','payroll-batches.js','site-reports.js','site-tasks.js','site-inspections.js','stock-safe.js','stock-desk.js','quotation-workflow.js','procurement-approval.js','payment-approval.js']){
  const source=fs.readFileSync(path.join(__dirname,file),'utf8');
  for(const match of source.matchAll(/app\.(get|post|put|patch|delete)\(\s*['"](\/api\/[^'"]+)['"]/g)){
   const route=match[2].slice(4);if(['/health','/auth/login'].includes(route))continue;
   assert.equal(allowed('ADMIN',route,match[1].toUpperCase()),true,file+' '+route);
  }
 }
});
test('local user roles enforce APIs, redact site finance, update live tokens and protect Admin access',{skip:process.env.CRM_INTEGRATION!=='1'},async()=>{
 require('dotenv').config();assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname));
 const {app,prisma}=require('./server'),server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const prefix='access_'+Date.now();const users=[];let project,worker;
 try{
  for(const role of ['ADMIN','ACCOUNTS','PROJECT_MANAGER','SITE_SUPERVISOR'])users.push(await prisma.user.create({data:{name:prefix+role,username:prefix+role,passwordHash:'test-only',role}}));
  const defaultUser=await prisma.user.create({data:{name:prefix+'default',username:prefix+'default',passwordHash:'test-only'}});users.push(defaultUser);assert.equal(defaultUser.role,'SITE_SUPERVISOR');
  const [admin,accounts,manager,supervisor]=users;
  project=await prisma.project.create({data:{name:prefix,contractValue:1000}});worker=await prisma.worker.create({data:{name:prefix}});
  await prisma.workerAttendance.create({data:{projectId:project.id,workerId:worker.id,workDate:new Date('2026-01-01'),dayUnits:1,overtimeHours:0,dailyRate:100,overtimeRate:0,amount:100}});
  const tokens=Object.fromEntries(users.map(u=>[u.id,require('jsonwebtoken').sign({userId:u.id,role:'ADMIN'},process.env.JWT_SECRET,{expiresIn:'5m'})])),url='http://127.0.0.1:'+server.address().port+'/api/';
  const call=async(u,path,method='GET',body)=>{const r=await fetch(url+path,{method,headers:{Authorization:'Bearer '+tokens[u.id],'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,...await r.json()};};
  assert.equal((await fetch(url+'access/users')).status,401);
  for(const u of [accounts,manager,supervisor])assert.equal((await call(u,'access/users')).status,403);
  for(const path of ['dashboard','income','expenses','transactions','billing/invoices','payables','reports/project-profit','labour','users'])assert.equal((await call(supervisor,path)).status,403,path);
  for(const [u,path] of [[manager,'income'],[manager,'purchases/1/payments'],[manager,'labour/attendance/1/payroll'],[accounts,'site-tasks'],[accounts,'rfqs'],[supervisor,'projects']])assert.equal((await call(u,path,'POST',{})).status,403,path);
  const report=(await call(supervisor,'site-reports','POST',{projectId:project.id,title:'Site check',reportDate:'2026-01-01',workSummary:'Work',progress:5})).data;
  const detail=await call(supervisor,'site-reports/'+report.id);assert.equal(detail.status,200);assert.equal(detail.data.activity.financialVisible,false);assert.equal(detail.data.activity.attendance.length,1);assert.ok(!('cashPaid' in detail.data.activity));assert.ok(!('amount' in detail.data.activity.attendance[0]));
  for(const suffix of [report.id+'/',String(report.id).split('').map(c=>'%'+c.charCodeAt(0).toString(16)).join('')])assert.equal((await call(supervisor,'site-reports/'+suffix)).data.activity.financialVisible,false);
  const projects=await call(supervisor,'projects?limit=-1');const p=projects.data.find(p=>p.id===project.id);assert.deepEqual(Object.keys(p).sort(),['id','name','status']);
  const ctx=await call(supervisor,'site-reports/context');assert.equal(ctx.status,200);assert.ok(!('passwordHash' in ctx.data.users[0]));
  assert.equal((await call(accounts,'site-reports/'+report.id)).status,403);
  assert.equal((await call(manager,'site-reports/'+report.id)).data.activity.attendanceWagePreview,100);
  assert.equal((await call(admin,'access/users/'+admin.id,'PUT',{role:'SITE_SUPERVISOR',status:'ACTIVE',accessVersion:1})).status,409);
  const changed=await call(admin,'access/users/'+manager.id,'PUT',{role:'SITE_SUPERVISOR',status:'ACTIVE',accessVersion:1});assert.equal(changed.status,200);
  assert.equal((await call(manager,'income')).status,403);assert.equal((await call(manager,'auth/me')).data.user.role,'SITE_SUPERVISOR');
  assert.equal((await call(admin,'access/users/'+manager.id,'PUT',{role:'ADMIN',status:'ACTIVE',accessVersion:1})).status,409);
  const races=await Promise.all([call(admin,'access/users/'+manager.id,'PUT',{role:'ACCOUNTS',status:'ACTIVE',accessVersion:2}),call(admin,'access/users/'+manager.id,'PUT',{role:'PROJECT_MANAGER',status:'ACTIVE',accessVersion:2})]);assert.equal(races.filter(x=>x.status===200).length,1);assert.equal(races.filter(x=>x.status===409).length,1);
  const current=races.find(x=>x.status===200).data;
  assert.equal((await call(admin,'access/users/'+manager.id,'PUT',{role:current.role,status:'INACTIVE',accessVersion:current.accessVersion})).status,200);
  assert.equal((await call(manager,'auth/me')).status,403);
  assert.ok(!(await call(admin,'access/users')).data.some(u=>'passwordHash' in u));
 }finally{
  if(project){await prisma.siteReport.deleteMany({where:{projectId:project.id}});await prisma.workerAttendance.deleteMany({where:{projectId:project.id}});await prisma.project.delete({where:{id:project.id}});}if(worker)await prisma.worker.delete({where:{id:worker.id}});await prisma.user.deleteMany({where:{id:{in:users.map(u=>u.id)}}});await new Promise(r=>server.close(r));await prisma.$disconnect();
 }
});
