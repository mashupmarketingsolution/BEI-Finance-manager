const fail = (message, status = 400) => { throw Object.assign(new Error(message), {status}); };
function cents(value) {
  if (!['string','number'].includes(typeof value) || !/^\d+(\.\d{1,2})?$/.test(String(value))) fail('Amount must be a positive number with at most two decimal places');
  const amount = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 999999999999999) fail('Invalid amount');
  return amount;
}
const idOf = value => { const id=Number(value); if(!Number.isSafeInteger(id)||id<=0) fail('Invalid ID'); return id; };
function dateOf(value) {
  if(typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail('Date must use YYYY-MM-DD');
  const date=new Date(value+'T00:00:00.000Z');
  if(!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10)!==value) fail('Invalid date');
  return date;
}
function present(invoice) {
  const paid=(invoice.payments || []).reduce((sum,p)=>sum+Math.round(Number(p.amount)*100),0);
  const total=Math.round(Number(invoice.amount)*100);
  return {...invoice,paidAmount:paid/100,dueAmount:invoice.status==='VOID'?0:(total-paid)/100,
    paymentStatus:invoice.status==='VOID'?'VOID':paid===total?'PAID':paid?'PARTIAL':'UNPAID',
    overdue:invoice.status==='ISSUED' && paid<total && invoice.dueDate.toISOString().slice(0,10)<new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Dhaka'})};
}
const include={customer:{select:{id:true,name:true}},project:{select:{id:true,name:true,contractValue:true}},milestone:true,payments:{include:{transaction:true},orderBy:{createdAt:'desc'}}};
function registerBilling(app,prisma,auth) {
  const route=(handler)=>async(req,res,next)=>{try {await handler(req,res,next);} catch(error){res.status(error.status || (['P2002','P2003','P2034'].includes(error.code)?409:500)).json({success:false,message:error.code==='P2002'?'Invoice number, milestone or receipt is already in use':error.code==='P2003'?'This record is linked to billing history':error.code==='P2034'?'Another request changed these records. Refresh and retry.':error.message});}};
  const transaction=fn=>prisma.$transaction(fn,{isolationLevel:'Serializable'});
  app.use('/api/billing',auth);
  app.get('/api/billing/context',route(async(req,res)=>{
    const [projects,quotations,receipts]=await Promise.all([
      prisma.project.findMany({where:{customerId:{not:null}},include:{customer:{select:{id:true,name:true,status:true}}},orderBy:{name:'asc'}}),
      prisma.quotation.findMany({where:{status:'ACCEPTED',projectId:{not:null}},include:{paymentMilestones:true}}),
      prisma.transaction.findMany({where:{type:'INCOME',projectId:{not:null},invoicePayment:null},orderBy:{transactionDate:'desc'}})
    ]);
    res.json({success:true,data:{projects,quotations,receipts}});
  }));
  app.get('/api/billing/invoices',route(async(req,res)=>{
    const where={};
    if(req.query.customerId) where.customerId=idOf(req.query.customerId);
    if(req.query.projectId) where.projectId=idOf(req.query.projectId);
    const invoices=(await prisma.clientInvoice.findMany({where,include,orderBy:{id:'desc'}})).map(present);
    const issued=invoices.filter(i=>i.status==='ISSUED');
    const sum=key=>issued.reduce((total,i)=>total+Math.round(Number(i[key])*100),0)/100;
    res.json({success:true,data:invoices,summary:{invoiced:sum('amount'),received:sum('paidAmount'),outstanding:sum('dueAmount'),overdue:issued.filter(i=>i.overdue).reduce((sum,i)=>sum+Math.round(i.dueAmount*100),0)/100}});
  }));
  app.post('/api/billing/invoices',route(async(req,res)=>{
    const body=req.body || {}, projectId=idOf(body.projectId);
    const amount=cents(body.amount), invoiceDate=dateOf(body.invoiceDate),dueDate=dateOf(body.dueDate);
    if(dueDate<invoiceDate) fail('Due date cannot precede invoice date');
    if(typeof body.invoiceNo!=='string'||!body.invoiceNo.trim()||body.invoiceNo.trim().length>50) fail('Invoice number is required (maximum 50 characters)');
    if(typeof body.description!=='string'||!body.description.trim()||body.description.length>2000) fail('Invoice description is required (maximum 2000 characters)');
    const result=await transaction(async tx=>{
      const project=await tx.project.findUnique({where:{id:projectId},include:{customer:true}});
      if(!project?.customer || project.customer.status!=='ACTIVE') fail('Select a project with an active customer');
      let milestoneId=null;
      if(body.milestoneId) {
        milestoneId=idOf(body.milestoneId);
        const milestone=await tx.quotationPaymentMilestone.findUnique({where:{id:milestoneId},include:{quotation:true}});
        if(!milestone || milestone.quotation.projectId!==projectId || milestone.quotation.customerId!==project.customerId || milestone.quotation.status!=='ACCEPTED') fail('Select a milestone from an accepted quotation for this project');
        if(cents(milestone.amount.toString())!==amount) fail('Invoice amount must match the selected milestone');
      }
      return tx.clientInvoice.create({data:{invoiceNo:body.invoiceNo.trim(),projectId,customerId:project.customerId,milestoneId,invoiceDate,dueDate,description:body.description.trim(),amount:amount/100,customerName:project.customer.name,customerAddress:project.customer.address},include});
    });
    res.status(201).json({success:true,data:present(result)});
  }));
  app.post('/api/billing/invoices/:id/issue',route(async(req,res)=>{
    const id=idOf(req.params.id);
    const result=await transaction(async tx=>{
      const invoice=await tx.clientInvoice.findUnique({where:{id},include:{project:true}});
      if(!invoice) fail('Invoice not found',404);
      if(invoice.status!=='DRAFT') fail('Only draft invoices can be issued');
      if(invoice.project.customerId!==invoice.customerId) fail('Project customer has changed; recreate this draft');
      const billed=await tx.clientInvoice.aggregate({where:{projectId:invoice.projectId,status:'ISSUED'},_sum:{amount:true}});
      if(Math.round(Number(billed._sum.amount || 0)*100)+cents(invoice.amount.toString())>Math.round(Number(invoice.project.contractValue)*100)) fail('Issued invoices cannot exceed the project contract value');
      return tx.clientInvoice.update({where:{id},data:{status:'ISSUED'},include});
    });res.json({success:true,data:present(result)});
  }));
  app.post('/api/billing/invoices/:id/void',route(async(req,res)=>{
    const id=idOf(req.params.id);
    const result=await transaction(async tx=>{
      const invoice=await tx.clientInvoice.findUnique({where:{id},include:{payments:true}});
      if(!invoice) fail('Invoice not found',404);
      if(invoice.status==='VOID') fail('Invoice is already void');
      if(invoice.payments.length) fail('Reverse or unlink payments before voiding the invoice');
      // Free its optional milestone for a corrected replacement; retain the void document.
      return tx.clientInvoice.update({where:{id},data:{status:'VOID',milestoneId:null},include});
    });res.json({success:true,data:present(result)});
  }));
  app.post('/api/billing/invoices/:id/payments',route(async(req,res)=>{
    const id=idOf(req.params.id),body=req.body || {};
    const result=await transaction(async tx=>{
      const invoice=await tx.clientInvoice.findUnique({where:{id},include:{payments:true}});
      if(!invoice) fail('Invoice not found',404);
      if(invoice.status!=='ISSUED') fail('Issue the invoice before recording a payment');
      let receipt, amount;
      if(body.transactionId) {
        receipt=await tx.transaction.findUnique({where:{id:idOf(body.transactionId)},include:{invoicePayment:true}});
        if(!receipt||receipt.type!=='INCOME'||receipt.projectId!==invoice.projectId||receipt.invoicePayment) fail('Select an unallocated income receipt belonging to this project');
        amount=cents(receipt.amount.toString());
      } else {
        amount=cents(body.amount);
        if(!['CASH','BANK','MOBILE_BANKING','OTHER'].includes(body.paymentMethod)) fail('Invalid payment method');
        const transactionDate=dateOf(body.paymentDate);
        if(transactionDate<invoice.invoiceDate) fail('Payment date cannot precede invoice date');
        receipt=await tx.transaction.create({data:{type:'INCOME',source:'CLIENT_PAYMENT',projectId:invoice.projectId,transactionDate,amount:amount/100,paymentMethod:body.paymentMethod,description:`Payment for invoice ${invoice.invoiceNo}`}});
      }
      if(amount>Math.round(present(invoice).dueAmount*100)) fail('Payment exceeds the invoice outstanding balance');
      await tx.invoicePayment.create({data:{invoiceId:id,transactionId:receipt.id,amount:amount/100}});
      return tx.clientInvoice.findUnique({where:{id},include});
    });res.status(201).json({success:true,data:present(result)});
  }));
  app.delete('/api/billing/payments/:id',route(async(req,res)=>{
    const id=idOf(req.params.id);
    await transaction(async tx=>{
      const payment=await tx.invoicePayment.findUnique({where:{id},include:{transaction:true}});
      if(!payment) fail('Payment not found',404);
      await tx.invoicePayment.delete({where:{id}});
      if(payment.transaction.source==='CLIENT_PAYMENT') await tx.transaction.delete({where:{id:payment.transactionId}});
    });res.json({success:true});
  }));
  // Existing general editors must not invalidate invoice receipts or client ownership.
  app.use(['/api/income/:id','/api/transactions/:id'],route(async(req,res,next)=>{
    if(!['PUT','PATCH','DELETE'].includes(req.method)) return next();
    const linked=await prisma.invoicePayment.findUnique({where:{transactionId:idOf(req.params.id)}});
    if(linked) fail('This receipt is allocated to an invoice. Reverse or unlink it in Client Billing first.',409);
    next();
  }));
  app.use('/api/projects/:id',route(async(req,res,next)=>{
    if(!['PUT','PATCH','DELETE'].includes(req.method)) return next();
    const id=idOf(req.params.id), invoice=await prisma.clientInvoice.findFirst({where:{projectId:id}});
    if(invoice) {
      if(req.method==='DELETE') fail('Project has invoice history',409);
      if(req.body.customerId!==undefined && Number(req.body.customerId)!==invoice.customerId) fail('Cannot reassign a project with invoice history',409);
      if(req.body.contractValue!==undefined) {
        const billed=await prisma.clientInvoice.aggregate({where:{projectId:id,status:'ISSUED'},_sum:{amount:true}});
        if(Number(req.body.contractValue)<Number(billed._sum.amount || 0)) fail('Contract value cannot be less than issued invoices',409);
      }
    }
    next();
  }));
}
module.exports={registerBilling,cents,dateOf,present};
