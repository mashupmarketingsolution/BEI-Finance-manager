const test=require('node:test'),assert=require('node:assert/strict');
const {newUserData}=require('./access-control');
const password='Test-only password!';
const body={name:' Test User ',username:' Test.User ',password,confirmPassword:password};
test('account creation validates identity, matching passwords and bcrypt byte limit',()=>{
 assert.deepEqual(newUserData(body),{name:'Test User',username:'test.user',role:'SITE_SUPERVISOR'});
 for(const invalid of [null,undefined,[]])assert.throws(()=>newUserData(invalid),e=>e.status===400);
 for(const extra of [{name:' '},{name:'x'.repeat(151)},{username:'ab'},{username:'a b'},{username:'abc@x'},{password:'short',confirmPassword:'short'},{confirmPassword:'different'},{role:'OWNER'},{password:'a'.repeat(73),confirmPassword:'a'.repeat(73)},{password:'ক'.repeat(25),confirmPassword:'ক'.repeat(25)}])assert.throws(()=>newUserData({...body,...extra}));
 assert.ok(newUserData({...body,password:'a'.repeat(72),confirmPassword:'a'.repeat(72)}));
});
test('local Admin creates users with hashed passwords, roles, unique usernames and working login',{skip:process.env.CRM_INTEGRATION!=='1'},async()=>{
 require('dotenv').config();assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname));
 const {app,prisma}=require('./server'),server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const prefix='create_'+Date.now();const ids=[];
 try{
  const admin=await prisma.user.create({data:{name:prefix,username:prefix,passwordHash:'test-only',role:'ADMIN'}});ids.push(admin.id);
  const restricted=await prisma.user.create({data:{name:prefix+'restricted',username:prefix+'restricted',passwordHash:'test-only'}});ids.push(restricted.id);
  const jwt=require('jsonwebtoken'),token=jwt.sign({userId:admin.id},process.env.JWT_SECRET,{expiresIn:'5m'}),limited=jwt.sign({userId:restricted.id},process.env.JWT_SECRET,{expiresIn:'5m'}),url='http://127.0.0.1:'+server.address().port+'/api/';
  const call=async(path,method='GET',data,bearer=token)=>{const r=await fetch(url+path,{method,headers:{'Content-Type':'application/json',...(bearer?{Authorization:'Bearer '+bearer}:{})},body:data===undefined?undefined:JSON.stringify(data)});return {status:r.status,...await r.json()};};
  const input={...body,username:prefix+'_staff',name:'Test staff'};
  assert.equal((await call('access/users','POST',input,null)).status,401);assert.equal((await call('access/users','POST',input,limited)).status,403);
  assert.equal((await call('access/users','POST',{...input,confirmPassword:'different'})).status,400);
  for(const role of ['SITE_SUPERVISOR','ACCOUNTS','PROJECT_MANAGER','ADMIN','PROCUREMENT_OFFICER','STOREKEEPER','VIEWER']){
   const username=prefix+'_'+role.toLowerCase();const created=await call('access/users','POST',{...input,username:username.toUpperCase(),role,passwordHash:'untrusted',status:'INACTIVE'});assert.equal(created.status,201);ids.push(created.data.id);
   assert.equal(created.data.username,username);assert.equal(created.data.status,'ACTIVE');assert.equal(created.data.role,role);assert.ok(!('passwordHash' in created.data));assert.ok(!('password' in created.data));
   const saved=await prisma.user.findUnique({where:{id:created.data.id}});assert.notEqual(saved.passwordHash,password);assert.equal(await require('bcryptjs').compare(password,saved.passwordHash),true);
   const login=await call('auth/login','POST',{username,password},null);assert.equal(login.status,200);assert.equal(login.data.user.role,role);assert.ok(login.data.token);assert.ok(!('passwordHash' in login.data.user));
   const finance=await call('income','GET',undefined,login.data.token);assert.equal(finance.status,['ADMIN','ACCOUNTS'].includes(role)?200:403);
   assert.equal((await call('auth/login','POST',{username,password:'Wrong-password'},null)).status,401);
  }
  assert.equal((await call('access/users','POST',{...input,username:prefix+'_accounts'})).status,409);
  const races=await Promise.all([call('access/users','POST',{...input,username:prefix+'_race'}),call('access/users','POST',{...input,username:prefix+'_race'})]);assert.equal(races.filter(r=>r.status===201).length,1);assert.equal(races.filter(r=>r.status===409).length,1);ids.push(races.find(r=>r.status===201).data.id);
  const list=await call('access/users');assert.ok(list.data.some(u=>u.id===ids.at(-1)));assert.ok(list.data.every(u=>!('passwordHash' in u)));
  assert.equal((await call('auth/me')).data.user.id,admin.id);
 }finally{
  // Prefix is unique to this test, including any record created before a failed assertion.
  await prisma.user.deleteMany({where:{username:{startsWith:prefix}}});await new Promise(r=>server.close(r));await prisma.$disconnect();
 }
});
