const toCents = value => Math.round(Number(value || 0) * 100);
const sum = (rows, key = 'amount') => rows.reduce((total, row) => total + toCents(row[key]), 0);

function costGroup(transaction) {
  const category=(transaction.category?.name || '').trim().toLowerCase();
  if(['transport','transportation','delivery','transport cost'].includes(category)) return 'transport';
  if(['design','design cost','design fee','design fees'].includes(category)) return 'design';
  if(transaction.workerId || ['labour','labor','labour cost','labor cost','wages','salary'].includes(category)) return 'labour';
  if(['material','materials','material cost'].includes(category)) return 'materials';
  return transaction.vendorId ? 'vendor' : 'other';
}

function costingDetails(project, expenses) {
  const purchases=project.purchases || [];
  const breakdown={materials:0,labour:0,transport:0,design:0,vendor:0,other:0};
  for(const p of purchases){breakdown.materials+=toCents(p.grandTotal)-toCents(p.transportCost);breakdown.transport+=toCents(p.transportCost);}
  const expenseCategories=new Map();
  for(const t of expenses){
    const group=costGroup(t);breakdown[group]+=toCents(t.amount);
    const key=group+'|'+(t.category?.name || 'Uncategorized');
    const row=expenseCategories.get(key)||{category:t.category?.name || 'Uncategorized',group,amount:0};row.amount+=toCents(t.amount);expenseCategories.set(key,row);
  }
  const actual=new Map();
  for(const p of purchases) for(const item of p.items || []){
    const key=item.materialId+'|'+item.unit;
    const row=actual.get(key)||{materialId:item.materialId,name:item.material?.name || 'Material #'+item.materialId,unit:item.unit,actualQuantity:0,actualCost:0};
    row.actualQuantity+=Math.round(Number(item.quantity)*1000);row.actualCost+=toCents(item.total);actual.set(key,row);
  }
  const boqs=(project.boqs||[]).filter(b=>b.status!=='CANCELLED').map(b=>{
    const rows=new Map([...actual].map(([key,row])=>[key,{...row,estimatedQuantity:0,estimatedCost:0,inBoq:false}]));
    for(const item of b.items||[]){
      const key=item.materialId+'|'+item.unit;
      const row=rows.get(key)||{materialId:item.materialId,name:item.material?.name || 'Material #'+item.materialId,unit:item.unit,actualQuantity:0,actualCost:0,estimatedQuantity:0,estimatedCost:0};
      row.inBoq=true;row.estimatedQuantity+=Math.round(Number(item.quantity)*1000);row.estimatedCost+=toCents(item.estimatedTotal);rows.set(key,row);
    }
    return {id:b.id,boqNo:b.boqNo,name:b.name,status:b.status,estimatedCost:sum(b.items||[],'estimatedTotal')/100,items:[...rows.values()].map(row=>({...row,estimatedQuantity:row.estimatedQuantity/1000,actualQuantity:row.actualQuantity/1000,estimatedCost:row.estimatedCost/100,actualCost:row.actualCost/100,variance:(row.estimatedCost-row.actualCost)/100}))};
  });
  return {breakdown:Object.fromEntries(Object.entries(breakdown).map(([k,v])=>[k,v/100])),expenseCategories:[...expenseCategories.values()].map(r=>({...r,amount:r.amount/100})),boqs,
    purchaseLineCost:[...actual.values()].reduce((s,r)=>s+r.actualCost,0)/100,
    purchaseAdjustments:purchases.reduce((s,p)=>s+toCents(p.grandTotal)-sum(p.items||[],'total'),0)/100};
}

function projectProfit(project, consumption) {
  const transactions = project.transactions || [];
  const purchases = project.purchases || [];
  // Purchases are the cost source; their accounting mirrors and settlements are excluded.
  const cashExpenses = transactions.filter(t => t.type === 'EXPENSE' && !['PURCHASE', 'PURCHASE_PAYMENT'].includes(t.source));
  const expenses = cashExpenses.filter(t => !t.payrollPayment && t.source !== 'WORKER_ADVANCE');
  const payroll = sum(project.payrollAccruals || []);
  const payrollPaid = (project.payrollAccruals || []).reduce((s,a)=>s+(a.payments||[]).reduce((n,p)=>n+toCents(p.transaction.amount),0)+sum(a.advanceAllocations||[]),0);
  const overhead = sum(project.overheadAllocations || []);
  const purchaseCost = sum(purchases, 'grandTotal');
  const labourCost = sum(expenses.filter(t => t.workerId));
  const otherCost = sum(expenses.filter(t => !t.workerId));
  const receipts = sum(transactions.filter(t => t.type === 'INCOME'));
  const purchasePaid = purchases.reduce((total, p) => total + sum(p.payments || []), 0);
  const vendorDue = purchases.reduce((total, p) => total + Math.max(0, toCents(p.grandTotal) - sum(p.payments || [])), 0);
  const materialBasis = consumption ? toCents(consumption.cost) : purchaseCost;
  const cost = materialBasis + labourCost + otherCost + payroll + overhead;
  const contract = toCents(project.contractValue);
  const cashOut = purchasePaid + sum(cashExpenses) + overhead;
  const values = {contract, receipts, customerDue: Math.max(0, contract - receipts), customerCredit: Math.max(0, receipts - contract), purchaseCost, labourCost, otherCost, cost, projectedProfit: contract - cost, purchasePaid, vendorDue, cashOut, cashBalance: receipts - cashOut};
  const details=costingDetails(project,expenses);
  if(consumption){details.breakdown.materials += (materialBasis-purchaseCost+sum(purchases,'transportCost'))/100;details.breakdown.transport -= sum(purchases,'transportCost')/100;}
  details.breakdown.labour += payroll/100;
  details.breakdown.overhead = overhead/100;
  return {id: project.id, name: project.name, status: project.status, customer: project.customer?.name || '', profitMargin:contract>0?Math.round((contract-cost)/contract*10000)/100:null, ...Object.fromEntries(Object.entries(values).map(([key,value]) => [key,value / 100])),...details,payroll:payroll/100,unpaidPayroll:(payroll-payrollPaid)/100,overhead:overhead/100,consumption:consumption||null};
}

function registerProjectProfit(app, prisma, auth) {
  app.get('/api/reports/project-profit', auth, async (req, res) => {
    try {
      const projects = await prisma.project.findMany({include: {customer: true,payrollAccruals:{include:{advanceAllocations:true,payments:{include:{transaction:true}}}},overheadAllocations:true, transactions: {include:{category:true,payrollPayment:true}}, purchases: {include: {payments: true,items:{include:{material:{select:{name:true}}}}}},boqs:{include:{items:{include:{material:{select:{name:true}}}}},orderBy:{id:'desc'}}}, orderBy: {name: 'asc'}});
      let consumption;
      if(req.query?.basis==='consumption'){
        const movements=await prisma.stockMovement.findMany({include:{material:{select:{name:true}}}});
        const purchases=await prisma.purchase.findMany({include:{items:true}});
        consumption=require('./consumption-cost').consumptionCosts(movements,purchases);
      }
      res.json({success: true, data: projects.map(p=>projectProfit(p,consumption?(consumption.get(p.id)||{cost:0,incomplete:false,items:[]}):undefined))});
    } catch (error) {
      console.error('Project profit report:', error);
      res.status(500).json({success: false, message: 'Unable to load project profit report'});
    }
  });
}
module.exports = {projectProfit, registerProjectProfit};
