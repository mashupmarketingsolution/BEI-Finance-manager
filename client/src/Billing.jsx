import PaginatedTable from "./PaginatedTable";
import {useEffect,useState} from 'react';
import axios from 'axios';
import './Billing.css';

const today=()=>new Date().toLocaleDateString('en-CA');
const money=value=>'৳ '+Number(value || 0).toLocaleString('en-BD',{minimumFractionDigits:2,maximumFractionDigits:2});
const blank=()=>({invoiceNo:'',projectId:'',milestoneId:'',description:'',amount:'',invoiceDate:today(),dueDate:today()});
export default function Billing({apiUrl}) {
  const [data,setData]=useState([]),[summary,setSummary]=useState({}),[context,setContext]=useState({projects:[],quotations:[],receipts:[]});
  const [selectedId,setSelectedId]=useState(null),[form,setForm]=useState(null),[payment,setPayment]=useState(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[search,setSearch]=useState(''),[filter,setFilter]=useState('ALL');
  const invoice=data.find(i=>i.id===selectedId);
  const base=apiUrl+'/api/billing';
  async function refresh() {
    const [list,ctx]=await Promise.all([axios.get(base+'/invoices'),axios.get(base+'/context')]);
    setData(list.data.data);setSummary(list.data.summary);setContext(ctx.data.data);
  }
  useEffect(()=>{let active=true;
    Promise.all([axios.get(apiUrl+'/api/billing/invoices'),axios.get(apiUrl+'/api/billing/context')]).then(([list,ctx])=>{if(active){setData(list.data.data);setSummary(list.data.summary);setContext(ctx.data.data);}}).catch(e=>{if(active)setError(e.response?.data?.message || 'Could not load billing');});
    return()=>{active=false;};
  },[apiUrl]);
  async function run(action,message) {
    if(busy)return;
    setBusy(true);setError('');setNotice('');
    try{await action();await refresh();setNotice(message);}catch(e){setError(e.response?.data?.message || 'Request failed. Refresh and try again.');}finally{setBusy(false);}
  }
  const update=(key,value)=>setForm(prev=>({...prev,[key]:value}));
  const milestones=context.quotations.filter(q=>q.projectId===Number(form?.projectId)).flatMap(q=>q.paymentMilestones.map(m=>({...m,quotationNo:q.quotationNo})));
  const receipts=context.receipts.filter(t=>t.projectId===invoice?.projectId);
  const rows=data.filter(i=>(i.invoiceNo+' '+i.customer.name+' '+i.project.name).toLowerCase().includes(search.toLowerCase()) && (filter==='ALL'||filter==='OVERDUE'&&i.overdue||i.status===filter||i.paymentStatus===filter));
  return <section className="billing">
    <header><div><h2>Client Billing</h2><p>Invoices, receipts and accounts receivable</p></div><div><button disabled={busy} onClick={()=>run(async()=>{},'Billing refreshed')}>Refresh</button> <button disabled={busy} onClick={()=>{setForm(blank());setPayment(null);setError('');}}>Create Invoice</button></div></header>
    {error&&<p role="alert" className="billing-error">{error}</p>}{notice&&<p role="status" className="billing-success">{notice}</p>}
    <div className="billing-summary">{[['Invoiced','invoiced'],['Allocated receipts','received'],['Invoice outstanding','outstanding'],['Overdue','overdue']].map(([label,key])=><div key={key}><span>{label}</span><strong>{money(summary[key])}</strong></div>)}</div>
    <p>Totals cover issued invoices. Existing project income appears here after you link its receipt to an invoice.</p>
    {form&&<form className="billing-panel" onSubmit={e=>{e.preventDefault();run(async()=>{const res=await axios.post(base+'/invoices',form);setSelectedId(res.data.data.id);setForm(null);},'Draft invoice created');}}>
      <h3>Create draft invoice</h3><div className="billing-grid">
        <label>Invoice number<input required maxLength={50} value={form.invoiceNo} onChange={e=>update('invoiceNo',e.target.value)}/></label>
        <label>Project / Customer<select required value={form.projectId} onChange={e=>setForm(prev=>({...prev,projectId:e.target.value,milestoneId:'',amount:'',description:''}))}><option value="">Select project</option>{context.projects.filter(p=>p.customer?.status==='ACTIVE').map(p=><option key={p.id} value={p.id}>{p.name} — {p.customer.name}</option>)}</select></label>
        <label>Quotation milestone (optional)<select value={form.milestoneId} onChange={e=>{const m=milestones.find(m=>m.id===Number(e.target.value));setForm(prev=>({...prev,milestoneId:e.target.value,...(m?{amount:String(m.amount),description:m.title}:{})}));}}><option value="">Custom invoice amount</option>{milestones.filter(m=>!data.some(i=>i.milestoneId===m.id&&i.status!=='VOID')).map(m=><option key={m.id} value={m.id}>{m.quotationNo}: {m.title} — {money(m.amount)}</option>)}</select></label>
        <label>Gross amount<input required type="number" min="0.01" step="0.01" readOnly={!!form.milestoneId} value={form.amount} onChange={e=>update('amount',e.target.value)}/></label>
        <label>Invoice date<input required type="date" value={form.invoiceDate} onChange={e=>update('invoiceDate',e.target.value)}/></label>
        <label>Due date<input required type="date" min={form.invoiceDate} value={form.dueDate} onChange={e=>update('dueDate',e.target.value)}/></label>
        <label className="billing-wide">Description<textarea required maxLength={2000} value={form.description} onChange={e=>update('description',e.target.value)}/></label>
      </div><button disabled={busy} type="submit">Save Draft</button> <button disabled={busy} type="button" onClick={()=>setForm(null)}>Cancel</button>
    </form>}
    <div className="billing-filters"><input aria-label="Search invoices" placeholder="Search invoice, customer or project" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="Filter invoices" value={filter} onChange={e=>setFilter(e.target.value)}>{['ALL','DRAFT','ISSUED','UNPAID','PARTIAL','PAID','OVERDUE','VOID'].map(s=><option key={s}>{s}</option>)}</select></div>
    <div className="billing-table"><PaginatedTable><thead><tr><th>Invoice</th><th>Client / Project</th><th>Due</th><th>Status</th><th>Amount</th><th>Paid</th><th>Due amount</th><th>Action</th></tr></thead><tbody>{rows.map(i=><tr key={i.id}><td>{i.invoiceNo}</td><td>{i.customer.name}<small>{i.project.name}</small></td><td>{i.dueDate.slice(0,10)}</td><td>{i.status} / {i.paymentStatus}{i.overdue&&<strong className="billing-error"> Overdue</strong>}</td><td>{money(i.amount)}</td><td>{money(i.paidAmount)}</td><td>{money(i.dueAmount)}</td><td><button onClick={()=>{setSelectedId(i.id);setPayment(null);}}>View</button></td></tr>)}{!rows.length&&<tr><td colSpan={8}>No invoices found.</td></tr>}</tbody></PaginatedTable></div>
    {invoice&&<section className="billing-panel"><header><h3>Invoice {invoice.invoiceNo}</h3><button disabled={busy} onClick={()=>{setSelectedId(null);setPayment(null);}}>Close details</button></header>
      <p><strong>{invoice.customerName}</strong> — {invoice.project.name}</p><p>{invoice.customerAddress}</p><p>{invoice.description}</p><p>Invoice date: {invoice.invoiceDate.slice(0,10)} · Due date: {invoice.dueDate.slice(0,10)}</p>
      <p>Amount: <strong>{money(invoice.amount)}</strong> · Paid: <strong>{money(invoice.paidAmount)}</strong> · Due: <strong>{money(invoice.dueAmount)}</strong></p>
      <div className="billing-actions">
        {invoice.status==='DRAFT'&&<button disabled={busy} onClick={()=>run(()=>axios.post(base+'/invoices/'+invoice.id+'/issue'),'Invoice issued')}>Issue Invoice</button>}
        {invoice.status==='ISSUED'&&invoice.dueAmount>0&&<><button disabled={busy} onClick={()=>setPayment({amount:'',paymentDate:today(),paymentMethod:'CASH',mode:'new'})}>Record Payment</button><button disabled={busy} onClick={()=>setPayment({transactionId:'',mode:'existing'})}>Link Existing Receipt</button></>}
        {invoice.status!=='VOID'&&!invoice.payments.length&&<button disabled={busy} onClick={()=>{if(window.confirm('Void invoice '+invoice.invoiceNo+'? It will remain in history.'))run(()=>axios.post(base+'/invoices/'+invoice.id+'/void'),'Invoice voided');}}>Void Invoice</button>}
      </div>
      {payment&&<form className="billing-panel" onSubmit={e=>{e.preventDefault();run(async()=>{await axios.post(base+'/invoices/'+invoice.id+'/payments',payment);setPayment(null);},'Invoice payment saved');}}><h4>{payment.mode==='new'?'Record new payment':'Link existing income receipt'}</h4>
        {payment.mode==='new'?<div className="billing-grid"><label>Amount<input required type="number" min="0.01" max={invoice.dueAmount} step="0.01" value={payment.amount} onChange={e=>setPayment({...payment,amount:e.target.value})}/></label><label>Payment date<input required type="date" min={invoice.invoiceDate.slice(0,10)} value={payment.paymentDate} onChange={e=>setPayment({...payment,paymentDate:e.target.value})}/></label><label>Method<select value={payment.paymentMethod} onChange={e=>setPayment({...payment,paymentMethod:e.target.value})}>{['CASH','BANK','MOBILE_BANKING','OTHER'].map(m=><option key={m}>{m}</option>)}</select></label></div>:<label>Receipt<select required value={payment.transactionId} onChange={e=>setPayment({...payment,transactionId:e.target.value})}><option value="">Select unallocated receipt</option>{receipts.map(t=><option key={t.id} value={t.id}>#{t.id} — {t.transactionDate.slice(0,10)} — {money(t.amount)} — {t.description}</option>)}</select><small>Links the full receipt to this invoice; it does not add income again.</small></label>}
        <button disabled={busy} type="submit">Save Payment</button> <button type="button" disabled={busy} onClick={()=>setPayment(null)}>Cancel</button>
      </form>}
      <h4>Payment history</h4><div className="billing-table"><PaginatedTable><thead><tr><th>Receipt</th><th>Date</th><th>Amount</th><th>Method</th><th>Action</th></tr></thead><tbody>{invoice.payments.map(p=><tr key={p.id}><td>#{p.transactionId}</td><td>{p.transaction.transactionDate.slice(0,10)}</td><td>{money(p.amount)}</td><td>{p.transaction.paymentMethod}</td><td><button disabled={busy} onClick={()=>{const isNew=p.transaction.source==='CLIENT_PAYMENT';if(window.confirm(isNew?'Reverse this payment and remove its generated income entry?':'Unlink this payment? The original income receipt will remain.'))run(()=>axios.delete(base+'/payments/'+p.id),isNew?'Payment reversed':'Receipt unlinked');}}>{p.transaction.source==='CLIENT_PAYMENT'?'Reverse Payment':'Unlink Receipt'}</button></td></tr>)}{!invoice.payments.length&&<tr><td colSpan={5}>No invoice payments recorded.</td></tr>}</tbody></PaginatedTable></div>
    </section>}
  </section>;
}
