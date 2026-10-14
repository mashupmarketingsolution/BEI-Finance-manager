const test=require('node:test'),assert=require('node:assert/strict');
const {targetAllowed,canonical}=require('./backup-verify');
test('restore cleanup accepts only generated targets distinct from source',()=>{
 const target='bei_restore_verify_1791957391159_aabb1234';assert.equal(targetAllowed('finance',target),true);
 for(const bad of ['finance','mysql','bei_restore_verify_','bei_restore_verify_1791957391159_aabb1234; DROP DATABASE finance',target+'`'])assert.equal(targetAllowed('finance',bad),false);
 assert.equal(targetAllowed(target,target),false);
});
test('backup comparison preserves binary bytes, large IDs and deterministic key ordering',()=>{
 assert.deepEqual(canonical({z:9007199254740993n,a:Buffer.from([0,255])}),{a:{binary:'AP8='},z:'9007199254740993'});
 assert.equal(JSON.stringify(canonical({b:'বাংলা',a:null})),JSON.stringify(canonical({a:null,b:'বাংলা'})));
});
