import {Children, cloneElement, isValidElement, useState} from 'react';
import {pageWindow} from './pagination';
import './Pagination.css';

// Use only for complete, locally loaded lists. Server-paginated tables keep their API controls.
export default function PaginatedTable({children, resetKey = '', ...tableProps}) {
  const [size, setSize] = useState('10');
  const [position, setPosition] = useState({page: 1, signature: ''});
  const sections = Children.toArray(children);
  const body = sections.find(child => isValidElement(child) && child.type === 'tbody');
  const rows = Children.toArray(body?.props.children).filter(isValidElement);
  const empty = rows.length === 1 && Children.toArray(rows[0].props.children).length === 1 && Number(Children.toArray(rows[0].props.children)[0]?.props.colSpan) > 1;
  const total = empty ? 0 : rows.length;
  const signature = JSON.stringify([resetKey, rows.map(row => row.key)]);
  const range = pageWindow(total, size, position.signature === signature ? position.page : 1);
  const move = page => setPosition({page, signature});
  return <div className="paged-table">
    <div className="paged-table-size"><label>Show <select aria-label="Entries per page" value={size} onChange={e => {setSize(e.target.value);move(1);}}>{['10','20','25','50','100','all'].map(value => <option key={value} value={value}>{value === 'all' ? 'All' : value}</option>)}</select> entries</label></div>
    <table {...tableProps}>{sections.map(section => section === body ? cloneElement(body, {}, empty ? rows : rows.slice(range.start, range.end)) : section)}</table>
    <div className="paged-table-footer"><span aria-live="polite">Showing {total ? range.start + 1 : 0}–{range.end} of {total} entries</span><div className="paged-table-buttons"><button type="button" disabled={range.page === 1} onClick={() => move(range.page - 1)}>Previous</button><span>Page {range.page} of {range.pages}</span><button type="button" disabled={range.page === range.pages} onClick={() => move(range.page + 1)}>Next</button></div></div>
  </div>;
}
