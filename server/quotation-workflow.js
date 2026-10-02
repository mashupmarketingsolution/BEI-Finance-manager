const categories = ['DESIGN','FURNITURE','CIVIL','ELECTRICAL','LIGHTING','MATERIALS','LABOUR','OTHER'];
const transitions = {
  DRAFT: ['SENT','ACCEPTED','REJECTED','CANCELLED'],
  SENT: ['ACCEPTED','REJECTED','EXPIRED','CANCELLED'],
};
function validateFinalization(items, milestones, total) {
  if (!items.length || !Number.isFinite(Number(total)) || Number(total) <= 0) return 'Add quotation items with a positive grand total before sending or accepting';
  if (!milestones.length || Math.abs(milestones.reduce((sum,m)=>sum+Number(m.percentage || 0),0)-100)>0.001) return 'Payment milestone percentages must total 100%';
  const cents = milestones.reduce((sum,m)=>sum+Math.round(Number(m.amount)*100),0);
  if (cents !== Math.round(Number(total)*100)) return 'Payment milestone amounts must equal the quotation grand total';
  return null;
}
function registerQuotationWorkflow(app, prisma, auth, calculateTotals) {
  app.patch('/api/quotations/:id/status', auth, async (req,res) => {
    try {
      const id=Number(req.params.id), status=req.body?.status;
      if (!Number.isSafeInteger(id) || id<=0) return res.status(400).json({success:false,message:'Invalid quotation ID'});
      const data=await prisma.$transaction(async tx=>{
        const quote=await tx.quotation.findUnique({where:{id},include:{items:true,paymentMilestones:true}});
        const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
        if (!quote) fail('Quotation not found',404);
        if (!transitions[quote.status]?.includes(status)) fail('This status transition is not allowed. Create a revision to change a finalized quotation.');
        const root=quote.originalQuotationId || quote.id;
        const newer=await tx.quotation.findFirst({where:{OR:[{id:root},{originalQuotationId:root}],revisionNo:{gt:quote.revisionNo}}});
        if(newer) fail('Only the latest quotation revision can change status',409);
        const totals=calculateTotals(quote.items,quote);
        if(['SENT','ACCEPTED'].includes(status)) {
          const problem=validateFinalization(quote.items,quote.paymentMilestones,totals.grandTotal);
          if(problem) fail(problem);
        }
        const updated=await tx.quotation.updateMany({where:{id,status:quote.status,updatedAt:quote.updatedAt},data:{status,...totals}});
        if(updated.count!==1) fail('Quotation changed. Refresh and retry.',409);
        return tx.quotation.findUnique({where:{id}});
      });
      res.json({success:true,data});
    } catch(error) {
      res.status(error.status || (error.code ? 500 : 400)).json({success:false,message:error.message});
    }
  });
}
module.exports={categories,transitions,validateFinalization,registerQuotationWorkflow};
