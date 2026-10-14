import {useEffect,useState} from 'react';
import axios from 'axios';

export default function BackupRestore({apiUrl}){
 const [setup,setSetup]=useState(null),[file,setFile]=useState(null),[preview,setPreview]=useState(null),[job,setJob]=useState(null);
 const [password,setPassword]=useState(''),[confirmation,setConfirmation]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const base=apiUrl+'/api/backups/restore';
 useEffect(()=>{let live=true;axios.get(base).then(r=>{if(live){setSetup(r.data.data);if(r.data.data?.lastJob)setJob(r.data.data.lastJob);}}).catch(()=>{if(live)setError('Unable to read restore settings.');});return()=>{live=false;};},[base]);
 useEffect(()=>{
  if(job?.state!=='RUNNING')return;
  let live=true;const read=()=>axios.get(base+'/'+job.id).then(r=>{if(live){setJob(r.data.data);setError('');}}).catch(()=>{if(live)setError('Unable to check restore progress. Do not start another restore; retry this page later.');});
  const timer=setInterval(read,3000);return()=>{live=false;clearInterval(timer);};
 },[base,job?.id,job?.state]);
 async function verify(){
  setBusy(true);setError('');setPreview(null);setJob(null);setPassword('');setConfirmation('');
  try{if(!file||file.size>50*1024*1024)throw Error('Choose an encrypted backup up to 50 MB.');const r=await axios.post(base+'/preview',file,{headers:{'Content-Type':'application/octet-stream'}});setPreview(r.data.data);}
  catch(e){setError(e.response?.data?.message||e.message||'Unable to verify this backup.');}finally{setBusy(false);}
 }
 async function restore(){
  setBusy(true);setError('');try{const r=await axios.post(base+'/'+preview.id+'/start',{password,confirmation});setJob({...r.data.data,message:r.data.message});}catch(e){setError(e.response?.data?.message||'Unable to start restore.');}finally{setPassword('');setBusy(false);}
 }
 const running=job?.state==='RUNNING',locked=busy||running;
 return <section className="billing-panel" aria-label="Restore a backup">
  <h3>Restore a backup</h3>
  <p>Download a backup from Google Drive, then choose the encrypted <strong>.sql.gz.enc</strong> file here. The original recovery key must already be configured on the server.</p>
  <p>Restore uses a separate, empty database. Current live data stays unchanged. After verification, your hosting operator can review the restored data and switch the app to it.</p>
  {!setup?<p>Loading restore settings…</p>:!setup.configured?<p role="status">Hosting setup needed: ask your operator to configure a separate empty restore database and a user with access only to it. You can still upload and verify a backup below.</p>:<p>Restore destination: <strong>{setup.target}</strong></p>}
  <label>Encrypted backup file (maximum 50 MB)<input type="file" accept=".enc" disabled={locked} onChange={e=>{setFile(e.target.files?.[0]||null);setPreview(null);setJob(null);setConfirmation('');setPassword('');setError('');}}/></label>
  <button type="button" disabled={locked||!file} onClick={verify}>{busy?'Please wait…':'Upload and verify backup'}</button>
  {error&&<p role="alert" className="billing-error">{error}</p>}
  {preview&&<div>
   <h4>Backup verified</h4><p>{preview.tables.length} tables · {preview.tables.reduce((sum,t)=>sum+t.rows,0).toLocaleString()} records · {(preview.sqlBytes/1024/1024).toFixed(2)} MB after opening</p>
   <p>This preview expires after 30 minutes. Only complete backups matching this app’s tables are accepted.</p>
   <details><summary>Backup checksum</summary><code style={{overflowWrap:'anywhere'}}>{preview.sha256}</code></details>
   {preview.target&&!job&&<form onSubmit={e=>{e.preventDefault();restore();}}>
    <p>Destination must be empty. No existing database will be overwritten. Keep the app’s current database until the restored copy has been reviewed.</p>
    <label>Current Admin password<input type="password" autoComplete="current-password" required value={password} disabled={locked} onChange={e=>setPassword(e.target.value)}/></label>
    <label>Type RESTORE TO {preview.target}<input type="text" autoComplete="off" required value={confirmation} disabled={locked} onChange={e=>setConfirmation(e.target.value)}/></label>
    <button disabled={locked||!password||confirmation!=='RESTORE TO '+preview.target}>Restore to separate database</button>
   </form>}
  </div>}
  {job&&<div role="status"><h4>Restore: {job.state}</h4><p>{job.message}</p></div>}
 </section>;
}
