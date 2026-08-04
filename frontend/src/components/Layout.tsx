import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  History, 
  Settings, 
  Camera, 
  LogOut,
  Building2,
  UserCheck,
  HelpCircle,
  X,
  BookOpen,
  UserPlus2,
  ShieldCheck,
  Clock,
  Compass
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: any;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeTab, 
  setActiveTab, 
  user, 
  onLogout 
}) => {
  const [showGuide, setShowGuide] = useState(true);

  const sidebarItems = [
    { id: 'dash', label: 'Analytics Dashboard', icon: LayoutDashboard, roles: ['employer'] },
    { id: 'roster', label: 'Employee Roster', icon: Users, roles: ['employer'] },
    { id: 'logs', label: 'Attendance Logs', icon: History, roles: ['employer', 'employee'] },
    { id: 'settings', label: 'Rules & Geofence', icon: Settings, roles: ['employer'] },
    { id: 'checkin', label: 'Live Check-in Portal', icon: Camera, roles: ['employer', 'employee'] },
  ];

  const visibleItems = sidebarItems.filter(item => 
    item.roles.includes(user?.role || 'employee')
  );

  const isAdmin = user?.role === 'employer';

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar (uTest Brand Teal-to-Cyan Gradient Sidebar) */}
      <aside className="w-72 bg-gradient-to-b from-[#00A8CC] to-[#4DC2DB] flex flex-col justify-between relative overflow-hidden z-30 shadow-lg">
        {/* Background circular vector design matching login & welcome banner */}
        <div className="absolute inset-0 opacity-10 scale-[1.6] pointer-events-none translate-y-24 select-none">
          <svg width="410" height="399" viewBox="0 0 410 399" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M250 -101C388.071 -101 500 10.9288 500 149C500 287.071 388.071 399 250 399C111.929 399 1.64975e-05 287.071 0 149C0 10.9288 111.929 -101 250 -101ZM310.088 33.6396V179.989C310.088 224.841 288.135 246.88 250.515 246.88C212.894 246.88 190.942 222.861 190.942 178.268V34.501H130.078V181.022C130.078 261.601 175.79 304.645 249.998 304.646C324.206 304.646 372.76 263.495 371.469 178.354V33.6396H310.088Z" fill="white" />
          </svg>
        </div>

        <div className="relative z-10">
          {/* Brand header */}
          <div className="p-6 border-b border-white/10 flex items-center space-x-3">
            <div className="p-2.5 bg-white/20 text-white rounded-xl border border-white/20">
              <Building2 size={22} />
            </div>
            <div>
              <h1 className="font-extrabold text-md text-white leading-tight tracking-wider">SmartSAS</h1>
              <p className="text-[9px] text-white/80 font-bold uppercase tracking-widest">uTest Identity Platform</p>
            </div>
          </div>

          {/* Current profile summary */}
          <div className="p-4 mx-4 my-4 bg-white/10 border border-white/15 rounded-2xl flex items-center space-x-3">
            <img 
              src={user?.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"} 
              alt="Avatar" 
              className="w-10 h-10 rounded-xl object-cover ring-2 ring-white/20"
            />
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-white truncate">{user?.name || 'David Kim'}</div>
              <div className="text-[9px] text-white/95 font-extrabold uppercase tracking-wider">{user?.role === 'employer' ? 'Administrator' : 'Staff Member'}</div>
              <div className="text-[9px] text-white/70 truncate">{user?.group || 'HQ Operations'}</div>
            </div>
          </div>

          {/* Menu items */}
          <nav className="px-3 space-y-1">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                    isActive 
                      ? 'bg-white text-[#00A8CC] shadow-md shadow-[#00A8CC]/10' 
                      : 'text-white/85 hover:bg-white/10 hover:text-white border border-transparent'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-[#00A8CC]' : 'text-white/85'} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer/Logout */}
        <div className="p-4 border-t border-white/10 relative z-10">
          <button
            onClick={onLogout}
            className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-bold text-white/85 hover:bg-white/10 hover:text-white transition-all duration-200"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content body */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f5f7fa]">
        {/* Top bar header (uTest Clean White Header) */}
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 z-25">
          <div className="flex items-center space-x-2">
            <UserCheck size={16} className="text-primary-500" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
              {sidebarItems.find(i => i.id === activeTab)?.label}
            </h2>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all duration-200 ${
                showGuide 
                  ? 'bg-primary-500/10 text-primary-500 border-primary-500/30' 
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600 hover:text-slate-850'
              }`}
            >
              <HelpCircle size={14} />
              <span>Usage Guidelines</span>
            </button>
            <span className="text-[10px] font-semibold px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-slate-600 flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
              <span>uTest Gateway Connected</span>
            </span>
          </div>
        </header>

        {/* Viewport & Guides wrap */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main viewport */}
          <main className="flex-1 overflow-y-auto p-8 relative">
            {children}
          </main>

          {/* Right-side dynamic guidelines panel (uTest Clean White panel) */}
          {showGuide && (
            <aside className="w-80 border-l border-slate-200 bg-white flex flex-col justify-between overflow-y-auto p-6 z-20 animate-[slideIn_0.2s_ease-out] shadow-md">
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                  <div className="flex items-center space-x-2 text-primary-500">
                    <BookOpen size={16} />
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Platform Manual</h3>
                  </div>
                  <button 
                    onClick={() => setShowGuide(false)}
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>

                {isAdmin ? (
                  /* Admin/Employer Guidelines */
                  <div className="space-y-5 text-xs text-slate-600 leading-relaxed">
                    <p className="font-semibold text-slate-500">Welcome, Administrator. Here are details on managing employee biometrics:</p>
                    
                    <div className="space-y-2.5">
                      <div className="flex items-start space-x-2.5">
                        <div className="p-1 bg-primary-500/10 text-primary-500 rounded border border-primary-500/25 mt-0.5">
                          <UserPlus2 size={12} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Enroll Personnel</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">Go to **Employee Roster**, click **Add Employee**, then select **Enroll Face** to record 5 distinct profile angles in the studio.</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-2.5">
                        <div className="p-1 bg-primary-500/10 text-primary-500 rounded border border-primary-500/25 mt-0.5">
                          <Clock size={12} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Adjust Shift Rules</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">Define shift start target hours, buffer thresholds, and grace minute margins in **Rules & Geofence**.</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-2.5">
                        <div className="p-1 bg-primary-500/10 text-primary-500 rounded border border-primary-500/25 mt-0.5">
                          <Compass size={12} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Deploy Geofences</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">Set physical Latitude/Longitude markers with radius constraints. Any remote scans outside the boundaries are blocked.</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-2.5">
                        <div className="p-1 bg-primary-500/10 text-primary-500 rounded border border-primary-500/25 mt-0.5">
                          <ShieldCheck size={12} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Audit logs similarity</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">Check similarity match scores (cosine score &gt;= 0.70 is standard match). Export report log lines as CSV for corporate payroll.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Standard Employee Guidelines */
                  <div className="space-y-5 text-xs text-slate-600 leading-relaxed">
                    <p className="font-semibold text-slate-500">Welcome, Staff Member. Here are instructions to check in successfully:</p>
                    
                    <div className="space-y-2.5">
                      <div className="flex items-start space-x-2.5">
                        <div className="p-1 bg-primary-500/10 text-primary-500 rounded border border-primary-500/25 mt-0.5">
                          <Camera size={12} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Align Face</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">Open **Live Check-in**, center your face in the targeting brackets, and click verify. Keep lighting stable.</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-2.5">
                        <div className="p-1 bg-primary-500/10 text-primary-500 rounded border border-primary-500/25 mt-0.5">
                          <ShieldCheck size={12} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Liveness Actions</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">If liveness is active, perform the flashing instruction prompt (e.g. blink eyes, turn head left/right, smile) to verify physical presence.</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-2.5">
                        <div className="p-1 bg-primary-500/10 text-primary-500 rounded border border-primary-500/25 mt-0.5">
                          <Compass size={12} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Geofence validation</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">Ensure browser location tracking is allowed when checking in remotely. Your GPS must match active workspace fences.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="text-[9px] text-slate-400 text-center border-t border-slate-200 pt-4 mt-6">
                SmartSAS Identity System v1.1
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
};
