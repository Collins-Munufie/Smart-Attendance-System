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
    </div>
  );
};
export default Settings;
