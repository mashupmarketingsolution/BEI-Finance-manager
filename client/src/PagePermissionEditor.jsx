import {useEffect,useState} from 'react';
import axios from 'axios';
const label=s=>s.replaceAll('-',' ').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
export default function PagePermissionEditor({apiUrl,users}){
 const [data,setData]=useState(null),[subject,setSubject]=useState('role:PROJECT_MANAGER'),[draft,setDraft]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[refresh,setRefresh]=useState(0);
 useEffect(()=>{let live=true;axios.get(apiUrl+'/api/access/page-permissions').then(r=>{if(!r.data.data?.pages||!r.data.data?.roles)throw Error('Unable to load page permissions');if(live)setData(r.data.data);}).catch(e=>{if(live)setError(e.response?.data?.message||'Unable to load page permissions');});return()=>{live=false;};},[apiUrl,refresh]);
 const policy=(()=>{
  if(draft?.subject===subject&&draft?.data===data)return draft.policy;
  if(!data)return {pages:[],writePages:[]};const own=data.policies.find(p=>p.subject===subject),user=users.find(u=>'user:'+u.id===subject),role=user?.role||subject.slice(5),inherited=data.policies.find(p=>p.subject==='role:'+role);
  const p=own?.permissions||(user?inherited?.permissions:null)||data.defaults[role]||{pages:[],writePages:[]};
  return {pages:p.pages.filter(p=>data.pages.includes(p)),writePages:p.writePages.filter(p=>data.pages.includes(p))};
 })();
 async function save(reset=false){
  if(!window.confirm(reset?'Restore inherited/default page access?':'Save page access for '+subject.replace(':',' ')+'?'))return;
  setBusy(true);setError('');setNotice('');try{const version=data.policies.find(p=>p.subject===subject)?.version||0;await axios.put(apiUrl+'/api/access/page-permissions/'+encodeURIComponent(subject),{...policy,version,reset});setNotice(reset?'Inherited/default permissions restored.':'Page permissions saved. They apply to the next API request; the user can refresh to update their menu.');setRefresh(v=>v+1);}catch(e){setError(e.response?.data?.message||'Unable to save permissions');}finally{setBusy(false);}
 }
 const toggle=(page,write,on)=>{const p=policy;setDraft({subject,data,policy:{pages:on?[...new Set([...p.pages,page])]:write?p.pages:p.pages.filter(x=>x!==page),writePages:write?(on?[...new Set([...p.writePages,page])]:p.writePages.filter(x=>x!==page)):on?p.writePages:p.writePages.filter(x=>x!==page)}});};
 return <section className="billing-panel" aria-label="Edit page permissions"><h3>Edit page permissions</h3>
 <p>Keep default role access, customise a whole role, or give one user their own page access. A user's custom access replaces role access until you reset it.</p>
 <p>Admin always retains all pages. User management, audit history and backups stay Admin-only. Assigned-project limits and approval rules still apply.</p>
 {error&&<p role="alert" className="billing-error">{error}</p>}{notice&&<p role="status">{notice}</p>}
 {!data?<p>Loading page permissions…</p>:<fieldset disabled={busy}><label>Access applies to<select value={subject} onChange={e=>{setSubject(e.target.value);setError('');setNotice('');}}><optgroup label="Entire role">{data.roles.map(r=><option key={r} value={'role:'+r}>{label(r)}</option>)}</optgroup><optgroup label="One user">{users.filter(u=>u.role!=='ADMIN').map(u=><option key={u.id} value={'user:'+u.id}>{u.name} ({u.username})</option>)}</optgroup></select></label>
 <p>{data.policies.some(p=>p.subject===subject)?'Custom access is saved for this selection.':'Using inherited/default access.'} No pages selected means no business-page access.</p>
 <div className="billing-table"><table><thead><tr><th>Page</th><th>View</th><th>Create / edit</th></tr></thead><tbody>{data.pages.map(page=><tr key={page}><td>{label(page)}</td><td><input aria-label={'View '+label(page)} type="checkbox" checked={policy.pages.includes(page)} onChange={e=>toggle(page,false,e.target.checked)}/></td><td><input aria-label={'Edit '+label(page)} type="checkbox" checked={policy.writePages.includes(page)} onChange={e=>toggle(page,true,e.target.checked)}/></td></tr>)}</tbody></table></div>
 <button type="button" onClick={()=>save(false)}>Save page permissions</button> <button type="button" onClick={()=>save(true)}>Reset to inherited/default</button>
 </fieldset>}
 </section>;
}
