import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  SwitchCamera, 
  RotateCcw, 
  Check, 
  X, 
  AlertCircle, 
  Upload, 
  Smartphone 
} from 'lucide-react';
import './CameraModal.css';

export interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string, label?: string) => void;
  title?: string;
  initialLabel?: string;
}

const INSPECTION_QUICK_TAGS = [
  '🚗 Frontal',
  '🚙 Trasera',
  '🚘 Lateral Izquierdo',
  '🚘 Lateral Derecho',
  '⚙️ Motor / Bahía',
  '🛞 Neumático / Rin',
  '📏 Odómetro / Tablero',
  '⚠️ Detalle / Daño',
  '🪟 Parabrisas / Vidrios',
  '🧰 Maleta / Pertenencias'
];

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  title = 'Cámara de Inspección en Vivo',
  initialLabel = ''
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>(initialLabel);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [hasMultipleCameras, setHasMultipleCameras] = useState<boolean>(true);

  // Stop current stream helper
  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  // Start video stream
  const startCamera = async (mode: 'environment' | 'user') => {
    stopStream();
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Tu navegador o dispositivo no soporta acceso directo a cámara web. Puedes usar la cámara nativa a continuación.');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Check available devices to see if camera switch is possible
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoInputs.length > 1);
      } catch {
        setHasMultipleCameras(true);
      }
    } catch (err: any) {
      console.warn('Error accediendo a cámara:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Permiso de cámara denegado. Concede permisos en tu navegador o usa el botón de cámara nativa.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No se encontró ninguna cámara conectada en este equipo.');
      } else {
        setCameraError('No se pudo inicializar la cámara web. Puedes usar la cámara nativa del sistema.');
      }
    }
  };

  // Lifecycle when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCapturedPhoto(null);
      setSelectedTag(initialLabel);
      startCamera(facingMode);
    } else {
      stopStream();
      setCapturedPhoto(null);
    }

    return () => {
      stopStream();
    };
  }, [isOpen]);

  // Flip camera (environment <-> user)
  const handleToggleCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Take snapshot
  const handleTakeSnapshot = () => {
    if (!videoRef.current) return;

    // Flash trigger
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 300);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    
    // Max photo resolution limit for performance
    const MAX_DIM = 1600;
    let w = video.videoWidth || 1280;
    let h = video.videoHeight || 720;

    if (w > MAX_DIM || h > MAX_DIM) {
      if (w > h) {
        h = Math.round((h * MAX_DIM) / w);
        w = MAX_DIM;
      } else {
        w = Math.round((w * MAX_DIM) / h);
        h = MAX_DIM;
      }
    }

    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If front camera, un-mirror or draw normally
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

    setCapturedPhoto(dataUrl);
    stopStream();
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedPhoto(null);
    startCamera(facingMode);
  };

  // Accept and use photo
  const handleConfirmPhoto = () => {
    if (!capturedPhoto) return;
    onCapture(capturedPhoto, selectedTag);
    onClose();
  };

  // Native device camera fallback handler
  const handleNativeCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      setCapturedPhoto(url);
      setCameraError(null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="cam-modal-overlay">
      <div className="cam-modal-container">
        
        {/* Header */}
        <div className="cam-header">
          <div className="cam-header-title">
            <Camera size={20} color="var(--color-primary, #dc2626)" />
            <span>{title}</span>
          </div>
          <button 
            type="button" 
            className="cam-header-close" 
            onClick={onClose}
            title="Cerrar cámara"
          >
            <X size={18} />
          </button>
        </div>

        {/* Viewfinder / Preview */}
        <div className="cam-viewfinder">
          {cameraError ? (
            <div className="cam-error-box">
              <AlertCircle size={44} className="cam-error-icon" />
              <div style={{ fontWeight: 700, fontSize: '15px' }}>Acceso a Cámara no disponible</div>
              <p style={{ fontSize: '13px', color: '#9ca3af', maxWidth: '380px', margin: '0 auto' }}>
                {cameraError}
              </p>

              <div className="cam-fallback-actions">
                <button
                  type="button"
                  className="cam-control-btn"
                  style={{ background: 'var(--color-primary, #dc2626)', justifyContent: 'center' }}
                  onClick={() => nativeCameraInputRef.current?.click()}
                >
                  <Smartphone size={16} />
                  <span>Tomar Foto con Cámara del Móvil</span>
                </button>

                <button
                  type="button"
                  className="cam-control-btn"
                  style={{ justifyContent: 'center' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={16} />
                  <span>Subir desde Galería o Archivo</span>
                </button>
              </div>
            </div>
          ) : capturedPhoto ? (
            <img src={capturedPhoto} alt="Captura" className="cam-preview-img" />
          ) : (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="cam-video" 
              />
              <div className="cam-grid-overlay">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="cam-grid-cell" />
                ))}
              </div>
              <div className="cam-target-crosshair" />
              <div className={`cam-flash ${isFlashing ? 'active' : ''}`} />
            </>
          )}

          {/* Hidden Fallback Inputs */}
          <input
            ref={nativeCameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handleNativeCameraCapture}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleNativeCameraCapture}
          />
        </div>

        {/* Quick Inspection Tags */}
        <div className="cam-labels-bar">
          <div className="cam-labels-title">
            Etiqueta del elemento inspeccionado:
          </div>
          <div className="cam-chips-scroll">
            {INSPECTION_QUICK_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`cam-chip ${selectedTag === tag ? 'active' : ''}`}
                onClick={() => setSelectedTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="cam-controls">
          {capturedPhoto ? (
            <>
              <button
                type="button"
                className="cam-control-btn"
                onClick={handleRetake}
              >
                <RotateCcw size={16} />
                <span>Repetir Foto</span>
              </button>

              <button
                type="button"
                className="cam-control-btn"
                style={{ 
                  background: 'var(--color-primary, #dc2626)', 
                  borderColor: 'var(--color-primary, #dc2626)',
                  padding: '10px 20px'
                }}
                onClick={handleConfirmPhoto}
              >
                <Check size={18} />
                <span>Usar Esta Foto</span>
              </button>
            </>
          ) : !cameraError ? (
            <>
              {hasMultipleCameras && (
                <button
                  type="button"
                  className="cam-control-btn"
                  onClick={handleToggleCamera}
                  title="Cambiar entre cámara trasera y delantera"
                >
                  <SwitchCamera size={18} />
                  <span>Voltear</span>
                </button>
              )}

              {/* Shutter Button */}
              <button
                type="button"
                className="cam-shutter-btn"
                onClick={handleTakeSnapshot}
                title="Tomar fotografía"
              >
                <div className="cam-shutter-inner">
                  <Camera size={26} />
                </div>
              </button>

              {/* Native / Gallery Alternative */}
              <button
                type="button"
                className="cam-control-btn"
                onClick={() => nativeCameraInputRef.current?.click()}
                title="Usar app de cámara del dispositivo"
              >
                <Smartphone size={18} />
                <span>Nativa</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              className="cam-control-btn"
              onClick={onClose}
            >
              <X size={16} />
              <span>Cerrar</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
