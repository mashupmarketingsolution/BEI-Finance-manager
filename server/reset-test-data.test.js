const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {schemaTables}=require('./reset-test-data');
test('reset table list covers reviewed mapped models and excludes schema migration history',()=>{
 const tables=schemaTables(fs.readFileSync(path.join(__dirname,'prisma/schema.prisma'),'utf8'));
 assert.equal(tables.length,53);assert.equal(new Set(tables).size,53);
 for(const name of ['users','transactions','stock_movements','document_versions','audit_events','financial_requests'])assert.ok(tables.includes(name));
 assert.equal(tables.includes('_prisma_migrations'),false);
 assert.throws(()=>schemaTables('model Unknown {\n id Int\n}\n'),/explicit table mapping/);
});
