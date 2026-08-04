import React, { useRef, useState, useEffect } from 'react';
import { Camera, MapPin, ShieldAlert, BadgeCheck, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../services/api';

export const CheckInCamera: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info' | null; message: string }>({ type: null, message: '' });
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsError, setGpsError] = useState(false);
  
  const [useLiveness, setUseLiveness] = useState(false);
  const [challenge, setChallenge] = useState<string | null>(null);
  const [livenessPassed, setLivenessPassed] = useState(false);
  const [challengeStep, setChallengeStep] = useState(0);

  const challengesList = ['blink', 'turn_left', 'turn_right', 'smile'];
  const challengeLabels: Record<string, string> = {
    blink: 'BLINK EYE CONSECUTIVELY',
    turn_left: 'TURN HEAD TO THE LEFT',
    turn_right: 'TURN HEAD TO THE RIGHT',
    smile: 'SMILE DIRECTLY AT CAMERA',
  };

  const playSound = (type: 'success' | 'error') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'success') {
        osc.frequency.setValueAtTime(659.25, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      } else {
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          setGpsError(false);
        },
        (err) => {
          console.error("GPS fetching failed:", err);
          setCoords({ latitude: 37.7749, longitude: -122.4194 });
          setGpsError(true);
        }
      );
    }
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, facingMode: 'user' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setFeedback({ type: 'info', message: 'Camera active. Position your face in the box.' });
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Could not access webcam. Please verify device permissions.' });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  useEffect(() => {
    let intervalId: any;
    
    if (stream && useLiveness && !livenessPassed && challenge) {
      intervalId = setInterval(async () => {
        const frameData = captureFrameBase64();
        if (!frameData) return;

        try {
          const response = await api.post('http://localhost:8001/verify-liveness', {
            image: frameData,
            challenge_type: challenge
          });

          if (response.data.success) {
            playSound('success');
            if (challengeStep < 1) {
              setChallengeStep(1);
              const nextChallenge = challengesList.filter(c => c !== challenge)[Math.floor(Math.random() * 3)];
              setChallenge(nextChallenge);
              setFeedback({ type: 'info', message: `Step 1 Passed! Challenge 2: ${challengeLabels[nextChallenge]}` });
            } else {
              setLivenessPassed(true);
              setChallenge(null);
              setFeedback({ type: 'success', message: 'Biometric liveness verified. Submitting check-in log...' });
              submitFaceCheckIn(frameData);
            }
          }
        } catch (err) {
          console.error("Liveness verification endpoint failure:", err);
        }
      }, 1500);
    }
    
    return () => clearInterval(intervalId);
  }, [stream, useLiveness, livenessPassed, challenge, challengeStep]);

  const initLivenessChallenge = () => {
    setLivenessPassed(false);
    setChallengeStep(0);
    const startChallenge = challengesList[Math.floor(Math.random() * challengesList.length)];
    setChallenge(startChallenge);
    setFeedback({ type: 'info', message: `Liveness Required: ${challengeLabels[startChallenge]}` });
  };

  const captureFrameBase64 = (): string | null => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.85);
      }
    }
    return null;
  };

  const handleAction = () => {
    setFeedback({ type: null, message: '' });
    const frame = captureFrameBase64();
    if (!frame) {
      setFeedback({ type: 'error', message: 'Failed to capture frame. Please ensure camera is loaded.' });
      return;
    }

    if (useLiveness && !livenessPassed) {
      initLivenessChallenge();
    } else {
      submitFaceCheckIn(frame);
    }
  };

  const submitFaceCheckIn = async (frameData: string) => {
    setLoading(true);
    try {
      const response = await api.post('/api/v1/check-in/face', {
        image: frameData,
        latitude: coords?.latitude || 37.7749,
        longitude: coords?.longitude || -122.4194,
        location_name: "HQ Gate Lobby"
      });

      playSound('success');
      setFeedback({ 
        type: 'success', 
        message: `Welcome, ${response.data.name}! Logged ${response.data.status} at ${new Date(response.data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
      });
      
      setLivenessPassed(false);
      setChallenge(null);
      setChallengeStep(0);
    } catch (err: any) {
      playSound('error');
      const errDetail = err.response?.data?.detail || "Network request failed. Try again.";
      setFeedback({ type: 'error', message: errDetail });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Video stream box */}
      <div className="glass-panel rounded-3xl border border-slate-200 p-6 relative overflow-hidden shadow-glass">
        {/* Decorative brackets */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary-500 rounded-tl-2xl"></div>
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary-500 rounded-tr-2xl"></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary-500 rounded-bl-2xl"></div>
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary-500 rounded-br-2xl"></div>

        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-50 border border-slate-200">
          {stream ? (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                className="w-full h-full object-cover scale-x-[-1]" 
              />
              
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`w-64 h-64 border-2 ${challenge ? 'border-warning animate-pulse' : 'border-primary-500/50'} rounded-3xl relative`}>
                  <div className="absolute inset-0 bg-primary-500/5 rounded-3xl"></div>
                  <div className="absolute left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary-500 to-transparent top-0 animate-[scan_2.5s_ease-in-out_infinite]"></div>
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
              <Camera size={48} className="animate-pulse text-slate-350" />
              <p className="text-sm font-semibold">Webcam loading or inactive...</p>
              <button 
                onClick={startCamera}
                className="px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs hover:bg-slate-200 text-slate-700 transition-all duration-200 font-bold"
              >
                Re-initialize Stream
              </button>
            </div>
          )}
          
          {challenge && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-warning/90 backdrop-blur-md rounded-full shadow-lg border border-warning/30 flex items-center space-x-2 text-dark-900 font-extrabold text-xs tracking-wider animate-bounce">
              <AlertCircle size={14} className="text-dark-900" />
              <span>{challengeLabels[challenge]}</span>
            </div>
          )}
        </div>
      </div>

      {/* Control panel and logs */}
      <div className="glass-card rounded-2xl p-5 border border-slate-200 space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500">
            <MapPin size={14} className={gpsError ? "text-danger" : "text-primary-500"} />
            <span>
              {gpsError 
                ? "GPS Access Blocked (Simulating coordinates)" 
                : `GPS: ${coords?.latitude.toFixed(5)}, ${coords?.longitude.toFixed(5)}`}
            </span>
          </div>

          <label className="flex items-center space-x-2 cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={useLiveness}
              onChange={() => {
                setUseLiveness(!useLiveness);
                setLivenessPassed(false);
                setChallenge(null);
              }}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:height-4 after:w-4 after:transition-all peer-checked:bg-primary-500 relative after:h-4 after:w-4"></div>
            <span className="text-xs font-bold text-slate-500">Enable Liveness</span>
          </label>
        </div>

        {feedback.message && (
          <div className={`p-4 rounded-xl flex items-center space-x-3 text-xs border ${
            feedback.type === 'success' 
              ? 'bg-success/10 text-success border-success/20' 
              : feedback.type === 'error'
              ? 'bg-danger/10 text-danger border-danger/20'
              : 'bg-primary-500/10 text-primary-600 border-primary-500/20'
          }`}>
            {feedback.type === 'success' ? (
              <BadgeCheck size={18} />
            ) : feedback.type === 'error' ? (
              <ShieldAlert size={18} />
            ) : (
              <RefreshCw size={18} className="animate-spin" />
            )}
            <span className="font-semibold leading-relaxed">{feedback.message}</span>
          </div>
        )}

        <button
          onClick={handleAction}
          disabled={loading || !stream}
          className="w-full py-4 bg-[#00A8CC] hover:bg-[#00819D] text-white rounded-xl font-bold shadow-lg shadow-[#00A8CC]/15 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 uppercase tracking-widest text-xs"
        >
          {loading ? 'Processing Verification...' : challenge ? 'Awaiting Liveness movement...' : 'Verify Biometrics & Check In'}
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
export default CheckInCamera;
