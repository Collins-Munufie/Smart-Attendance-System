import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CalendarCheck, 
  Clock, 
  UserMinus, 
  Percent, 
  RefreshCw,
  Clock3,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import api from '../services/api';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [liveLogs, setLiveLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const statsRes = await api.get('/api/v1/dashboard/stats');
      const chartsRes = await api.get('/api/v1/dashboard/charts');
      const logsRes = await api.get('/api/v1/logs', { params: { limit: 12 } });
      
      setStats(statsRes.data);
      setChartData(chartsRes.data);
      setLiveLogs(logsRes.data);
    } catch (err) {
      console.error("Dashboard statistics retrieval failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(interval);
  }, []);

  const statCards = [
    { label: 'Total Staff', value: stats?.total_employees ?? '-', icon: Users, color: 'text-[#00A8CC] bg-[#00A8CC]/10 border-[#00A8CC]/20' },
    { label: 'Active Today', value: stats?.active_today ?? '-', icon: CalendarCheck, color: 'text-success bg-success/15 border-success/20' },
    { label: 'On Time', value: stats?.on_time_today ?? '-', icon: Clock, color: 'text-success bg-success/10 border-success/20' },
    { label: 'Late Margins', value: stats?.late_today ?? '-', icon: Clock3, color: 'text-warning bg-warning/10 border-warning/20' },
    { label: 'Absent today', value: stats?.absent_today ?? '-', icon: UserMinus, color: 'text-danger bg-danger/10 border-danger/20' },
    { label: 'Attendance Rate', value: stats ? `${stats.attendance_rate}%` : '-', icon: Percent, color: 'text-primary-600 bg-primary-600/10 border-primary-500/25' },
  ];

  return (
    <div className="space-y-6">
      {/* uTest Style Color-Blended Welcome Banner */}
      <div className="relative bg-gradient-to-r from-[#00A8CC] to-[#4DC2DB] rounded-3xl p-6 shadow-lg shadow-[#00A8CC]/10 border-none overflow-hidden text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* Background circular vector design */}
        <div className="absolute right-0 top-0 bottom-0 opacity-10 scale-[1.5] pointer-events-none translate-x-12 select-none">
          <svg width="410" height="399" viewBox="0 0 410 399" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M250 -101C388.071 -101 500 10.9288 500 149C500 287.071 388.071 399 250 399C111.929 399 1.64975e-05 287.071 0 149C0 10.9288 111.929 -101 250 -101ZM310.088 33.6396V179.989C310.088 224.841 288.135 246.88 250.515 246.88C212.894 246.88 190.942 222.861 190.942 178.268V34.501H130.078V181.022C130.078 261.601 175.79 304.645 249.998 304.646C324.206 304.646 372.76 263.495 371.469 178.354V33.6396H310.088Z" fill="white" />
          </svg>
        </div>

        <div className="space-y-1 relative z-10">
          <h2 className="text-xl font-black uppercase tracking-wider flex items-center space-x-2">
            <ShieldCheck size={22} className="text-white" />
            <span>Identity Engine Dashboard</span>
          </h2>
          <p className="text-xs text-white/90 leading-relaxed max-w-xl">
            Enterprise SmartSAS verification services are active. Biometrics, GPS Geofencing, and Challenge-Response liveness checking are operating under standard configurations.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/20 relative z-10 text-xs font-bold uppercase tracking-wider">
          <Zap size={14} className="text-white animate-pulse" />
          <span>Real-time Sync</span>
        </div>
      </div>

      {/* Stat Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          const isAttendanceRate = card.label === 'Attendance Rate';
          
          if (isAttendanceRate) {
            return (
              <div key={i} className="bg-gradient-to-br from-[#00A8CC] to-[#4DC2DB] text-white rounded-2xl p-5 shadow-md shadow-[#00A8CC]/15 flex flex-col justify-between h-32 relative group border-none transition-all duration-300">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-extrabold text-white/80 uppercase tracking-wider">{card.label}</span>
                  <div className="p-2 rounded-lg bg-white/20 border border-white/10 text-white">
                    <Icon size={14} />
                  </div>
                </div>
                <div className="text-2xl font-black text-white mt-4">{card.value}</div>
              </div>
            );
          }

          return (
            <div key={i} className="glass-panel rounded-2xl p-5 border border-slate-200/80 flex flex-col justify-between h-32 relative group hover:border-[#00A8CC]/30 transition-all duration-300">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">{card.label}</span>
                <div className={`p-2 rounded-lg border ${card.color}`}>
                  <Icon size={14} />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-800 mt-4">{card.value}</div>
            </div>
          );
        })}
      </div>

      {/* Daily Attendance Summary - Full Width Section */}
      <div className="glass-panel rounded-3xl border border-slate-200 p-6 shadow-glass">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-sm font-black text-slate-800 tracking-wide uppercase">Daily Attendance Summary</h3>
            <p className="text-xs text-slate-400 mt-1">Analytics computed over the previous week</p>
          </div>
          <button 
            onClick={fetchDashboardData}
            className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-400 hover:text-slate-650 transition-all duration-200"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="h-80 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.02)" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px' }}
                  labelStyle={{ color: '#0f172a', fontWeight: 'bold', fontSize: '12px' }}
                  itemStyle={{ fontSize: '11px' }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#64748b' }} />
                <Bar dataKey="on_time" name="On Time" stackId="a" fill="#00A8CC" barSize={18} />
                <Bar dataKey="late" name="Late Logs" stackId="a" fill="#4DC2DB" />
                <Bar dataKey="absent" name="Absent" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 font-medium">No analytics logs recorded.</div>
          )}
        </div>
      </div>

      {/* Live Check-in Stream - Placed Under Daily Attendance Summary */}
      <div className="glass-panel rounded-3xl border border-slate-200 p-6 shadow-glass">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-sm font-black text-slate-800 tracking-wide uppercase flex items-center space-x-2">
              <span>Live Check-in Stream</span>
              <span className="w-2 h-2 rounded-full bg-success animate-ping inline-block"></span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">Real-time biometric gate verification events and identity stream</p>
          </div>
          <span className="text-xs font-mono font-bold text-[#00A8CC] bg-[#00A8CC]/10 px-3 py-1 rounded-full border border-[#00A8CC]/20">
            {liveLogs.length} Events Logged Today
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {liveLogs.length > 0 ? (
            liveLogs.map((log) => (
              <div key={log.id} className="p-4 bg-[#f8fafc] border border-slate-200/80 rounded-2xl flex items-center justify-between transition-all duration-200 hover:border-[#00A8CC]/40 shadow-sm">
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div className="relative flex-shrink-0">
                    <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${log.action_type === 'CHECK_OUT' ? 'bg-purple-600' : 'bg-emerald-500'}`}></div>
                    <img 
                      src={log.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"} 
                      alt={log.name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-sm"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-slate-800 truncate">{log.name}</div>
                    <div className="text-[10px] text-[#00A8CC] font-mono font-bold">{log.employee_id}</div>
                    <div className="text-[10px] text-slate-400 font-semibold truncate">{log.group}</div>
                  </div>
                </div>
                
                <div className="text-right flex flex-col items-end flex-shrink-0">
                  <div className="text-[10px] text-slate-500 font-bold font-mono">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  <div className="flex items-center space-x-1.5 mt-1.5">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                      log.action_type === 'CHECK_OUT'
                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}>
                      {log.action_type || 'CHECK_IN'}
                    </span>
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded uppercase ${
                      log.status === 'LATE' 
                        ? 'bg-warning/10 text-warning border border-warning/20' 
                        : log.status === 'CHECK OUT'
                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : 'bg-success/10 text-success border border-success/20'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-400 font-medium mt-1">{log.method}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-xs text-slate-400 font-medium bg-[#f8fafc] rounded-2xl border border-dashed border-slate-200">
              No check-in operations today yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
