const fs=require('node:fs'),fsp=fs.promises,path=require('node:path'),crypto=require('node:crypto');
const {pipeline}=require('node:stream/promises'),{Writable}=require('node:stream'),zlib=require('node:zlib'),{spawn}=require('node:child_process');
const MAGIC=Buffer.from('BEIBAK01'),pattern=/^bei-([a-f0-9]{16})-(\d{13})-([a-f0-9]{8})\.sql\.gz\.enc$/;
const hash=()=>crypto.createHash('sha256');
function config(env=process.env){return {dir:path.resolve(env.BACKUP_PRIVATE_DIR||path.join(__dirname,'backup-private')),keyFile:env.BACKUP_KEY_FILE?path.resolve(env.BACKUP_KEY_FILE):null,remote:env.BACKUP_REMOTE||'',rclone:env.RCLONE_BIN||'rclone',rcloneConfig:env.RCLONE_CONFIG||'',dump:env.MYSQLDUMP_BIN||(process.platform==='win32'?'C:/xampp/mysql/bin/mysqldump.exe':'mysqldump'),scheduled:env.BACKUP_AUTO_ENABLED==='true'};}
async function init(c){await fsp.mkdir(c.dir,{recursive:true,mode:0o700});try{await fsp.writeFile(path.join(c.dir,'installation-id'),crypto.randomBytes(8).toString('hex'),{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}}
async function key(c){const b=await fsp.readFile(c.keyFile||path.join(c.dir,'encryption.key'));if(b.length!==32)throw Error('Encryption key must contain exactly 32 bytes');return b;}
function exec(exe,args,env=process.env){return new Promise((resolve,reject)=>{const p=spawn(exe,args,{env,windowsHide:true,stdio:['ignore','pipe','pipe']});let out='',overflow=false;p.stderr.resume();p.stdout.on('data',b=>{out+=b;if(out.length>8*1024*1024){overflow=true;p.kill();}});const timer=setTimeout(()=>p.kill(),20*60*1000);p.once('error',()=>{clearTimeout(timer);reject(Error('Required backup utility could not start'));});p.once('close',code=>{clearTimeout(timer);code===0&&!overflow?resolve(out):reject(Error('Backup utility failed; check server configuration and cloud connection'));});});}
async function encryptStream(input,file,k){
 const iv=crypto.randomBytes(12),header=Buffer.concat([MAGIC,iv]),cipher=crypto.createCipheriv('aes-256-gcm',k,iv);cipher.setAAD(header);
 await fsp.writeFile(file,header,{flag:'wx',mode:0o600});
 await pipeline(input,zlib.createGzip(),cipher,fs.createWriteStream(file,{flags:'a',mode:0o600}));await fsp.appendFile(file,cipher.getAuthTag());
}
async function decryptStream(file,k,output){
 const stat=await fsp.stat(file);if(stat.size<37)throw Error('Invalid encrypted backup');const h=await fsp.open(file,'r');let header=Buffer.alloc(20),tag=Buffer.alloc(16);try{await h.read(header,0,20,0);await h.read(tag,0,16,stat.size-16);}finally{await h.close();}
 if(!header.subarray(0,8).equals(MAGIC))throw Error('Unknown backup format');const decipher=crypto.createDecipheriv('aes-256-gcm',k,header.subarray(8));decipher.setAAD(header);decipher.setAuthTag(tag);
 await pipeline(fs.createReadStream(file,{start:20,end:stat.size-17}),decipher,zlib.createGunzip(),output);
}
async function checksum(file){const h=hash();for await(const b of fs.createReadStream(file))h.update(b);return h.digest('hex');}
function week(ms){const d=new Date(ms+6*3600000);d.setUTCHours(0,0,0,0);d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return d.toISOString().slice(0,10);}
function retention(names,installation){
 const rows=names.map(name=>({name,m:pattern.exec(name)})).filter(r=>r.m&&r.m[1]===installation).sort((a,b)=>Number(b.m[2])-Number(a.m[2]));
 const days=new Set(),weeks=new Set(),keep=new Set();
 for(const r of rows){const day=new Date(Number(r.m[2])+6*3600000).toISOString().slice(0,10),w=week(Number(r.m[2]));if(!days.has(day)&&days.size<7){days.add(day);keep.add(r.name);}if(!weeks.has(w)&&weeks.size<4){weeks.add(w);keep.add(r.name);}}
 return rows.filter(r=>!keep.has(r.name)).map(r=>r.name);
}
function remoteFolder(c,id){if(!/^[a-zA-Z0-9_-]+:[^\r\n]*$/.test(c.remote)||c.remote.includes('..')||c.remote.includes('\\'))throw Error('Use a named rclone remote and a dedicated backup folder');return c.remote.replace(/\/$/,'')+'/bei-'+id;}
const rargs=c=>c.rcloneConfig?['--config',c.rcloneConfig]:[];
async function saveState(c,state){const file=path.join(c.dir,'status.json'),tmp=file+'.tmp';await fsp.writeFile(tmp,JSON.stringify(state,null,2),{mode:0o600});await fsp.rename(tmp,file);}
async function state(c=config()){try{return JSON.parse(await fsp.readFile(path.join(c.dir,'status.json'),'utf8'));}catch{return {state:'NEVER',history:[]};}}
async function status(c=config()){
 const s=await state(c),keyReady=await key(c).then(()=>true,()=>false);return {...s,keyReady,cloudConfigured:!!c.remote,automaticConfigured:c.scheduled,retention:'7 daily + 4 weekly snapshots',stale:!s.lastSuccessAt||Date.now()-new Date(s.lastSuccessAt).getTime()>36*3600000};
}
async function runBackup(c=config(),{scheduled=false,execute=exec,startDump=spawn}={}){
 if(scheduled&&!c.scheduled)return {disabled:true};await init(c);const lockFile=path.join(c.dir,'running.lock');let lock;
 try{lock=await fsp.open(lockFile,'wx',0o600);}catch(e){if(e.code==='EEXIST')throw Error('A backup is already running or its lock needs operator review');throw e;}
 let s=await state(c),file,stage='PREPARE';const startedAt=new Date().toISOString();
 try{
  await lock.writeFile(JSON.stringify({pid:process.pid,startedAt}));await saveState(c,{...s,state:'RUNNING',startedAt});
  const k=await key(c),id=(await fsp.readFile(path.join(c.dir,'installation-id'),'utf8')).trim();if(!/^[a-f0-9]{16}$/.test(id))throw Error('Invalid installation ID');
  const url=new URL(process.env.DATABASE_URL),name=decodeURIComponent(url.pathname.slice(1));if(!/^[a-zA-Z0-9_]+$/.test(name))throw Error('Unsupported database name');
  const filename='bei-'+id+'-'+Date.now()+'-'+crypto.randomBytes(4).toString('hex')+'.sql.gz.enc';file=path.join(c.dir,filename);stage='DATABASE';
  const p=startDump(c.dump,['--single-transaction','--skip-lock-tables','--no-tablespaces','--hex-blob','--routines','--triggers','--events','--default-character-set=utf8mb4','--host='+url.hostname,'--port='+(url.port||3306),'--user='+decodeURIComponent(url.username),name],{windowsHide:true,env:{...process.env,MYSQL_PWD:decodeURIComponent(url.password)},stdio:['ignore','pipe','pipe']});p.stderr.resume();
  const timer=setTimeout(()=>p.kill(),20*60*1000);
  const completed=new Promise((resolve,reject)=>{p.once('error',()=>reject(Error('Database utility unavailable')));p.once('close',code=>code===0?resolve():reject(Error('Database export failed')));}).finally(()=>clearTimeout(timer));
  const parts=await Promise.allSettled([encryptStream(p.stdout,file+'.part',k).catch(e=>{p.kill();throw e;}),completed]);if(parts.some(r=>r.status==='rejected')){p.kill();throw Error('Database backup could not be completed');}
  stage='VERIFY';await decryptStream(file+'.part',k,new Writable({write(chunk,encoding,done){done();}}));await fsp.rename(file+'.part',file);
  const entry={filename,createdAt:new Date().toISOString(),bytes:(await fsp.stat(file)).size,sha256:await checksum(file),cloud:c.remote?'PENDING':'NOT_CONFIGURED',scheduled};
  s={...s,history:[entry,...(s.history||[])].slice(0,100)};await saveState(c,{...s,state:'RUNNING',startedAt});
  if(c.remote){stage='UPLOAD';const remote=remoteFolder(c,id);await execute(c.rclone,['copyto',file,remote+'/'+filename,...rargs(c)]);
   // Compare downloaded encrypted bytes, even if the provider lacks checksums.
   await execute(c.rclone,['check',c.dir,remote,'--include',filename,'--one-way','--download',...rargs(c)]);entry.cloud='VERIFIED';
   stage='RETENTION';const remoteRows=JSON.parse(await execute(c.rclone,['lsjson',remote,'--files-only','--max-depth','1',...rargs(c)]));
   for(const old of retention(remoteRows.filter(r=>!r.IsDir&&r.Name===r.Path).map(r=>r.Name),id))await execute(c.rclone,['deletefile',remote+'/'+old,...rargs(c)]);
  }
  stage='RETENTION';for(const old of retention(await fsp.readdir(c.dir),id))await fsp.unlink(path.join(c.dir,old));
  const result={...s,state:'SUCCESS',startedAt,finishedAt:new Date().toISOString(),lastSuccessAt:new Date().toISOString(),lastError:null};await saveState(c,result);return result;
 }catch(e){if(file)await fsp.unlink(file+'.part').catch(()=>{});const failure={...s,state:'FAILED',startedAt,finishedAt:new Date().toISOString(),lastError:'Backup failed during '+stage+'. Check server backup settings; the last successful backup is retained.'};await saveState(c,failure);throw Error(failure.lastError);
 }finally{await lock.close();await fsp.unlink(lockFile);}
}
function registerBackups(app){
 const admin=(req,res,next)=>req.user?.role==='ADMIN'?next():res.status(403).json({success:false,message:'Admin access required'});
 app.get('/api/backups',admin,async(req,res)=>{try{res.json({success:true,data:await status()});}catch{res.status(500).json({success:false,message:'Unable to read backup status'});}});
 app.post('/api/backups/run',admin,async(req,res)=>{const s=await status();if(!s.keyReady)return res.status(400).json({success:false,message:'Complete encryption key setup on the server first'});if(s.state==='RUNNING')return res.status(409).json({success:false,message:'Backup is already running'});runBackup().catch(()=>{});res.status(202).json({success:true,message:'Backup requested. Check status for completion.'});});
}
async function cli(){require('dotenv').config({path:path.join(__dirname,'.env'),quiet:true});const c=config(),arg=process.argv[2];
 if(arg==='--init-key'){await init(c);await fsp.writeFile(c.keyFile||path.join(c.dir,'encryption.key'),crypto.randomBytes(32),{flag:'wx',mode:0o600});console.log('Encryption key created privately. Keep a separate protected recovery copy.');}
 else if(arg==='--run'||arg==='--scheduled'){const s=await runBackup(c,{scheduled:arg==='--scheduled'});console.log(s.disabled?'Automatic backup is disabled.':'Backup completed; see Admin → Backups for status.');}
 else if(arg==='--decrypt'){const [input,output]=process.argv.slice(3);if(!input||!output)throw Error('Supply encrypted backup and a new output file path');const handle=await fsp.open(output,'wx',0o600);try{await decryptStream(input,await key(c),handle.createWriteStream());}catch{await handle.close().catch(()=>{});await fsp.unlink(output).catch(()=>{});throw Error('Decryption failed; check key and backup integrity');}console.log('SQL decrypted. Restore only into a separately reviewed target database.');}
 else throw Error('Use --init-key, --run, --scheduled or --decrypt <backup> <new-output.sql>');
}
if(require.main===module)cli().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={config,encryptStream,decryptStream,retention,remoteFolder,runBackup,status,registerBackups};
