export const quotationCategories = ['DESIGN','FURNITURE','CIVIL','ELECTRICAL','LIGHTING','MATERIALS','LABOUR','OTHER'];

export function milestoneAmount(total, percentage) {
  if (percentage === '' || percentage == null) return '';
  const value = Number(percentage), grandTotal = Number(total);
  if (!Number.isFinite(value) || value < 0 || value > 100 || !Number.isFinite(grandTotal) || grandTotal < 0) return '';
  return (Math.round(grandTotal * value) / 100).toFixed(2);
}
