const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),express=require('express');
const {registerFrontend}=require('./frontend');
test('production frontend serves app and assets without swallowing API or private paths',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'bei-frontend-'));fs.writeFileSync(path.join(directory,'index.html'),'<h1>Finance</h1>');fs.writeFileSync(path.join(directory,'app.js'),'// asset');
 const app=express();registerFrontend(app,{production:true,directory});app.use((req,res)=>res.status(404).json({success:false}));const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 try{for(const p of ['/','/projects'])assert.match(await (await fetch(base+p)).text(),/Finance/);assert.equal((await fetch(base+'/app.js')).status,200);for(const p of ['/api/unknown','/.env','/backup-private/encryption.key','/missing.js'])assert.equal((await fetch(base+p)).status,404,p);assert.equal((await fetch(base+'/projects',{method:'POST'})).status,404);}finally{await new Promise(r=>server.close(r));if(path.dirname(directory)===path.resolve(os.tmpdir())&&path.basename(directory).startsWith('bei-frontend-'))fs.rmSync(directory,{recursive:true,force:true});}
});
