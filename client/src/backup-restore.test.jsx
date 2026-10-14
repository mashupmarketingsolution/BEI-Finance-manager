// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import BackupRestore from './BackupRestore';
const http=vi.hoisted(()=>({get:vi.fn(),post:vi.fn()}));
vi.mock('axios',()=>({default:http}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('allows verification without hosting destination but never offers import into live data',async()=>{
 http.get.mockResolvedValue({data:{data:{configured:false}}});http.post.mockResolvedValue({data:{data:{id:'abc',tables:[{name:'users',rows:1}],sqlBytes:50,sha256:'a'.repeat(64),target:null}}});
 render(<BackupRestore apiUrl=""/>);await screen.findByText(/Hosting setup needed/);fireEvent.change(screen.getByLabelText(/Encrypted backup file/),{target:{files:[new File(['encrypted'],'backup.sql.gz.enc')]}});
 fireEvent.click(screen.getByRole('button',{name:'Upload and verify backup'}));await screen.findByText('Backup verified');expect(http.post.mock.calls[0][2].headers['Content-Type']).toBe('application/octet-stream');expect(screen.queryByRole('button',{name:'Restore to separate database'})).toBeNull();
});
it('requires exact target confirmation and Admin password, then shows completion',async()=>{
 http.get.mockResolvedValue({data:{data:{configured:true,target:'restore_db'}}});http.post.mockResolvedValueOnce({data:{data:{id:'abc',tables:[{name:'users',rows:2}],sqlBytes:50,target:'restore_db',sha256:'b'.repeat(64)}}}).mockResolvedValueOnce({data:{data:{id:'abc',state:'SUCCESS'},message:'Restore verified. Live data unchanged.'}});
 render(<BackupRestore apiUrl=""/>);await screen.findByText('restore_db');fireEvent.change(screen.getByLabelText(/Encrypted backup file/),{target:{files:[new File(['encrypted'],'backup.enc')]}});fireEvent.click(screen.getByRole('button',{name:'Upload and verify backup'}));await screen.findByText('Backup verified');
 const button=screen.getByRole('button',{name:'Restore to separate database'});expect(button.disabled).toBe(true);
 fireEvent.change(screen.getByLabelText('Current Admin password'),{target:{value:'test-password'}});fireEvent.change(screen.getByLabelText('Type RESTORE TO restore_db'),{target:{value:'RESTORE TO wrong_db'}});expect(button.disabled).toBe(true);
 fireEvent.change(screen.getByLabelText('Type RESTORE TO restore_db'),{target:{value:'RESTORE TO restore_db'}});fireEvent.click(button);await screen.findByText('Restore: SUCCESS');expect(http.post.mock.calls[1][1]).toEqual({password:'test-password',confirmation:'RESTORE TO restore_db'});
});
it('rejects files over 50 MB before uploading and recovers a running job after reopening',async()=>{
 http.get.mockResolvedValue({data:{data:{configured:false}}});render(<BackupRestore apiUrl=""/>);await screen.findByText(/Hosting setup needed/);
 const file=new File(['x'],'large.enc');Object.defineProperty(file,'size',{value:51*1024*1024});fireEvent.change(screen.getByLabelText(/Encrypted backup file/),{target:{files:[file]}});fireEvent.click(screen.getByRole('button',{name:'Upload and verify backup'}));await screen.findByRole('alert');expect(http.post).not.toHaveBeenCalled();cleanup();
 http.get.mockResolvedValue({data:{data:{configured:true,target:'restore_db',lastJob:{id:'abc',state:'RUNNING',message:'Restoring safely'}}}});render(<BackupRestore apiUrl=""/>);await screen.findByText('Restore: RUNNING');await waitFor(()=>expect(screen.getByRole('button',{name:'Upload and verify backup'}).disabled).toBe(true));
});
