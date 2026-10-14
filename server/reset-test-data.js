// Explicit, local-only test-data reset, gated by a freshly verified backup.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {snapshot}=require('./backup-verify');
function schemaTables(schema){
 return [...schema.matchAll(/^model\s+\w+\s*\{([\s\S]*?)^\}/gm)].map(m=>{
  const name=m[1].match(/@@map\("([a-zA-Z0-9_]+)"\)/)?.[1];if(!name)throw Error('Every reset model must have an explicit table mapping');return name;
 });
}
function checkBackup(directory){
 const root=fs.realpathSync(path.join(__dirname,'local-backups')),real=fs.realpathSync(directory),relative=path.relative(root,real);
 if(!relative||relative.startsWith('..')||path.isAbsolute(relative)||relative.includes(path.sep))throw Error('Backup must be a direct child of local-backups');
 const manifest=JSON.parse(fs.readFileSync(path.join(real,'verification.json'),'utf8'));
 if(manifest.verified!==true||manifest.sourceUnchanged!==true||!manifest.tables)throw Error('Backup is not verified');
 const age=Date.now()-new Date(manifest.createdAt).getTime();if(!Number.isFinite(age)||age<0||age>3600000)throw Error('Make a fresh verified backup within one hour before resetting');
 const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(real,'database.sql'))).digest('hex');
 if(hash!==manifest.dumpSha256)throw Error('Backup checksum does not match');
 return {real,manifest};
}
async function main(){
 const args=process.argv.slice(2);if(args.length!==2||args[0]!=='--apply')throw Error('Usage: node reset-test-data.js --apply <verified-backup-directory>');
 require('dotenv').config({quiet:true});const url=new URL(process.env.DATABASE_URL);
 if(!['localhost','127.0.0.1'].includes(url.hostname))throw Error('Only the local test database can be reset; remote deployment is not supported');
 const backup=checkBackup(args[1]),tables=schemaTables(fs.readFileSync(path.join(__dirname,'prisma/schema.prisma'),'utf8'));
 const db=await require('mariadb').createConnection({host:url.hostname,port:Number(url.port||3306),user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),database:decodeURIComponent(url.pathname.slice(1)),dateStrings:true,bigIntAsNumber:false,decimalAsNumber:false});
 let active=false;
 try{
  await db.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');await db.beginTransaction();active=true;
  const before=await snapshot(db),expected=[...tables,'_prisma_migrations'].sort();
  if(JSON.stringify(Object.keys(before).sort())!==JSON.stringify(expected))throw Error('Database tables do not match the reviewed application schema');
  if(JSON.stringify(before)!==JSON.stringify(backup.manifest.tables))throw Error('Source changed since backup; make a new verified backup');
  const admins=await db.query("SELECT id FROM users WHERE role='ADMIN' AND status='ACTIVE' FOR UPDATE");if(!admins.length)throw Error('Cannot reset without retaining an active Admin');
  const retained=admins.map(a=>a.id),placeholders=retained.map(()=>'?').join(',');
  const adminRows=await db.query('SELECT * FROM users WHERE id IN ('+placeholders+')',retained);
  // DELETE is transactional. No TRUNCATE/ALTER, schema deletion or ID reset.
  await db.query('SET FOREIGN_KEY_CHECKS=0');
  const removed={};for(const name of tables.filter(t=>t!=='users')){const result=await db.query('DELETE FROM `'+name+'`');removed[name]=Number(result.affectedRows);}
  const users=await db.query('DELETE FROM users WHERE id NOT IN ('+placeholders+')',retained);removed.users=Number(users.affectedRows);
  const after=await snapshot(db);
  for(const name of tables.filter(t=>t!=='users'))if(after[name].count!==0)throw Error('Reset verification failed for '+name);
  if(JSON.stringify(adminRows)!==JSON.stringify(await db.query('SELECT * FROM users WHERE id IN ('+placeholders+')',retained)))throw Error('Retained Admin account changed');
  if(after.users.count!==retained.length||JSON.stringify(after._prisma_migrations)!==JSON.stringify(before._prisma_migrations))throw Error('Account or migration verification failed');
  await db.query('SET FOREIGN_KEY_CHECKS=1');await db.commit();active=false;
  fs.writeFileSync(path.join(backup.real,'reset-result.json'),JSON.stringify({completedAt:new Date().toISOString(),retainedAdminCount:retained.length,removed,totalRemoved:Object.values(removed).reduce((a,b)=>a+b,0),businessTablesEmpty:true,migrationsPreserved:true},null,2),{mode:0o600});
  console.log(JSON.stringify({businessTablesEmpty:true,retainedAdminCount:retained.length,totalRemoved:Object.values(removed).reduce((a,b)=>a+b,0),migrationsPreserved:true}));
 }catch(e){if(active)await db.rollback();throw e;}finally{try{await db.query('SET FOREIGN_KEY_CHECKS=1');}finally{await db.end();}}
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={schemaTables};
