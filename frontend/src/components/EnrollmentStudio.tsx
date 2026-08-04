import React, { useRef, useState, useEffect } from 'react';
import { Camera, CheckCircle2, ChevronRight, UserPlus2, RefreshCw } from 'lucide-react';
import api from '../services/api';

interface EnrollmentStudioProps {
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const EnrollmentStudio: React.FC<EnrollmentStudioProps> = ({ 
  userId, 
  onSuccess, 
  onCancel 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [samples, setSamples] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const steps = [
    { label: 'Look Straight (Center)', instruction: 'Keep your head level and look directly at the center box.' },
    { label: 'Turn Head Left', instruction: 'Turn your head slightly to the left to capture side features.' },
    { label: 'Turn Head Right', instruction: 'Turn your head slightly to the right.' },
    { label: 'Tilt Head Down', instruction: 'Tilt your chin down slightly.' },
    { label: 'Smile / Expression', instruction: 'Provide a natural smile to record expression variance.' }
  ];

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
      setError('Could not access webcam. Please check permissions.');
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

  const captureSample = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = 300;
        canvas.height = 300;
        
        const size = Math.min(video.videoWidth, video.videoHeight);
        const xOffset = (video.videoWidth - size) / 2;
        const yOffset = (video.videoHeight - size) / 2;
        
        context.drawImage(
          video, 
          xOffset, yOffset, size, size, 
          0, 0, 300, 300
        );
        
        const frameData = canvas.toDataURL('image/jpeg', 0.9);
        const newSamples = [...samples, frameData];
        setSamples(newSamples);
        
        if (step < steps.length - 1) {
          setStep(step + 1);
        } else {
          submitEnrollment(newSamples);
        }
      }
    }
  };

  const submitEnrollment = async (imgSamples: string[]) => {
    setLoading(true);
    setError(null);
    try {
      await api.post('/api/v1/users/enroll', {
        user_id: userId,
        images: imgSamples
      });
      stopCamera();
      onSuccess();
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.detail || "Enrollment failed. Please repeat the sequence.";
      setError(msg);
      setStep(0);
      setSamples([]);
    } finally {
      setLoading(false);
    }
  };

  const resetStudio = () => {
    setStep(0);
    setSamples([]);
    setError(null);
    startCamera();
  };

  return (
    <div className="space-y-6 bg-white p-2">
      <div className="flex justify-between items-center pb-4 border-b border-slate-200">
        <div>
          <h3 className="text-sm font-black text-slate-800 flex items-center space-x-2 uppercase tracking-wide">
            <UserPlus2 size={16} className="text-primary-500" />
            <span>Biometric Registration Studio</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">Registering profile: <strong className="text-slate-650">{userId}</strong></p>
        </div>
        <button 
          onClick={onCancel}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-250 border border-slate-200 rounded-lg text-xs text-slate-650 font-bold"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="p-4 bg-danger/10 text-danger border border-danger/25 rounded-xl text-xs font-semibold leading-relaxed flex items-center justify-between">
          <span>{error}</span>
          <button 
            onClick={resetStudio}
            className="flex items-center space-x-1.5 px-3 py-1 bg-danger/20 hover:bg-danger/30 rounded-lg text-[10px] text-danger border border-danger/30"
          >
            <RefreshCw size={10} />
            <span>Restart</span>
          </button>
        </div>
      )}

      {/* Capture Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="relative aspect-square max-w-sm mx-auto w-full bg-slate-50 rounded-3xl border border-slate-200 overflow-hidden flex items-center justify-center">
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
                <div className="w-56 h-56 border-2 border-primary-500/40 rounded-full relative">
                  <div className="absolute inset-0 border border-dashed border-primary-500/20 rounded-full animate-spin"></div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-slate-400 text-xs font-semibold">Webcam inactive...</div>
          )}
        </div>

        {/* Guidance and Progress */}
        <div className="flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <span className="text-[10px] font-bold px-2 py-1 bg-primary-500/10 text-primary-500 border border-primary-500/20 rounded-full tracking-widest uppercase">
              Capture Stage {step + 1} of {steps.length}
            </span>
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">{steps[step].label}</h4>
            <p className="text-xs text-slate-550 leading-relaxed">{steps[step].instruction}</p>
          </div>

          {/* Stepper display indicators */}
          <div className="grid grid-cols-5 gap-2.5">
            {steps.map((_, index) => (
              <div key={index} className="flex flex-col items-center space-y-1">
                <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                  index < step 
                    ? 'bg-success/10 border-success/30 text-success' 
                    : index === step 
                    ? 'bg-primary-500/10 border-primary-500 text-[#00A8CC] ring-2 ring-primary-500/20 shadow-[0_0_10px_rgba(0,168,204,0.15)]' 
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}>
                  {index < step ? <CheckCircle2 size={14} /> : index + 1}
                </div>
                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter truncate w-full text-center">
                  {index === 0 ? 'Straight' : index === 1 ? 'Left' : index === 2 ? 'Right' : index === 3 ? 'Down' : 'Smile'}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={captureSample}
            disabled={loading || !stream}
            className="w-full py-3.5 bg-[#00A8CC] hover:bg-[#00819D] text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-[#00A8CC]/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {loading ? (
              <>
                <RefreshCw className="animate-spin" size={16} />
                <span>Processing Vectors...</span>
              </>
            ) : (
              <>
                <Camera size={16} />
                <span>Capture Sample {step + 1}</span>
                <ChevronRight size={14} />
              </>
            )}
          </button>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
export default EnrollmentStudio;
