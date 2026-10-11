import {useEffect, useState} from 'react';
import axios from 'axios';
import './Billing.css';

const money = value => '৳ ' + Number(value || 0).toLocaleString('en-BD', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const metrics = [['Contract value','contract'],['Recorded cost','cost'],['Projected profit / loss','projectedProfit'],['Cash balance','cashBalance']];
const groupLabels={materials:'Materials (net of purchase discount)',labour:'Labour',transport:'Transport',design:'Design',vendor:'Other vendor expenses',other:'Other expenses'};

function CostingDetails({detail,onClose}) {
  const [boqId,setBoqId]=useState('');
  const boq=detail.boqs.find(b=>String(b.id)===boqId);
  const variance=boq?Math.round((boq.estimatedCost-detail.cost)*100)/100:null;
  return <section className="billing-panel">
    <header><h3>{detail.name} — Job Costing</h3><button onClick={onClose}>Close details</button></header>
    <div className="billing-grid">{Object.entries(groupLabels).map(([key,label])=><div key={key}>{label}<strong style={{display:'block'}}>{money(detail.breakdown[key])}</strong></div>)}</div>
    <p><strong>Total recorded cost: {money(detail.cost)}</strong> · Projected profit: {money(detail.projectedProfit)} · Margin: {detail.profitMargin==null?'Not available (zero contract value)':detail.profitMargin.toFixed(2)+'%'}</p>
    <p>Vendor payments: {money(detail.purchasePaid)} · Vendor due: {money(detail.vendorDue)} · Customer credit: {money(detail.customerCredit)}</p>
    <h4>BOQ estimate versus actual cost</h4>
    <label>Comparison BOQ<select value={boqId} onChange={e=>setBoqId(e.target.value)}><option value="">Choose one BOQ</option>{detail.boqs.map(b=><option key={b.id} value={b.id}>{b.boqNo} — {b.name} ({b.status})</option>)}</select></label>
    {!detail.boqs.length&&<p>No active BOQ for this project. Add a BOQ to compare estimates.</p>}
    <p>Choose the BOQ covering the work you want to compare. Multiple BOQs are not added together. Actual values include all project purchases to date, not material consumption; missing future costs can make the remaining budget look larger.</p>
    {boq&&<>
      {boq.status==='DRAFT'&&<p>This BOQ is a draft estimate.</p>}
      <div className="billing-summary"><div><span>Selected BOQ estimate</span><strong>{money(boq.estimatedCost)}</strong></div><div><span>Recorded project cost</span><strong>{money(detail.cost)}</strong></div><div><span>{variance<0?'Above selected estimate':'Estimate less recorded cost'}</span><strong className={variance<0?'billing-error':''}>{money(Math.abs(variance))}</strong></div><div><span>Variance % of estimate</span><strong>{boq.estimatedCost>0?(variance/boq.estimatedCost*100).toFixed(2)+'%':'—'}</strong></div></div>
      <p>The project comparison includes all expense groups. If this BOQ covers materials only, use the item table below for a matching comparison. Positive item variance means estimate exceeds purchases; it is not final savings.</p>
      <div className="billing-table"><table><thead><tr><th>Material / Unit</th><th>Estimated qty</th><th>Purchased qty</th><th>Estimated cost</th><th>Purchase line cost</th><th>Estimate − Actual</th></tr></thead><tbody>{boq.items.map(item=><tr key={item.materialId+'|'+item.unit}><td>{item.name}<small>{item.unit}{!item.inBoq?' · Not in selected BOQ':''}</small></td><td>{item.estimatedQuantity}</td><td>{item.actualQuantity}</td><td>{money(item.estimatedCost)}</td><td>{money(item.actualCost)}</td><td className={item.variance<0?'billing-error':''}>{money(item.variance)}</td></tr>)}{!boq.items.length&&<tr><td colSpan={6}>No estimated or purchased items.</td></tr>}</tbody></table></div>
      <p>Purchase line subtotal: {money(detail.purchaseLineCost)} · Bill adjustments (discount/transport): {money(detail.purchaseAdjustments)} · Purchase cost: {money(detail.purchaseCost)}. Adjustments are kept at bill level and are not allocated to material rows.</p>
    </>}
    <h4>Manual expense categories</h4>
    <p>Recognized category names determine transport, design and material groups. Worker-linked expenses fall under labour unless explicitly categorized as transport/design. Other vendor-linked expenses appear separately.</p>
    <div className="billing-table"><table><thead><tr><th>Category</th><th>Cost group</th><th>Amount</th></tr></thead><tbody>{detail.expenseCategories.map(row=><tr key={row.group+'|'+row.category}><td>{row.category}</td><td>{groupLabels[row.group]}</td><td>{money(row.amount)}</td></tr>)}{!detail.expenseCategories.length&&<tr><td colSpan={3}>No manual expenses recorded.</td></tr>}</tbody></table></div>
    <p>Customer due compares contract value with all project income and may differ from issued invoice balances.</p>
  </section>;
}
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
    <p>Purchase payments settle bills without adding cost again. Unassigned purchases and transactions are excluded. Details show cost groups and a selectable BOQ comparison.</p>
    <label>Search project or customer<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Project or customer name" /></label>
    {loading ? <p role="status">Loading report…</p> : error ? <p className="billing-error" role="alert">{error}</p> : <>
      <p>{filtered.length} projects shown. Summary totals follow your search.</p>
      <div className="billing-summary">{metrics.map(([label,key]) => <div key={key}><span>{label}</span><strong className={total(key) < 0 ? 'billing-error' : ''}>{money(total(key))}</strong></div>)}</div>
      <div className="billing-table"><table><thead><tr><th>Project</th><th>Status</th><th>Contract</th><th>Cost</th><th>Projected profit / loss</th><th>Received</th><th>Customer due</th><th>Cash paid</th><th>Cash balance</th><th>Profit margin</th><th>Action</th></tr></thead><tbody>{filtered.map(row => <tr key={row.id}><td>{row.name}<small>{row.customer}</small></td><td>{row.status}</td>{['contract','cost','projectedProfit','receipts','customerDue','cashOut','cashBalance'].map(key => <td key={key} className={row[key] < 0 ? 'billing-error' : ''}>{money(row[key])}</td>)}<td>{row.profitMargin == null ? "—" : row.profitMargin.toFixed(2) + "%"}</td><td><button onClick={() => setSelected(row.id)}>Details</button></td></tr>)}{!filtered.length && <tr><td colSpan={11}>No matching projects.</td></tr>}</tbody></table></div>
      {detail && <CostingDetails key={detail.id} detail={detail} onClose={() => setSelected(null)} />}
    </>}
  </section>;
}
