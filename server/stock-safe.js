const {dateOf}=require('./billing');
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const idOf=value=>{const id=Number(value);if(!Number.isSafeInteger(id)||id<=0)fail('Invalid record ID');return id;};
function quantityOf(value,signed=false){
  if(!['string','number'].includes(typeof value)||!(/^-?\d+(\.\d{1,3})?$/).test(String(value)))fail('Quantity must have at most three decimal places');
  const quantity=Math.round(Number(value)*1000);
  if(!Number.isSafeInteger(quantity)||quantity===0||(!signed&&quantity<0))fail('Invalid quantity');
  return quantity;
}
const units=value=>Math.round(Number(value)*1000);
function stock(movements){return movements.reduce((sum,m)=>sum+units(m.quantity)*(['PROJECT_USAGE','DAMAGE'].includes(m.movementType)?-1:1),0);}
function registerStock(app,prisma){
  const route=fn=>async(req,res)=>{try{await fn(req,res);}catch(e){res.status(e.status||(['P2034','P2028'].includes(e.code)?409:400)).json({success:false,message:['P2034','P2028'].includes(e.code)?'Stock changed concurrently. Refresh and retry.':e.message});}};
  const transaction=fn=>prisma.$transaction(fn,{isolationLevel:'Serializable',timeout:20000});
  app.post('/api/purchases/:id/receive',route(async(req,res)=>{
    const purchaseId=idOf(req.params.id),receiveDate=dateOf(req.body.receiveDate),items=req.body.items;
    if(!Array.isArray(items)||!items.length)fail('At least one receive item is required');
    const seen=new Set();const requested=items.map(item=>{const id=idOf(item.purchaseItemId);if(seen.has(id))fail('Each purchase item may appear only once');seen.add(id);return {id,quantity:quantityOf(item.quantity),notes:item.notes};});
    const data=await transaction(async tx=>{
      const purchase=await tx.purchase.findUnique({where:{id:purchaseId},include:{items:true}});if(!purchase)fail('Purchase not found',404);
      const results=[];
      for(const request of requested){
        const item=purchase.items.find(i=>i.id===request.id);if(!item)fail('Item does not belong to this purchase');
        const received=units(item.receivedQuantity)+request.quantity;if(received>units(item.quantity))fail('Receive quantity exceeds remaining order quantity');
        const updated=await tx.purchaseItem.updateMany({where:{id:item.id,receivedQuantity:item.receivedQuantity},data:{receivedQuantity:received/1000}});
        if(updated.count!==1)fail('Stock changed concurrently. Refresh and retry.',409);
        const stockMovement=await tx.stockMovement.create({data:{materialId:item.materialId,movementType:'PURCHASE',quantity:request.quantity/1000,unit:item.unit,referenceType:'PURCHASE_RECEIVE',referenceId:purchaseId,projectId:purchase.projectId,unitCost:item.unitPrice,movementDate:receiveDate,notes:request.notes?.trim()||`Material Receive - ${purchase.purchaseNo}`}});
        results.push({purchaseItem:{...item,receivedQuantity:received/1000},stockMovement});
      }
      return {purchaseId,purchaseNo:purchase.purchaseNo,receiveDate,items:results};
    });res.json({success:true,message:'Purchase material received successfully',data});
  }));
  for(const [action,type] of Object.entries({usage:'PROJECT_USAGE',return:'RETURN',damage:'DAMAGE',adjustment:'ADJUSTMENT'})){
    app.post('/api/stock-movements/'+action,route(async(req,res)=>{
      const body=req.body,materialId=idOf(body.materialId),quantity=quantityOf(body.quantity,action==='adjustment');
      const projectId=['usage','return'].includes(action)?idOf(body.projectId):null;
      const result=await transaction(async tx=>{
        // Lock the common material row, including when no movement rows exist yet.
        await tx.$queryRaw`SELECT id FROM materials WHERE id = ${materialId} FOR UPDATE`;
        const material=await tx.material.findUnique({where:{id:materialId}});if(!material)fail('Material not found',404);
        if(body.unit&&body.unit.trim()!==material.unit)fail('Unit must match the material unit');
        if(projectId&&!await tx.project.findUnique({where:{id:projectId}}))fail('Project not found',404);
        const movements=await tx.stockMovement.findMany({where:{materialId}});
        const available=stock(movements);
        const change=['usage','damage'].includes(action)?-quantity:quantity;
        if(available+change<0)fail('Insufficient stock');
        let summary;
        if(action==='return'){
          const used=movements.filter(m=>m.projectId===projectId&&m.movementType==='PROJECT_USAGE').reduce((s,m)=>s+units(m.quantity),0);
          const returned=movements.filter(m=>m.projectId===projectId&&m.movementType==='RETURN').reduce((s,m)=>s+units(m.quantity),0);
          if(quantity>used-returned)fail('Return exceeds material issued to this project');
          summary={totalUsed:used/1000,totalReturned:(returned+quantity)/1000,availableReturn:(used-returned-quantity)/1000};
        }
        const data=await tx.stockMovement.create({data:{materialId,projectId,movementType:type,quantity:quantity/1000,unit:material.unit,referenceType:action==='usage'?'PROJECT_USAGE':'STOCK_'+action.toUpperCase(),notes:body.notes?.trim()||null},include:{material:true,project:true}});
        return {data,summary};
      });res.status(201).json({success:true,message:'Stock movement recorded successfully',...result});
    }));
  }
}
module.exports={registerStock,quantityOf,stock};
