// Read-only checks: never infer missing payments or opening-stock prices.
const cents=n=>Math.round(Number(n||0)*100);
const sum=(rows,key='amount')=>rows.reduce((s,r)=>s+cents(r[key]),0);
function reconcile({purchases=[],invoices=[],payroll=[],overheads=[],movements=[]}){
 const findings=[];
 const add=(code,id,details)=>findings.push({code,id,...details});
 for(const p of purchases){
  const paid=sum(p.payments||[]),total=cents(p.grandTotal),due=Math.max(0,total-paid),status=paid>=total?'PAID':paid?'PARTIAL':'UNPAID';
  if(cents(p.paidAmount)!==paid||cents(p.dueAmount)!==due||p.paymentStatus!==status)add('PURCHASE_PAYMENT_HISTORY_MISMATCH',p.id,{storedPaid:Number(p.paidAmount),historyPaid:paid/100,storedDue:Number(p.dueAmount),historyDue:due/100});
  if(paid>total)add('VENDOR_OVERPAYMENT',p.id,{excess:(paid-total)/100});
  if(sum(p.items||[],'total')!==cents(p.subtotal)||cents(p.subtotal)-cents(p.discount)+cents(p.transportCost)!==total)add('PURCHASE_TOTAL_MISMATCH',p.id,{});
  for(const payment of p.payments||[]){const t=payment.transaction;if(!payment.transactionId)add('HISTORICAL_PAYMENT_WITHOUT_TRANSACTION',payment.id,{purchaseId:p.id});else if(!t||t.type!=='EXPENSE'||t.source!=='PURCHASE_PAYMENT'||cents(t.amount)!==cents(payment.amount)||t.projectId!==p.projectId||t.vendorId!==p.vendorId)add('VENDOR_TRANSACTION_MISMATCH',payment.id,{purchaseId:p.id});}
 }
 for(const i of invoices){
  if(sum(i.payments||[])>cents(i.amount))add('INVOICE_OVERPAYMENT',i.id,{});
  for(const p of i.payments||[]){const t=p.transaction;if(!t||t.type!=='INCOME'||t.projectId!==i.projectId||cents(t.amount)!==cents(p.amount)||i.status!=='ISSUED')add('INVOICE_RECEIPT_MISMATCH',p.id,{invoiceId:i.id});}
 }
 for(const a of payroll){
  const paid=(a.payments||[]).reduce((s,p)=>s+cents(p.transaction?.amount),0)+sum(a.advanceAllocations||[]);
  if(paid>cents(a.amount))add('PAYROLL_OVERSETTLED',a.id,{excess:(paid-cents(a.amount))/100});
  for(const p of a.payments||[]){const t=p.transaction;if(!t||t.type!=='EXPENSE'||t.projectId!==a.projectId||t.workerId!==a.workerId)add('PAYROLL_TRANSACTION_MISMATCH',p.id,{accrualId:a.id});}
 }
 for(const t of overheads)if(sum(t.overheadAllocations||[])>cents(t.amount)||((t.overheadAllocations||[]).length&&(t.type!=='EXPENSE'||t.source!=='MANUAL'||t.projectId!=null||t.workerId!=null)))add('OVERHEAD_ALLOCATION_MISMATCH',t.id,{});
 const stocks=new Map();
 for(const m of [...movements].sort((a,b)=>new Date(a.movementDate)-new Date(b.movementDate)||a.id-b.id)){
  const key=m.materialId+'|'+m.unit,before=stocks.get(key)||0,q=Number(m.quantity),out=['PROJECT_USAGE','DAMAGE'].includes(m.movementType)||q<0;
  if(out&&before-Math.abs(q)<-0.000001)add('STOCK_BEFORE_RECEIPT',m.id,{materialId:m.materialId,projectId:m.projectId,unit:m.unit,available:before,quantity:Math.abs(q)});
  if(['PROJECT_USAGE','RETURN'].includes(m.movementType)&&!m.projectId)add('STOCK_PROJECT_MISSING',m.id,{materialId:m.materialId,type:m.movementType});
  if(!out&&m.movementType==='ADJUSTMENT'&&m.unitCost==null)add('UNPRICED_STOCK_ADJUSTMENT',m.id,{materialId:m.materialId,quantity:q});
  stocks.set(key,before+(out?-Math.abs(q):q));
 }
 return {findings,counts:{purchases:purchases.length,invoices:invoices.length,payroll:payroll.length,overheads:overheads.length,movements:movements.length}};
}
async function readReconciliation(db){
 return db.$transaction(async tx=>{
  const [purchases,invoices,payroll,overheads,movements]=await Promise.all([
   tx.purchase.findMany({include:{items:true,payments:{include:{transaction:true}}}}),
   tx.clientInvoice.findMany({include:{payments:{include:{transaction:true}}}}),
   tx.payrollAccrual.findMany({include:{payments:{include:{transaction:true}},advanceAllocations:true}}),
   tx.transaction.findMany({where:{overheadAllocations:{some:{}}},include:{overheadAllocations:true}}),
   tx.stockMovement.findMany()
  ]);return reconcile({purchases,invoices,payroll,overheads,movements});
 },{isolationLevel:'RepeatableRead'});
}
if(require.main===module){const {prisma}=require('./server');readReconciliation(prisma).then(r=>console.log(JSON.stringify(r,null,2))).catch(()=>{console.error('Reconciliation could not complete. Check the local database connection.');process.exitCode=1;}).finally(()=>prisma.$disconnect());}
module.exports={reconcile,readReconciliation};
