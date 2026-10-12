const test=require('node:test'),assert=require('node:assert/strict');
const {canonical}=require('./financial-approval'),{allowed}=require('./access-control');
test('payroll/expense approval validates details and restricts financial decisions',()=>{
 for(const role of ['PROJECT_MANAGER','PROCUREMENT_OFFICER','STOREKEEPER','SITE_SUPERVISOR','VIEWER'])assert.equal(allowed(role,'/financial-requests','GET'),false);
 assert.equal(allowed('ACCOUNTS','/financial-requests','POST'),true);for(const action of ['approve','reject','reverse'])assert.equal(allowed('ACCOUNTS','/financial-requests/1/'+action,'POST'),false);
 assert.throws(()=>canonical('EXPENSE',{amount:'1.001',transactionDate:'2026-01-01',description:'Expense'}));assert.throws(()=>canonical('EXPENSE',{amount:1,transactionDate:'2026-02-30',description:'Expense'}));assert.throws(()=>canonical('EXPENSE',{amount:1,transactionDate:'2026-01-01'}));assert.throws(()=>canonical('PAYROLL',{accrualId:0,amount:1,paymentDate:'2026-01-01'}));
});
test('local payroll and expense requests require independent review and post/reverse atomically',{skip:process.env.CRM_INTEGRATION!=='1'},async()=>{
 require('dotenv').config();assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname));const {app,prisma}=require('./server'),server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const prefix='fin_review_'+Date.now(),users=[];let project,worker,wage,category;
 try{
  for(const role of ['ADMIN','ADMIN','ACCOUNTS','PROJECT_MANAGER'])users.push(await prisma.user.create({data:{name:prefix+users.length,username:prefix+users.length,role,passwordHash:'test-only'}}));const [admin,other,accounts,manager]=users;
  project=await prisma.project.create({data:{name:prefix,contractValue:1000}});worker=await prisma.worker.create({data:{name:prefix}});category=await prisma.category.create({data:{name:prefix,type:'EXPENSE'}});wage=await prisma.payrollAccrual.create({data:{projectId:project.id,workerId:worker.id,reference:prefix,description:'Earned wages',earnedDate:new Date('2026-01-01'),amount:100}});
  const base='http://127.0.0.1:'+server.address().port+'/api/',tokens=Object.fromEntries(users.map(u=>[u.id,require('jsonwebtoken').sign({userId:u.id},process.env.JWT_SECRET,{expiresIn:'5m'})]));
  const call=async(u,path,method='GET',body)=>{const r=await fetch(base+path,{method,headers:{Authorization:'Bearer '+tokens[u.id],'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,...await r.json()};};
  const submit=async(kind,payload,u=accounts)=>{const r=await call(u,'financial-requests','POST',{kind,payload});assert.equal(r.status,201,JSON.stringify(r));return r.data;};
  const act=(u,r,action,notes)=>call(u,'financial-requests/'+r.id+'/'+action,'POST',{version:r.version,notes});
  const expense={amount:25,transactionDate:'2026-01-02',paymentMethod:'CASH',description:'Site transport',notes:'Receipt 1',projectId:project.id,categoryId:category.id};
  const payroll={accrualId:wage.id,amount:60,paymentDate:'2026-01-02',paymentMethod:'BANK'};
  assert.equal((await fetch(base+'financial-requests')).status,401);assert.equal((await call(manager,'financial-requests')).status,403);
  assert.equal((await call(accounts,'expenses','POST',expense)).status,400);assert.equal((await call(accounts,'job-costing/payroll/'+wage.id+'/payments','POST',payroll)).status,400);
  let own=await submit('EXPENSE',expense,admin);assert.equal((await act(admin,own,'approve')).status,403);assert.equal((await act(other,own,'reject')).status,400);own=(await act(other,own,'reject','Need receipt')).data;assert.equal((await act(admin,own,'post')).status,409);
  let e=await submit('EXPENSE',expense),p=await submit('PAYROLL',payroll);
  assert.equal((await call(admin,'projects/'+project.id,'DELETE')).status,409);
  assert.equal(await prisma.transaction.count({where:{projectId:project.id}}),0);assert.equal((await call(admin,'job-costing/payroll/'+wage.id,'DELETE')).status,409);
  assert.equal((await act(accounts,e,'approve')).status,403);const decisions=await Promise.all([act(admin,e,'approve'),act(other,e,'approve')]);assert.equal(decisions.filter(x=>x.status===200).length,1);assert.equal(decisions.filter(x=>x.status===409).length,1);e=decisions.find(x=>x.status===200).data;
  assert.equal((await call(accounts,'expenses','POST',{...expense,amount:26,approvalRequestId:e.id,version:e.version})).status,409);
  assert.equal((await act(accounts,{...e,version:1},'post')).status,409);
  const posted=await Promise.all([act(accounts,e,'post'),act(admin,e,'post')]);assert.equal(posted.filter(x=>x.status===201).length,1,JSON.stringify(posted));assert.equal(posted.filter(x=>x.status===409).length,1);const transaction=posted.find(x=>x.status===201).data;
  for(const path of ['expenses/','income/','transactions/'])assert.equal((await call(admin,path+transaction.id,'DELETE')).status,409);
  e=(await call(accounts,'financial-requests')).data.find(r=>r.id===e.id);assert.equal((await act(accounts,e,'reverse','Correction')).status,403);assert.equal((await act(admin,e,'reverse')).status,400);assert.equal((await act(admin,e,'reverse','Wrong receipt')).status,200);
  p=(await act(admin,p,'approve')).data;assert.equal((await call(accounts,'job-costing/payroll/'+wage.id+'/payments','POST',{...payroll,amount:61,approvalRequestId:p.id,version:p.version})).status,409);
  const paid=await Promise.all([act(accounts,p,'post'),act(admin,p,'post')]);assert.equal(paid.filter(x=>x.status===201).length,1);assert.equal(paid.filter(x=>x.status===409).length,1);const payment=paid.find(x=>x.status===201).data;assert.equal(await prisma.payrollPayment.count({where:{accrualId:wage.id}}),1);
  const report=(await call(admin,'reports/project-profit?basis=consumption')).data.find(r=>r.id===project.id);assert.equal(report.cost,100);assert.equal(report.cashOut,60);assert.equal(report.unpaidPayroll,40);
  assert.equal((await call(accounts,'job-costing/payments/'+payment.id,'DELETE',{notes:'Wrong worker'})).status,403);assert.equal((await call(admin,'job-costing/payments/'+payment.id,'DELETE',{notes:'Correction'})).status,200);
  const reversed=(await call(accounts,'financial-requests')).data.find(r=>r.id===p.id);assert.equal(reversed.state,'REVERSED');assert.deepEqual(reversed.events.map(x=>x.action),['SUBMIT','APPROVE','POST','REVERSE']);assert.equal((await act(accounts,reversed,'post')).status,409);
  let stale=await submit('PAYROLL',payroll);stale=(await act(admin,stale,'approve')).data;await prisma.payrollAccrual.update({where:{id:wage.id},data:{amount:90}});assert.equal((await act(accounts,stale,'post')).status,409);assert.equal((await act(accounts,stale,'cancel','Wages changed')).status,200);await prisma.payrollAccrual.update({where:{id:wage.id},data:{amount:100}});
  let a=await submit('PAYROLL',payroll),b=await submit('PAYROLL',payroll);a=(await act(admin,a,'approve')).data;b=(await act(admin,b,'approve')).data;assert.equal((await act(accounts,a,'post')).status,201);assert.equal((await act(accounts,b,'post')).status,400);assert.equal((await act(accounts,b,'cancel','Balance settled')).status,200);
  const ef=await submit('EXPENSE',expense);assert.equal((await act(accounts,ef,'cancel','Duplicate')).status,200);
  await prisma.user.update({where:{id:accounts.id},data:{role:'VIEWER'}});assert.equal((await call(accounts,'financial-requests')).status,403);
 }finally{
  await prisma.financialRequest.deleteMany({where:{creatorId:{in:users.map(u=>u.id)}}});if(wage)await prisma.payrollPayment.deleteMany({where:{accrualId:wage.id}});if(project)await prisma.transaction.deleteMany({where:{projectId:project.id}});if(wage)await prisma.payrollAccrual.deleteMany({where:{id:wage.id}});if(worker)await prisma.worker.delete({where:{id:worker.id}});if(project)await prisma.project.delete({where:{id:project.id}});if(category)await prisma.category.delete({where:{id:category.id}});await prisma.user.deleteMany({where:{id:{in:users.map(u=>u.id)}}});await new Promise(r=>server.close(r));await prisma.$disconnect();
 }
});
