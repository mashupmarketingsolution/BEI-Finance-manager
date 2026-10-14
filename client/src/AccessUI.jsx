import {Children,isValidElement,useEffect,useRef} from 'react';
const names={'Dashboard':'dashboard','Projects':'projects','Site Reports':'site-reports','Leads':'leads','Customers':'customers','Client Billing':'billing','Project Profit & Loss':'project-profit','Vendor Payables':'payables','Quotations':'quotations','BOQ':'boqs','Income':'income','Expenses':'expenses','Transactions':'transactions','Workers':'workers','Vendors':'vendors','Materials':'materials','Purchases':'purchases','Purchase Requests':'purchase-requests','RFQ':'rfqs','Purchase Orders':'purchase-orders','Categories':'categories','User Access':'user-access'};
const text=node=>typeof node==='string'?node:isValidElement(node)?Children.toArray(node.props.children).map(text).join(''):'';
names['Stock Desk']='stock-desk';
names['Approvals']='approvals';
names['Procurement Review']='procurement-review';
names['Payment Requests']='payment-requests';
names['Financial Requests']='financial-requests';
names['Documents']='documents';
names['Audit Log']='audit-log';
names['Backups']='backups';
export function PermissionMenu({permissions,children}){return <nav className="menu">{Children.toArray(children).filter(c=>isValidElement(c)&&permissions?.pages?.includes(names[text(c).trim()]))}</nav>;}
const mutation=/\b(add|create|save|edit|delete|remove|record|generate|post|undo|reverse|allocate|issue|void|accept|reject|send|convert|award|receive|usage|return|use|damage|adjust|archive|restore|complete|reopen|link|apply to wages)\b/i;
// This is presentation assistance for legacy forms. The server is the authority.
export function PermissionSurface({user,page,children,banner=true}){
 const root=useRef(null),readOnly=!user?.permissions?.writePages?.includes(page);
 useEffect(()=>{
  const node=root.current;if(!node)return;
  const blocked=button=>{
   const name=button.textContent+' '+(button.getAttribute('aria-label')||'')+' '+(button.getAttribute('title')||'');
   if(/Create \/ View Purchases/.test(name))return false;
   const mutates=mutation.test(name)||!!button.querySelector('svg.lucide-pencil,svg.lucide-trash-2,svg.lucide-plus,svg.lucide-save');
   if(readOnly&&mutates)return true;
   if(user?.projectRestricted&&page==='projects'&&/\badd project\b/i.test(name))return true;
   if(['PROJECT_MANAGER','PROCUREMENT_OFFICER'].includes(user?.role)&&/\b(delete|remove)\b/i.test(name)&&page!=='site-reports'&&!/attendance/i.test(name))return true;
   if(user?.role==='PROCUREMENT_OFFICER'&&mutates&&/\b(stock|receive|usage|return|use|damage|adjustment)\b/i.test(name))return true;
   return user?.role==='PROJECT_MANAGER'&&page==='workers'&&/\b(rate|payroll|batch|advance|allocation|wages)\b/i.test(name)&&mutates;
  };
  const enforce=()=>{for(const b of node.querySelectorAll('button,input[type="submit"]'))if(blocked(b)){if(!b.disabled)b.disabled=true;b.dataset.accessBlocked='true';b.title='Your role has view access only for this action';}};
  enforce();const observer=new MutationObserver(enforce);observer.observe(node,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']});
  const click=e=>{const b=e.target.closest?.('button,input[type="submit"]');if(b&&blocked(b)){e.preventDefault();e.stopPropagation();}};
  const submit=e=>{if(readOnly||(user?.role==='PROJECT_MANAGER'&&page==='workers'&&/rate|payroll|advance|allocation/i.test(e.target.closest('details')?.querySelector('summary')?.textContent||''))){e.preventDefault();e.stopPropagation();}};
  node.addEventListener('click',click,true);node.addEventListener('submit',submit,true);
  return()=>{observer.disconnect();node.removeEventListener('click',click,true);node.removeEventListener('submit',submit,true);for(const b of node.querySelectorAll('[data-access-blocked]')){b.disabled=false;delete b.dataset.accessBlocked;}};
 },[user,page,readOnly]);
 if(!user?.permissions?.pages?.includes(page))return <p role="status">Opening an allowed page…</p>;
 return <div ref={root}>{banner&&readOnly&&<p role="status" className="billing-panel">Your role has view access on this page. Changes are restricted.</p>}{children}</div>;
}
