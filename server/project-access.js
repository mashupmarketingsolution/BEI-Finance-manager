const {AsyncLocalStorage}=require('node:async_hooks');
const {Prisma}=require('@prisma/client');
const storage=new AsyncLocalStorage(),restrictedRoles=['PROJECT_MANAGER','SITE_SUPERVISOR','VIEWER'];
// Prisma 7's runtime model metadata omits relation cardinality and foreign-key fields.
// Enrich it from the versioned schema used to generate this client.
const schema=require('node:fs').readFileSync(require('node:path').join(__dirname,'prisma','schema.prisma'),'utf8');
const schemaModels=Object.fromEntries([...schema.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g)].map(m=>[m[1],Object.fromEntries(m[2].split('\n').map(line=>{const f=line.match(/^\s*(\w+)\s+(\w+)(\[\]|\?)?/);if(!f)return null;const keys=line.match(/fields\s*:\s*\[([^\]]+)\]/);return [f[1],{isList:f[3]==='[]',relationFromFields:keys?keys[1].split(',').map(v=>v.trim()):[]}];}).filter(Boolean))]));
const metadata=Object.fromEntries(Prisma.dmmf.datamodel.models.map(m=>[m.name,{...m,fields:m.fields.map(f=>({...f,...schemaModels[m.name]?.[f.name]}))}]));
const parents={DocumentVersion:'document',SitePhoto:'report',SiteTaskReport:'task',InspectionApproval:'inspection',PayrollPayment:'accrual',WorkerAdvanceAllocation:'accrual',PurchaseItem:'purchase',PurchasePayment:'purchase',BOQItem:'boq',QuotationItem:'quotation',QuotationPaymentMilestone:'quotation',PurchaseRequestItem:'purchaseRequest',RFQItem:'rfq',RFQVendor:'rfq',PurchaseOrderItem:'purchaseOrder',ProcurementApprovalEvent:'approval',InvoicePayment:'invoice',VendorPaymentRequest:'purchase',VendorPaymentEvent:'request',FinancialEvent:'request'};
const fail=()=>{throw Object.assign(new Error('This action requires an assigned project. Ask Admin to update your project access.'),{status:403,code:'PROJECT_ACCESS_DENIED'});};
const delegate=model=>model[0].toLowerCase()+model.slice(1);
function condition(model,ids){
 if(model==='Project')return {id:{in:ids}};
 if(model==='UserProjectAssignment')return null;
 if(model==='FinancialRequest')return {OR:[{accrual:{projectId:{in:ids}}},{transaction:{projectId:{in:ids}}},...ids.flatMap(projectId=>[{payload:{path:'$.projectId',equals:projectId}},{snapshot:{path:'$.projectId',equals:projectId}}])]};
 if(model==='ProcurementApproval')return {OR:[{request:{projectId:{in:ids}}},{order:{projectId:{in:ids}}}]};
 if(metadata[model]?.fields.some(f=>f.name==='projectId')){
  if(model==='StockMovement')return {OR:[{projectId:{in:ids}},{projectId:null}]};
  if(model==='Transaction')return {OR:[{projectId:{in:ids}},{overheadAllocations:{some:{projectId:{in:ids}}}}]};
  return {projectId:{in:ids}};
 }
 const key=parents[model],relation=metadata[model]?.fields.find(f=>f.name===key);if(relation)return {[key]:condition(relation.type,ids)};
 return null;
}
const merge=(where,scope)=>where?{...where,AND:[...(Array.isArray(where.AND)?where.AND:where.AND?[where.AND]:[]),scope]}:scope;
function nested(model,args,ids){
 const out={...args};for(const mode of ['include','select'])if(args[mode]){out[mode]={...args[mode]};for(const [key,value] of Object.entries(args[mode])){const f=metadata[model]?.fields.find(f=>f.name===key&&f.kind==='object');if(!f||!value)continue;let child=value===true?{}:{...value};const scope=condition(f.type,ids);if(f.isList&&scope)child.where=merge(child.where,scope);child=nested(f.type,child,ids);out[mode][key]=Object.keys(child).length?child:true;}
  if(args[mode]._count===true||args[mode]._count?.select){const count=args[mode]._count===true?Object.fromEntries(metadata[model].fields.filter(f=>f.kind==='object'&&f.isList).map(f=>[f.name,true])):{...args[mode]._count.select};for(const [key,value] of Object.entries(count)){const f=metadata[model]?.fields.find(f=>f.name===key&&f.kind==='object');const scope=f&&condition(f.type,ids);if(value&&f?.isList&&scope)count[key]={...(value===true?{}:value),where:merge(value.where,scope)};}out[mode]._count={select:count};}
 }return out;
}
async function validateData(base,model,data,ids,creating,inherited=false){
 if(Array.isArray(data)){for(const row of data)await validateData(base,model,row,ids,creating,inherited);return;}if(!data)return;
 if(model==='Project'&&creating)fail();
 if(Object.hasOwn(data,'projectId')){const value=typeof data.projectId==='object'?data.projectId?.set:data.projectId;if(!(model==='StockMovement'&&value===null)&&!ids.includes(Number(value)))fail();}
 if(creating&&metadata[model]?.fields.some(f=>f.name==='projectId')&&!Object.hasOwn(data,'projectId')&&!data.project?.connect&&!inherited)fail();
 for(const f of metadata[model]?.fields.filter(f=>f.kind==='object')||[]){
  const scope=condition(f.type,ids);if(!scope)continue;const value=data[f.name],foreign=f.relationFromFields?.[0];
  const refs=[];if(foreign&&data[foreign]!=null&&foreign!=='projectId')refs.push({id:typeof data[foreign]==='object'?data[foreign].set:data[foreign]});if(value?.connect)refs.push(...(Array.isArray(value.connect)?value.connect:[value.connect]));
  for(const ref of refs)if(!await base[delegate(f.type)].findFirst({where:merge(ref,scope)}))fail();
  if(value?.disconnect||value?.set||value?.update||value?.updateMany||value?.delete||value?.deleteMany||value?.upsert||value?.connectOrCreate)fail();
  const inherit=!!condition(model,ids);
  if(value?.create)await validateData(base,f.type,value.create,ids,true,inherit);if(value?.createMany)await validateData(base,f.type,value.createMany.data,ids,true,inherit);
 }
}
function scopedClient(base){const extended=base.$extends({name:'assigned-projects',query:{$allModels:{$allOperations:async({model,operation,args,query})=>{
 const scope=storage.getStore();if(!scope)return query(args);const ids=scope.ids,filter=condition(model,ids);let next=nested(model,args,ids);
 if(filter&&['findMany','findFirst','findFirstOrThrow','findUnique','findUniqueOrThrow','count','aggregate','groupBy','update','updateMany','updateManyAndReturn','delete','deleteMany','upsert'].includes(operation))next.where=merge(args.where,filter);
 const db=scope.tx||base;
 if(['create','createMany','createManyAndReturn','update','updateMany','updateManyAndReturn','upsert'].includes(operation)){await validateData(db,model,operation==='upsert'?args.create:args.data,ids,operation.startsWith('create')||operation==='upsert');if(operation==='upsert')await validateData(db,model,args.update,ids,false);}
 if(filter&&['update','delete'].includes(operation)&&!await db[delegate(model)].findFirst({where:next.where}))fail();
 return query(next);
 }}}});return new Proxy(extended,{get(target,key){if(key==='$transaction')return (fn,options)=>{const scope=storage.getStore();return target.$transaction(scope&&typeof fn==='function'?tx=>storage.run({...scope,tx},()=>fn(tx)):fn,options);};const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;}});}
function middleware(req,res,next){if(!restrictedRoles.includes(req.user?.role))return next();const ids=(req.user.projectAssignments||[]).map(a=>a.projectId).sort((a,b)=>a-b);req.user.projectRestricted=true;req.user.projectIds=ids;const json=res.json.bind(res);res.json=payload=>{if(payload?.success===false&&payload.message?.startsWith('This action requires an assigned project.'))res.status(403);return json(res.statusCode===403&&payload?.success===false?{...payload,code:'PROJECT_ACCESS_DENIED'}:payload);};return storage.run({ids,userId:req.user.id},next);}
const companyRead=fn=>storage.run(null,fn);
module.exports={scopedClient,middleware,condition,nested,restrictedRoles,companyRead};
