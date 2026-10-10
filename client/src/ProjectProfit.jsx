import {useEffect, useState} from 'react';
import axios from 'axios';
import './Billing.css';

const money = value => '৳ ' + Number(value || 0).toLocaleString('en-BD', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const metrics = [['Contract value','contract'],['Recorded cost','cost'],['Projected profit / loss','projectedProfit'],['Cash balance','cashBalance']];
export default function ProjectProfit({apiUrl}) {
  const [rows,setRows] = useState([]), [search,setSearch] = useState(''), [selected,setSelected] = useState(null);
  const [loading,setLoading] = useState(true), [error,setError] = useState(''), [version,setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    axios.get(apiUrl + '/api/reports/project-profit').then(r => {if(active) setRows(r.data.data);}).catch(() => {if(active) setError('Unable to load report. Please retry.');}).finally(() => {if(active) setLoading(false);});
    return () => {active = false;};
  }, [apiUrl,version]);
  const filtered = rows.filter(row => (row.name + ' ' + row.customer).toLowerCase().includes(search.toLowerCase()));
  const total = key => filtered.reduce((sum,row) => sum + Math.round(row[key] * 100),0) / 100;
  const detail = rows.find(row => row.id === selected);
  return <section className="billing">
    <header><div><h2>Project Profit &amp; Loss</h2><p>Lifetime totals for recorded project activity</p></div><button disabled={loading} onClick={() => {setLoading(true);setError('');setVersion(v => v + 1);}}>Refresh</button></header>
    <p>Projected profit = contract value − recorded purchase, worker and other costs. Future costs are not included; this is not final earned profit. Cash balance = recorded income − recorded payments.</p>
    <p>Purchase payments settle bills without adding cost again. Unassigned purchases and transactions are excluded. Worker costs use expenses linked to a worker; other manual expenses appear under Other costs.</p>
    <label>Search project or customer<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Project or customer name" /></label>
    {loading ? <p role="status">Loading report…</p> : error ? <p className="billing-error" role="alert">{error}</p> : <>
      <p>{filtered.length} projects shown. Summary totals follow your search.</p>
      <div className="billing-summary">{metrics.map(([label,key]) => <div key={key}><span>{label}</span><strong className={total(key) < 0 ? 'billing-error' : ''}>{money(total(key))}</strong></div>)}</div>
      <div className="billing-table"><table><thead><tr><th>Project</th><th>Status</th><th>Contract</th><th>Cost</th><th>Projected profit / loss</th><th>Received</th><th>Customer due</th><th>Cash paid</th><th>Cash balance</th><th>Action</th></tr></thead><tbody>{filtered.map(row => <tr key={row.id}><td>{row.name}<small>{row.customer}</small></td><td>{row.status}</td>{['contract','cost','projectedProfit','receipts','customerDue','cashOut','cashBalance'].map(key => <td key={key} className={row[key] < 0 ? 'billing-error' : ''}>{money(row[key])}</td>)}<td><button onClick={() => setSelected(row.id)}>Details</button></td></tr>)}{!filtered.length && <tr><td colSpan={10}>No matching projects.</td></tr>}</tbody></table></div>
      {detail && <section className="billing-panel"><header><h3>{detail.name}</h3><button onClick={() => setSelected(null)}>Close details</button></header><div className="billing-grid">{[['Purchase costs','purchaseCost'],['Worker-linked costs','labourCost'],['Other costs','otherCost'],['Vendor payments','purchasePaid'],['Vendor due','vendorDue'],['Customer credit','customerCredit']].map(([label,key]) => <div key={key}>{label}<strong style={{display:'block'}}>{money(detail[key])}</strong></div>)}</div><p>Customer due compares the contract value with all recorded project income. It can differ from issued invoice balances in Client Billing.</p></section>}
    </>}
  </section>;
}
