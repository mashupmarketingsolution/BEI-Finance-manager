const test=require('node:test'),assert=require('node:assert/strict');
test('All and numeric page sizes preserve list filters and return complete API lists',{skip:process.env.CRM_INTEGRATION!=='1'},async()=>{
  require('dotenv').config();assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname));
  const {app,prisma}=require('./server');const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  let user;const prefix='pagination_'+Date.now();
  try{
    user=await prisma.user.create({data:{name:'Pagination test',username:prefix,passwordHash:'test-only'}});
    await prisma.worker.createMany({data:Array.from({length:26},(_,i)=>({name:prefix+'_'+i}))});
    const token=require('jsonwebtoken').sign({userId:user.id},process.env.JWT_SECRET,{expiresIn:'5m'});
    const get=async path=>{const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/'+path,{headers:{Authorization:'Bearer '+token}});assert.equal(r.status,200,path);return r.json();};
    for(const path of ['projects','leads','customers','material-categories','materials','income','expenses','workers','vendors','transactions','categories/paginated']){
      const r=await get(path+'?limit=-1&page=3');
      if(path==='categories/paginated'){for(const kind of ['income','expense']){assert.equal(r.data[kind].length,r.pagination[kind].totalRecords);assert.equal(r.pagination[kind].totalPages,1);}}
      else {const total=Object.entries(r.pagination).find(([k])=>k.startsWith('total')&&k!=='totalPages')[1];assert.equal(r.data.length,total,path);assert.equal(r.pagination.page,1);assert.equal(r.pagination.totalPages,1);}
    }
    const first=await get('workers?limit=10&page=1'),second=await get('workers?limit=10&page=2');
    assert.equal(first.data.length,10);assert.equal(second.data.length,10);assert.equal(first.data.some(a=>second.data.some(b=>a.id===b.id)),false);
    assert.equal((await get('workers?limit=25')).data.length,25);
    const filtered=await get('transactions?limit=-1&type=INCOME');assert.ok(filtered.data.every(t=>t.type==='INCOME'));
  }finally{
    await prisma.worker.deleteMany({where:{name:{startsWith:prefix}}});if(user)await prisma.user.delete({where:{id:user.id}});
    await new Promise(r=>server.close(r));await prisma.$disconnect();
  }
});
