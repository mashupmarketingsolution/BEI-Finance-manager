const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const express=require('express'),bcrypt=require('bcryptjs'),{Readable}=require('node:stream');
const {registerRestore,inspectSql,migrationRecords,targetConfig,requireEmptyTarget}=require('./backup-restore');
const {encryptStream}=require('./automatic-backup');
const checksum='a'.repeat(64),migration={name:'20261014000000_init',checksum};
const sql="-- BEI fixture\nCREATE TABLE `users` (`id` int, `name` text);\nINSERT INTO `users` VALUES (1,'বাংলা; (test), \\'quote\\''),(2,'second');\nCREATE TABLE `_prisma_migrations` (`id` text,`checksum` text,`finished_at` text,`migration_name` text,`logs` text,`rolled_back_at` text,`started_at` text,`applied_steps_count` int);\nINSERT INTO `_prisma_migrations` VALUES ('id','"+checksum+"','2026-10-14','"+migration.name+"',NULL,NULL,'2026-10-14',1);\n/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;";
function fixture(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bei-restore-api-'));t.after(()=>{if(path.dirname(dir)!==path.resolve(os.tmpdir())||!path.basename(dir).startsWith('bei-restore-api-'))throw Error('Unsafe cleanup');fs.rmSync(dir,{recursive:true,force:true});});return dir;}
test('dump inspection handles quoted Bengali values/comments and rejects database/client/routine commands',()=>{
 assert.deepEqual(inspectSql(sql),[{name:'_prisma_migrations',rows:1},{name:'users',rows:2}]);assert.deepEqual(migrationRecords(sql),[migration]);
 for(const bad of ['USE production;','CREATE DATABASE victim;','SOURCE other.sql;','DELIMITER $$','/*!50003 CREATE TRIGGER dangerous */;','/*!40101 SET @x=1; DROP DATABASE victim */;'])assert.throws(()=>inspectSql(sql+'\n'+bad));
 assert.throws(()=>inspectSql(sql.replace('CREATE TABLE `users`','CREATE TABLE `otherdb`.`users`')));assert.throws(()=>inspectSql(sql+"INSERT INTO `missing` VALUES (1);"));
});
test('restore destination cannot be live, shared user or another host; target must be empty and least-privileged',async()=>{
 const DATABASE_URL='mysql://live:private@localhost/live_db';
 for(const RESTORE_DATABASE_URL of ['mysql://different:p@localhost/live_db','mysql://live:p@localhost/new_db','mysql://different:p@otherhost/new_db'])assert.throws(()=>targetConfig({DATABASE_URL,RESTORE_DATABASE_URL}));
 const c=targetConfig({DATABASE_URL,RESTORE_DATABASE_URL:'mysql://restore:p@localhost/new_db'});assert.equal(c.database,'new_db');
 let ended=0;const fake=(grants,objects=[])=>async()=>({query:async q=>q.startsWith('SHOW GRANTS')?grants.map(g=>({grant:g})):q.startsWith('SELECT TABLE_NAME')?objects:[{count:0}],end:async()=>{ended++;}});
 await requireEmptyTarget(c,fake(['GRANT USAGE ON *.* TO x','GRANT ALL PRIVILEGES ON `new\\_db`.* TO x']));
 await assert.rejects(requireEmptyTarget(c,fake(['GRANT ALL PRIVILEGES ON *.* TO x'])),/only/);
 await assert.rejects(requireEmptyTarget(c,fake(['GRANT ALL ON `live_db`.* TO x'])),/only/);
 await assert.rejects(requireEmptyTarget(c,fake(['GRANT ALL ON `new_db`.* TO x'],[{TABLE_NAME:'existing'}])),/empty/);assert.equal(ended,4);
});
async function harness(t,options={}){
 const dir=fixture(t),key=crypto.randomBytes(32);fs.writeFileSync(path.join(dir,'encryption.key'),key);
 const previous={DATABASE_URL:process.env.DATABASE_URL,RESTORE_DATABASE_URL:process.env.RESTORE_DATABASE_URL};process.env.DATABASE_URL='mysql://live:p@localhost/live_db';process.env.RESTORE_DATABASE_URL='mysql://restore:p@localhost/restore_db';t.after(()=>{for(const [k,v] of Object.entries(previous))if(v===undefined)delete process.env[k];else process.env[k]=v;});
 const hash=await bcrypt.hash('fixture-password',4),prisma={user:{findUnique:async()=>({passwordHash:hash})},$queryRawUnsafe:async q=>q.includes('migration_name')?[migration]:[{name:'users'},{name:'_prisma_migrations'}]};
 let imported=0,afterImport=false;
 const connect=options.connect||(async()=>({query:async q=>{
  if(q.startsWith('SHOW GRANTS'))return [{grant:'GRANT ALL ON `restore_db`.* TO x'}];
  if(q.startsWith('SELECT TABLE_NAME'))return afterImport?[{name:'users',kind:'BASE TABLE'},{name:'_prisma_migrations',kind:'BASE TABLE'}]:[];
  if(q.startsWith('SELECT COUNT'))return [{count:q.includes('`users`')?2:1}];return [{count:0}];},end:async()=>{}}));
 const importer=options.importer||(async p=>{imported++;assert.equal(fs.readFileSync(p,'utf8'),sql);afterImport=true;});
 const app=express();app.use(express.json());app.use((req,res,next)=>{req.user={id:Number(req.headers['x-owner']||1),role:req.headers['x-role']||'ADMIN'};next();});registerRestore(app,prisma,{getConfig:()=>({dir}),connect,importer});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>server.close(r)));
 const base='http://127.0.0.1:'+server.address().port+'/api/backups/restore';
 const enc=path.join(dir,'fixture.enc');await encryptStream(Readable.from([Buffer.from(sql)]),enc,key);
 const preview=async(headers={})=>fetch(base+'/preview',{method:'POST',headers:{'Content-Type':'application/octet-stream',...headers},body:fs.readFileSync(enc)});
 const start=(id,body={password:'fixture-password',confirmation:'RESTORE TO restore_db'})=>fetch(base+'/'+id+'/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 return {dir,base,enc,preview,start,imports:()=>imported};
}
test('Admin restore validates encryption, owner, confirmation/password, rejects reuse, imports and verifies without plaintext leftovers',async t=>{
 const h=await harness(t);const p=await (await h.preview()).json();assert.equal(p.success,true);const id=p.data.id;assert.equal(p.data.tables.length,2);assert.equal(JSON.stringify(p).includes('private'),false);
 assert.equal((await fetch(h.base+'/'+id,{headers:{'x-owner':'2'}})).status,404);
 assert.equal((await h.start(id,{password:'wrong',confirmation:'RESTORE TO restore_db'})).status,400);assert.equal(h.imports(),0);
 assert.equal((await h.start(id,{password:'fixture-password',confirmation:'RESTORE'})).status,400);
 assert.equal((await h.start(id)).status,202);
 let j;for(let n=0;n<60;n++){j=await (await fetch(h.base+'/'+id)).json();if(j.data.state!=='RUNNING')break;await new Promise(r=>setTimeout(r,10));}
 assert.equal(j.data.state,'SUCCESS');assert.equal(h.imports(),1);assert.equal((await h.start(id)).status,400);
 assert.equal(fs.existsSync(path.join(h.dir,'restore-staging',id+'.sql')),false);assert.equal(fs.existsSync(path.join(h.dir,'restore-staging',id+'.enc')),false);assert.equal(fs.existsSync(path.join(h.dir,'running.lock')),false);
 const setup=await (await fetch(h.base)).json();assert.equal(setup.data.lastJob.state,'SUCCESS');
 const bytes=fs.readFileSync(h.enc);bytes[25]^=1;fs.writeFileSync(h.enc,bytes);assert.equal((await h.preview()).status,400);
});
test('every restore endpoint denies non-Admins before file parsing and backend imports',async t=>{
 const h=await harness(t);for(const role of ['VIEWER','ACCOUNTS','PROJECT_MANAGER','SITE_SUPERVISOR','PROCUREMENT_OFFICER','STOREKEEPER']){
  for(const [suffix,method] of [['','GET'],['/preview','POST'],['/'+'a'.repeat(32),'GET'],['/'+'a'.repeat(32)+'/start','POST']])assert.equal((await fetch(h.base+suffix,{method,headers:{'x-role':role}})).status,403);
 }assert.equal(h.imports(),0);
});
test('expired previews, backup locks and failed imports do not overwrite data or leave decrypted SQL',async t=>{
 const h=await harness(t,{importer:async()=>{throw Error('private detail');}});let p=await (await h.preview()).json(),id=p.data.id;
 const meta=path.join(h.dir,'restore-staging',id+'.json'),j=JSON.parse(fs.readFileSync(meta));j.expiresAt=0;fs.writeFileSync(meta,JSON.stringify(j));assert.equal((await h.start(id)).status,400);
 p=await (await h.preview()).json();id=p.data.id;fs.writeFileSync(path.join(h.dir,'running.lock'),'fixture backup');assert.equal((await h.start(id)).status,400);fs.unlinkSync(path.join(h.dir,'running.lock'));
 assert.equal((await h.start(id)).status,202);let result;for(let n=0;n<60;n++){result=await (await fetch(h.base+'/'+id)).json();if(result.data.state!=='RUNNING')break;await new Promise(r=>setTimeout(r,10));}
 assert.equal(result.data.state,'FAILED');assert.equal(JSON.stringify(result).includes('private detail'),false);assert.equal(fs.existsSync(path.join(h.dir,'restore-staging',id+'.sql')),false);
});
test('real local MySQL importer restores Bengali rows into a generated isolated database',{skip:process.env.BEI_RESTORE_INTEGRATION!=='true'},async t=>{
 require('dotenv').config({quiet:true});const mariadb=require('mariadb'),{connection,importSql}=require('./backup-restore');const source=connection(process.env.DATABASE_URL);
 assert.ok(['localhost','127.0.0.1'].includes(source.host),'Integration drill is local only');
 const suffix=Date.now()+'_'+crypto.randomBytes(4).toString('hex'),database='bei_restore_api_'+suffix;
 assert.match(database,/^bei_restore_api_\d{13}_[a-f0-9]{8}$/);
 const root=await mariadb.createConnection(source);let created=false;
 try{
  await root.query('CREATE DATABASE `'+database+'` CHARACTER SET utf8mb4');created=true;
  const dir=fixture(t),file=path.join(dir,'fixture.sql');fs.writeFileSync(file,sql,{mode:0o600});inspectSql(sql);await importSql(file,{...source,database});
  const restored=await mariadb.createConnection({...source,database});try{const rows=await restored.query('SELECT * FROM users ORDER BY id');assert.equal(rows.length,2);assert.match(rows[0].name,/বাংলা/);for(const table of inspectSql(sql)){const result=await restored.query('SELECT COUNT(*) AS count FROM `'+table.name+'`');assert.equal(Number(result[0].count),table.rows);}}finally{await restored.end();}
 }finally{if(created)await root.query('DROP DATABASE `'+database+'`');await root.end();}
});
