const {test}=require('node:test');
const assert=require('node:assert/strict');
const {projectProfit,registerProjectProfit}=require('./project-profit');
test('project profit counts purchase costs once and historical and linked payments once',()=>{
  const result=projectProfit({id:1,contractValue:1000,purchases:[{grandTotal:400,payments:[{amount:100},{amount:50,transactionId:3}]}],transactions:[
    {type:'EXPENSE',source:'PURCHASE',amount:400},
    {type:'EXPENSE',source:'PURCHASE_PAYMENT',amount:150},
    {type:'EXPENSE',source:'MANUAL',workerId:1,amount:100},
    {type:'EXPENSE',source:'MANUAL',amount:20.25},
    {type:'INCOME',source:'CLIENT_PAYMENT',amount:300},
    {type:'INCOME',source:'MANUAL',amount:200}
  ]});
  assert.equal(result.cost,520.25);assert.equal(result.projectedProfit,479.75);
  assert.equal(result.cashOut,270.25);assert.equal(result.cashBalance,229.75);
  assert.equal(result.customerDue,500);assert.equal(result.vendorDue,250);
});
test('loss, overpayments and decimal amounts remain distinct',()=>{
  const result=projectProfit({contractValue:0.3,purchases:[{grandTotal:0.4,payments:[{amount:0.5}]}],transactions:[{type:'INCOME',amount:0.4}]});
  assert.equal(result.projectedProfit,-0.1);assert.equal(result.cashBalance,-0.1);assert.equal(result.vendorDue,0);assert.equal(result.customerCredit,0.1);
  assert.equal(projectProfit({}).cost,0);
});
test('report route registers authentication and returns calculated totals',async()=>{
  let handler,guard;const auth=()=>{};
  const app={get(path,a,h){assert.equal(path,'/api/reports/project-profit');guard=a;handler=h;}};
  registerProjectProfit(app,{project:{findMany:async()=>[{id:1,contractValue:10}]}},auth);
  assert.equal(guard,auth);let result;await handler({}, {json(value){result=value;}});assert.equal(result.data[0].projectedProfit,10);
});
test('local database report endpoint returns finite totals and rejects anonymous access',{skip:process.env.CRM_INTEGRATION!=='1'},async()=>{
  require('dotenv').config();
  assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname));
  const {app,prisma}=require('./server');
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  let user;
  try {
    user=await prisma.user.create({data:{name:'Report test',username:'profit_test_'+Date.now(),passwordHash:'test-only'}});
    const token=require('jsonwebtoken').sign({userId:user.id},process.env.JWT_SECRET,{expiresIn:'5m'});
    const url=`http://127.0.0.1:${server.address().port}/api/reports/project-profit`;
    assert.equal((await fetch(url)).status,401);
    const response=await fetch(url,{headers:{Authorization:`Bearer ${token}`}});
    assert.equal(response.status,200);
    const {data}=await response.json();assert.ok(Array.isArray(data));
    for(const row of data) assert.ok(Number.isFinite(row.projectedProfit)&&Number.isFinite(row.cashBalance));
  } finally {
    if(user) await prisma.user.delete({where:{id:user.id}});
    await new Promise(resolve=>server.close(resolve));await prisma.$disconnect();
  }
});
