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
test('job costing reconciles groups, separates BOQs, units and bill adjustments',()=>{
  const item=(materialId,unit,total,quantity)=>({materialId,unit,total,quantity,material:{name:'Material '+materialId}});
  const report=projectProfit({contractValue:1000,purchases:[{grandTotal:290,transportCost:10,items:[item(1,'pcs',200,2),item(2,'sheet',100,1)]}],transactions:[
    {type:'EXPENSE',amount:20,category:{name:'Transport'}},
    {type:'EXPENSE',amount:30,category:{name:'Design'}},
    {type:'EXPENSE',amount:40,workerId:1},
    {type:'EXPENSE',amount:50,vendorId:1},
    {type:'EXPENSE',amount:10,category:{name:'Other'}},
    {type:'EXPENSE',amount:15,category:{name:'Materials'}}
  ],boqs:[{id:1,status:'APPROVED',items:[{...item(1,'pcs',0,3),estimatedTotal:250},{...item(1,'box',0,1),estimatedTotal:20}]},{id:2,status:'DRAFT',items:[{...item(1,'pcs',0,9),estimatedTotal:900}]},{id:3,status:'CANCELLED',items:[]}]});
  assert.equal(report.cost,455);assert.equal(report.profitMargin,54.5);
  assert.deepEqual(report.breakdown,{materials:295,transport:30,design:30,labour:40,vendor:50,other:10});
  assert.equal(Object.values(report.breakdown).reduce((a,b)=>a+b,0),report.cost);
  assert.equal(report.purchaseLineCost,300);assert.equal(report.purchaseAdjustments,-10);
  assert.equal(report.boqs.length,2);assert.equal(report.boqs[0].estimatedCost,270);assert.equal(report.boqs[1].estimatedCost,900);
  assert.equal(report.boqs[0].items.find(i=>i.unit==='pcs').variance,50);
  assert.equal(report.boqs[0].items.find(i=>i.unit==='box').actualCost,0);
  assert.equal(report.boqs[0].items.find(i=>i.materialId===2).inBoq,false);
  assert.equal(projectProfit({}).profitMargin,null);
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
  let user,project,material;
  try {
    user=await prisma.user.create({data:{name:'Report test',username:'profit_test_'+Date.now(),passwordHash:'test-only'}});
    material=await prisma.material.create({data:{name:'Costing test',code:'costing_'+user.id,unit:'pcs'}});
    project=await prisma.project.create({data:{name:'costing_'+user.id,contractValue:100,boqs:{create:{boqNo:'costing_'+user.id,name:'Budget',status:'APPROVED',items:{create:{materialId:material.id,quantity:2,unit:'pcs',estimatedUnitPrice:15,estimatedTotal:30}}}}}});
    const token=require('jsonwebtoken').sign({userId:user.id},process.env.JWT_SECRET,{expiresIn:'5m'});
    const url=`http://127.0.0.1:${server.address().port}/api/reports/project-profit`;
    assert.equal((await fetch(url)).status,401);
    const response=await fetch(url,{headers:{Authorization:`Bearer ${token}`}});
    assert.equal(response.status,200);
    const {data}=await response.json();assert.ok(Array.isArray(data));
    for(const row of data) assert.ok(Number.isFinite(row.projectedProfit)&&Number.isFinite(row.cashBalance));
    const report=data.find(row=>row.id===project.id);assert.equal(report.profitMargin,100);assert.equal(report.boqs[0].estimatedCost,30);assert.equal(report.boqs[0].items[0].name,'Costing test');
  } finally {
    if(project)await prisma.project.delete({where:{id:project.id}});
    if(material)await prisma.material.delete({where:{id:material.id}});
    if(user) await prisma.user.delete({where:{id:user.id}});
    await new Promise(resolve=>server.close(resolve));await prisma.$disconnect();
  }
});
