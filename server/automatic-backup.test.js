const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {Readable,Writable}=require('node:stream'),{spawn}=require('node:child_process');
const {config,encryptStream,decryptStream,retention,remoteFolder,runBackup,status,registerBackups}=require('./automatic-backup');
const {allowed}=require('./access-control');
function fixture(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bei-auto-backup-'));t.after(()=>{if(path.dirname(dir)!==path.resolve(os.tmpdir())||!path.basename(dir).startsWith('bei-auto-backup-'))throw Error('Unsafe fixture cleanup');fs.rmSync(dir,{recursive:true,force:true});});return dir;}
const sink=()=>{const parts=[];return {parts,stream:new Writable({write(b,e,done){parts.push(b);done();}})};};
test('encrypted compressed backup round-trips Bengali/binary and rejects tampering/wrong keys',async t=>{
 const dir=fixture(t),file=path.join(dir,'backup.enc'),key=crypto.randomBytes(32),original=Buffer.concat([Buffer.from('CREATE TABLE test; বাংলা\n'),Buffer.from([0,255,22])]);
 await encryptStream(Readable.from([original]),file,key);const out=sink();await decryptStream(file,key,out.stream);assert.deepEqual(Buffer.concat(out.parts),original);assert.equal(fs.readFileSync(file).includes(Buffer.from('CREATE TABLE')),false);
 await assert.rejects(decryptStream(file,crypto.randomBytes(32),sink().stream));const bytes=fs.readFileSync(file);bytes[24]^=1;fs.writeFileSync(file,bytes);await assert.rejects(decryptStream(file,key,sink().stream));
});
test('retention keeps daily and weekly representatives and never selects another installation or unrelated files',()=>{
 const id='a'.repeat(16),other='b'.repeat(16),names=[];for(let d=0;d<40;d++)names.push(`bei-${id}-${Date.UTC(2026,9,14-d)}-aabbccdd.sql.gz.enc`);
 const deleted=retention([...names,'notes.txt',`bei-${other}-${Date.UTC(2026,9,1)}-aabbccdd.sql.gz.enc`],id);
 assert.ok(deleted.length>0);for(const n of names.slice(0,7))assert.ok(!deleted.includes(n));for(const n of [names[10],names[17]])assert.ok(!deleted.includes(n));assert.ok(deleted.every(n=>names.includes(n)));assert.ok(names.length-deleted.length<=11);
 assert.throws(()=>remoteFolder({remote:'gdrive:../other'},id));assert.match(remoteFolder({remote:'gdrive:BEI'},id),/gdrive:BEI\/bei-/);
});
test('backup run verifies encrypted local copy, cloud check before retention, lock and safe failure status',async t=>{
 const dir=fixture(t),c={...config({}),dir,remote:'gdrive:BEI'},key=crypto.randomBytes(32);fs.writeFileSync(path.join(dir,'encryption.key'),key);
 const previous=process.env.DATABASE_URL;process.env.DATABASE_URL='mysql://test:private@localhost/test_db';t.after(()=>{if(previous===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=previous;});
 const startDump=()=>spawn(process.execPath,['-e','process.stdout.write("CREATE TABLE test(id INT);\\n")'],{stdio:['ignore','pipe','pipe'],windowsHide:true}),calls=[];
 const execute=async(exe,args)=>{calls.push(args);return args[0]==='lsjson'?'[]':'';};
 const result=await runBackup(c,{startDump,execute});assert.equal(result.state,'SUCCESS');assert.equal(result.history[0].cloud,'VERIFIED');assert.deepEqual(calls.map(a=>a[0]),['copyto','check','lsjson']);assert.ok(calls[1].includes('--download'));
 fs.writeFileSync(path.join(dir,'running.lock'),'owned fixture');await assert.rejects(runBackup(c,{startDump,execute}),/already running/);fs.unlinkSync(path.join(dir,'running.lock'));
 const failedCalls=[];await assert.rejects(runBackup(c,{startDump,execute:async(exe,args)=>{failedCalls.push(args[0]);throw Error('token secret');}}),/UPLOAD/);assert.deepEqual(failedCalls,['copyto']);const s=await status(c);assert.equal(s.state,'FAILED');assert.equal(s.lastSuccessAt,result.lastSuccessAt);assert.equal(JSON.stringify(s).includes('token secret'),false);
 assert.ok(!fs.readdirSync(dir).some(n=>n.endsWith('.part')));assert.deepEqual(await runBackup({...c,scheduled:false},{scheduled:true}),{disabled:true});
});
test('backup status and run API are Admin-only and expose no key or destination credentials',async()=>{
 const express=require('express'),app=express();app.use((req,res,next)=>{req.user={role:req.headers['x-test-role']};next();});registerBackups(app);const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 try{const url='http://127.0.0.1:'+server.address().port+'/api/backups';for(const role of ['ACCOUNTS','PROJECT_MANAGER','SITE_SUPERVISOR','PROCUREMENT_OFFICER','STOREKEEPER','VIEWER']){assert.equal(allowed(role,'/backups','GET'),false);assert.equal((await fetch(url,{headers:{'x-test-role':role}})).status,403);assert.equal((await fetch(url+'/run',{method:'POST',headers:{'x-test-role':role}})).status,403);}assert.equal(allowed('ADMIN','/backups','GET'),true);const r=await (await fetch(url,{headers:{'x-test-role':'ADMIN'}})).json();assert.equal(r.success,true);for(const k of ['dir','keyFile','remote','rcloneConfig'])assert.equal(k in r.data,false);}finally{await new Promise(r=>server.close(r));}
});
