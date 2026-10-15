const bcrypt=require('bcryptjs');
function validatePassword(body){
 if(typeof body?.newPassword!=='string'||Array.from(body.newPassword).length<8||Buffer.byteLength(body.newPassword)>72||body.newPassword.includes('\0'))throw Object.assign(new Error('Use at least 8 characters and at most 72 UTF-8 bytes'),{status:400});
 if(body.newPassword!==body.confirmPassword)throw Object.assign(new Error('Passwords do not match'),{status:400});
 if(typeof body.currentPassword!=='string'||!body.currentPassword||Buffer.byteLength(body.currentPassword)>72)throw Object.assign(new Error('Enter your current password'),{status:400});
}
function registerPasswords(app,prisma){
 const attempts=new Map();
 const handler=reset=>async(req,res)=>{
 try{
 if(reset&&req.user.role!=='ADMIN')return res.status(403).json({success:false,message:'Admin access required'});
 const now=Date.now(),key=req.user.id;
 for(const [id,v] of attempts)if(v.until<now)attempts.delete(id);
 const limit=attempts.get(key)||{count:0,until:now+15*60*1000};
 if(limit.count>=5)return res.status(429).json({success:false,message:'Too many attempts. Try again after 15 minutes.'});
 limit.count++;attempts.set(key,limit);
 validatePassword(req.body);
 const id=reset?Number(req.params.id):req.user.id;
 if(!Number.isSafeInteger(id)||id<1)throw Object.assign(new Error('Invalid user'),{status:400});
 const actor=await prisma.user.findUnique({where:{id:req.user.id}});
 if(!actor||actor.status!=='ACTIVE'||(reset&&actor.role!=='ADMIN'))return res.status(403).json({success:false,message:'Access denied'});
 if(!await bcrypt.compare(req.body.currentPassword,actor.passwordHash))return res.status(400).json({success:false,message:'Current password is incorrect'});
 const target=id===actor.id?actor:await prisma.user.findUnique({where:{id}});
 if(!target)return res.status(404).json({success:false,message:'User not found'});
 if(await bcrypt.compare(req.body.newPassword,target.passwordHash))return res.status(400).json({success:false,message:'Choose a different new password'});
 const passwordHash=await bcrypt.hash(req.body.newPassword,12);
 await prisma.$transaction(async db=>{
 await db.$queryRawUnsafe('SELECT id FROM users WHERE id IN (?, ?) ORDER BY id FOR UPDATE',actor.id,id);
 const fresh=await db.user.findUnique({where:{id:actor.id}});
 if(!fresh||fresh.status!=='ACTIVE'||fresh.passwordHash!==actor.passwordHash||(reset&&fresh.role!=='ADMIN'))throw Object.assign(new Error('Account changed. Sign in again and retry'),{status:409});
 const result=await db.user.updateMany({where:{id,passwordHash:target.passwordHash},data:{passwordHash,passwordVersion:{increment:1}}});
 if(result.count!==1)throw Object.assign(new Error('Password changed. Refresh and retry'),{status:409});
 });
 attempts.delete(key);
 res.json({success:true,message:'Password updated. All previous sessions for this user are signed out.'});
 }catch(e){res.status(e.status||500).json({success:false,message:e.status?e.message:'Unable to update password'});}
 };
 app.post('/api/auth/password',handler(false));
 app.post('/api/access/users/:id/password',handler(true));
}
module.exports={registerPasswords,validatePassword};
