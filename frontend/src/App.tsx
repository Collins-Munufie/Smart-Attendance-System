import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Roster } from './pages/Roster';
import { Logs } from './pages/Logs';
import { Settings } from './pages/Settings';
import { CheckInCamera } from './components/CheckInCamera';

function App() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dash');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for session credentials
    const token = localStorage.getItem('smart_attendance_token');
    const localUser = localStorage.getItem('smart_attendance_user');
    
    if (token && localUser) {
      setUser(JSON.parse(localUser));
      // By default, open dashboard for admins, and check-in portal for standard staff
      const parsed = JSON.parse(localUser);
      setActiveTab(parsed.role === 'employer' ? 'dash' : 'checkin');
    }
    setLoading(false);

    const handleStorageChange = () => {
      const updatedLocalUser = localStorage.getItem('smart_attendance_user');
      if (updatedLocalUser) {
        setUser(JSON.parse(updatedLocalUser));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('smart_attendance_token');
    localStorage.removeItem('smart_attendance_user');
    setUser(null);
  };

  const handleLoginSuccess = (loggedInUser: any) => {
    setUser(loggedInUser);
    setActiveTab(loggedInUser.role === 'employer' ? 'dash' : 'checkin');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f7fa]">
        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      user={user} 
      onLogout={handleLogout}
    >
      {activeTab === 'dash' && <Dashboard />}
      {activeTab === 'roster' && <Roster />}
      {activeTab === 'logs' && <Logs />}
      {activeTab === 'settings' && <Settings />}
      {activeTab === 'checkin' && <CheckInCamera />}
    </Layout>
  );
}

export default App;
