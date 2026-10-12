const test=require('node:test'),assert=require('node:assert/strict');
const {inspectionData,ready}=require('./site-inspections');
const check={key:'wall',label:'Wall finish',result:'PENDING'};
const body={projectId:1,title:'Quality check',inspectionDate:'2026-01-01',inspectorId:1,checklist:[check]};
test('inspection checklist rejects malformed results and requires corrective evidence',()=>{
 assert.equal(ready(inspectionData(body).checklist),false);
 assert.equal(ready(inspectionData({...body,checklist:[{...check,result:'PASS'}]}).checklist),true);
 for(const extra of [{inspectionDate:'2026-02-30'},{checklist:[]},{checklist:[check,check]},{checklist:[{...check,result:'DONE'}]},{checklist:[{...check,result:'FAIL'}]},{checklist:[{...check,result:'FAIL',issue:'Gap',correction:'FIXED'}]}])assert.throws(()=>inspectionData({...body,...extra}));
 const verified={...check,result:'FAIL',issue:'Gap',action:'Repair',ownerId:1,dueDate:'2026-01-02',correction:'VERIFIED',verification:'Rechecked'};
 assert.equal(ready(inspectionData({...body,checklist:[verified]}).checklist),true);
 assert.throws(()=>inspectionData({...body,checklist:[{...verified,verification:''}]}));
});
test('local inspection defect lifecycle, evidence gates, links, concurrency and archive recovery',{skip:process.env.CRM_INTEGRATION!=='1'},async()=>{
 require('dotenv').config();assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname));
 const {app,prisma}=require('./server'),server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const prefix='inspection_'+Date.now();let user,inactive,project,other;
 try{
  user=await prisma.user.create({data:{name:prefix,username:prefix,role:'ADMIN',passwordHash:'test-only'}});inactive=await prisma.user.create({data:{name:prefix+'_inactive',username:prefix+'_inactive',role:'ADMIN',passwordHash:'test-only',status:'INACTIVE'}});
  project=await prisma.project.create({data:{name:prefix}});other=await prisma.project.create({data:{name:prefix+'_other'}});
  const token=require('jsonwebtoken').sign({userId:user.id},process.env.JWT_SECRET,{expiresIn:'5m'}),url='http://127.0.0.1:'+server.address().port+'/api/';
  const call=async(path,method='GET',data)=>{const r=await fetch(url+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});return {status:r.status,...await r.json()};};
  assert.equal((await fetch(url+'site-inspections')).status,401);
  const rb={projectId:project.id,title:'Daily',reportDate:'2026-01-01',workSummary:'Wall finish',progress:20};const report=(await call('site-reports','POST',rb)).data;
  const task=(await call('site-tasks','POST',{projectId:project.id,title:'Wall task',startDate:'2026-01-01',dueDate:'2026-01-02',status:'PENDING',priority:'NORMAL',reportIds:[]})).data;
  const failed={...check,result:'FAIL',issue:'Uneven finish',correction:'OPEN',dueDate:'2026-01-02',ownerId:user.id};
  const data={...body,projectId:project.id,inspectorId:user.id,taskId:task.id,reportId:report.id,checklist:[failed]};
  assert.equal((await call('site-inspections','POST',{...data,projectId:other.id})).status,400);
  assert.equal((await call('site-inspections','POST',{...data,inspectorId:inactive.id})).status,400);
  let created=await call('site-inspections','POST',data);assert.equal(created.status,201);let r=created.data;assert.equal(r.creator.id,user.id);assert.equal(r.status,'DRAFT');
  assert.equal((await call('site-inspections/'+r.id+'/complete','POST',{version:r.version})).status,409);
  assert.equal((await call('site-inspections?projectId='+project.id+'&issues=OVERDUE')).data.length,1);
  assert.equal((await call('site-reports/'+report.id,'PUT',{...rb,projectId:other.id,version:report.version})).status,409);
  assert.equal((await call('site-inspections/'+r.id,'PUT',{...data,version:r.version,checklist:[{...check,result:'PASS'}]})).status,409);
  const races=await Promise.all([call('site-inspections/'+r.id,'PUT',{...data,notes:'A',version:r.version}),call('site-inspections/'+r.id,'PUT',{...data,notes:'B',version:r.version})]);assert.equal(races.filter(x=>x.status===200).length,1);assert.equal(races.filter(x=>x.status===409).length,1);r=races.find(x=>x.status===200).data;
  const fixed={...failed,action:'Levelled finish',correction:'FIXED'};r=(await call('site-inspections/'+r.id,'PUT',{...data,version:r.version,checklist:[fixed]})).data;
  assert.equal((await call('site-inspections/'+r.id+'/complete','POST',{version:r.version})).status,409);
  const verified={...fixed,correction:'VERIFIED',verification:'Finish rechecked',verifiedById:inactive.id,verifiedAt:'2000-01-01'};
  const saved=await call('site-inspections/'+r.id,'PUT',{...data,version:r.version,checklist:[verified]});assert.equal(saved.status,200);r=saved.data;assert.equal(r.checklist[0].verifiedById,user.id);assert.notEqual(r.checklist[0].verifiedAt,'2000-01-01');
  const complete=await call('site-inspections/'+r.id+'/complete','POST',{version:r.version});assert.equal(complete.status,200);r=complete.data;assert.ok(r.completedAt);
  assert.equal((await call('site-inspections/'+r.id,'PUT',{...data,version:r.version,checklist:[verified]})).status,409);
  assert.equal((await call('site-inspections?projectId='+project.id+'&issues=OPEN')).data.length,0);
  const archive=await call('site-inspections/'+r.id+'/archive','POST',{version:r.version});assert.equal(archive.status,200);r=archive.data;
  assert.equal((await call('site-inspections?projectId='+project.id)).data.length,0);
  assert.equal((await call('site-inspections/'+r.id+'/reopen','POST',{version:r.version})).status,409);
  r=(await call('site-inspections/'+r.id+'/restore','POST',{version:r.version})).data;
  r=(await call('site-inspections/'+r.id+'/reopen','POST',{version:r.version})).data;assert.equal(r.completedAt,null);
  const archivedReport=await call('site-reports/'+report.id+'/archive','POST',{version:report.version});assert.equal(archivedReport.status,200);
  assert.equal((await call('site-inspections/'+r.id,'PUT',{...data,version:r.version,reportId:null,checklist:[verified]})).status,409);
  const kept=await call('site-inspections/'+r.id,'PUT',{...data,version:r.version,checklist:[verified]});assert.equal(kept.status,200);r=kept.data;
  await call('site-reports/'+report.id+'/restore','POST',{version:archivedReport.data.version});
  assert.equal((await call('site-inspections/'+r.id,'PUT',{...data,version:r.version,taskId:null,reportId:null,checklist:[verified]})).status,200);
  await prisma.siteTask.deleteMany({where:{projectId:project.id}});await prisma.siteReport.deleteMany({where:{projectId:project.id}});
  assert.equal((await call('projects/'+project.id,'DELETE')).status,409);
  assert.equal(await prisma.transaction.count({where:{projectId:project.id}}),0);
 }finally{
  for(const p of [project,other])if(p){await prisma.siteInspection.deleteMany({where:{projectId:p.id}});await prisma.siteTask.deleteMany({where:{projectId:p.id}});await prisma.siteReport.deleteMany({where:{projectId:p.id}});await prisma.project.delete({where:{id:p.id}});}
  for(const u of [user,inactive])if(u)await prisma.user.delete({where:{id:u.id}});await new Promise(r=>server.close(r));await prisma.$disconnect();
 }
});
