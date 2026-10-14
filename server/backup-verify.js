// Local-only disaster-recovery drill. Never restores over the source database.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
const mariadb=require('mariadb');
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
function targetAllowed(source,target){return /^bei_restore_verify_\d{13}_[a-f0-9]{8}$/.test(target)&&target!==source;}
const quote=name=>'`'+name.replaceAll('`','``')+'`';
function canonical(value){if(Buffer.isBuffer(value))return {binary:value.toString('base64')};if(typeof value==='bigint')return value.toString();if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));return value;}
async function snapshot(db){
 const tables=await db.query('SELECT TABLE_NAME AS name,TABLE_TYPE AS kind FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME');
 if(tables.some(t=>t.kind!=='BASE TABLE'))throw Error('Views require a separate restore review');
 const result={};
 for(const table of tables){const definition=await db.query('SHOW CREATE TABLE '+quote(table.name)),rows=await db.query('SELECT * FROM '+quote(table.name));result[table.name]={count:rows.length,schema:digest(definition[0]['Create Table']),data:digest(JSON.stringify(rows.map(r=>digest(JSON.stringify(canonical(r)))).sort()))};}
 return result;
}
async function run(exe,args,connection,input){
 await new Promise((resolve,reject)=>{
  const child=spawn(exe,args,{windowsHide:true,env:{...process.env,MYSQL_PWD:connection.password},stdio:[input?'pipe':'ignore','ignore','pipe']});
  child.stderr.resume();child.once('error',()=>reject(Error('Database utility could not start')));child.once('close',code=>code===0?resolve():reject(Error('Database utility failed (credentials and SQL omitted from output)')));
  // Keep stderr private: database utilities can include connection details.
  if(input){const stream=fs.createReadStream(input);stream.on('error',()=>{child.kill();reject(Error('Backup could not be read'));});child.stdin.on('error',()=>{});stream.pipe(child.stdin);}
 });
}
async function main(){
 require('dotenv').config({quiet:true});const url=new URL(process.env.DATABASE_URL);
 if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw Error('This drill supports local databases only');
 const source=decodeURIComponent(url.pathname.slice(1));if(!/^[a-zA-Z0-9_]+$/.test(source))throw Error('Unsupported source database name');
 const config={host:url.hostname,port:Number(url.port||3306),user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),database:source,dateStrings:true,bigIntAsNumber:false,decimalAsNumber:false};
 const bin=process.env.MYSQL_BIN_DIR||'C:/xampp/mysql/bin';for(const name of ['mysqldump.exe','mysql.exe'])if(!fs.existsSync(path.join(bin,name)))throw Error('XAMPP database utilities not found');
 const target='bei_restore_verify_'+Date.now()+'_'+crypto.randomBytes(4).toString('hex');if(!targetAllowed(source,target))throw Error('Unsafe restore target');
 const root=path.resolve(__dirname,'local-backups'),directory=path.join(root,target);fs.mkdirSync(directory,{recursive:true,mode:0o700});
 const dump=path.join(directory,'database.sql'),manifestFile=path.join(directory,'verification.json');
 let db,restored,created=false,verified=false;
 try{
  db=await mariadb.createConnection(config);
  const objects=await db.query('SELECT (SELECT COUNT(*) FROM information_schema.EVENTS WHERE EVENT_SCHEMA=DATABASE())+(SELECT COUNT(*) FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA=DATABASE())+(SELECT COUNT(*) FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE()) AS count');
  if(Number(objects[0].count))throw Error('Active routines/triggers/events require a separate isolated restore review');
  const schemas=await db.query('SELECT DEFAULT_CHARACTER_SET_NAME AS charset,DEFAULT_COLLATION_NAME AS collation FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=DATABASE()');
  const {charset,collation}=schemas[0];if(!/^[a-zA-Z0-9_]+$/.test(charset)||!/^[a-zA-Z0-9_]+$/.test(collation))throw Error('Unsupported database encoding');
  const before=await snapshot(db),args=['--host='+config.host,'--port='+config.port,'--user='+config.user,'--default-character-set=utf8mb4'];
  await run(path.join(bin,'mysqldump.exe'),[...args,'--single-transaction','--skip-lock-tables','--hex-blob','--routines','--events','--triggers','--result-file='+dump,source],config);
  fs.chmodSync(dump,0o600);
  await db.query('CREATE DATABASE '+quote(target)+' CHARACTER SET '+charset+' COLLATE '+collation);created=true;
  await run(path.join(bin,'mysql.exe'),[...args,'--binary-mode=1',target],config,dump);
  restored=await mariadb.createConnection({...config,database:target});
  const actual=await snapshot(restored),after=await snapshot(db);
  if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Source changed during backup; rerun while idle');
  if(JSON.stringify(before)!==JSON.stringify(actual))throw Error('Restored content/schema does not match source');
  verified=true;
  fs.writeFileSync(manifestFile,JSON.stringify({verified:true,createdAt:new Date().toISOString(),sourceUnchanged:true,tableCount:Object.keys(before).length,rowCount:Object.values(before).reduce((s,t)=>s+t.count,0),dumpSha256:digest(fs.readFileSync(dump)),tables:before},null,2),{mode:0o600});
  console.log(JSON.stringify({verified:true,tableCount:Object.keys(before).length,rowCount:Object.values(before).reduce((s,t)=>s+t.count,0),backupDirectory:directory}));
 }finally{
  if(restored)await restored.end();
  if(db){try{if(created){if(!targetAllowed(source,target))throw Error('Unsafe cleanup target');await db.query('DROP DATABASE '+quote(target));console.log('Only the generated restore-test database was removed.');}}finally{await db.end();}}
  if(!verified)console.error('Drill not verified. Any backup file is retained privately for inspection.');
 }
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={targetAllowed,canonical};
