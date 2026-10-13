const ExcelJS=require('exceljs');
const PDFDocument=require('pdfkit');
const path=require('node:path');
const {loadProjectProfit}=require('./project-profit');
const groups={materials:'Materials',labour:'Labour (earned wages included)',transport:'Transport',design:'Design',vendor:'Other vendor expenses',other:'Other expenses',overhead:'Allocated overhead'};
const fields=[['Contract value','contract'],['Recorded cost','cost'],['Projected profit / loss','projectedProfit'],['Receipts','receipts'],['Customer due','customerDue'],['Customer credit','customerCredit'],['Cash paid','cashOut'],['Cash balance','cashBalance'],['Purchase cost','purchaseCost'],['Vendor paid','purchasePaid'],['Vendor due','vendorDue'],['Accrued payroll','payroll'],['Unpaid payroll','unpaidPayroll'],['Allocated overhead','overhead']];
const amount=v=>Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const sum=(rows,key)=>rows.reduce((s,r)=>s+Math.round(Number(r[key]||0)*100),0)/100;
const stockState=(r,basis)=>basis==='purchase'?'Not used':r.consumption?.incomplete?'PROVISIONAL - incomplete stock cost':'Complete recorded stock cost';
const stamp=d=>new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Dhaka',dateStyle:'medium',timeStyle:'short'}).format(d)+' (Asia/Dhaka)';
function metadata(rows,options){return [
 'BE Interior | Project Profit & Loss',
 'Lifetime recorded activity; snapshot generated '+stamp(options.generatedAt),
 'Currency: BDT | Material basis: '+(options.basis==='consumption'?'Stock consumed, net of returns':'Purchases, including unused stock'),
 `${rows.length} matching project(s) | Search: ${options.search||'None'} | Scope: ${options.projectId?'Project #'+options.projectId:'All matching projects allowed to this user'}`,
 'Projected profit = contract less recorded costs; future costs are excluded. This is not final realized profit.',
 'Customer due is contract less project income and can differ from issued invoice balances. Cash balance includes actual payments and attributed overhead; unpaid wages are costs, not cash paid.',
 'Consumption uses moving weighted average receipt costs. Incomplete stock history makes cost and profit provisional. Purchase basis includes unused stock. Advances do not add a second labour cost.',
 'BOQ rows compare purchases, even when the project uses consumption basis; estimates from different BOQs must not be added together.',
 ];}
function sheet(workbook,name,headers,widths,records,numeric=[]){
 const ws=workbook.addWorksheet(name,{views:[{state:'frozen',ySplit:1}],pageSetup:{orientation:'landscape',paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0}});
 ws.columns=headers.map((header,i)=>({header,width:widths[i]||20}));
 for(const values of records)ws.addRow(values);
 ws.getRow(1).height=32;ws.getRow(1).eachCell(c=>{c.font={name:'Calibri',size:11,bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF183153'}};});
 for(let n=2;n<=ws.rowCount;n++){const r=ws.getRow(n);r.height=Math.max(32,...r.values.slice(1).map((v,i)=>typeof v==='string'?Math.ceil(v.length/Math.max(8,(widths[i]||20)-2))*15+8:32));r.eachCell((c,i)=>{c.font={name:'Calibri',size:11,color:{argb:typeof c.value==='number'&&c.value<0?'FFB42318':'FF183153'}};c.alignment={vertical:'middle',wrapText:true};if(n%2===0)c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF1F5FA'}};if(numeric.includes(i))c.numFmt='"BDT "#,##0.00;[Red]("BDT "#,##0.00);"BDT "0.00';});}
 ws.autoFilter={from:{row:1,column:1},to:{row:Math.max(1,ws.rowCount),column:headers.length}};ws.pageSetup.printTitlesRow='1:1';return ws;
}
async function excel(rows,options){
 const w=new ExcelJS.Workbook();w.creator='BE Interior Finance Manager';w.created=options.generatedAt;
 const overview=w.addWorksheet('Overview');overview.columns=[{width:38},{width:105}];overview.addRow(['BE Interior','Project Profit & Loss']);overview.getRow(1).font={name:'Calibri',size:16,bold:true,color:{argb:'FF183153'}};
 for(const [i,text] of metadata(rows,options).slice(1,4).entries())overview.addRow([['Generated','Cost basis / Currency','Project filter'][i],text]);overview.addRow([]);overview.addRow(['Metric','Total (BDT)']);for(const [label,key] of fields)overview.addRow([label,sum(rows,key)]);overview.addRow(['Stock cost status',rows.some(r=>options.basis==='consumption'&&r.consumption?.incomplete)?'PROVISIONAL: review incomplete project stock costs':'Recorded cost basis; future costs excluded']);overview.addRow([]);overview.addRow(['Report notes','']);for(const text of metadata(rows,options).slice(4))overview.addRow(['Method / limitations',text]);overview.eachRow((r,n)=>{if(n>1){r.height=typeof r.getCell(2).value==='number'?26:44;r.eachCell(c=>{c.font={name:'Calibri',size:11};c.alignment={wrapText:true,vertical:'middle'};if(typeof c.value==='number')c.numFmt='"BDT "#,##0.00;[Red]("BDT "#,##0.00);"BDT "0.00';});}});overview.views=[{state:'frozen',ySplit:1}];
 const projects=sheet(w,'Projects',['Project ID','Project','Customer','Status',...fields.map(f=>f[0]),'Profit margin (%)','Stock cost status'],[12,38,30,18,...fields.map(()=>23),20,45],rows.map(r=>[r.id,r.name,r.customer,r.status,...fields.map(([,key])=>r[key]),r.profitMargin==null?null:r.profitMargin/100,stockState(r,options.basis)]),fields.map((_,i)=>i+5));projects.getColumn(fields.length+5).numFmt='0.00%';
 sheet(w,'Cost Breakdown',['Project ID','Project','Cost group','Amount (BDT)'],[12,38,40,24],rows.flatMap(r=>Object.entries(groups).map(([key,label])=>[r.id,r.name,label,r.breakdown[key]])),[4]);
 sheet(w,'Stock Consumption',['Project ID','Project','Material','Unit','Net used','Cost (BDT)','Stock cost status'],[12,38,35,14,18,24,45],rows.flatMap(r=>options.basis==='consumption'?(r.consumption?.items||[]).map(i=>[r.id,r.name,i.name,i.unit,i.quantity,i.cost,stockState(r,options.basis)]):[]),[6]);
 sheet(w,'Manual Expenses',['Project ID','Project','Category','Cost group','Amount (BDT)'],[12,38,35,40,24],rows.flatMap(r=>r.expenseCategories.map(c=>[r.id,r.name,c.category,groups[c.group],c.amount])),[5]);
 sheet(w,'BOQ Purchase Comparison',['Project ID','Project','BOQ number','BOQ name','BOQ status','Material','Unit','In selected BOQ','Estimated qty','Purchased qty','Estimated cost (BDT)','Purchase line cost (BDT)','Estimate less purchase (BDT)'],[12,38,20,35,18,35,14,18,20,20,25,25,28],rows.flatMap(r=>r.boqs.flatMap(b=>b.items.map(i=>[r.id,r.name,b.boqNo,b.name,b.status,i.name,i.unit,i.inBoq?'Yes':'No',i.estimatedQuantity,i.actualQuantity,i.estimatedCost,i.actualCost,i.variance]))),[11,12,13]);
 return Buffer.from(await w.xlsx.writeBuffer());
}
async function pdf(rows,options){
 const doc=new PDFDocument({size:'A4',layout:'landscape',margin:36,bufferPages:true,info:{Title:'BE Interior - Project Profit & Loss',Author:'BE Interior Finance Manager'}}),chunks=[];
 const done=new Promise((resolve,reject)=>{doc.on('data',b=>chunks.push(b));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});
 const font=path.join(__dirname,'assets/fonts/NotoSansBengali.ttf');doc.font(font);const width=doc.page.width-72;let y;
 const header=()=>{doc.fontSize(18).fillColor('#183153').text('BE Interior | Project Profit & Loss',36,30,{width});y=doc.y+5;for(const t of metadata(rows,options).slice(1,4)){doc.fontSize(9).text(t,36,y,{width});y=doc.y+4;}y+=8;};header();
 const next=()=>{doc.addPage();header();};
 const paragraph=(text,size=9)=>{doc.fontSize(size);const h=doc.heightOfString(text,{width});if(y+h>doc.page.height-42)next();doc.fillColor('#183153').text(text,36,y,{width});y=doc.y+7;};
 const table=(title,headers,widths,data)=>{
 const titleLine=()=>{if(y+65>doc.page.height-42)next();paragraph(title,12);};titleLine();
 const row=(cells,head=false)=>{doc.fontSize(head?9:9);const height=Math.max(27,...cells.map((c,i)=>doc.heightOfString(String(c??'—'),{width:widths[i]-12})+12));if(y+height>doc.page.height-42){next();paragraph(title+' (continued)',12);row(headers,true);}const top=y;let x=36;if(head)doc.rect(x,top,width,height).fill('#183153');else doc.rect(x,top,width,height).fill('#F1F5FA');cells.forEach((c,i)=>{doc.fillColor(head?'#FFFFFF':'#183153').text(String(c??'—'),x+6,top+6,{width:widths[i]-12});x+=widths[i];});y=top+height+2;};row(headers,true);for(const cells of data)row(cells);if(!data.length)paragraph('No matching records.');y+=9;
 };
 paragraph('Currency: BDT. Lifetime snapshot; future costs are excluded. Projected profit is provisional when stock costs are incomplete.');
 table('Financial performance',['Project / Customer','Status','Contract','Cost','Projected profit / loss','Margin','Stock cost'],[190,65,95,95,110,65,width-620],rows.map(r=>[r.name+'\n'+r.customer,r.status,amount(r.contract),amount(r.cost),amount(r.projectedProfit),r.profitMargin==null?'—':r.profitMargin.toFixed(2)+'%',options.basis==='purchase'?'Purchase basis':r.consumption?.incomplete?'PROVISIONAL':'Recorded']));
 table('Cash and customer balances',['Project','Received','Customer due','Customer credit','Cash paid','Cash balance'],[190,115,115,115,115,width-650],rows.map(r=>[r.name,amount(r.receipts),amount(r.customerDue),amount(r.customerCredit),amount(r.cashOut),amount(r.cashBalance)]));
 table('Matching project totals',['Metric','BDT'],[width-180,180],fields.map(([label,key])=>[label,amount(sum(rows,key))]));
 if(options.projectId&&rows.length===1){const r=rows[0];next();paragraph(r.name+' | '+r.customer,14);paragraph('Cost status: '+stockState(r,options.basis));table('Recorded cost breakdown',['Cost group','BDT'],[width-180,180],Object.entries(groups).map(([key,label])=>[label,amount(r.breakdown[key])]));if(options.basis==='consumption')table('Stock consumption',['Material','Net used / Unit','Cost (BDT)'],[width-330,150,180],(r.consumption?.items||[]).map(i=>[i.name,i.quantity+' '+i.unit,amount(i.cost)]));table('Manual expense categories',['Category','Cost group','BDT'],[width-420,240,180],r.expenseCategories.map(c=>[c.category,groups[c.group],amount(c.amount)]));for(const b of r.boqs){paragraph(`BOQ ${b.boqNo} - ${b.name} (${b.status}). Estimate BDT ${amount(b.estimatedCost)}. Separate estimate; do not add BOQs together.`);table('BOQ versus purchases',['Material / Unit','Est. qty','Bought qty','Estimated','Purchase line','Est. less purchase'],[width-505,70,75,115,115,130],b.items.map(i=>[i.name+' / '+i.unit+(i.inBoq?'':' (not in BOQ)'),i.estimatedQuantity,i.actualQuantity,amount(i.estimatedCost),amount(i.actualCost),amount(i.variance)]));}paragraph(`Purchase line subtotal BDT ${amount(r.purchaseLineCost)}; bill adjustments BDT ${amount(r.purchaseAdjustments)}. BOQ item comparison excludes bill-level discount/transport adjustments.`);}
 if(y+120>doc.page.height-42)next();paragraph('Report notes',12);for(const t of metadata(rows,options).slice(4))paragraph(t);
 const pages=doc.bufferedPageRange();for(let i=0;i<pages.count;i++){doc.switchToPage(i);doc.page.margins.bottom=0;doc.fillColor('#61728A').fontSize(8).text(`BE Interior | BDT | Page ${i+1} of ${pages.count}`,36,doc.page.height-25,{width,lineBreak:false,align:'right'});}doc.end();return done;
}
function registerProjectProfitExport(app,prisma){app.get('/api/reports/project-profit/export',async(req,res)=>{try{
 const {format,basis='consumption',search='',projectId}=req.query;if(!['pdf','xlsx'].includes(format)||!['consumption','purchase'].includes(basis)||typeof search!=='string'||search.length>150) return res.status(400).json({success:false,message:'Choose a valid export format, cost basis and search'});
 const id=projectId===undefined?null:Number(projectId);if(projectId!==undefined&&(!Number.isSafeInteger(id)||id<1))return res.status(400).json({success:false,message:'Choose a valid project'});
 const options={basis,search,projectId:id,generatedAt:new Date()};
 const all=await prisma.$transaction(tx=>loadProjectProfit(tx,basis),{isolationLevel:'RepeatableRead',timeout:30000});const rows=all.filter(r=>(!id||r.id===id)&&(r.name+' '+r.customer).toLowerCase().includes(search.toLowerCase()));
 if(id&&!rows.length)return res.status(404).json({success:false,message:'Project not found in your allowed report'});if(rows.length>1000)return res.status(413).json({success:false,message:'Too many projects. Narrow the search before exporting.'});
 const buffer=await (format==='pdf'?pdf(rows,options):excel(rows,options)),day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dhaka',year:'numeric',month:'2-digit',day:'2-digit'}).format(options.generatedAt);
 res.set({'Content-Type':format==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':`attachment; filename="project-profit-${basis}${id?'-'+id:''}-${day}.${format}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Access-Control-Expose-Headers':'Content-Disposition'}).send(buffer);
 }catch(e){console.error('Project profit export:',e);res.status(500).json({success:false,message:'Unable to export report. Please retry.'});}});}
module.exports={excel,pdf,metadata,registerProjectProfitExport};
