import {useState} from 'react';
import ApprovalQueue from './ApprovalQueue';
import ProcurementReviewDesk from './ProcurementReviewDesk';
import PaymentRequests from './PaymentRequests';
export default function ApprovalCenter({apiUrl,user}){
 const [tab,setTab]=useState('inspection');
 return <><div className="billing-panel"><button onClick={()=>setTab('inspection')}>Inspection approvals</button> <button onClick={()=>setTab('procurement')}>Purchase / PO approvals</button> {user.role==='ADMIN'&&<button onClick={()=>setTab('payments')}>Vendor payment approvals</button>}</div>{tab==='inspection'?<ApprovalQueue apiUrl={apiUrl} user={user}/>:tab==='payments'?<PaymentRequests apiUrl={apiUrl} user={user} queue/>:<ProcurementReviewDesk apiUrl={apiUrl} user={user} queue/>}</>;
}
