// Restore into an operator-configured, empty database only. Never imports over live data.
const fs=require('node:fs'),fsp=fs.promises,path=require('node:path'),crypto=require('node:crypto');
const {Writable}=require('node:stream'),{spawn}=require('node:child_process');
const express=require('express'),mariadb=require('mariadb'),bcrypt=require('bcryptjs');
const backup=require('./automatic-backup');
const MAX_UPLOAD=50*1024*1024,MAX_SQL=256*1024*1024,TTL=30*60*1000;
const validId=id=>/^[a-f0-9]{32}$/.test(id);
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
function connection(value){const u=new URL(value);const database=decodeURIComponent(u.pathname.slice(1));if(u.protocol!=='mysql:'||!/^[a-zA-Z0-9_]+$/.test(database))throw Error('Invalid database configuration');return {host:u.hostname,port:Number(u.port||3306),user:decodeURIComponent(u.username),password:decodeURIComponent(u.password),database};}
function targetConfig(env=process.env){
 if(!env.RESTORE_DATABASE_URL)return null;
 const source=connection(env.DATABASE_URL),target=connection(env.RESTORE_DATABASE_URL);
 if(source.host!==target.host||source.port!==target.port||source.database===target.database||source.user===target.user)throw Error('Use a separate empty database and a dedicated database user on this server');
 return target;
}
// Ignore comments/quoted values before deciding which statements a dump contains.
function statements(sql){
 const out=[];let s='',quote='',line=false,block=false;
 for(let i=0;i<sql.length;i++){
  const c=sql[i],n=sql[i+1];
  if(line){if(c==='\n'){line=false;s+=' ';}continue;}
  if(block){if(c==='*'&&n==='/'){block=false;i++;s+=' ';}continue;}
  if(quote){s+=c;if(c==='\\'){s+=n||'';i++;}else if(c===quote){if(n===quote){s+=n;i++;}else quote='';}continue;}
  if(c==='-'&&n==='-'&&/\s/.test(sql[i+2]||' ')){line=true;i++;continue;}
  if(c==='#'){line=true;continue;}
  if(c==='/'&&n==='*'){
   if(sql[i+2]==='!'){
    const end=sql.indexOf('*/',i+3);if(end<0)throw Error('Incomplete SQL comment');
    const body=sql.slice(i+3,end).replace(/^\d+\s*/, '').trim();
    if(body.includes(';')||(!/^SET\s/i.test(body)&&!/^ALTER TABLE\b/i.test(body)))throw Error('Unsupported executable SQL comment');
    // Session/key comments are checked independently, not executed during preview.
    out.push(body.replace(/;\s*$/,''));i=end+1;continue;
   }
   block=true;i++;continue;
  }
  if(c==='\''||c==='"'||c==='`'){quote=c;s+=c;continue;}
  if(c===';'){if(s.trim())out.push(s.trim());s='';}else s+=c;
 }
 if(quote||block)throw Error('Incomplete SQL');if(s.trim())out.push(s.trim());return out;
}
function inspectSql(sql){
 const tables=new Map();let inserts=[];
 for(const s of statements(sql)){
  let m;
  if((m=/^CREATE TABLE\s+`([a-zA-Z0-9_]+)`\s*\(/i.exec(s))){if(tables.has(m[1]))throw Error('Duplicate table');tables.set(m[1],0);continue;}
  if((m=/^INSERT INTO\s+`([a-zA-Z0-9_]+)`\s+VALUES\s*/i.exec(s))){
   let quote='',depth=0,count=0;const values=s.slice(m[0].length);
   for(let i=0;i<values.length;i++){const c=values[i],n=values[i+1];if(quote){if(c==='\\')i++;else if(c===quote){if(n===quote)i++;else quote='';}continue;}if(c==='\''||c==='"'){quote=c;continue;}if(c==='('){if(depth===0)count++;depth++;}if(c===')')depth--;if(depth<0)throw Error('Invalid insert');}
   if(depth||quote||!count)throw Error('Invalid insert');inserts.push([m[1],count]);continue;
  }
  if(/^SET\s+(?:@|SESSION\b|NAMES\b|CHARACTER_SET_CLIENT\b|CHARACTER_SET_RESULTS\b|COLLATION_CONNECTION\b|TIME_ZONE\b|UNIQUE_CHECKS\b|FOREIGN_KEY_CHECKS\b|SQL_MODE\b|SQL_NOTES\b)/i.test(s))continue;
  if(/^DROP TABLE IF EXISTS\s+`[a-zA-Z0-9_]+`$/i.test(s))continue;
  if(/^LOCK TABLES\s+`[a-zA-Z0-9_]+` WRITE$/i.test(s)||/^UNLOCK TABLES$/i.test(s))continue;
  if(/^ALTER TABLE\s+`[a-zA-Z0-9_]+`\s+(?:DISABLE|ENABLE) KEYS$/i.test(s))continue;
  throw Error('Only standard BEI table backups are supported; database switches, routines and client commands are not allowed');
 }
 for(const [name,count] of inserts){if(!tables.has(name))throw Error('Insert without table');tables.set(name,tables.get(name)+count);}
 if(!tables.has('users')||!tables.has('_prisma_migrations')||tables.size<2)throw Error('This is not a complete BEI database backup');
 return [...tables].map(([name,rows])=>({name,rows})).sort((a,b)=>a.name.localeCompare(b.name));
}
function migrationRecords(sql){
 const result=[];
 for(const s of statements(sql)){
  const m=/^INSERT INTO\s+`_prisma_migrations`\s+VALUES\s*/i.exec(s);if(!m)continue;
  const values=s.slice(m[0].length);let fields=[],value='',quote=false;
  const field=()=>{fields.push(value.trim());value='';};
  for(let i=0;i<values.length;i++){
   const c=values[i],n=values[i+1];
   if(quote){if(c==='\\'){value+=n||'';i++;}else if(c==="'"){if(n==="'"){value+="'";i++;}else quote=false;}else value+=c;continue;}
   if(c==="'"){quote=true;continue;}if(c==='('){fields=[];value='';continue;}if(c===','){if(fields.length||value)field();continue;}
   if(c===')'){field();if(fields.length!==8||fields[2]==='NULL'||fields[5]!=='NULL'||!/^\d+_/.test(fields[3])||!/^[a-f0-9]{64}$/.test(fields[1]))throw Error('Incomplete migration history');result.push({name:fields[3],checksum:fields[1]});fields=[];value='';continue;}value+=c;
  }
 }
 return result.sort((a,b)=>a.name.localeCompare(b.name));
}
async function decrypt(file,c,output){const k=await fsp.readFile(c.keyFile||path.join(c.dir,'encryption.key'));if(k.length!==32)throw Error('Invalid key');let bytes=0;await backup.decryptStream(file,k,new Writable({write(chunk,encoding,done){bytes+=chunk.length;if(bytes>MAX_SQL)return done(Error('Expanded backup exceeds 256 MB'));output(chunk);done();}}));return bytes;}
async function requireEmptyTarget(target,connect=mariadb.createConnection){
 const db=await connect({...target,connectTimeout:10000});
 try{
  const grants=await db.query('SHOW GRANTS FOR CURRENT_USER');
  for(const row of grants){const grant=String(Object.values(row)[0]);if(/^GRANT USAGE ON \*\.\* TO /i.test(grant))continue;
   const match=/^GRANT .+ ON `([^`]+)`\.\* TO /i.exec(grant);
   if(!match||match[1].replace(/\\_/g,'_')!==target.database||/WITH GRANT OPTION/i.test(grant))throw Error('Restore user must have access only to the restore database');
  }
  const objects=await db.query('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()');
  const extra=await db.query('SELECT (SELECT COUNT(*) FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA=DATABASE())+(SELECT COUNT(*) FROM information_schema.EVENTS WHERE EVENT_SCHEMA=DATABASE()) AS count');
  if(objects.length||Number(extra[0].count))throw Error('Restore database must be completely empty. No existing data was changed');
 }finally{await db.end();}
}
function importSql(file,target,bin=process.env.MYSQL_BIN||(process.platform==='win32'?'C:/xampp/mysql/bin/mysql.exe':'mysql')){
 return new Promise((resolve,reject)=>{
  const p=spawn(bin,['--binary-mode=1','--local-infile=0','--default-character-set=utf8mb4','--host='+target.host,'--port='+target.port,'--user='+target.user,target.database],{windowsHide:true,env:{...process.env,MYSQL_PWD:target.password},stdio:['pipe','ignore','pipe']});
  const timer=setTimeout(()=>p.kill(),20*60*1000);const input=fs.createReadStream(file);p.stderr.resume();p.stdin.on('error',()=>{});input.on('error',()=>{p.kill();});p.on('error',()=>{input.destroy();clearTimeout(timer);reject(Error('Restore utility unavailable'));});p.on('close',code=>{input.destroy();clearTimeout(timer);code===0?resolve():reject(Error('Database import failed'));});input.pipe(p.stdin);
 });
}
function registerRestore(app,prisma,{getConfig=backup.config,connect=mariadb.createConnection,importer=importSql}={}){
 const attempts=new Map();
 const root=()=>path.join(getConfig().dir,'restore-staging');
 const file=(id,ext)=>{if(!validId(id))throw Error('Invalid restore reference');return path.join(root(),id+ext);};
 const write=async job=>{const p=file(job.id,'.json');await fsp.writeFile(p+'.tmp',JSON.stringify(job),{mode:0o600});await fsp.rename(p+'.tmp',p);};
 const read=async(id,owner)=>{const job=JSON.parse(await fsp.readFile(file(id,'.json'),'utf8'));if(job.owner!==owner)throw Error('Restore reference not found');return job;};
 const clean=async()=>{await fsp.mkdir(root(),{recursive:true,mode:0o700});for(const name of await fsp.readdir(root())){if(!/^[a-f0-9]{32}\.json$/.test(name))continue;try{const job=JSON.parse(await fsp.readFile(path.join(root(),name),'utf8'));if(job.state!=='RUNNING'&&Date.now()>job.expiresAt){for(const ext of ['.enc','.sql','.json','.json.tmp'])await fsp.unlink(file(job.id,ext)).catch(()=>{});}}catch{/* Keep unreadable records for operator review. */}}};
 const admin=(req,res,next)=>req.user?.role==='ADMIN'?next():res.status(403).json({success:false,message:'Admin access required'});
 app.get('/api/backups/restore',admin,async(req,res)=>{let target=null,lastJob=null;try{target=targetConfig();}catch{/* Expose setup state, not connection details. */}try{await clean();const jobs=[];for(const n of await fsp.readdir(root()))if(/^[a-f0-9]{32}\.json$/.test(n)){const j=JSON.parse(await fsp.readFile(path.join(root(),n),'utf8'));if(j.owner===req.user.id&&j.state!=='VERIFIED')jobs.push(j);}jobs.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));const j=jobs.find(j=>j.state==='RUNNING')||jobs[0];if(j)lastJob={id:j.id,state:j.state,target:j.target,message:j.message};}catch{/* No restore yet. */}res.json({success:true,data:{configured:!!target,target:target?.database||null,maxUploadMB:50,mode:'EMPTY_DATABASE_ONLY',lastJob}});});
 app.post('/api/backups/restore/preview',admin,express.raw({type:'application/octet-stream',limit:MAX_UPLOAD}),async(req,res)=>{
  let id;
  try{
   if(!Buffer.isBuffer(req.body)||req.body.length<37)throw Error('Choose a BEI encrypted backup file');
   await clean();const jobs=(await fsp.readdir(root())).filter(n=>n.endsWith('.json'));if(jobs.length>=20)throw Error('Restore staging is full. Expired previews are removed after 30 minutes');
   id=crypto.randomBytes(16).toString('hex');await fsp.writeFile(file(id,'.enc'),req.body,{flag:'wx',mode:0o600});
   const chunks=[];const bytes=await decrypt(file(id,'.enc'),getConfig(),b=>chunks.push(b));const sql=Buffer.concat(chunks).toString('utf8'),tables=inspectSql(sql);
   const expected=await prisma.$queryRawUnsafe('SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME');
   if(JSON.stringify(tables.map(t=>t.name).sort())!==JSON.stringify(expected.map(t=>t.name).sort()))throw Error('Backup tables do not match this app version. Ask an operator to review migration compatibility');
   const migrations=await prisma.$queryRawUnsafe('SELECT migration_name AS name, checksum FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name');
   if(!migrations.length||JSON.stringify(migrationRecords(sql))!==JSON.stringify(migrations.map(m=>({name:m.name,checksum:m.checksum})).sort((a,b)=>a.name.localeCompare(b.name))))throw Error('Backup tables or migration history do not match this app version. Ask an operator to review migration compatibility');
   let target=null;try{target=targetConfig();}catch{/* Setup shown separately. */}
   const job={id,owner:req.user.id,state:'VERIFIED',createdAt:new Date().toISOString(),expiresAt:Date.now()+TTL,sha256:digest(req.body),sqlBytes:bytes,tables,target:target?.database||null,targetHash:target?digest(JSON.stringify(target)):null};await write(job);
   res.json({success:true,data:{id,state:job.state,expiresAt:job.expiresAt,sha256:job.sha256,sqlBytes:bytes,tables,target:job.target}});
  }catch(e){if(id)await fsp.unlink(file(id,'.enc')).catch(()=>{});res.status(400).json({success:false,message:/^Backup tables|^Choose |^Restore staging/.test(e.message)?e.message:'Backup could not be verified. Use a complete BEI backup and its original server recovery key'});}
 });
 app.get('/api/backups/restore/:id',admin,async(req,res)=>{try{const j=await read(req.params.id,req.user.id);res.json({success:true,data:{id:j.id,state:j.state,message:j.message||null,target:j.target,tables:j.state==='SUCCESS'?j.tables:undefined}});}catch{res.status(404).json({success:false,message:'Restore reference not found'});}});
 app.post('/api/backups/restore/:id/start',admin,async(req,res)=>{
  let lock,job,target;
  try{
   job=await read(req.params.id,req.user.id);if(job.state!=='VERIFIED'||Date.now()>job.expiresAt)throw Error('Preview expired or already used. Upload and verify again');
   target=targetConfig();if(!target||digest(JSON.stringify(target))!==job.targetHash)throw Error('Configure the separate restore database, then upload and verify again');
   if(req.body?.confirmation!=='RESTORE TO '+target.database)throw Error('Type the restore confirmation exactly');
   const attempt=attempts.get(req.user.id)||{count:0,until:Date.now()+15*60*1000};if(Date.now()>attempt.until){attempt.count=0;attempt.until=Date.now()+15*60*1000;}if(attempt.count>=5)throw Error('Current Admin password check limit reached. Retry after 15 minutes');attempt.count++;attempts.set(req.user.id,attempt);
   const user=await prisma.user.findUnique({where:{id:req.user.id}});const password=String(req.body?.password||'');if(!user||password.length>1024||!await bcrypt.compare(password,user.passwordHash))throw Error('Current Admin password is incorrect');attempts.delete(req.user.id);
   lock=await fsp.open(path.join(getConfig().dir,'running.lock'),'wx',0o600);await lock.writeFile(JSON.stringify({pid:process.pid,kind:'restore',startedAt:new Date().toISOString()}));
   await requireEmptyTarget(target,connect);job.state='RUNNING';job.message='Restoring into the separate database. Live data is unchanged';await write(job);
  }catch(e){if(lock){await lock.close();await fsp.unlink(path.join(getConfig().dir,'running.lock')).catch(()=>{});}return res.status(400).json({success:false,message:e.code==='EEXIST'?'A backup or restore is running. Retry later':e.message.includes('password')||/^(Preview|Configure|Type|Restore database|Restore user)/.test(e.message)?e.message:'Restore could not start. Check the private restore database settings'});}
  (async()=>{
   let db,handle;
   try{
    const enc=await fsp.readFile(file(job.id,'.enc'));if(digest(enc)!==job.sha256)throw Error('Staged file changed');
    handle=await fsp.open(file(job.id,'.sql'),'wx',0o600);const chunks=[];await decrypt(file(job.id,'.enc'),getConfig(),b=>chunks.push(b));const sql=Buffer.concat(chunks);inspectSql(sql.toString('utf8'));await handle.writeFile(sql);await handle.close();handle=null;
    await requireEmptyTarget(target,connect);await importer(file(job.id,'.sql'),target);
    db=await connect({...target,connectTimeout:10000});const tables=await db.query('SELECT TABLE_NAME AS name,TABLE_TYPE AS kind FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME');
    if(tables.some(t=>t.kind!=='BASE TABLE')||JSON.stringify(tables.map(t=>t.name).sort())!==JSON.stringify(job.tables.map(t=>t.name).sort()))throw Error('Restored tables differ');
    for(const t of job.tables){const rows=await db.query('SELECT COUNT(*) AS count FROM `'+t.name+'`');if(Number(rows[0].count)!==t.rows)throw Error('Restored row count differs');}
    job.state='SUCCESS';job.message='Restore verified: tables and row counts match. Live data is unchanged. Ask your operator to switch database settings after reviewing the restored data';
   }catch{job.state='FAILED';job.message='Restore failed. Live data is unchanged. The separate target may contain partial data; ask your operator to review it before retrying';}
   finally{if(handle)await handle.close().catch(()=>{});if(db)await db.end().catch(()=>{});await fsp.unlink(file(job.id,'.sql')).catch(()=>{});await fsp.unlink(file(job.id,'.enc')).catch(()=>{});job.finishedAt=new Date().toISOString();await write(job).catch(()=>{});await lock.close();await fsp.unlink(path.join(getConfig().dir,'running.lock')).catch(()=>{});}
  })().catch(()=>{});
  res.status(202).json({success:true,data:{id:job.id,state:'RUNNING'},message:'Restore started in the separate database'});
 });
 app.use('/api/backups/restore',(err,req,res,next)=>{if(err.type==='entity.too.large')return res.status(413).json({success:false,message:'Backup upload limit is 50 MB'});next(err);});
}
module.exports={registerRestore,inspectSql,statements,migrationRecords,targetConfig,requireEmptyTarget,connection,importSql};
