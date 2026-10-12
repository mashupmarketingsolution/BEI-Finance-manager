const {stock}=require('./stock-safe');
function registerStockDesk(app,prisma){
 app.get('/api/stock-desk',async(req,res)=>{
  try{
   const [materials,projects,purchases,movements]=await Promise.all([
    prisma.material.findMany({select:{id:true,name:true,unit:true},orderBy:{name:'asc'}}),
    prisma.project.findMany({select:{id:true,name:true},orderBy:{name:'asc'}}),
    prisma.purchase.findMany({select:{id:true,purchaseNo:true,project:{select:{id:true,name:true}},items:{select:{id:true,materialId:true,material:{select:{name:true}},quantity:true,receivedQuantity:true,unit:true}}},orderBy:{id:'desc'}}),
    prisma.stockMovement.findMany({select:{id:true,materialId:true,material:{select:{name:true}},projectId:true,project:{select:{name:true}},movementType:true,quantity:true,unit:true,movementDate:true},orderBy:[{movementDate:'desc'},{id:'desc'}]})
   ]);
   const balances=materials.map(m=>({...m,available:stock(movements.filter(x=>x.materialId===m.id))/1000}));
   res.json({success:true,data:{materials:balances,projects,purchases:purchases.map(p=>({...p,items:p.items.filter(i=>Number(i.quantity)>Number(i.receivedQuantity))})).filter(p=>p.items.length),movements}});
  }catch{res.status(500).json({success:false,message:'Unable to load stock desk'});}
 });
}
module.exports={registerStockDesk};
