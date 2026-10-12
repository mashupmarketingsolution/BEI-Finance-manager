import {useState} from 'react';
import ApprovalQueue from './ApprovalQueue';
import ProcurementReviewDesk from './ProcurementReviewDesk';
export default function ApprovalCenter({apiUrl,user}){
 const [tab,setTab]=useState('inspection');
 return <><div className="billing-panel"><button onClick={()=>setTab('inspection')}>Inspection approvals</button> <button onClick={()=>setTab('procurement')}>Purchase / PO approvals</button></div>{tab==='inspection'?<ApprovalQueue apiUrl={apiUrl} user={user}/>:<ProcurementReviewDesk apiUrl={apiUrl} user={user} queue/>}</>;
}
