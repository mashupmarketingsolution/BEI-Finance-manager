const test=require('node:test'),assert=require('node:assert/strict');
const {permissions,allowed}=require('./access-control');
test('only Admin sees all pages and approval decisions require reviewer roles',()=>{
 const all=permissions('ADMIN').pages;
 for(const role of ['ACCOUNTS','PROJECT_MANAGER','SITE_SUPERVISOR','PROCUREMENT_OFFICER','STOREKEEPER','VIEWER'])assert.ok(permissions(role).pages.length<all.length);
 for(const role of ['SITE_SUPERVISOR','ACCOUNTS','VIEWER','STOREKEEPER','PROCUREMENT_OFFICER']){assert.equal(allowed(role,'/approvals/inspections','GET'),false);assert.equal(allowed(role,'/site-inspections/1/approve','POST'),false);}
 assert.equal(allowed('PROJECT_MANAGER','/income','GET'),false);assert.equal(allowed('PROJECT_MANAGER','/dashboard','GET'),false);assert.equal(allowed('ACCOUNTS','/rfqs','GET'),false);assert.equal(allowed('ACCOUNTS','/projects/1','GET'),false);
 assert.equal(allowed('PROJECT_MANAGER','/approvals/inspections','GET'),true);
});
test('local inspection submission, independent review, snapshots, rejection correction and concurrency',{skip:process.env.CRM_INTEGRATION!=='1'},async()=>{
 require('dotenv').config();assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname));const {app,prisma}=require('./server'),server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const prefix='approval_'+Date.now(),users=[];let project;
 try{
  for(const role of ['ADMIN','PROJECT_MANAGER','SITE_SUPERVISOR','ACCOUNTS'])users.push(await prisma.user.create({data:{name:prefix+role,username:prefix+role,role,passwordHash:'test-only'}}));const [admin,manager,supervisor,accounts]=users;
  project=await prisma.project.create({data:{name:prefix}});const tokens=Object.fromEntries(users.map(u=>[u.id,require('jsonwebtoken').sign({userId:u.id},process.env.JWT_SECRET,{expiresIn:'5m'})])),url='http://127.0.0.1:'+server.address().port+'/api/';
  const call=async(u,path,method='GET',body)=>{const r=await fetch(url+path,{method,headers:{Authorization:'Bearer '+tokens[u.id],'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,...await r.json()};};
  const body={projectId:project.id,title:'Original inspection',inspectionDate:'2026-01-01',inspectorId:supervisor.id,checklist:[{key:'finish',label:'Wall finish',result:'PASS'}]};
  let r=(await call(supervisor,'site-inspections','POST',body)).data;assert.equal(r.approvalState,'NOT_SUBMITTED');
  assert.equal((await call(supervisor,'site-inspections/'+r.id+'/submit','POST',{version:r.version})).status,409);
  r=(await call(supervisor,'site-inspections/'+r.id+'/complete','POST',{version:r.version})).data;
  const submitted=await call(supervisor,'site-inspections/'+r.id+'/submit','POST',{version:r.version});assert.equal(submitted.status,200);r=submitted.data;assert.equal(r.approvalState,'SUBMITTED');assert.equal(r.approvalEvents[0].snapshot.title,body.title);
  for(const action of ['reopen','archive'])assert.equal((await call(supervisor,'site-inspections/'+r.id+'/'+action,'POST',{version:r.version})).status,409);
  assert.equal((await call(supervisor,'site-inspections/'+r.id,'PUT',{...body,version:r.version})).status,409);
  assert.equal((await call(supervisor,'site-inspections/'+r.id+'/approve','POST',{version:r.version})).status,403);assert.equal((await call(accounts,'approvals/inspections')).status,403);
  assert.ok((await call(manager,'approvals/inspections')).data.some(i=>i.id===r.id));
  assert.equal((await call(admin,'site-inspections/'+r.id+'/reject','POST',{version:r.version})).status,400);
  r=(await call(admin,'site-inspections/'+r.id+'/reject','POST',{version:r.version,notes:'Need clearer inspection notes'})).data;assert.equal(r.approvalState,'REJECTED');
  assert.equal((await call(supervisor,'site-inspections/'+r.id+'/submit','POST',{version:r.version})).status,409);
  assert.equal((await call(supervisor,'site-inspections/'+r.id+'/reopen','POST',{version:r.version})).status,400);
  r=(await call(supervisor,'site-inspections/'+r.id+'/reopen','POST',{version:r.version,notes:'Correcting the review feedback'})).data;assert.equal(r.approvalState,'NOT_SUBMITTED');
  r=(await call(supervisor,'site-inspections/'+r.id,'PUT',{...body,title:'Corrected inspection',version:r.version})).data;
  assert.equal(r.approvalEvents[0].snapshot.title,'Original inspection');
  r=(await call(supervisor,'site-inspections/'+r.id+'/complete','POST',{version:r.version})).data;r=(await call(supervisor,'site-inspections/'+r.id+'/submit','POST',{version:r.version})).data;
  const races=await Promise.all([call(admin,'site-inspections/'+r.id+'/approve','POST',{version:r.version}),call(manager,'site-inspections/'+r.id+'/reject','POST',{version:r.version,notes:'Recheck needed'})]);assert.equal(races.filter(x=>x.status===200).length,1);assert.equal(races.filter(x=>x.status===409).length,1);r=races.find(x=>x.status===200).data;
  assert.equal(r.approvalEvents.filter(e=>['APPROVE','REJECT'].includes(e.action)).length,2);
  if(r.approvalState==='APPROVED')assert.equal((await call(supervisor,'site-inspections/'+r.id+'/reopen','POST',{version:r.version,notes:'Change'})).status,403);
  const ownBody={...body,inspectorId:manager.id,title:'Manager own inspection'};let own=(await call(manager,'site-inspections','POST',ownBody)).data;own=(await call(manager,'site-inspections/'+own.id+'/complete','POST',{version:own.version})).data;own=(await call(manager,'site-inspections/'+own.id+'/submit','POST',{version:own.version})).data;
  assert.equal((await call(manager,'site-inspections/'+own.id+'/approve','POST',{version:own.version})).status,403);
  own=(await call(admin,'site-inspections/'+own.id+'/approve','POST',{version:own.version,notes:'Checked independently'})).data;assert.equal(own.approvalState,'APPROVED');assert.equal(own.approvalEvents.at(-1).actorRole,'ADMIN');
  assert.equal(await prisma.transaction.count({where:{projectId:project.id}}),0);
 }finally{if(project){await prisma.siteInspection.deleteMany({where:{projectId:project.id}});await prisma.project.delete({where:{id:project.id}});}await prisma.user.deleteMany({where:{id:{in:users.map(u=>u.id)}}});await new Promise(r=>server.close(r));await prisma.$disconnect();}
});
