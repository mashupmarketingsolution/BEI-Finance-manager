const test=require('node:test'),assert=require('node:assert/strict');
const {allowed,permissions}=require('./access-control');
test('procurement, warehouse and viewer roles separate money, inventory and viewing',()=>{
 assert.deepEqual(permissions('STOREKEEPER').pages,['stock-desk']);assert.deepEqual(permissions('VIEWER').writePages,[]);
 for(const path of ['/rfq-items/1','/rfq-vendors/1','/purchase-request-items/1','/materials/1','/vendors/1','/purchase-orders/1'])assert.equal(allowed('PROCUREMENT_OFFICER',path,'PUT'),true);
 for(const path of ['/purchases/1/payments','/purchases/1/receive','/stock-movements/usage','/income','/access/users'])assert.equal(allowed('PROCUREMENT_OFFICER',path,'POST'),false);
 for(const path of ['/purchases/1/receive','/stock-movements/usage','/stock-movements/return'])assert.equal(allowed('STOREKEEPER',path,'POST'),true);
 for(const path of ['/stock-movements/damage','/stock-movements/adjustment','/materials','/purchases','/access/users','/labour/attendance'])assert.equal(allowed('STOREKEEPER',path,'POST'),false);
 for(const role of ['STOREKEEPER','PROCUREMENT_OFFICER'])for(const path of ['/income','/dashboard','/labour/accounts','/reports/project-profit'])assert.equal(allowed(role,path,'GET'),false);
 for(const path of ['/site-tasks','/stock-desk','/reports/project-profit']){assert.equal(allowed('VIEWER',path,'GET'),true);assert.equal(allowed('VIEWER',path,'POST'),false);}
 assert.equal(allowed('VIEWER','/income','GET'),false);assert.equal(allowed('VIEWER','/labour/accounts','GET'),false);assert.equal(allowed('VIEWER','/labour/payroll-batches/preview','POST'),false);assert.equal(allowed('VIEWER','/access/users','GET'),false);assert.equal(allowed(undefined,'/users','GET'),false);
});
test('local specialized roles have usable stock workflow, private amounts and read-only protection',{skip:process.env.CRM_INTEGRATION!=='1'},async()=>{
 require('dotenv').config();assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname));
 const {app,prisma}=require('./server'),server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const prefix='extra_'+Date.now(),users=[];let project,material,purchase;const vendors=[];
 try{
  for(const role of ['ADMIN','PROCUREMENT_OFFICER','STOREKEEPER','VIEWER'])users.push(await prisma.user.create({data:{name:prefix+role,username:prefix+role,passwordHash:'test-only',role}}));
  const [admin,procurement,store,viewer]=users;project=await prisma.project.create({data:{name:prefix,contractValue:1000}});await prisma.userProjectAssignment.createMany({data:users.map(u=>({userId:u.id,projectId:project.id}))});material=await prisma.material.create({data:{name:prefix,code:prefix,unit:'pcs'}});vendors.push(await prisma.vendor.create({data:{name:prefix}}));
  purchase=await prisma.purchase.create({data:{purchaseNo:prefix,purchaseDate:new Date('2026-01-01'),projectId:project.id,vendorId:vendors[0].id,subtotal:100,grandTotal:100,items:{create:{materialId:material.id,quantity:10,unit:'pcs',unitPrice:10,total:100}}},include:{items:true}});
  const tokens=Object.fromEntries(users.map(u=>[u.id,require('jsonwebtoken').sign({userId:u.id},process.env.JWT_SECRET,{expiresIn:'5m'})])),url='http://127.0.0.1:'+server.address().port+'/api/';
  const call=async(u,path,method='GET',body)=>{const r=await fetch(url+path,{method,headers:{Authorization:'Bearer '+tokens[u.id],'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,...await r.json()};};
  const privateFields=r=>{const s=JSON.stringify(r);for(const field of ['unitPrice','unitCost','grandTotal','paidAmount','contractValue','passwordHash'])assert.ok(!s.includes('"'+field+'"'),field);};
  for(const role of [procurement,store,viewer])assert.equal((await call(role,'access/users')).status,403);
  for(const path of ['income','labour','purchases','materials','projects/'+project.id])assert.equal((await call(store,path)).status,403,path);
  const initial=await call(store,'stock-desk');assert.equal(initial.status,200);privateFields(initial);assert.equal(initial.data.materials.find(m=>m.id===material.id).available,0);
  assert.equal((await call(procurement,'purchases/'+purchase.id+'/receive','POST',{receiveDate:'2026-01-01',items:[{purchaseItemId:purchase.items[0].id,quantity:10}]})).status,403);
  const received=await call(store,'purchases/'+purchase.id+'/receive','POST',{receiveDate:'2026-01-01',items:[{purchaseItemId:purchase.items[0].id,quantity:10}]});assert.equal(received.status,200);privateFields(received);
  const payload={materialId:material.id,projectId:project.id,quantity:4};const used=await call(store,'stock-movements/usage','POST',payload);assert.equal(used.status,201);privateFields(used);
  const returned=await call(store,'stock-movements/return','POST',{...payload,quantity:2});assert.equal(returned.status,201);privateFields(returned);
  assert.equal((await call(store,'stock-movements/usage','POST',{...payload,quantity:99})).status,400);assert.equal((await call(store,'stock-movements/return','POST',{...payload,quantity:10})).status,400);
  for(const action of ['damage','adjustment'])assert.equal((await call(store,'stock-movements/'+action,'POST',payload)).status,403);
  const desk=await call(store,'stock-desk');privateFields(desk);assert.equal(desk.data.materials.find(m=>m.id===material.id).available,8);assert.ok(!desk.data.purchases.some(p=>p.id===purchase.id));
  for(const role of [procurement,store])assert.equal((await call(role,'purchases/'+purchase.id+'/payments','POST',{amount:1})).status,403);
  const vendor=await call(procurement,'vendors','POST',{name:prefix+'_created'});assert.equal(vendor.status,201);vendors.push(vendor.data);
  const lookups=await call(procurement,'projects?limit=-1');assert.deepEqual(Object.keys(lookups.data.find(p=>p.id===project.id)).sort(),['id','name','status']);
  assert.equal((await call(viewer,'income')).status,403);assert.equal((await call(viewer,'stock-desk')).status,200);assert.equal((await call(viewer,'stock-movements/usage','POST',payload)).status,403);assert.equal((await call(viewer,'vendors','POST',{name:'No creation'})).status,403);
  assert.equal((await call(admin,'access/users/'+viewer.id,'PUT',{role:'STOREKEEPER',status:'ACTIVE',accessVersion:viewer.accessVersion})).status,200);assert.equal((await call(viewer,'income')).status,403);assert.equal((await call(viewer,'auth/me')).data.user.role,'STOREKEEPER');
 }finally{
  if(material)await prisma.stockMovement.deleteMany({where:{materialId:material.id}});if(purchase){await prisma.purchaseItem.deleteMany({where:{purchaseId:purchase.id}});await prisma.purchase.delete({where:{id:purchase.id}});}if(material)await prisma.material.delete({where:{id:material.id}});if(project)await prisma.project.delete({where:{id:project.id}});for(const v of vendors)await prisma.vendor.delete({where:{id:v.id}});await prisma.user.deleteMany({where:{id:{in:users.map(u=>u.id)}}});await new Promise(r=>server.close(r));await prisma.$disconnect();
 }
});
