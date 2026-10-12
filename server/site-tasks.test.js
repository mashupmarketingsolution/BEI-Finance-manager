const test=require('node:test'),assert=require('node:assert/strict');
const {taskData}=require('./site-tasks');
const baseBody={projectId:1,title:' Painting ',startDate:'2026-01-01',dueDate:'2026-01-02',status:'PENDING',priority:'HIGH',reportIds:[]};
test('site task validates scheduling, status, text and report link IDs',()=>{
 assert.equal(taskData(baseBody).data.title,'Painting');
 for(const extra of [{startDate:'2026-02-30'},{dueDate:'2025-01-01'},{status:'PAID'},{priority:'X'},{title:' '},{blockers:'x'.repeat(5001)},{reportIds:[1,1]},{reportIds:[-1]}])assert.throws(()=>taskData({...baseBody,...extra}));
});
test('local task assignment, concurrent updates, overdue filters, report integrity and archive recovery',{skip:process.env.CRM_INTEGRATION!=='1'},async()=>{
 require('dotenv').config();assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname));
 const {app,prisma}=require('./server'),server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const prefix='task_'+Date.now();let user,inactive,project,other;
 try{
  user=await prisma.user.create({data:{name:prefix,username:prefix,role:'ADMIN',passwordHash:'test-only'}});
  inactive=await prisma.user.create({data:{name:prefix+'_inactive',username:prefix+'_inactive',role:'ADMIN',passwordHash:'test-only',status:'INACTIVE'}});
  project=await prisma.project.create({data:{name:prefix}});other=await prisma.project.create({data:{name:prefix+'_other'}});
  const token=require('jsonwebtoken').sign({userId:user.id},process.env.JWT_SECRET,{expiresIn:'5m'}),url='http://127.0.0.1:'+server.address().port+'/api/';
  const call=async(path,method='GET',body)=>{const r=await fetch(url+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,...await r.json()};};
  assert.equal((await fetch(url+'site-tasks')).status,401);
  const rb={projectId:project.id,reportDate:'2026-01-01',title:'Daily work',workSummary:'Painting',progress:10};
  const report=(await call('site-reports','POST',rb)).data;
  const foreign=(await call('site-reports','POST',{...rb,projectId:other.id})).data;
  const body={...baseBody,projectId:project.id,responsibleId:user.id,reportIds:[report.id],blockers:'Material delay'};
  assert.equal((await call('site-tasks','POST',{...body,reportIds:[foreign.id]})).status,400);
  assert.equal((await call('site-tasks','POST',{...body,responsibleId:inactive.id})).status,400);
  const created=await call('site-tasks','POST',body);assert.equal(created.status,201);let task=created.data;
  assert.equal(task.creator.id,user.id);assert.equal(task.responsible.id,user.id);assert.equal(task.reports[0].reportId,report.id);
  assert.equal((await call('site-reports/'+report.id)).data.tasks[0].task.id,task.id);
  assert.equal((await call('site-reports/'+report.id,'PUT',{...rb,projectId:other.id,reportDate:'2026-01-02',version:report.version})).status,409);
  const races=await Promise.all([call('site-tasks/'+task.id,'PUT',{...body,version:task.version,status:'IN_PROGRESS'}),call('site-tasks/'+task.id,'PUT',{...body,version:task.version,title:'Other edit'})]);
  assert.equal(races.filter(r=>r.status===200).length,1);assert.equal(races.filter(r=>r.status===409).length,1);
  const list=await call('site-tasks?projectId='+project.id+'&overdue=true');assert.equal(list.data.length,1);task=list.data[0];assert.equal(task.overdue,true);
  const completed=await call('site-tasks/'+task.id,'PUT',{...body,version:task.version,status:'COMPLETED'});assert.equal(completed.status,200);task=completed.data;assert.ok(task.completedAt);
  assert.equal((await call('site-tasks?projectId='+project.id+'&overdue=true')).data.length,0);
  const reopened=await call('site-tasks/'+task.id,'PUT',{...body,version:task.version,status:'IN_PROGRESS'});task=reopened.data;assert.equal(task.completedAt,null);
  assert.equal((await call('site-tasks/'+task.id,'PUT',{...body,projectId:other.id,version:task.version})).status,400);
  const archivedReport=await call('site-reports/'+report.id+'/archive','POST',{version:report.version});assert.equal(archivedReport.status,200);
  assert.equal((await call('site-tasks/'+task.id,'PUT',{...body,version:task.version,reportIds:[]})).status,409);
  const kept=await call('site-tasks/'+task.id,'PUT',{...body,version:task.version,description:'Keep archived link'});assert.equal(kept.status,200);task=kept.data;
  const archive=await call('site-tasks/'+task.id+'/archive','POST',{version:task.version});assert.equal(archive.status,200);task=archive.data;
  assert.equal((await call('site-tasks?projectId='+project.id)).data.length,0);
  assert.equal((await call('site-tasks/'+task.id,'PUT',{...body,version:task.version})).status,409);
  assert.equal((await call('site-tasks/'+task.id+'/restore','POST',{version:task.version-1})).status,409);
  const restore=await call('site-tasks/'+task.id+'/restore','POST',{version:task.version});assert.equal(restore.status,200);task=restore.data;
  assert.equal((await call('site-tasks?projectId='+project.id+'&search=Material&priority=HIGH&responsibleId='+user.id)).data.length,1);
  await call('site-reports/'+report.id+'/restore','POST',{version:archivedReport.data.version});
  const unlink=await call('site-tasks/'+task.id,'PUT',{...body,version:task.version,reportIds:[]});assert.equal(unlink.status,200);
  await prisma.siteReport.deleteMany({where:{projectId:project.id}});
  assert.equal((await call('projects/'+project.id,'DELETE')).status,409);
  assert.equal(Number((await prisma.project.findUnique({where:{id:project.id}})).contractValue),0);
  assert.equal(await prisma.transaction.count({where:{projectId:project.id}}),0);
 }finally{
  for(const p of [project,other])if(p){await prisma.siteTask.deleteMany({where:{projectId:p.id}});await prisma.siteReport.deleteMany({where:{projectId:p.id}});await prisma.project.delete({where:{id:p.id}});}
  for(const u of [user,inactive])if(u)await prisma.user.delete({where:{id:u.id}});
  await new Promise(r=>server.close(r));await prisma.$disconnect();
 }
});
