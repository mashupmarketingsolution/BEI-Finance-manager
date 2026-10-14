import {useEffect,useState} from 'react';
import axios from 'axios';
import './Billing.css';
const stamp=d=>d?new Date(d).toLocaleString('en-GB',{timeZone:'Asia/Dhaka'}):'Not yet';
export function BackupNotice({apiUrl}){
 const [data,setData]=useState(null);
 useEffect(()=>{let live=true;const read=()=>axios.get(apiUrl+'/api/backups').then(r=>{if(live)setData(r.data.data);}).catch(()=>{});read();const timer=setInterval(read,60000);return()=>{live=false;clearInterval(timer);};},[apiUrl]);
 return data&&(data.state==='FAILED'||data.stale)?<p role="alert" className="billing-panel billing-error">{data.state==='FAILED'?'The latest backup failed.':'No recent successful backup is recorded.'} Open Backups to review.</p>:null;
}
export default function Backups({apiUrl}){
 const [data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{let live=true;const read=()=>axios.get(apiUrl+'/api/backups').then(r=>{if(live){setData(r.data.data);setError('');}}).catch(()=>{if(live)setError('Unable to read backup status.');});read();const timer=setInterval(read,3000);return()=>{live=false;clearInterval(timer);};},[apiUrl]);
 async function run(){setBusy(true);setError('');setMessage('');try{await axios.post(apiUrl+'/api/backups/run');setMessage('Backup requested. Completion will appear below.');const r=await axios.get(apiUrl+'/api/backups');setData(r.data.data);}catch(e){setError(e.response?.data?.message||'Unable to start backup.');}finally{setBusy(false);}}
 return <section className="billing"><header><div><h2>Backups</h2><p>Protect your database, documents and photos</p></div><button disabled={busy||!data?.keyReady||data?.state==='RUNNING'} onClick={run}>Back up now</button></header>
 {error&&<p role="alert" className="billing-error">{error}</p>}{message&&<p role="status">{message}</p>}
 {!data?<p>Loading backup status…</p>:<>
 <div className="billing-summary"><div><span>Latest attempt</span><strong>{data.state}</strong></div><div><span>Last successful backup</span><strong>{stamp(data.lastSuccessAt)}</strong></div><div><span>Cloud destination</span><strong>{data.cloudConfigured?'Configured':'Not connected'}</strong></div><div><span>Automatic backup</span><strong>{data.automaticConfigured?'Enabled in server settings':'Not enabled'}</strong></div></div>
 {data.lastError&&<p role="alert" className="billing-error">{data.lastError}</p>}
 {!data.keyReady&&<p className="billing-panel">Setup required: create the backup encryption key on your hosting account before the first backup.</p>}
 {!data.cloudConfigured&&<p className="billing-panel">Google Drive or another cloud destination is not connected. Backups remain on this server until the connection is configured.</p>}
 <p>Retention: {data.retention}. Copies are encrypted before upload. A backup is marked successful only after its encryption check and any configured cloud verification finish.</p>
 <p>Automatic backup requires your hosting schedule to be installed. Enabling the server setting alone does not create a schedule. Keep the recovery key separately; the cloud copy cannot be opened without it.</p>
 <h3>Recent backups</h3><div className="billing-table"><table><thead><tr><th>Created</th><th>File</th><th>Size</th><th>Cloud copy</th></tr></thead><tbody>{(data.history||[]).map(r=><tr key={r.filename}><td>{stamp(r.createdAt)}</td><td>{r.filename}</td><td>{(r.bytes/1024).toFixed(1)} KB</td><td>{r.cloud}</td></tr>)}{!data.history?.length&&<tr><td colSpan={4}>No backups recorded yet.</td></tr>}</tbody></table></div>
 </>}
 </section>;
}
