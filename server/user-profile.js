function profile(body){
 const bad=message=>{throw Object.assign(Error(message),{status:400});};
 if(typeof body.name!=='string'||!body.name.trim()||body.name.trim().length>150||/[\x00-\x1f\x7f]/.test(body.name))bad('Enter a valid full name (1–150 characters)');
 if(typeof body.username!=='string'||! /^[A-Za-z0-9][A-Za-z0-9._-]{2,49}$/.test(body.username.trim()))bad('Username must have 3–50 letters, numbers, dots, hyphens or underscores');
 return {name:body.name.trim(),username:body.username.trim().toLowerCase()};
}
function registerUserProfile(app,prisma){
 const action=kind=>async(req,res)=>{try{
 if(req.user?.role!=='ADMIN')return res.status(403).json({success:false,message:'Admin access required'});
 const id=Number(req.params.id),version=req.body?.accessVersion;
 if(!Number.isSafeInteger(id)||id<1||!Number.isSafeInteger(version)||version<1)throw Object.assign(Error('Refresh users and retry'),{status:400});
 const input=kind==='profile'?profile(req.body):null;
 const data=await prisma.$transaction(async db=>{
 await db.$queryRaw`SELECT id FROM users ORDER BY id FOR UPDATE`;
 const actor=await db.user.findUnique({where:{id:req.user.id}}),u=await db.user.findUnique({where:{id}});
 if(!actor||actor.role!=='ADMIN'||actor.status!=='ACTIVE'||actor.deletedAt)throw Object.assign(Error('Active Admin access required'),{status:403});
 if(!u)throw Object.assign(Error('User not found'),{status:404});
 if(u.accessVersion!==version)throw Object.assign(Error('User changed. Refresh users before saving'),{status:409});
 if(kind==='delete'&&id===actor.id)throw Object.assign(Error('You cannot delete your own Admin account'),{status:409});
 if(kind==='delete'&&u.role==='ADMIN'&&u.status==='ACTIVE'&&await db.user.count({where:{role:'ADMIN',status:'ACTIVE',deletedAt:null}})<=1)throw Object.assign(Error('Keep at least one active Admin'),{status:409});
 if(kind!=='restore'&&u.deletedAt)throw Object.assign(Error('Account is already deleted. Restore it first'),{status:409});
 if(kind==='restore'&&!u.deletedAt)throw Object.assign(Error('Account is not deleted'),{status:409});
 return db.user.update({where:{id},data:{...(kind==='profile'?input:kind==='delete'?{deletedAt:new Date(),status:'INACTIVE'}:{deletedAt:null,status:'INACTIVE'}),accessVersion:{increment:1},...(kind!=='profile'||u.username!==input.username?{passwordVersion:{increment:1}}:{})},select:{id:true,name:true,username:true,status:true,role:true,deletedAt:true,accessVersion:true}});
 },{isolationLevel:'Serializable'});
 res.json({success:true,data,message:kind==='restore'?'Restored as inactive. Edit access to activate.':kind==='delete'?'User deleted. History is preserved.':'User details updated.'});
 }catch(e){res.status(e.status||(['P2002','P2034'].includes(e.code)?409:500)).json({success:false,message:e.status?e.message:e.code==='P2002'?'Username is already in use (including deleted accounts)':e.code==='P2034'?'Account changed concurrently. Refresh and retry.':'Unable to update user'});}};
 app.put('/api/access/users/:id/profile',action('profile'));
 app.delete('/api/access/users/:id',action('delete'));
 app.post('/api/access/users/:id/restore',action('restore'));
}
module.exports={profile,registerUserProfile};
