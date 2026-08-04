import React, { useState, useEffect } from 'react';
import { Download, Search, RefreshCw, BadgeAlert } from 'lucide-react';
import api from '../services/api';

export const Logs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterEmpId, setFilterEmpId] = useState('');
  
  const localUser = localStorage.getItem('smart_attendance_user');
  const user = localUser ? JSON.parse(localUser) : null;
  const isEmployee = user?.role === 'employee';

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 200 };
      if (filterEmpId.trim()) {
        params.employee_id = filterEmpId.trim();
      }
      const response = await api.get('/api/v1/logs', { params });
      setLogs(response.data);
    } catch (err) {
      console.error("Failed to retrieve attendance logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const downloadCSV = () => {
    if (logs.length === 0) return;
    
    const headers = ['Log ID', 'Employee ID', 'Name', 'Department', 'Timestamp', 'Status', 'Verification Method', 'Score'];
    const rows = logs.map(log => [
      log.id,
      log.employee_id,
      `"${log.name}"`,
      `"${log.group}"`,
      new Date(log.timestamp).toLocaleString(),
      log.status,
      log.method,
      log.verification_score !== null ? log.verification_score.toFixed(4) : 'N/A'
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `smart_attendance_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Search Filter Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-sm font-black text-slate-800 tracking-wide uppercase">Identity Check Logs</h3>
          <p className="text-xs text-slate-400 mt-1">Audit verification history, RFID card scans and geofence flags</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {!isEmployee && (
            <form onSubmit={handleSearchSubmit} className="relative flex-1 md:flex-initial">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search Employee ID..."
                value={filterEmpId}
                onChange={(e) => setFilterEmpId(e.target.value)}
                className="w-full md:w-56 pl-10 pr-4 py-2 glass-input rounded-xl text-xs"
              />
            </form>
          )}

          <button
            onClick={fetchLogs}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-400 hover:text-slate-650 transition-all duration-200"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={downloadCSV}
            disabled={logs.length === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-200 text-slate-650 hover:text-slate-800 rounded-xl text-xs font-semibold transition-all duration-200"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-panel rounded-3xl border border-slate-200 overflow-hidden shadow-glass">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6">Timestamp</th>
                <th className="py-4 px-6">ID</th>
                <th className="py-4 px-6">Name</th>
                <th className="py-4 px-6">Department</th>
                <th className="py-4 px-6">Method</th>
                <th className="py-4 px-6">Similarity Score</th>
                <th className="py-4 px-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-55 text-xs transition-colors duration-150">
                    <td className="py-3.5 px-6 font-mono text-slate-500">
                      {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                    </td>
                    <td className="py-3.5 px-6 font-bold text-[#00A8CC]">{log.employee_id}</td>
                    <td className="py-3.5 px-6 font-bold text-slate-800">{log.name}</td>
                    <td className="py-3.5 px-6 text-slate-500">{log.group}</td>
                    <td className="py-3.5 px-6 font-semibold text-slate-600">{log.method}</td>
                    <td className="py-3.5 px-6 font-mono text-slate-500">
                      {log.verification_score !== null ? (
                        <span className={`font-bold ${log.verification_score >= 0.7 ? 'text-success' : 'text-warning'}`}>
                          {log.verification_score.toFixed(4)}
                        </span>
                      ) : 'N/A'}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded uppercase ${
                        log.status === 'LATE' 
                          ? 'bg-warning/10 text-warning border border-warning/10' 
                          : 'bg-success/10 text-success border border-success/10'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 font-medium">No check-in logs found. Run check-ins in the camera page.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default Logs;
