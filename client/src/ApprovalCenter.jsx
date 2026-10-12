import {useState} from 'react';
import ApprovalQueue from './ApprovalQueue';
import ProcurementReviewDesk from './ProcurementReviewDesk';
import PaymentRequests from './PaymentRequests';
import FinancialRequests from './FinancialRequests';
export default function ApprovalCenter({apiUrl,user}){
 const [tab,setTab]=useState('inspection');
 return <><div className="billing-panel"><button onClick={()=>setTab('inspection')}>Inspection approvals</button> <button onClick={()=>setTab('procurement')}>Purchase / PO approvals</button> {user.role==='ADMIN'&&<button onClick={()=>setTab('payments')}>Vendor payment approvals</button>} {user.role==='ADMIN'&&<button onClick={()=>setTab('financial')}>Payroll / Expense approvals</button>}</div>{tab==='inspection'?<ApprovalQueue apiUrl={apiUrl} user={user}/>:tab==='financial'?<FinancialRequests apiUrl={apiUrl} user={user} queue/>:tab==='payments'?<PaymentRequests apiUrl={apiUrl} user={user} queue/>:<ProcurementReviewDesk apiUrl={apiUrl} user={user} queue/>}</>;
}
