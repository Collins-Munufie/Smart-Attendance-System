import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, MapPin, Trash2, ShieldAlert, Award, Clock } from 'lucide-react';
import api from '../services/api';

export const Settings: React.FC = () => {
  const [config, setConfig] = useState<any>({
    late_threshold_minutes: 15,
    grace_period_minutes: 10,
    shift_start_time: '09:00'
  });
  
  const [geofences, setGeofences] = useState<any[]>([]);
  
  const [fenceName, setFenceName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radius, setRadius] = useState('100');
  
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  const fetchData = async () => {
    try {
      const configRes = await api.get('/api/v1/config');
      const fenceRes = await api.get('/api/v1/geofence');
      setConfig(configRes.data);
      setGeofences(fenceRes.data);
    } catch (err) {
      console.error("Failed to load settings data:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback({ type: null, message: '' });
    try {
      await api.post('/api/v1/config', config);
      setFeedback({ type: 'success', message: 'Rule configurations saved successfully.' });
    } catch (err) {
      setFeedback({ type: 'error', message: 'Failed to update rule configurations.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddGeofence = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback({ type: null, message: '' });
    
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const rad = parseFloat(radius);

    if (isNaN(lat) || isNaN(lon) || isNaN(rad)) {
      setFeedback({ type: 'error', message: 'Please input numerical geofence points.' });
      return;
    }

    try {
      await api.post('/api/v1/geofence', {
        name: fenceName,
        latitude: lat,
        longitude: lon,
        radius_meters: rad
      });
      setFenceName('');
      setLatitude('');
      setLongitude('');
      setRadius('100');
      fetchData();
      setFeedback({ type: 'success', message: `Geofence zone '${fenceName}' activated.` });
    } catch (err) {
      setFeedback({ type: 'error', message: 'Failed to register geofence.' });
    }
  };

  const handleDeleteGeofence = async (id: number) => {
    try {
      await api.delete(`/api/v1/geofence/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const localUser = localStorage.getItem('smart_attendance_user');
  const currentUser = localUser ? JSON.parse(localUser) : null;
  const isAdmin = currentUser?.role === 'employer';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {feedback.message && (
        <div className={`p-4 rounded-xl text-xs font-semibold leading-relaxed border ${
          feedback.type === 'success' 
            ? 'bg-success/10 text-success border-success/20' 
            : 'bg-danger/10 text-danger border-danger/25'
        }`}>
          {feedback.message}
        </div>
      )}

      {/* Employee Profile Picture Customization Card (Always accessible to every employee & admin) */}
      <ProfileAvatarCard onProfileUpdated={() => fetchData()} />

      {/* Admin Rules & Geofencing Configurations */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Shift configuration */}
          <div className="glass-panel rounded-3xl border border-slate-200 p-6 shadow-glass space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-800 flex items-center space-x-2 uppercase tracking-wide">
                <Clock size={16} className="text-primary-500" />
                <span>Shift Timing & Leniency</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">Configure global grace periods and shift start targets</p>
            </div>

          <form onSubmit={handleSaveConfig} className="space-y-5">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Shift Start Time (HH:MM)</label>
              <input 
                type="text" 
                required
                value={config.shift_start_time}
                onChange={(e) => setConfig({ ...config, shift_start_time: e.target.value })}
                placeholder="09:00"
                className="w-full px-4 py-2.5 glass-input rounded-xl text-xs font-mono"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <span>Late Threshold</span>
                <span className="text-[#00A8CC] font-bold font-mono">{config.late_threshold_minutes} min</span>
              </div>
              <input 
                type="range" min="0" max="60"
                value={config.late_threshold_minutes}
                onChange={(e) => setConfig({ ...config, late_threshold_minutes: parseInt(e.target.value) })}
                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#00A8CC]"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <span>Grace Period Buffer</span>
                <span className="text-[#00A8CC] font-bold font-mono">{config.grace_period_minutes} min</span>
              </div>
              <input 
                type="range" min="0" max="30"
                value={config.grace_period_minutes}
                onChange={(e) => setConfig({ ...config, grace_period_minutes: parseInt(e.target.value) })}
                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#00A8CC]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#00A8CC] hover:bg-[#00819D] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#00A8CC]/10 transition-all duration-200"
            >
              Update Config
            </button>
          </form>
        </div>

        {/* Geofence Rule list */}
        <div className="glass-panel rounded-3xl border border-slate-200 p-6 shadow-glass space-y-6">
          <div>
            <h3 className="text-sm font-black text-slate-800 flex items-center space-x-2 uppercase tracking-wide">
              <MapPin size={16} className="text-primary-500" />
              <span>Workspace Geofencing</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">Register valid check-in geolocation fences for mobile staff</p>
          </div>

          <form onSubmit={handleAddGeofence} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <input 
                  type="text" required placeholder="Fence Name (e.g. Headquarters)"
                  value={fenceName} onChange={(e) => setFenceName(e.target.value)}
                  className="w-full px-4 py-2 glass-input rounded-xl text-xs"
                />
              </div>
              <div>
                <input 
                  type="text" required placeholder="Latitude (e.g. 37.7749)"
                  value={latitude} onChange={(e) => setLatitude(e.target.value)}
                  className="w-full px-4 py-2 glass-input rounded-xl text-xs font-mono"
                />
              </div>
              <div>
                <input 
                  type="text" required placeholder="Longitude (e.g. -122.41)"
                  value={longitude} onChange={(e) => setLongitude(e.target.value)}
                  className="w-full px-4 py-2 glass-input rounded-xl text-xs font-mono"
                />
              </div>
              <div className="col-span-2">
                <input 
                  type="number" required placeholder="Radius in Meters (e.g. 150)"
                  value={radius} onChange={(e) => setRadius(e.target.value)}
                  className="w-full px-4 py-2 glass-input rounded-xl text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-[#00A8CC] hover:bg-[#00819D] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200"
            >
              Add Geofence Boundary
            </button>
          </form>

          {/* Boundaries List */}
          <div className="space-y-2 max-h-40 overflow-y-auto">
            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Boundaries</h5>
            {geofences.length > 0 ? (
              geofences.map((fence) => (
                <div key={fence.id} className="p-2.5 bg-[#f8fafc] border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-800">{fence.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Lat: {fence.latitude.toFixed(4)}, Lon: {fence.longitude.toFixed(4)} ({fence.radius_meters}m)
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteGeofence(fence.id)}
                    className="p-1.5 bg-danger/10 hover:bg-danger/25 border border-danger/15 text-danger rounded-lg transition-all duration-200"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-400 font-medium py-4 text-center">No active geofences configured.</div>
            )}
          </div>
        </div>
      </div>
    )}
  </div>
);
};

// Profile Avatar Card Component
const ProfileAvatarCard: React.FC<{ onProfileUpdated: () => void }> = ({ onProfileUpdated }) => {
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const saved = localStorage.getItem('smart_attendance_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar_url || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error' | null; text: string }>({ type: null, text: '' });

  const avatarPresets = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150'
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setMsg({ type: 'error', text: 'Image size should be less than 2MB' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ type: null, text: '' });

    try {
      const response = await api.put('/api/v1/users/me/profile', { avatar_url: avatarUrl });
      const updatedUser = response.data;
      localStorage.setItem('smart_attendance_user', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
      setMsg({ type: 'success', text: 'Profile picture updated successfully!' });
      window.dispatchEvent(new Event('storage'));
      onProfileUpdated();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to update profile picture.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-panel rounded-3xl border border-slate-200 p-6 shadow-glass space-y-6">
      <div>
        <h3 className="text-sm font-black text-slate-800 flex items-center space-x-2 uppercase tracking-wide">
          <Award size={16} className="text-[#00A8CC]" />
          <span>My Profile Picture Customization</span>
        </h3>
        <p className="text-xs text-slate-400 mt-1">Customize your employee avatar with presets or upload your own profile image</p>
      </div>

      {msg.text && (
        <div className={`p-3 rounded-xl text-xs font-semibold ${msg.type === 'success' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSaveProfile} className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
          {/* Avatar Preview */}
          <div className="relative group">
            <img 
              src={avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'} 
              alt="Profile Avatar Preview"
              className="w-24 h-24 rounded-2xl object-cover border-2 border-[#00A8CC]/30 shadow-md transition-all duration-200" 
            />
          </div>

          {/* Upload input and presets */}
          <div className="flex-1 space-y-4 w-full">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
                Upload Custom Photo
              </label>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleFileUpload}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#00A8CC]/10 file:text-[#00A8CC] hover:file:bg-[#00A8CC]/20 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                Or Select Avatar Preset
              </label>
              <div className="flex flex-wrap gap-2">
                {avatarPresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAvatarUrl(preset)}
                    className={`w-10 h-10 rounded-xl overflow-hidden border-2 transition-all duration-150 ${
                      avatarUrl === preset ? 'border-[#00A8CC] scale-105 shadow-md' : 'border-transparent hover:border-slate-300'
                    }`}
                  >
                    <img src={preset} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-[#00A8CC] hover:bg-[#00819D] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#00A8CC]/15 transition-all duration-200 disabled:opacity-50"
        >
          {saving ? 'Saving Profile...' : 'Save Profile Picture'}
        </button>
      </form>
    </div>
  );
};

export default Settings;
