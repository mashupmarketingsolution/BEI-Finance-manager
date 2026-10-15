// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import PagePermissionEditor from './PagePermissionEditor';
const http=vi.hoisted(()=>({get:vi.fn(),put:vi.fn()}));vi.mock('axios',()=>({default:http}));
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.clearAllMocks();});
it('edits a whole role or one user, requires view for edit, and restores inherited access',async()=>{
 const data={pages:['customers','projects'],roles:['PROJECT_MANAGER'],defaults:{PROJECT_MANAGER:{pages:['projects'],writePages:[]}},policies:[]};http.get.mockResolvedValue({data:{data}});http.put.mockResolvedValue({data:{success:true}});vi.spyOn(window,'confirm').mockReturnValue(true);
 render(<PagePermissionEditor apiUrl="" users={[{id:2,name:'Manager',username:'manager',role:'PROJECT_MANAGER'}]}/>);expect(http.get).not.toHaveBeenCalled();fireEvent.click(screen.getByText('Edit page permissions'));await screen.findByLabelText('View Customers');
 fireEvent.click(screen.getByLabelText('Edit Customers'));expect(screen.getByLabelText('View Customers').checked).toBe(true);fireEvent.click(screen.getByRole('button',{name:'Save page permissions'}));await waitFor(()=>expect(http.put).toHaveBeenCalled());expect(http.put.mock.calls[0][0]).toContain('role%3APROJECT_MANAGER');expect(http.put.mock.calls[0][1]).toMatchObject({pages:['projects','customers'],writePages:['customers'],version:0});
 await waitFor(()=>expect(screen.getByRole('button',{name:'Save page permissions'}).disabled).toBe(false));fireEvent.change(screen.getByLabelText('Access applies to'),{target:{value:'user:2'}});fireEvent.click(screen.getByRole('button',{name:'Reset to inherited/default'}));await waitFor(()=>expect(http.put.mock.calls.length).toBe(2));expect(http.put.mock.calls[1][0]).toContain('user%3A2');expect(http.put.mock.calls[1][1].reset).toBe(true);
});
