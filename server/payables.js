const {cents,dateOf}=require('./billing');
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const idOf=value=>{const id=Number(value);if(!Number.isSafeInteger(id)||id<=0)fail('Invalid ID');return id;};
function billSummary(bill) {
  const paid=(bill.payments||[]).reduce((sum,p)=>sum+Math.round(Number(p.amount)*100),0);
  const total=Math.round(Number(bill.grandTotal)*100);
  return {...bill,paidAmount:paid/100,dueAmount:Math.max(0,total-paid)/100,creditAmount:Math.max(0,paid-total)/100,paymentStatus:paid>=total?'PAID':paid?'PARTIAL':'UNPAID',
    overdue:paid<total&&!!bill.dueDate&&bill.dueDate.toISOString().slice(0,10)<new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Dhaka'})};
}
function registerPayables(app,prisma,auth) {
  const route=fn=>async(req,res,next)=>{try{await fn(req,res,next);}catch(e){res.status(e.status||(['P2002','P2003','P2034'].includes(e.code)?409:500)).json({success:false,message:e.code==='P2002'?'This supplier bill number or payment is already recorded':e.code==='P2034'?'Another update occurred. Refresh and retry.':e.code==='P2003'?'This record is linked to purchase payment history':e.message});}};
  const transact=fn=>prisma.$transaction(fn,{isolationLevel:'Serializable',timeout:20000});
  app.use('/api/payables',auth);
  app.get('/api/payables',route(async(req,res)=>{
    const vendors=await prisma.vendor.findMany({include:{purchases:{include:{payments:{orderBy:{paymentDate:'desc'}},project:{select:{id:true,name:true}}},orderBy:{purchaseDate:'desc'}}},orderBy:{name:'asc'}});
    const data=vendors.map(v=>{
      const bills=v.purchases.map(billSummary);
      const sum=key=>bills.reduce((s,b)=>s+Math.round(Number(b[key])*100),0)/100;
      const history=bills.flatMap(b=>b.payments.map(p=>({...p,purchaseNo:b.purchaseNo,vendorBillNo:b.vendorBillNo}))).sort((a,b)=>new Date(b.paymentDate)-new Date(a.paymentDate)||b.id-a.id);
      const {purchases,...vendor}=v;
      return {...vendor,bills,history,totalPurchase:sum('grandTotal'),totalPaid:sum('paidAmount'),totalDue:sum('dueAmount'),credit:sum('creditAmount'),outstandingBills:bills.filter(b=>b.dueAmount>0).length,lastPayment:history[0]||null};
    });
    const sum=key=>data.reduce((s,v)=>s+Math.round(v[key]*100),0)/100;
    res.json({success:true,data,summary:{totalPurchase:sum('totalPurchase'),totalPaid:sum('totalPaid'),totalDue:sum('totalDue')}});
  }));
  app.put('/api/payables/bills/:id',route(async(req,res)=>{
    const id=idOf(req.params.id),body=req.body||{};
    if(body.vendorBillNo!=null&&(typeof body.vendorBillNo!=='string'||body.vendorBillNo.trim().length>100))fail('Supplier bill number must be at most 100 characters');
    const dueDate=body.dueDate?dateOf(body.dueDate):null;
    const bill=await prisma.purchase.findUnique({where:{id}});if(!bill)fail('Purchase bill not found',404);
    if(dueDate&&dueDate.toISOString().slice(0,10)<bill.purchaseDate.toISOString().slice(0,10))fail('Due date cannot precede purchase date');
    const data=await prisma.purchase.update({where:{id},data:{vendorBillNo:body.vendorBillNo?.trim()||null,dueDate}});
    res.json({success:true,data});
  }));
  // The original Purchases UI and the new payables UI use this same payment endpoint.
  app.post('/api/purchases/:id/payments',auth,route(async(req,res)=>{
    const purchaseId=idOf(req.params.id),body=req.body||{},amount=cents(body.amount),paymentDate=dateOf(body.paymentDate);
    const paymentMethod=body.paymentMethod||'CASH';
    if(!['CASH','BANK','MOBILE_BANKING','OTHER'].includes(paymentMethod))fail('Invalid payment method');
    for(const [key,max] of [['referenceNo',100],['notes',16000]])if(body[key]!=null&&(typeof body[key]!=='string'||body[key].length>max))fail('Invalid '+key);
    const data=await transact(async tx=>{
      const purchase=await tx.purchase.findUnique({where:{id:purchaseId},include:{payments:true}});if(!purchase)fail('Purchase bill not found',404);
      if(paymentDate.toISOString().slice(0,10)<purchase.purchaseDate.toISOString().slice(0,10))fail('Payment date cannot precede purchase date');
      const summary=billSummary(purchase);
      if(amount>Math.round(summary.dueAmount*100))fail('Payment amount cannot exceed the outstanding bill balance');
      const category=await tx.category.upsert({where:{name_type:{name:'Materials',type:'EXPENSE'}},update:{},create:{name:'Materials',type:'EXPENSE'}});
      const transaction=await tx.transaction.create({data:{type:'EXPENSE',source:'PURCHASE_PAYMENT',transactionDate:paymentDate,amount:amount/100,paymentMethod,projectId:purchase.projectId,vendorId:purchase.vendorId,categoryId:category.id,description:`Vendor Payment - ${purchase.purchaseNo}`,notes:body.notes?.trim()||null}});
      const payment=await tx.purchasePayment.create({data:{purchaseId,transactionId:transaction.id,paymentDate,amount:amount/100,paymentMethod,referenceNo:body.referenceNo?.trim()||null,notes:body.notes?.trim()||null}});
      const paidAmount=(Math.round(summary.paidAmount*100)+amount)/100,dueAmount=(Math.round(summary.dueAmount*100)-amount)/100;
      const updatedPurchase=await tx.purchase.update({where:{id:purchaseId},data:{paidAmount,dueAmount,paymentStatus:dueAmount===0?'PAID':'PARTIAL'}});
      return {payment,transaction,updatedPurchase};
    });res.status(201).json({success:true,data,message:'Purchase payment created successfully'});
  }));
  app.delete('/api/payables/payments/:id',route(async(req,res)=>{
    const id=idOf(req.params.id);
    await transact(async tx=>{
      const payment=await tx.purchasePayment.findUnique({where:{id},include:{transaction:true}});if(!payment)fail('Payment not found',404);
      if(!payment.transactionId||payment.transaction?.source!=='PURCHASE_PAYMENT')fail('Historical payment has no verified transaction link; automatic reversal is unavailable',409);
      const purchase=await tx.purchase.findUnique({where:{id:payment.purchaseId},include:{payments:true}});
      await tx.purchasePayment.delete({where:{id}});await tx.transaction.delete({where:{id:payment.transactionId}});
      const remaining=billSummary({...purchase,payments:purchase.payments.filter(p=>p.id!==id)});
      await tx.purchase.update({where:{id:purchase.id},data:{paidAmount:remaining.paidAmount,dueAmount:remaining.dueAmount,paymentStatus:remaining.paymentStatus}});
    });res.json({success:true});
  }));
  app.use(['/api/expenses/:id','/api/transactions/:id'],route(async(req,res,next)=>{
    if(!['PUT','PATCH','DELETE'].includes(req.method))return next();
    const transaction=await prisma.transaction.findUnique({where:{id:idOf(req.params.id)}});
    if(['PURCHASE','PURCHASE_PAYMENT'].includes(transaction?.source))fail('Purchase-managed transactions must be corrected through Purchases / Vendor Payables',409);
    next();
  }));
  app.use('/api/purchases/:id',route(async(req,res,next)=>{
    if(!['PUT','PATCH','DELETE'].includes(req.method)||req.path!=='/')return next();
    if(await prisma.purchasePayment.count({where:{purchaseId:idOf(req.params.id)}}))fail('This bill has payments. Reverse linked payments before changing or deleting the purchase.',409);
    next();
  }));
}
module.exports={registerPayables,billSummary};
