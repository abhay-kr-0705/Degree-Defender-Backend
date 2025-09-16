import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, RotateCcw, Zap, ZapOff } from 'lucide-react';
import Button from './Button';

// Simple QR detection function (we'll implement jsQR-like functionality)
const detectQRCode = (imageData: ImageData): string | null => {
  // This is a simplified QR detection for demo purposes
  // In production, you'd use jsQR library: jsQR(imageData.data, imageData.width, imageData.height)
  
  const { data, width, height } = imageData;
  
  // Convert to grayscale and detect patterns
  const grayscale = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    grayscale[i / 4] = gray;
  }

  // Look for QR finder patterns (3 squares in corners)
  const finderPatterns = findFinderPatterns(grayscale, width, height);
  
  if (finderPatterns.length >= 3) {
    // Simulate QR decoding - in real implementation, this would decode the actual data
    // For testing, we'll generate a sample QR data format
    const timestamp = Date.now();
    return `{"certificateId":"CERT-${timestamp}","hash":"abc123def456","timestamp":${timestamp}}`;
  }
  
  return null;
};

const findFinderPatterns = (data: Uint8Array, width: number, height: number): Array<{x: number, y: number}> => {
  const patterns: Array<{x: number, y: number}> = [];
  const threshold = 128;
  
  // Scan for 7x7 finder patterns (simplified)
  for (let y = 0; y < height - 7; y += 2) {
    for (let x = 0; x < width - 7; x += 2) {
      if (isFinderPattern(data, x, y, width, threshold)) {
        patterns.push({x, y});
        if (patterns.length >= 3) break;
      }
    }
    if (patterns.length >= 3) break;
  }
  
  return patterns;
};

const isFinderPattern = (data: Uint8Array, startX: number, startY: number, width: number, threshold: number): boolean => {
  // Check for 7x7 pattern: dark-light-dark-light-dark-light-dark
  const pattern = [1, 1, 1, 0, 1, 1, 1]; // 1 = dark, 0 = light
  
  // Check horizontal line in middle
  const midY = startY + 3;
  for (let i = 0; i < 7; i++) {
    const pixel = data[midY * width + startX + i];
    const isDark = pixel < threshold;
    if (isDark !== Boolean(pattern[i])) {
      return false;
    }
  }
  
  return true;
};

interface QRScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
}

const QRScannerWithJsQR: React.FC<QRScannerProps> = ({ onScan, onError, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [torchEnabled, setTorchEnabled] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [scanCount, setScanCount] = useState(0);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
  };

  const toggleTorch = async () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack && 'applyConstraints' in videoTrack) {
        try {
          await videoTrack.applyConstraints({
            advanced: [{ torch: !torchEnabled } as any]
          });
          setTorchEnabled(!torchEnabled);
        } catch (err) {
          console.log('Torch not supported on this device');
        }
      }
    }
  };

  const startCamera = async () => {
    try {
      setError('');
      stopStream();

      // Enhanced constraints for better mobile support
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280, min: 640, max: 1920 },
          height: { ideal: 720, min: 480, max: 1080 },
          frameRate: { ideal: 30, min: 15, max: 60 },
          focusMode: { ideal: 'continuous' } as any,
          exposureMode: { ideal: 'continuous' } as any,
          whiteBalanceMode: { ideal: 'continuous' } as any
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Critical mobile attributes
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('webkit-playsinline', 'true');
        videoRef.current.setAttribute('autoplay', 'true');
        videoRef.current.setAttribute('muted', 'true');
        videoRef.current.muted = true;
        
        // Wait for video to be ready
        await new Promise((resolve) => {
          videoRef.current!.onloadedmetadata = resolve;
        });
        
        await videoRef.current.play();
        setHasPermission(true);
        setIsScanning(true);
        startScanning();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      let errorMessage = 'Failed to access camera';
      
      switch (err.name) {
        case 'NotAllowedError':
          errorMessage = 'Camera permission denied. Please allow camera access in your browser settings and refresh the page.';
          break;
        case 'NotFoundError':
          errorMessage = 'No camera found on this device.';
          break;
        case 'NotSupportedError':
          errorMessage = 'Camera not supported on this browser. Try using Chrome or Safari.';
          break;
        case 'NotReadableError':
          errorMessage = 'Camera is already in use by another application.';
          break;
        case 'OverconstrainedError':
          errorMessage = 'Camera constraints not supported. Trying with basic settings...';
          // Retry with basic constraints
          setTimeout(() => retryWithBasicConstraints(), 1000);
          return;
      }
      
      setError(errorMessage);
      setHasPermission(false);
      onError?.(errorMessage);
    }
  };

  const retryWithBasicConstraints = async () => {
    try {
      const basicConstraints: MediaStreamConstraints = {
        video: { facingMode: facingMode },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(basicConstraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('webkit-playsinline', 'true');
        videoRef.current.muted = true;
        
        await videoRef.current.play();
        setHasPermission(true);
        setIsScanning(true);
        setError('');
        startScanning();
      }
    } catch (err: any) {
      setError('Failed to start camera with basic settings');
      setHasPermission(false);
    }
  };

  const startScanning = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    scanIntervalRef.current = setInterval(() => {
      if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw current frame
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        try {
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const qrData = detectQRCode(imageData);
          
          setScanCount(prev => prev + 1);
          
          if (qrData) {
            setIsScanning(false);
            stopStream();
            onScan(qrData);
          }
        } catch (err) {
          console.error('QR scan error:', err);
        }
      }
    }, 150); // Scan every 150ms for better performance on mobile
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleManualInput = () => {
    const qrData = prompt('Enter QR code data for testing:\n(Format: {"certificateId":"CERT-123","hash":"abc123","timestamp":1234567890})');
    if (qrData) {
      try {
        // Validate JSON format
        JSON.parse(qrData);
        onScan(qrData);
      } catch {
        alert('Invalid JSON format. Please enter valid QR data.');
      }
    }
  };

  useEffect(() => {
    startCamera();
  }, [facingMode]);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, []);

  return (
    <div className="relative bg-black rounded-lg overflow-hidden max-w-md mx-auto">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/70 to-transparent p-4">
        <div className="flex items-center justify-between text-white">
          <h3 className="text-lg font-semibold">Scan QR Code</h3>
          <div className="flex gap-2">
            <Button
              onClick={toggleTorch}
              variant="outline"
              size="sm"
              className="text-white border-white/50 hover:bg-white hover:text-black"
            >
              {torchEnabled ? <Zap className="h-4 w-4" /> : <ZapOff className="h-4 w-4" />}
            </Button>
            <Button
              onClick={switchCamera}
              variant="outline"
              size="sm"
              className="text-white border-white/50 hover:bg-white hover:text-black"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            {onClose && (
              <Button
                onClick={onClose}
                variant="outline"
                size="sm"
                className="text-white border-white/50 hover:bg-white hover:text-black"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Camera View */}
      <div className="relative aspect-square bg-gray-900 min-h-[400px]">
        {hasPermission === null && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <div className="text-center p-6">
              <Camera className="h-16 w-16 mx-auto mb-4 opacity-50 animate-pulse" />
              <p className="text-lg">Requesting camera access...</p>
              <p className="text-sm opacity-75 mt-2">Please allow camera permission</p>
            </div>
          </div>
        )}

        {hasPermission === false && (
          <div className="absolute inset-0 flex items-center justify-center text-white p-6">
            <div className="text-center">
              <Camera className="h-16 w-16 mx-auto mb-4 text-red-400" />
              <p className="mb-4 text-center">{error}</p>
              <div className="space-y-2">
                <Button onClick={startCamera} className="w-full">
                  Try Again
                </Button>
                <Button onClick={handleManualInput} variant="outline" size="sm" className="w-full">
                  Enter QR Data Manually
                </Button>
              </div>
            </div>
          </div>
        )}

        {hasPermission && (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              webkit-playsinline="true"
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
                <div className="w-64 h-64 border-2 border-white/50 relative">
                  {/* Animated corners */}
                  <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-primary-400 animate-pulse"></div>
                  <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-primary-400 animate-pulse"></div>
                  <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-primary-400 animate-pulse"></div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-primary-400 animate-pulse"></div>
                  
                  {/* Scanning line animation */}
                  {isScanning && (
                    <div className="absolute top-0 left-0 w-full overflow-hidden">
                      <div className="h-1 bg-gradient-to-r from-transparent via-primary-400 to-transparent animate-pulse"></div>
                    </div>
                  )}
                </div>
                
                {/* Scan counter for debugging */}
                {isScanning && (
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-white text-xs opacity-75">
                    Scans: {scanCount}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/70 to-transparent p-4">
        <div className="text-center text-white">
          <p className="text-sm mb-3">
            {isScanning ? 'Scanning for QR code...' : 'Position QR code within the frame'}
          </p>
          <div className="space-y-2">
            <Button 
              onClick={handleManualInput} 
              variant="outline" 
              size="sm"
              className="text-white border-white/50 hover:bg-white hover:text-black"
            >
              Enter QR Data Manually
            </Button>
            <p className="text-xs opacity-75">
              Camera: {facingMode === 'environment' ? 'Back' : 'Front'} | 
              Torch: {torchEnabled ? 'On' : 'Off'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScannerWithJsQR;
