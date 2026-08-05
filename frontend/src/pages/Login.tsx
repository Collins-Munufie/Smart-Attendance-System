import React, { useState } from 'react';
import { Lock, User, AlertCircle, ShieldCheck, Building2, ArrowRight } from 'lucide-react';
import api from '../services/api';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [loginMode, setLoginMode] = useState<'password' | 'face'>('password');
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Could not access webcam for biometric login. Please check device permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  React.useEffect(() => {
    if (loginMode === 'face') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [loginMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      params.append('username', employeeId);
      params.append('password', password);

      const response = await api.post('/api/v1/auth/login', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const { access_token } = response.data;
      localStorage.setItem('smart_attendance_token', access_token);

      const userRes = await api.get('/api/v1/users/me');
      localStorage.setItem('smart_attendance_user', JSON.stringify(userRes.data));
      
      onLoginSuccess(userRes.data);
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.detail || "Authentication failed. Please verify credentials.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFaceLogin = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setLoading(true);
    setError(null);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frameData = canvas.toDataURL('image/jpeg', 0.85);

      const response = await api.post('/api/v1/auth/face-login', { image: frameData });
      const { access_token } = response.data;
      localStorage.setItem('smart_attendance_token', access_token);

      const userRes = await api.get('/api/v1/users/me');
      localStorage.setItem('smart_attendance_user', JSON.stringify(userRes.data));

      stopCamera();
      onLoginSuccess(userRes.data);
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.detail || "Biometric face verification failed. Ensure face is clear and registered.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#ffffff]">
      {/* Left Column: Sign-in Form */}
      <div className="flex-1 flex flex-col justify-between p-8 md:p-16 max-w-2xl">
        {/* Brand Header */}
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-[#00A8CC]/10 text-[#00A8CC] rounded-xl border border-[#00A8CC]/30">
            <Building2 size={20} />
          </div>
          <div>
            <h1 className="font-extrabold text-md text-slate-800 tracking-wider leading-none">SmartSAS</h1>
            <span className="text-[9px] text-[#00A8CC] font-bold tracking-widest uppercase">uTest Platform</span>
          </div>
        </div>

        {/* Form Container */}
        <div className="my-auto py-12 max-w-md w-full">
          <div className="space-y-2 mb-6">
            <h2 className="text-2xl font-black text-slate-900 tracking-wide">Sign In</h2>
            <p className="text-xs text-slate-500">Choose your preferred login method</p>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setLoginMode('password')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                loginMode === 'password' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Password Login
            </button>
            <button
              type="button"
              onClick={() => setLoginMode('face')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                loginMode === 'face' ? 'bg-[#00A8CC] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Face ID Login
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-danger/10 text-danger border border-danger/25 rounded-xl text-xs font-semibold leading-relaxed flex items-center space-x-2.5">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {loginMode === 'password' ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                  Employee ID <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    required
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="EMP-1011"
                    className="w-full pl-11 pr-4 py-3 bg-[#ffffff] border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-[#00A8CC] focus:ring-1 focus:ring-[#00A8CC] transition-all duration-200"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                  Password <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-3 bg-[#ffffff] border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-[#00A8CC] focus:ring-1 focus:ring-[#00A8CC] transition-all duration-200"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input id="rememberMe" type="checkbox" className="w-4 h-4 text-[#00A8CC] border-slate-300 rounded focus:ring-[#00A8CC] cursor-pointer" />
                <label htmlFor="rememberMe" className="ml-2 text-xs font-bold text-slate-500 select-none cursor-pointer">
                  Keep me logged in
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 mt-2 bg-[#00A8CC] hover:bg-[#00819D] text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition-all duration-200 shadow-md shadow-[#00A8CC]/10 disabled:opacity-50"
              >
                <span>{loading ? 'Continuing...' : 'Continue'}</span>
                <ArrowRight size={14} />
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-900 border border-slate-300 flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-[#00A8CC] rounded-3xl relative animate-pulse">
                    <div className="absolute inset-0 bg-[#00A8CC]/10 rounded-3xl"></div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleFaceLogin}
                disabled={loading || !stream}
                className="w-full py-3.5 bg-[#00A8CC] hover:bg-[#00819D] text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition-all duration-200 shadow-md disabled:opacity-50"
              >
                <span>{loading ? 'Verifying Face ID...' : 'Scan Face & Sign In'}</span>
                <ArrowRight size={14} />
              </button>
              <canvas ref={canvasRef} className="hidden" />
            </div>
          )}

          {/* Dev credentials seed block */}
          <div className="mt-8 p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-black block">Seed Admin Credentials</span>
            <code className="text-[10px] text-[#00A8CC] font-bold block mt-1">ID: EMP-1011 / Password: admin123</code>
          </div>
        </div>

        {/* Footer info */}
        <footer className="text-[10px] text-slate-400 mt-6 border-t border-slate-100 pt-4 flex flex-wrap gap-x-4 gap-y-1">
          <span>© 2026 SmartSAS - uTest Integration</span>
          <a href="#" className="hover:underline">Terms of Use</a>
          <a href="#" className="hover:underline">Privacy Policy</a>
          <a href="#" className="hover:underline">Help & Support</a>
        </footer>
      </div>

      {/* Right Column: uTest Branding Panel */}
      <div className="hidden md:flex flex-1 bg-gradient-to-br from-[#00A8CC] to-[#4DC2DB] relative flex-col justify-center items-center p-12 text-white overflow-hidden">
        {/* Floating circles */}
        <div className="absolute -top-12 -right-12 w-96 h-96 border border-white/10 rounded-full pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 border border-white/5 rounded-full pointer-events-none"></div>
        
        {/* Circle logo SVG background */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10 scale-[1.3] pointer-events-none">
          <svg width="410" height="399" viewBox="0 0 410 399" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M250 -101C388.071 -101 500 10.9288 500 149C500 287.071 388.071 399 250 399C111.929 399 1.64975e-05 287.071 0 149C0 10.9288 111.929 -101 250 -101ZM310.088 33.6396V179.989C310.088 224.841 288.135 246.88 250.515 246.88C212.894 246.88 190.942 222.861 190.942 178.268V34.501H130.078V181.022C130.078 261.601 175.79 304.645 249.998 304.646C324.206 304.646 372.76 263.495 371.469 178.354V33.6396H310.088Z" fill="white" />
          </svg>
        </div>

        {/* Content Card Mockup */}
        <div className="relative z-10 max-w-sm text-center space-y-6">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl shadow-xl flex flex-col items-center">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-4">
              <ShieldCheck size={26} className="text-white" />
            </div>
            <h3 className="text-lg font-extrabold tracking-wide uppercase">Unified Biometric Gate</h3>
            <p className="text-xs text-white/80 leading-relaxed mt-2 text-center">
              Connecting your corporate roster with face detection, liveness matching, and geofenced operations at scale.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-md font-bold uppercase tracking-wider">Apply for Your Next Opportunity</h4>
            <p className="text-xs text-white/80 leading-relaxed">
              Register profiles, verify biometrics, log gate attendance records and manage geofencing rules inside one integrated portal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Login;
