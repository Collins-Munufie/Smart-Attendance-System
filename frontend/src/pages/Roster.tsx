import React, { useState, useEffect } from 'react';
import { Plus, UserCheck, UserMinus, ShieldAlert, Award, UserPlus2, RefreshCw } from 'lucide-react';
import api from '../services/api';
import { EnrollmentStudio } from '../components/EnrollmentStudio';

export const Roster: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Create employee form
  const [showAddForm, setShowAddForm] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [group, setGroup] = useState('Software Engineering');
  const [password, setPassword] = useState('password123');
  const [rfidCard, setRfidCard] = useState('');
  const [role, setRole] = useState('employee');
  const [formError, setFormError] = useState<string | null>(null);

  // Enrollment Studio variables
  const [activeEnrollmentUserId, setActiveEnrollmentUserId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/v1/users');
      setUsers(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      await api.post('/api/v1/users', {
        employee_id: employeeId,
        name,
        email: email || undefined,
        group,
        password,
        rfid_card: rfidCard || undefined,
        role
      });
      
      setEmployeeId('');
      setName('');
      setEmail('');
      setRfidCard('');
      setShowAddForm(false);
      fetchUsers();
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Could not register user. Check fields.";
      setFormError(msg);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (confirm("Are you sure you want to permanently delete this employee's credentials and biometric profiles?")) {
      try {
        await api.delete(`/api/v1/users/${id}`);
        fetchUsers();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="space-y-6">
      {activeEnrollmentUserId ? (
        <div className="glass-panel rounded-3xl border border-slate-200 p-6 shadow-glass max-w-xl mx-auto">
          <EnrollmentStudio 
            userId={activeEnrollmentUserId} 
            onSuccess={() => {
              setActiveEnrollmentUserId(null);
              fetchUsers();
            }}
            onCancel={() => setActiveEnrollmentUserId(null)}
          />
        </div>
      ) : (
        <>
          {/* Header Row */}
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-black text-slate-800 tracking-wide uppercase">Enterprise Staff Roster</h3>
              <p className="text-xs text-slate-400 mt-1">Manage active personnel configurations and biometric locks</p>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={fetchUsers}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-400 hover:text-slate-650 transition-all duration-200"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center space-x-2 px-4 py-2.5 bg-[#00A8CC] hover:bg-[#00819D] text-white rounded-xl text-xs font-bold transition-all duration-200 uppercase tracking-wider"
              >
                <Plus size={16} />
                <span>Add Employee</span>
              </button>
            </div>
          </div>

          {/* Add Employee Form Drawer */}
          {showAddForm && (
            <div className="glass-panel rounded-2xl border border-slate-200 p-6 shadow-lg max-w-2xl">
              <h4 className="text-xs font-black text-slate-800 mb-4 uppercase tracking-wider">Register Profile</h4>
              
              {formError && (
                <div className="mb-4 p-3 bg-danger/10 text-danger border border-danger/20 rounded-xl text-xs font-semibold">
                  {formError}
                </div>
              )}

              <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-555 uppercase tracking-widest">Employee ID</label>
                  <input 
                    type="text" required placeholder="e.g. EMP-2041"
                    value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full px-4 py-2.5 glass-input rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-555 uppercase tracking-widest">Full Name</label>
                  <input 
                    type="text" required placeholder="e.g. Elena Rostova"
                    value={name} onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 glass-input rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-555 uppercase tracking-widest">Email Address</label>
                  <input 
                    type="email" placeholder="elena@enterprise.com"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 glass-input rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-555 uppercase tracking-widest">Department Group</label>
                  <select 
                    value={group} onChange={(e) => setGroup(e.target.value)}
                    className="w-full px-4 py-2.5 glass-input rounded-xl text-xs bg-slate-50 border border-slate-300"
                  >
                    <option value="Software Engineering">Software Engineering</option>
                    <option value="Product Design">Product Design</option>
                    <option value="DevOps & Cloud">DevOps & Cloud</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Finance & Legal">Finance & Legal</option>
                    <option value="Global Sales">Global Sales</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-555 uppercase tracking-widest">Access Passphrase</label>
                  <input 
                    type="password" required
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 glass-input rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-555 uppercase tracking-widest">RFID Card Code (Optional)</label>
                  <input 
                    type="text" placeholder="RFID-44129-TX"
                    value={rfidCard} onChange={(e) => setRfidCard(e.target.value)}
                    className="w-full px-4 py-2.5 glass-input rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-555 uppercase tracking-widest">System Role</label>
                  <div className="flex space-x-4 mt-2">
                    <label className="inline-flex items-center text-xs font-semibold text-slate-650 cursor-pointer">
                      <input 
                        type="radio" name="role" value="employee" checked={role === 'employee'}
                        onChange={() => setRole('employee')} className="mr-2 cursor-pointer"
                      />
                      Employee
                    </label>
                    <label className="inline-flex items-center text-xs font-semibold text-slate-650 cursor-pointer">
                      <input 
                        type="radio" name="role" value="employer" checked={role === 'employer'}
                        onChange={() => setRole('employer')} className="mr-2 cursor-pointer"
                      />
                      Admin
                    </label>
                  </div>
                </div>
                
                <div className="md:col-span-2 pt-2 flex space-x-3">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#00A8CC] hover:bg-[#00819D] text-white rounded-xl text-xs font-bold transition-all duration-200 uppercase tracking-wider"
                  >
                    Save Personnel
                  </button>
                  <button
                    type="button" onClick={() => setShowAddForm(false)}
                    className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all duration-200"
                  >
                    Discard
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Roster Table */}
          <div className="glass-panel rounded-3xl border border-slate-200 overflow-hidden shadow-glass">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-250 bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Employee ID</th>
                    <th className="py-4 px-6">Name</th>
                    <th className="py-4 px-6">Department</th>
                    <th className="py-4 px-6">Biometric Profile</th>
                    <th className="py-4 px-6">RFID Tag</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {users.length > 0 ? (
                    users.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 text-xs transition-colors duration-150">
                        <td className="py-3.5 px-6 font-bold text-[#00A8CC]">{item.employee_id}</td>
                        <td className="py-3.5 px-6 font-bold text-slate-800 flex items-center space-x-2.5">
                          <img 
                            src={item.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"} 
                            alt={item.name} 
                            className="w-7 h-7 rounded-lg object-cover border border-slate-200"
                          />
                          <span>{item.name}</span>
                        </td>
                        <td className="py-3.5 px-6 text-slate-500">{item.group}</td>
                        <td className="py-3.5 px-6">
                          {item.is_enrolled ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-success/10 border border-success/20 text-success text-[10px] font-bold rounded-full uppercase tracking-wide">
                              <UserCheck size={10} />
                              <span>Enrolled</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-danger/10 border border-danger/20 text-danger text-[10px] font-bold rounded-full uppercase tracking-wide">
                              <ShieldAlert size={10} />
                              <span>Unenrolled</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-6 font-mono text-slate-400 text-[10px]">{item.rfid_card || 'None'}</td>
                        <td className="py-3.5 px-6 text-right space-x-2">
                          <button
                            onClick={() => setActiveEnrollmentUserId(item.employee_id)}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-[#00A8CC]/10 hover:bg-[#00A8CC]/20 border border-[#00A8CC]/20 text-[#00A8CC] text-[10px] font-bold rounded-lg uppercase tracking-wide transition-all duration-200"
                          >
                            <UserPlus2 size={12} />
                            <span>Enroll Face</span>
                          </button>
                          <button
                            onClick={() => handleDeleteUser(item.id)}
                            disabled={item.employee_id === 'EMP-1011'}
                            className="p-1.5 bg-danger/10 hover:bg-danger/20 border border-danger/15 text-danger rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                          >
                            <UserMinus size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400 font-medium">No personnel registered. Add staff above.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
export default Roster;
