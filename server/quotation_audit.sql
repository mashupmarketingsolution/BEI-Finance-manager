SELECT
  id,
  quotationNo,
  revisionNo,
  status,
  customerId,
  projectId,
  grandTotal,
  quotationDate,
  validUntil,
  createdAt
FROM quotations
ORDER BY id;
