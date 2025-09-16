import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, RotateCcw } from 'lucide-react';
import Button from './Button';

interface QRScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, onError, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
  };

  const startCamera = async () => {
    try {
      setError('');
      
      // Stop any existing stream
      stopStream();

      // Request camera permission with mobile-optimized constraints
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // Important for iOS
        videoRef.current.setAttribute('webkit-playsinline', 'true'); // Important for older iOS
        videoRef.current.muted = true;
        
        await videoRef.current.play();
        setHasPermission(true);
        setIsScanning(true);
        startScanning();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      let errorMessage = 'Failed to access camera';
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access and try again.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device.';
      } else if (err.name === 'NotSupportedError') {
        errorMessage = 'Camera not supported on this device.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Camera is already in use by another application.';
      }
      
      setError(errorMessage);
      setHasPermission(false);
      onError?.(errorMessage);
    }
  };

  const startScanning = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    scanIntervalRef.current = setInterval(() => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        try {
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const qrData = scanQRCode(imageData);
          
          if (qrData) {
            setIsScanning(false);
            stopStream();
            onScan(qrData);
          }
        } catch (err) {
          console.error('QR scan error:', err);
        }
      }
    }, 100); // Scan every 100ms
  };

  // Simple QR code detection using basic pattern recognition
  const scanQRCode = (imageData: ImageData): string | null => {
    // This is a simplified QR detection - in production you'd use a proper QR library
    // For now, we'll implement a basic pattern detection
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // Convert to grayscale and look for QR patterns
    const grayscale = new Uint8Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      grayscale[i / 4] = gray;
    }

    // Look for QR code finder patterns (simplified detection)
    // This is a basic implementation - you might want to use a proper QR library
    return detectQRPattern(grayscale, width, height);
  };

  const detectQRPattern = (data: Uint8Array, width: number, height: number): string | null => {
    // Simplified QR pattern detection
    // In a real implementation, you'd use libraries like jsQR or @zxing/library
    
    // For demo purposes, let's simulate QR detection with a simple text input
    // This should be replaced with actual QR decoding logic
    
    // Check if there are enough dark/light transitions that might indicate a QR code
    let transitions = 0;
    const threshold = 128;
    
    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width - 1; x++) {
        const current = data[y * width + x];
        const next = data[y * width + x + 1];
        if ((current < threshold && next >= threshold) || (current >= threshold && next < threshold)) {
          transitions++;
        }
      }
    }
    
    // If we detect enough transitions, prompt for QR data (temporary solution)
    if (transitions > width * height * 0.1) {
      // In a real implementation, this would decode the actual QR code
      // For now, we'll return null to continue scanning
      return null;
    }
    
    return null;
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  useEffect(() => {
    if (facingMode) {
      startCamera();
    }
  }, [facingMode]);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, []);

  const handleManualInput = () => {
    const qrData = prompt('Enter QR code data manually (for testing):');
    if (qrData) {
      onScan(qrData);
    }
  };

  return (
    <div className="relative bg-black rounded-lg overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-black bg-opacity-50 p-4">
        <div className="flex items-center justify-between text-white">
          <h3 className="text-lg font-semibold">Scan QR Code</h3>
          <div className="flex gap-2">
            <Button
              onClick={switchCamera}
              variant="outline"
              size="sm"
              className="text-white border-white hover:bg-white hover:text-black"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            {onClose && (
              <Button
                onClick={onClose}
                variant="outline"
                size="sm"
                className="text-white border-white hover:bg-white hover:text-black"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Camera View */}
      <div className="relative aspect-video bg-gray-900">
        {hasPermission === null && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <div className="text-center">
              <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Requesting camera access...</p>
            </div>
          </div>
        )}

        {hasPermission === false && (
          <div className="absolute inset-0 flex items-center justify-center text-white p-6">
            <div className="text-center">
              <Camera className="h-12 w-12 mx-auto mb-4 text-red-400" />
              <p className="mb-4">{error}</p>
              <Button onClick={startCamera} className="mb-2">
                Try Again
              </Button>
              <br />
              <Button onClick={handleManualInput} variant="outline" size="sm">
                Enter Manually
              </Button>
            </div>
          </div>
        )}

        {hasPermission && (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />
            <canvas
              ref={canvasRef}
              className="hidden"
            />
            
            {/* Scanning overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                {/* Scanning frame */}
                <div className="w-64 h-64 border-2 border-white opacity-75 relative">
                  {/* Corner indicators */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary-500"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary-500"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary-500"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary-500"></div>
                  
                  {/* Scanning line animation */}
                  {isScanning && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-primary-500 animate-pulse"></div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-black bg-opacity-50 p-4">
        <div className="text-center text-white">
          <p className="text-sm mb-2">
            {isScanning ? 'Scanning for QR code...' : 'Position QR code within the frame'}
          </p>
          <Button onClick={handleManualInput} variant="outline" size="sm">
            Enter QR Data Manually
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
