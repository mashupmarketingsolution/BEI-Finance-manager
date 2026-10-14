// @vitest-environment jsdom
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import App from './App';
import {createRequire} from 'node:module';
const {permissions}=createRequire(import.meta.url)('../../server/access-control.js');
const http=vi.hoisted(()=>({get:vi.fn(),post:vi.fn(),put:vi.fn(),delete:vi.fn()}));
vi.mock('axios',()=>({default:{...http,interceptors:{request:{use:vi.fn()},response:{use:vi.fn()}}}}));
vi.mock('./SiteReports',()=>({default:()=> <h2>Assigned site reports</h2>}));
let sessionUser;
const pages=['dashboard','customers','leads','categories','quotations','purchase-requests','rfqs','purchase-orders'];
const pagination={page:1,totalPages:1,totalRecords:0,totalCustomers:0,totalProjects:0};
const count=path=>http.get.mock.calls.filter(([url])=>url.endsWith(path)).length;
beforeEach(()=>{
 localStorage.clear();vi.clearAllMocks();sessionUser={id:1,name:'QA user',username:'qa',role:'ADMIN',projectIds:[],permissions:{pages,writePages:pages,financeWrite:true}};
 localStorage.setItem('bei_auth_token','test-only');localStorage.setItem('bei_auth_user',JSON.stringify(sessionUser));
 http.get.mockImplementation(async(url)=>{
  if(url.endsWith('/auth/me'))return {data:{success:true,data:{user:sessionUser}}};
  if(url.includes('/dashboard'))return {data:{success:true,data:{totalProjects:0,totalIncome:0,totalExpenses:0,currentBalance:0,totalCustomers:0,activeCustomers:0,inactiveCustomers:0,customersWithProjects:0,customersWithoutProjects:0,totalCashPaid:0,recentTransactions:[]}}};
  if(url.endsWith('/categories/paginated'))return {data:{success:true,data:{income:[],expense:[]},pagination:{income:pagination,expense:pagination}}};
  if(url.endsWith('/stock-desk'))return {data:{success:true,data:{materials:[],projects:[],purchases:[],movements:[]}}};
  if(url.endsWith('/job-costing/context'))return {data:{success:true,data:{workers:[],payroll:[],overheads:[]}}};
  return {data:{success:true,data:[],pagination,summary:{totalIncome:0,totalExpenses:0,currentBalance:0}}};
 });
});
afterEach(()=>{cleanup();localStorage.clear();});
const menuLabels={dashboard:'Dashboard',projects:'Projects',documents:'Documents','site-reports':'Site Reports',leads:'Leads',customers:'Customers',billing:'Client Billing','project-profit':'Project Profit & Loss',payables:'Vendor Payables',quotations:'Quotations',boqs:'BOQ',income:'Income',expenses:'Expenses',transactions:'Transactions',workers:'Workers',vendors:'Vendors',materials:'Materials',purchases:'Purchases','purchase-requests':'Purchase Requests',rfqs:'RFQ','purchase-orders':'Purchase Orders',categories:'Categories','user-access':'User Access','stock-desk':'Stock Desk',approvals:'Approvals','procurement-review':'Procurement Review','payment-requests':'Payment Requests','financial-requests':'Financial Requests','audit-log':'Audit Log'};
it.each(['ADMIN','ACCOUNTS','PROJECT_MANAGER','SITE_SUPERVISOR','PROCUREMENT_OFFICER','STOREKEEPER','VIEWER'])('renders exactly the authorized menu for %s',async role=>{
 sessionUser={...sessionUser,role,permissions:permissions(role)};
 localStorage.setItem('bei_auth_user',JSON.stringify(sessionUser));render(<App/>);
 await waitFor(()=>expect(http.get.mock.calls.some(([url])=>url.endsWith('/auth/me'))).toBe(true));
 await act(async()=>{});
 for(const [page,label] of Object.entries(menuLabels))expect(screen.queryByRole('link',{name:label,exact:true})!==null,label).toBe(sessionUser.permissions.pages.includes(page));
 expect(http.post).not.toHaveBeenCalled();
});
it('opens the allowed page immediately for a restricted role',async()=>{
 sessionUser={...sessionUser,role:'SITE_SUPERVISOR',projectIds:[5],permissions:{pages:['site-reports'],writePages:['site-reports']}};localStorage.setItem('bei_auth_user',JSON.stringify(sessionUser));render(<App/>);await screen.findByRole('heading',{name:'Assigned site reports'});expect(screen.queryByRole('link',{name:'Dashboard',exact:true})).toBeNull();expect(count('/projects')).toBe(0);
});
it('loads customers once per page entry and once per page-size change',async()=>{
 render(<App/>);await screen.findByRole('link',{name:'Customers',exact:true});fireEvent.click(screen.getByRole('link',{name:'Customers',exact:true}));const heading=await screen.findByRole('heading',{name:'Customers',exact:true});await waitFor(()=>expect(count('/customers')).toBe(1));await act(async()=>{});expect(count('/customers')).toBe(1);const section=heading.closest('section');fireEvent.change(within(section).getAllByRole('combobox')[0],{target:{value:'20'}});await waitFor(()=>expect(count('/customers')).toBe(2));await act(async()=>{});expect(http.get.mock.calls.filter(([url])=>url.endsWith('/customers')).at(-1)[1].params.limit).toBe(20);expect(count('/customers')).toBe(2);
});
it('procurement pages settle loading and repeated navigation does not strand the spinner',async()=>{
 render(<App/>);await screen.findByRole('link',{name:'Purchase Requests',exact:true});for(const [name,path] of [['Purchase Requests','/purchase-requests'],['RFQ','/rfqs'],['Purchase Orders','/purchase-orders'],['Quotations','/quotations']]){fireEvent.click(screen.getByRole('link',{name,exact:true}));await waitFor(()=>expect(count(path)).toBe(1));await act(async()=>{});fireEvent.click(screen.getByRole('link',{name,exact:true}));await act(async()=>{});expect(count(path)).toBe(1);expect(document.body.textContent).not.toMatch(/Loading (purchase requests|RFQs|purchase orders|quotations)/i);}
});
it('ignores a late customer response after leaving and re-entering the page',async()=>{
 const base=http.get.getMockImplementation(),pending=[];http.get.mockImplementation((url,config)=>url.endsWith('/customers')?new Promise(resolve=>pending.push({resolve,signal:config.signal})):base(url,config));
 render(<App/>);await screen.findByRole('link',{name:'Customers',exact:true});fireEvent.click(screen.getByRole('link',{name:'Customers',exact:true}));await waitFor(()=>expect(pending.length).toBe(1));fireEvent.click(screen.getByRole('link',{name:'Dashboard',exact:true}));expect(pending[0].signal.aborted).toBe(true);fireEvent.click(screen.getByRole('link',{name:'Customers',exact:true}));await waitFor(()=>expect(pending.length).toBe(2));const response=name=>({data:{success:true,data:[{id:77,name,status:'ACTIVE',customerType:'INDIVIDUAL'}],pagination:{...pagination,totalCustomers:1}}});await act(async()=>pending[0].resolve(response('Stale customer')));expect(screen.queryByText('Stale customer')).toBeNull();await act(async()=>pending[1].resolve(response('Fresh customer')));await screen.findByText('Fresh customer');expect(screen.queryByText('Stale customer')).toBeNull();
});
it('rejects empty or failed login without caching a session',async()=>{
 localStorage.clear();const errorLog=vi.spyOn(console,'error').mockImplementation(()=>{});
 try{render(<App/>);const button=await screen.findByRole('button',{name:'Sign In',exact:true});fireEvent.submit(button.closest('form'));await screen.findByText('Username and password are required');expect(http.post).not.toHaveBeenCalled();fireEvent.change(screen.getByLabelText('Username'),{target:{value:' qa '}});fireEvent.change(screen.getByLabelText('Password'),{target:{value:'test-only-password'}});http.post.mockRejectedValueOnce({response:{status:401,data:{message:'Invalid username or password'}}});fireEvent.submit(button.closest('form'));await screen.findByText('Invalid username or password');expect(http.post.mock.calls[0][1].username).toBe('qa');expect(localStorage.getItem('bei_auth_token')).toBeNull();expect(localStorage.getItem('bei_auth_user')).toBeNull();expect(screen.queryByRole('link',{name:'Dashboard',exact:true})).toBeNull();}finally{errorLog.mockRestore();}
});
