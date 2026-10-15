const fs=require('node:fs'),path=require('node:path');const catalog=require('./catalog/bd-interior');
const norm=s=>s.trim().toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
async function importCatalog(db,apply=false){
 const categories=await db.query('SELECT * FROM categories'),groups=await db.query('SELECT * FROM material_categories'),materials=await db.query('SELECT * FROM materials');
 const existingGroups=new Map(groups.map(x=>[norm(x.name),x.id])),existingMaterials=new Set(materials.map(x=>norm(x.name))),existingCats=new Set(categories.map(x=>x.type+':'+norm(x.name)));
 const result={materialCategories:[],materials:[],income:[],expense:[],skippedMaterials:0};
 for(const [name] of catalog.groups)if(!existingGroups.has(norm(name)))result.materialCategories.push(name);
 for(const item of catalog.materials){if(existingMaterials.has(norm(item.name))){result.skippedMaterials++;continue;}if(materials.some(x=>x.code===item.code))throw Error('Existing material code conflict: '+item.code);result.materials.push(item);existingMaterials.add(norm(item.name));}
 for(const [type,list] of [['INCOME',catalog.income],['EXPENSE',catalog.expense]])for(const name of list)if(!existingCats.has(type+':'+norm(name))){result[type==='INCOME'?'income':'expense'].push(name);existingCats.add(type+':'+norm(name));}
 if(!apply)return result;
 await db.beginTransaction();try{
 for(const name of result.materialCategories){const r=await db.query('INSERT INTO material_categories (name,description,status,createdAt,updatedAt) VALUES (?,?,?,NOW(3),NOW(3))',[name,'Generic interior purchasing families; BD source research 2026-10-15. Confirm project specifications.','ACTIVE']);existingGroups.set(norm(name),Number(r.insertId));}
 for(const m of result.materials)await db.query('INSERT INTO materials (code,name,categoryId,unit,specification,description,status,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,NOW(3),NOW(3))',[m.code,m.name,existingGroups.get(norm(m.category)),m.unit,m.specification,m.description,'ACTIVE']);
 for(const [type,list] of [['INCOME',result.income],['EXPENSE',result.expense]])for(const name of list)await db.query('INSERT INTO categories (name,type,status,createdAt,updatedAt) VALUES (?,?,?,NOW(3),NOW(3))',[name,type,'ACTIVE']);
 await db.commit();return result;
 }catch(e){await db.rollback();throw e;}
}
async function main(){require('dotenv').config({quiet:true});const u=new URL(process.env.DATABASE_URL);if(!['localhost','127.0.0.1'].includes(u.hostname))throw Error('Local database only. Live import requires a separately reviewed deployment.');const db=await require('mariadb').createConnection({host:u.hostname,port:Number(u.port||3306),user:decodeURIComponent(u.username),password:decodeURIComponent(u.password),database:u.pathname.slice(1),bigIntAsNumber:true});try{const apply=process.argv.includes('--apply');if(apply){const snapshot={createdAt:new Date().toISOString(),database:u.pathname.slice(1)};for(const table of ['categories','material_categories','materials'])snapshot[table]=await db.query('SELECT * FROM '+table);const dir=path.resolve(__dirname,'../deployment-private');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'catalog-before-'+Date.now()+'.json'),JSON.stringify(snapshot),{mode:0o600});}const r=await importCatalog(db,apply);console.log(JSON.stringify({applied:apply,addedMaterialCategories:r.materialCategories.length,addedMaterials:r.materials.length,addedIncome:r.income.length,addedExpense:r.expense.length,skippedMaterials:r.skippedMaterials},null,2));}finally{await db.end();}}
if(require.main===module)main().catch(e=>{console.error(e.code||e.message);process.exitCode=1;});module.exports={norm,importCatalog};
