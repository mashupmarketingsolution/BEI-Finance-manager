const test=require('node:test'),assert=require('node:assert/strict');
const {reportData,validImage}=require('./site-reports');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=','base64');
test('site reports validate dates, progress, text limits and safe image signatures',()=>{
  const body={projectId:1,reportDate:'2026-01-01',title:' Report ',workSummary:' কাজ ',progress:'20.25'};
  assert.equal(reportData(body).title,'Report');assert.equal(reportData(body).progress,20.25);
  for(const extra of [{progress:-1},{progress:101},{progress:'1.001'},{reportDate:'2026-02-30'},{workSummary:' '},{issues:'x'.repeat(5001)}])assert.throws(()=>reportData({...body,...extra}));
  assert.equal(validImage(png,'image/png'),true);assert.equal(validImage(png,'image/jpeg'),false);assert.equal(validImage(Buffer.from('<svg></svg>'),'image/svg+xml'),false);
});
test('local report lifecycle, live activity, optimistic edits, protected photos and archive recovery',{skip:process.env.CRM_INTEGRATION!=='1'},async()=>{
  require('dotenv').config();assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname));
  const {app,prisma}=require('./server');const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const prefix='site_'+Date.now();let user,project,worker,vendor,purchase;
  try{
    user=await prisma.user.create({data:{name:prefix,username:prefix,passwordHash:'test-only'}});project=await prisma.project.create({data:{name:prefix}});worker=await prisma.worker.create({data:{name:prefix}});vendor=await prisma.vendor.create({data:{name:prefix}});
    await prisma.workerAttendance.create({data:{workerId:worker.id,projectId:project.id,workDate:new Date('2026-01-01'),dayUnits:0.5,overtimeHours:0,dailyRate:1200,overtimeRate:0,amount:600}});
    await prisma.transaction.createMany({data:[{type:'INCOME',source:'MANUAL',amount:200},{type:'EXPENSE',source:'MANUAL',amount:30},{type:'EXPENSE',source:'WORKER_ADVANCE',amount:40},{type:'EXPENSE',source:'PURCHASE',amount:100},{type:'EXPENSE',source:'PURCHASE_PAYMENT',amount:20}].map(t=>({...t,projectId:project.id,transactionDate:new Date('2026-01-01')}))});
    purchase=await prisma.purchase.create({data:{purchaseNo:prefix,purchaseDate:new Date('2026-01-01'),vendorId:vendor.id,projectId:project.id,subtotal:100,grandTotal:100,paidAmount:20,dueAmount:80,payments:{create:{paymentDate:new Date('2026-01-01'),amount:20,paymentMethod:'CASH'}}}});
    const token=require('jsonwebtoken').sign({userId:user.id},process.env.JWT_SECRET,{expiresIn:'5m'}),base='http://127.0.0.1:'+server.address().port+'/api/';
    const call=async(path,method='GET',body)=>{const r=await fetch(base+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,...await r.json()};};
    const upload=async(record,bytes=png,mime='image/png')=>{const r=await fetch(base+'site-reports/'+record+'/photos',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':mime,'X-File-Name':'site.png'},body:bytes});return {status:r.status,...await r.json()};};
    assert.equal((await fetch(base+'site-reports')).status,401);
    const ctx=await call('site-reports/context');assert.equal(ctx.status,200);assert.equal(ctx.data.currentUserId,user.id);assert.ok(ctx.data.maxPhotoBytes>png.length);
    const body={projectId:project.id,reportDate:'2026-01-01',title:'Wall work',workSummary:'কাজ শেষ হয়েছে',progress:25,issues:'Material delay',nextPlan:'Painting',responsibleId:user.id};
    const created=await call('site-reports','POST',body);assert.equal(created.status,201);let report=created.data;assert.equal(report.creator.id,user.id);
    assert.equal((await call('site-reports','POST',body)).status,409);
    const races=await Promise.all([call('site-reports/'+report.id,'PUT',{...body,version:report.version,progress:30}),call('site-reports/'+report.id,'PUT',{...body,version:report.version,progress:40})]);assert.equal(races.filter(r=>r.status===200).length,1);assert.equal(races.filter(r=>r.status===409).length,1);
    let detail=await call('site-reports/'+report.id);assert.equal(detail.status,200);report=detail.data;assert.equal(report.activity.attendanceWagePreview,600);assert.equal(report.activity.purchasesRecorded,100);assert.equal(report.activity.cashReceived,200);assert.equal(report.activity.cashPaid,90);
    assert.equal((await upload(report.id,Buffer.from('<svg/>'),'image/svg+xml')).status,400);
    const big=Buffer.alloc(6*1024*1024);png.copy(big);assert.equal((await upload(report.id,big)).status,413);
    const photo=await upload(report.id);assert.equal(photo.status,201);
    assert.equal((await fetch(base+'site-photos/'+photo.data.id)).status,401);
    const file=await fetch(base+'site-photos/'+photo.data.id,{headers:{Authorization:'Bearer '+token}});assert.equal(file.status,200);assert.equal(file.headers.get('content-type'),'image/png');assert.equal(file.headers.get('x-content-type-options'),'nosniff');assert.deepEqual(Buffer.from(await file.arrayBuffer()),png);
    assert.equal((await call('site-reports/'+report.id,'PUT',{...body,version:report.version})).status,409);
    for(let i=0;i<9;i++)assert.equal((await upload(report.id)).status,201);assert.equal((await upload(report.id)).status,400);
    report=(await call('site-reports/'+report.id)).data;assert.equal(report.photos.length,10);assert.ok(!Object.hasOwn(report.photos[0],'data'));
    assert.equal((await call('projects/'+project.id,'DELETE')).status,409);
    let archived=await call('site-reports/'+report.id+'/archive','POST',{version:report.version});assert.equal(archived.status,200);report=archived.data;
    assert.equal((await call('site-reports?projectId='+project.id)).data.length,0);assert.equal((await call('site-reports?projectId='+project.id+'&state=ARCHIVED')).data.length,1);
    assert.equal((await upload(report.id)).status,409);assert.equal((await call('site-reports/'+report.id+'/photos/'+photo.data.id,'DELETE')).status,409);
    const restored=await call('site-reports/'+report.id+'/restore','POST',{version:report.version});assert.equal(restored.status,200);assert.equal(restored.data.photos.length,10);
    assert.equal((await call('site-reports/'+report.id+'/photos/'+photo.data.id,'DELETE')).status,200);
    assert.equal((await call('site-reports?projectId='+project.id+'&search=Material')).data.length,1);
  }finally{
    if(project){await prisma.siteReport.deleteMany({where:{projectId:project.id}});await prisma.workerAttendance.deleteMany({where:{projectId:project.id}});await prisma.transaction.deleteMany({where:{projectId:project.id}});if(purchase){await prisma.purchasePayment.deleteMany({where:{purchaseId:purchase.id}});await prisma.purchase.delete({where:{id:purchase.id}});}await prisma.project.delete({where:{id:project.id}});}
    if(worker)await prisma.worker.delete({where:{id:worker.id}});if(vendor)await prisma.vendor.delete({where:{id:vendor.id}});if(user)await prisma.user.delete({where:{id:user.id}});await new Promise(r=>server.close(r));await prisma.$disconnect();
  }
});
