export function pageWindow(total, size, requestedPage) {
  const limit = size === 'all' ? Math.max(1, total) : Number(size);
  const pages = Math.max(1, Math.ceil(total / limit));
  const page = Math.max(1, Math.min(requestedPage, pages));
  const start = (page - 1) * limit;
  return {page, pages, start, end: Math.min(total, start + limit)};
}
