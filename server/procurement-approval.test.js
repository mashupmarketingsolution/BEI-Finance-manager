const test=require('node:test'),assert=require('node:assert/strict');
const {allowed}=require('./access-control');
test('procurement authors may submit but reviewers alone decide',()=>{
 for(const role of ['ADMIN','PROJECT_MANAGER','PROCUREMENT_OFFICER'])assert.equal(allowed(role,'/procurement-review/requests/1/submit','POST'),true);
 for(const role of ['ACCOUNTS','SITE_SUPERVISOR','VIEWER','STOREKEEPER'])assert.equal(allowed(role,'/procurement-review','GET'),false);
 assert.equal(allowed('PROCUREMENT_OFFICER','/procurement-review/orders/1/approve','POST'),false);assert.equal(allowed('PROJECT_MANAGER','/approvals/procurement','GET'),true);
});
test('local request/order approvals freeze content, preserve snapshots and gate conversion atomically',{skip:process.env.CRM_INTEGRATION!=='1'},async()=>{
 require('dotenv').config();assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname));const {app,prisma}=require('./server'),server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const prefix='proc_review_'+Date.now(),users=[];let project,vendor,material;
 try{
  for(const role of ['ADMIN','PROJECT_MANAGER','PROCUREMENT_OFFICER'])users.push(await prisma.user.create({data:{name:prefix+role,username:prefix+role,role,passwordHash:'test-only'}}));const [admin,manager,author]=users;
  project=await prisma.project.create({data:{name:prefix}});vendor=await prisma.vendor.create({data:{name:prefix}});material=await prisma.material.create({data:{name:prefix,code:prefix,unit:'pcs'}});
  const tokens=Object.fromEntries(users.map(u=>[u.id,require('jsonwebtoken').sign({userId:u.id},process.env.JWT_SECRET,{expiresIn:'5m'})])),base='http://127.0.0.1:'+server.address().port+'/api/';
  const call=async(u,path,method='GET',body)=>{const r=await fetch(base+path,{method,headers:{Authorization:'Bearer '+tokens[u.id],'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,...await r.json()};};
  const list=async kind=>(await call(author,'procurement-review?kind='+kind)).data;
  const action=(u,r,a,notes)=>call(u,'procurement-review/'+r.kind+'/'+r.id+'/'+a,'POST',{version:r.approval.version,fingerprint:r.fingerprint,notes});
  const prBody={requestNo:prefix,requestDate:'2026-01-01',projectId:project.id,status:'DRAFT',priority:'NORMAL'};
  assert.equal((await call(author,'purchase-requests','POST',{...prBody,status:'APPROVED'})).status,400);
  const created=await call(author,'purchase-requests','POST',prBody);assert.equal(created.status,201);const pr=created.data;
  let r=(await list('requests')).find(r=>r.id===pr.id);assert.equal(r.approval.creatorId,author.id);assert.equal((await action(author,r,'submit')).status,400);
  const added=await call(author,'purchase-requests/'+pr.id+'/items','POST',{materialId:material.id,quantity:3,unit:'pcs'});assert.equal(added.status,201);const item=added.data;
  assert.equal((await action(author,r,'submit')).status,409);r=(await list('requests')).find(r=>r.id===pr.id);
  const submitted=await action(author,r,'submit');assert.equal(submitted.status,200);r=submitted.data;
  assert.equal((await call(author,'purchase-request-items/'+item.id,'PUT',{materialId:material.id,quantity:4,unit:'pcs'})).status,409);
  assert.equal((await call(author,'purchase-requests/'+pr.id+'/convert-to-rfq','POST',{rfqNo:prefix+'_rfq',rfqDate:'2026-01-02',status:'DRAFT'})).status,409);
  assert.equal((await action(author,r,'approve')).status,403);assert.equal((await action(admin,r,'reject')).status,400);
  r=(await action(admin,r,'reject','Revise quantity')).data;assert.equal((await action(author,r,'submit')).status,409);r=(await action(author,r,'reopen','Correcting request')).data;
  assert.equal((await call(author,'purchase-request-items/'+item.id,'PUT',{materialId:material.id,quantity:4,unit:'pcs'})).status,200);
  r=(await list('requests')).find(r=>r.id===pr.id);assert.equal(r.approval.events[0].snapshot.items[0].quantity,'3');r=(await action(author,r,'submit')).data;r=(await action(manager,r,'approve')).data;assert.equal(r.sourceStatus,'APPROVED');
  assert.equal((await call(author,'purchase-requests/'+pr.id,'PUT',{...prBody,notes:'Changed after approval'})).status,409);
  const conversions=await Promise.all([1,2].map(i=>call(author,'purchase-requests/'+pr.id+'/convert-to-rfq','POST',{rfqNo:prefix+'_rfq_'+i,rfqDate:'2026-01-02',status:'DRAFT'})));assert.equal(conversions.filter(x=>x.status===201).length,1);assert.equal(conversions.filter(x=>x.status>=400).length,1);
  r=(await list('requests')).find(r=>r.id===pr.id);assert.equal(r.closed,true);assert.equal((await action(admin,r,'reopen','No rollback after conversion')).status,409);
  const poBody={poNo:prefix+'_po',poDate:'2026-01-03',projectId:project.id,vendorId:vendor.id,discount:0,transportCost:0,items:[{materialId:material.id,quantity:2,unit:'pcs',unitPrice:10}]};
  const poCreated=await call(author,'purchase-orders','POST',poBody);assert.equal(poCreated.status,201);const po=poCreated.data;
  assert.equal((await call(author,'purchase-orders/'+po.id+'/status','PATCH',{status:'CONFIRMED'})).status,409);
  assert.equal((await call(author,'purchase-orders/'+po.id+'/convert-to-purchase','POST',{})).status,400);
  let order=(await list('orders')).find(r=>r.id===po.id);order=(await action(author,order,'submit')).data;
  assert.equal((await call(author,'purchase-orders/'+po.id,'PUT',{...poBody,notes:'Pending edit'})).status,409);
  const decisions=await Promise.all([action(admin,order,'approve'),action(manager,order,'reject','Independent rejection')]);assert.equal(decisions.filter(x=>x.status===200).length,1);assert.equal(decisions.filter(x=>x.status===409).length,1);order=decisions.find(x=>x.status===200).data;
  order=(await action(admin,order,'reopen','Revise order')).data;assert.equal((await call(author,'purchase-orders/'+po.id,'PUT',{...poBody,items:[{...poBody.items[0],quantity:3}]})).status,200);
  order=(await list('orders')).find(r=>r.id===po.id);order=(await action(author,order,'submit')).data;order=(await action(admin,order,'approve')).data;assert.equal(order.sourceStatus,'CONFIRMED');
  assert.equal((await call(author,'purchase-orders/'+po.id+'/status','PATCH',{status:'SENT'})).status,200);
  assert.equal((await call(author,'purchase-orders/'+po.id+'/status','PATCH',{status:'COMPLETED'})).status,200);
  const purchaseConversions=await Promise.all([1,2].map(()=>call(author,'purchase-orders/'+po.id+'/convert-to-purchase','POST',{})));assert.equal(purchaseConversions.filter(x=>x.status===201).length,1,JSON.stringify(purchaseConversions));
  const purchase=await prisma.purchase.findFirst({where:{purchaseNo:po.poNo}});assert.equal(Number(purchase.grandTotal),30);assert.equal(Number(purchase.paidAmount),0);assert.equal(await prisma.transaction.count({where:{projectId:project.id,source:'PURCHASE'}}),1);
  assert.equal((await call(admin,'projects/'+project.id,'DELETE')).status,409);
  assert.ok((await call(admin,'approvals/procurement?kind=orders&state=APPROVED')).data.some(r=>r.id===po.id));
 }finally{
  if(project){await prisma.procurementApproval.deleteMany({where:{OR:[{request:{projectId:project.id}},{order:{projectId:project.id}}]}});await prisma.purchaseOrder.deleteMany({where:{projectId:project.id}});await prisma.purchaseRequest.deleteMany({where:{projectId:project.id}});await prisma.rFQ.deleteMany({where:{projectId:project.id}});await prisma.transaction.deleteMany({where:{projectId:project.id}});await prisma.purchase.deleteMany({where:{projectId:project.id}});await prisma.project.delete({where:{id:project.id}});}if(material)await prisma.material.delete({where:{id:material.id}});if(vendor)await prisma.vendor.delete({where:{id:vendor.id}});await prisma.user.deleteMany({where:{id:{in:users.map(u=>u.id)}}});await new Promise(r=>server.close(r));await prisma.$disconnect();
 }
});
