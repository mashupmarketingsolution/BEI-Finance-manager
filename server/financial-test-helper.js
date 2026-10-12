// Test-only HTTP workflow: never bypass the approval gate to exercise older accounting checks.
const jwt=require('jsonwebtoken');
function wrapFinancialCalls(prisma,user,server,raw){
 let reviewerPromise;
 return async(path,method='GET',body)=>{
  const match=method==='POST'&&path.match(/^job-costing\/payroll\/(\d+)\/payments$/);
  if(!match)return raw(path,method,method==='DELETE'&&path.startsWith('job-costing/payments/')?{notes:'Test correction'}:body);
  const submitted=await raw('financial-requests','POST',{kind:'PAYROLL',payload:{accrualId:Number(match[1]),...body}});if(submitted.status!==201)return submitted;
  const reviewer=await(reviewerPromise||=(prisma.user.create({data:{name:'Approval test reviewer',username:'financial_review_'+user.id,role:'ADMIN',passwordHash:'test-only'}})));
  const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/financial-requests/'+submitted.data.id+'/approve',{method:'POST',headers:{Authorization:'Bearer '+jwt.sign({userId:reviewer.id},process.env.JWT_SECRET,{expiresIn:'5m'}),'Content-Type':'application/json'},body:JSON.stringify({version:submitted.data.version})});const approved={status:response.status,...await response.json()};if(approved.status!==200)return approved;
  return raw(path,method,{...body,approvalRequestId:approved.data.id,version:approved.data.version});
 };
}
async function cleanupFinancialTest(prisma,user){if(!user)return;await prisma.financialRequest.deleteMany({where:{creatorId:user.id}});await prisma.user.deleteMany({where:{username:'financial_review_'+user.id}});}
module.exports={wrapFinancialCalls,cleanupFinancialTest};
