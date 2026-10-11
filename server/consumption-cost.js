// Replay receipts in date/id order. Returns reverse the project's average remaining issue cost.
// Unknown opening stock is reported as incomplete instead of silently inventing a price.
function consumptionCosts(movements, purchases = []) {
  const bills = new Map(purchases.map(p => [p.id, p]));
  const stocks = new Map(), projects = new Map();
  const project = id => { if (!projects.has(id)) projects.set(id, {cost: 0, incomplete: false, items: new Map()}); return projects.get(id); };
  for (const m of [...movements].sort((a,b) => new Date(a.movementDate)-new Date(b.movementDate) || a.id-b.id)) {
    const key = m.materialId+'|'+m.unit;
    const s = stocks.get(key) || {qty:0, value:0, unknown:false, issues:new Map()};
    const q = Number(m.quantity), outgoing = ['PROJECT_USAGE','DAMAGE'].includes(m.movementType) || q < 0;
    let unitCost = m.unitCost == null ? null : Number(m.unitCost);
    const bill = ['PURCHASE','PURCHASE_RECEIVE'].includes(m.referenceType) ? bills.get(m.referenceId) : null;
    if (m.movementType === 'PURCHASE' && bill) {
      const matching = bill.items.filter(i => i.materialId === m.materialId && i.unit === m.unit);
      const qty = matching.reduce((n,i)=>n+Number(i.quantity),0);
      const subtotal = bill.items.reduce((n,i)=>n+Number(i.total),0);
      if (qty > 0 && subtotal > 0) unitCost = matching.reduce((n,i)=>n+Number(i.total),0)/qty * Number(bill.grandTotal)/subtotal;
    }
    const issued = s.issues.get(m.projectId) || {qty:0,value:0,unknown:false};
    let value = 0, unknown = false;
    if (m.movementType === 'RETURN') {
      unknown = issued.unknown || q > issued.qty + 0.000001 || issued.qty <= 0;
      value = issued.qty > 0 ? q * issued.value / issued.qty : 0;
      issued.qty -= q; issued.value -= value;
      s.qty += q; s.value += value; s.unknown ||= unknown;
    } else if (outgoing) {
      const used = Math.abs(q);
      unknown = s.unknown || s.qty < used - 0.000001 || s.qty <= 0;
      value = s.qty > 0 ? used * s.value / s.qty : 0;
      s.qty -= used; s.value -= value;
      s.unknown ||= unknown;
      if (m.movementType === 'PROJECT_USAGE') { issued.qty += used; issued.value += value; issued.unknown ||= unknown; }
    } else {
      unknown = unitCost == null;
      s.qty += q; s.value += q * (unitCost || 0); s.unknown ||= unknown;
    }
    if (m.projectId && ['PROJECT_USAGE','RETURN'].includes(m.movementType)) {
      const p = project(m.projectId), sign = m.movementType === 'RETURN' ? -1 : 1;
      p.cost += sign * value; p.incomplete ||= unknown;
      const item = p.items.get(key) || {materialId:m.materialId, name:m.material?.name || 'Material #'+m.materialId, unit:m.unit, quantity:0, cost:0};
      item.quantity += sign*q; item.cost += sign*value; p.items.set(key,item);
      s.issues.set(m.projectId,issued);
    }
    if (Math.abs(s.qty)<0.000001) {s.qty=0;s.value=0;s.unknown=false;}
    stocks.set(key,s);
  }
  return new Map([...projects].map(([id,p])=>[id,{cost:Math.round(p.cost*100)/100,incomplete:p.incomplete,items:[...p.items.values()].map(i=>({...i,quantity:Math.round(i.quantity*1000)/1000,cost:Math.round(i.cost*100)/100}))}]));
}
module.exports = {consumptionCosts};
