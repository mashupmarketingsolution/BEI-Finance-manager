const toCents = value => Math.round(Number(value || 0) * 100);
const sum = (rows, key = 'amount') => rows.reduce((total, row) => total + toCents(row[key]), 0);

function projectProfit(project) {
  const transactions = project.transactions || [];
  const purchases = project.purchases || [];
  // Purchases are the cost source; their accounting mirrors and settlements are excluded.
  const expenses = transactions.filter(t => t.type === 'EXPENSE' && !['PURCHASE', 'PURCHASE_PAYMENT'].includes(t.source));
  const purchaseCost = sum(purchases, 'grandTotal');
  const labourCost = sum(expenses.filter(t => t.workerId));
  const otherCost = sum(expenses.filter(t => !t.workerId));
  const receipts = sum(transactions.filter(t => t.type === 'INCOME'));
  const purchasePaid = purchases.reduce((total, p) => total + sum(p.payments || []), 0);
  const vendorDue = purchases.reduce((total, p) => total + Math.max(0, toCents(p.grandTotal) - sum(p.payments || [])), 0);
  const cost = purchaseCost + labourCost + otherCost;
  const contract = toCents(project.contractValue);
  const cashOut = purchasePaid + labourCost + otherCost;
  const values = {contract, receipts, customerDue: Math.max(0, contract - receipts), customerCredit: Math.max(0, receipts - contract), purchaseCost, labourCost, otherCost, cost, projectedProfit: contract - cost, purchasePaid, vendorDue, cashOut, cashBalance: receipts - cashOut};
  return {id: project.id, name: project.name, status: project.status, customer: project.customer?.name || '', ...Object.fromEntries(Object.entries(values).map(([key,value]) => [key,value / 100]))};
}

function registerProjectProfit(app, prisma, auth) {
  app.get('/api/reports/project-profit', auth, async (req, res) => {
    try {
      const projects = await prisma.project.findMany({include: {customer: true, transactions: true, purchases: {include: {payments: true}}}, orderBy: {name: 'asc'}});
      res.json({success: true, data: projects.map(projectProfit)});
    } catch (error) {
      console.error('Project profit report:', error);
      res.status(500).json({success: false, message: 'Unable to load project profit report'});
    }
  });
}
module.exports = {projectProfit, registerProjectProfit};
