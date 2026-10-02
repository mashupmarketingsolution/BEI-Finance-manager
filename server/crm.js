const sources = ['FACEBOOK', 'WEBSITE', 'REFERRAL', 'PHONE', 'WALK_IN', 'OTHER'];
function validateContact(body) {
  if (!body || typeof body !== 'object') return 'Contact details are required';
  for (const [field, max] of Object.entries({name:150, phone:30, email:150, companyName:150, address:16000, notes:16000})) {
    const value = body[field];
    if (value != null && (typeof value !== 'string' || value.trim().length > max)) return `${field} must be text of at most ${max} characters`;
  }
  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) return 'Invalid email address';
  if (body.source !== undefined && !sources.includes(body.source)) return 'Invalid lead source';
  return null;
}
function customerFinancials(projects) {
  const result = {contractValue:0, received:0, outstanding:0, credit:0, payments:[]};
  // Integer cents prevent floating point drift; credits never offset another project's due.
  for (const project of projects) {
    const contract = Math.round(Number(project.contractValue) * 100);
    const payments = (project.transactions || []).filter(t => t.type === 'INCOME');
    const received = payments.reduce((sum,t)=>sum+Math.round(Number(t.amount)*100),0);
    result.contractValue += contract;
    result.received += received;
    result.outstanding += Math.max(0,contract-received);
    result.credit += Math.max(0,received-contract);
    result.payments.push(...payments.map(t=>({...t,projectName:project.name})));
  }
  for (const key of ['contractValue','received','outstanding','credit']) result[key] /= 100;
  result.payments.sort((a,b)=>new Date(b.transactionDate)-new Date(a.transactionDate));
  return result;
}
module.exports = {validateContact, customerFinancials};
