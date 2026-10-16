const rows=[
 ['Akij','Plain Particle Board','Regular','Plain particle board','https://akijboard.com/product/particle-board-regular/'],
 ['Akij','Plain Particle Board','HMR','HMR particle board','https://akijboard.com/wp-content/uploads/2022/12/Akij-Board-Brochure-New.pdf'],
 ['Akij','Plain Particle Board','Jute','Jute particle board','https://akijbashir.com/business/akijboard/'],
 ['Akij','Plain Particle Board','Lightweight','Lite board','https://akijboard.com/products/'],
 ['Akij','MDF Board','Plain MDF Board','Plain MDF board','https://akijbashir.com/business/akijboard/'],
 ['Akij','Plywood',null,'Plywood','https://akijbashir.com/business/akijboard/'],
 ['Akij','Melamine Board','Particle core','Melamine faced particle board','https://akijboard.com/melamine-board/'],
 ['Akij','Melamine Board','Synchro','Synchro melamine board','https://akijboard.com/products/'],
 ['Akij','Melamine Board','PU finish','PU melamine board','https://akijboard.com/products/'],
 ['Akij','Melamine Board','Embossed','Embossed melamine board','https://akijboard.com/products/'],
 ['Akij','Melamine Board','3D','3D melamine board','https://akijboard.com/products/'],
 ['Akij','Veneered Board',null,'Wood veneered board','https://akijboard.com/products/'],
 ['Akij','Premium Surface Board','UV High Gloss','High gloss UV board','https://akijboard.com/high-gloss/'],
 ['Akij','Premium Surface Board','Ultimatt','Ultimatt board','https://akijbashir.com/business/akijboard/'],
 ['Akij','Premium Surface Board','Acrylic','Acrylic board','https://akijboard.com/products/'],
 ['Akij','Premium Surface Board','Glass Acrylic','Glass acrylic board','https://akijboard.com/products/'],
 ['Akij','Premium Surface Board','PETG','PETG board','https://akijboard.com/products/'],
 ['Akij','Fibre Cement Board','Fibercem','Fibercem board','https://akijboard.com/products/'],
 ['Akij','Laminates & Edge Banding','ProEDGE','ProEDGE PVC edge band','https://akijboard.com/proedge/','rft'],
 ['Ahmed','Plain Particle Board',null,'Plain particle board','https://particlemela.com/shop/'],
 ['Ahmed','Melamine Board',null,'Melamine board','https://particlemela.com/'],
 ['Ahmed','Melamine Board','Elegant Italian','Elegant Italian melamine board','https://particlemela.com/'],
 ['Ahmed','Melamine Board','Fervent','Fervent melamine board','https://particlemela.com/'],
 ['Ahmed','Veneered Board',null,'Veneered board','https://particlemela.com/'],
 ['Ahmed','Plywood','Gorjon Plywood','Gorjon plywood','https://particlemela.com/'],
 ['Ahmed','Plywood','Marine Gorjon','Gorjon marine plywood','https://particlemela.com/'],
 ['Ahmed','Plywood','Shuttering','Shuttering plywood','https://particlemela.com/'],
 ['Ahmed','HPL-faced Board',null,'HPL board','https://particlemela.com/'],
 ['Ahmed','uPVC Board',null,'uPVC board','https://particlemela.com/'],
 ['Ahmed','WPC Panel',null,'WPC panel','https://particlemela.com/']
];
const materials=rows.map(([brand,category,subCategory,name,source,unit='sheet'],i)=>({code:'AAB-'+String(i+1).padStart(3,'0'),brand,category,subCategory,name,source,unit}));
for(const [i,core] of ['Standard MDF','HMR MDF','Plywood MR'].entries())for(const mm of [18,25])materials.push({code:'AAB-HPL-'+i+'-'+mm,brand:'Akij',category:'HPL-faced Board',subCategory:core,name:'HPL faced '+core+' board - '+mm+'mm',size:'Thickness: '+mm+' mm; sheet: 4 x 8 ft',source:'https://akijboard.com/hpl-board/',unit:'sheet'});
for(const [i,face] of ['Burma teak','Crown teak','Pencil teak','Golden teak','Straight line teak','Red oak','American ash','American natural walnut','Ebony','Red burl','Golden burl'].entries())materials.push({code:'AAB-AHPLY-'+String(i+1).padStart(2,'0'),brand:'Ahmed',category:'Plywood',subCategory:'Decorative Plywood',name:(['Burma teak','Crown teak','Pencil teak','Red oak','Ebony','Red burl'].includes(face)?face:face)+' faced plywood',unit:'sheet',source:'https://particlemela.com/'});
for(const m of materials){m.specification=m.brand==='Ahmed'?'Retailer-listed family; supplier confirmation required. Thickness, size, core and grade must be specified; face names do not imply solid timber.':'Official catalogue family; confirm selected decor/core/thickness with supplier. No automatic thickness combinations.';m.description='Owner-approved board review 2026-10-16. Evidence: '+m.source+'. No stock, price or performance certification seeded.';}
module.exports={materials,groups:[...new Set(materials.map(m=>m.category))].map(name=>[name]),income:[],expense:[]};
