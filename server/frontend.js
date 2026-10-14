const express=require('express'),fs=require('node:fs'),path=require('node:path');
function registerFrontend(app,{production=process.env.NODE_ENV==='production',directory=path.join(__dirname,'public')}={}){
 if(!production||!fs.existsSync(path.join(directory,'index.html')))return;
 app.use((req,res,next)=>req.path.startsWith('/api/')||req.path==='/api'?next():express.static(directory,{dotfiles:'deny',index:false})(req,res,next));
 app.use((req,res,next)=>{
  if(!['GET','HEAD'].includes(req.method)||req.path.startsWith('/api')||req.path.split('/').some(p=>p.startsWith('.'))||path.extname(req.path)||!req.accepts('html'))return next();
  res.set('Cache-Control','no-cache');res.sendFile(path.join(directory,'index.html'));
 });
}
module.exports={registerFrontend};
