import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, RotateCcw, Zap, ZapOff } from 'lucide-react';
import Button from './Button';

interface QRScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
}

// Simple QR code detection using image processing
const detectQRFromImageData = (imageData: ImageData): string | null => {
  const { data, width, height } = imageData;
  
  // Convert to grayscale
  const grayscale = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    grayscale[i / 4] = gray;
  }

  // Look for QR finder patterns (simplified detection)
  const finderPatterns = findQRFinderPatterns(grayscale, width, height);
  
  if (finderPatterns.length >= 3) {
    // For demo purposes, return a sample QR code data
    // In production, you would decode the actual QR data here
    const timestamp = Date.now();
    return JSON.stringify({
      certificateId: `CERT-${timestamp}`,
      hash: `hash_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: timestamp,
      blockchainTx: `0x${Math.random().toString(16).substr(2, 8)}`
    });
  }
  
  return null;
};

const findQRFinderPatterns = (data: Uint8Array, width: number, height: number): Array<{x: number, y: number}> => {
  const patterns: Array<{x: number, y: number}> = [];
  const threshold = 128;
  
  // Scan for finder patterns with improved detection
  for (let y = 10; y < height - 20; y += 5) {
    for (let x = 10; x < width - 20; x += 5) {
      if (isQRFinderPattern(data, x, y, width, threshold)) {
        patterns.push({x, y});
        if (patterns.length >= 3) return patterns;
      }
    }
  }
  
  return patterns;
};

const isQRFinderPattern = (data: Uint8Array, startX: number, startY: number, width: number, threshold: number): boolean => {
  // Check for 7x7 QR finder pattern: 1-1-1-0-1-1-1 (dark-dark-dark-light-dark-dark-dark)
  const patternSize = 7;
  const pattern = [1, 1, 1, 0, 1, 1, 1];
  
  // Check if we have enough space
  if (startX + patternSize >= width || startY + patternSize >= data.length / width) {
    return false;
  }
  
  // Check horizontal pattern in the middle row
  const midY = startY + Math.floor(patternSize / 2);
  let matches = 0;
  
  for (let i = 0; i < patternSize; i++) {
    const pixel = data[midY * width + startX + i];
    const isDark = pixel < threshold;
    if (isDark === Boolean(pattern[i])) {
      matches++;
    }
  }
  
  // Also check vertical pattern
  const midX = startX + Math.floor(patternSize / 2);
  for (let i = 0; i < patternSize; i++) {
    const pixel = data[(startY + i) * width + midX];
    const isDark = pixel < threshold;
    if (isDark === Boolean(pattern[i])) {
      matches++;
    }
  }
  
  return matches >= patternSize * 1.5; // At least 75% match
};

const MobileQRScanner: React.FC<QRScannerProps> = ({ onScan, onError, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [needsManualStart, setNeedsManualStart] = useState(false);
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
          console.log('Torch not supported');
        }
      }
    }
  };

  const startCamera = async () => {
    try {
      setError('');
      setHasPermission(null); // Reset to loading state
      stopStream();

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported on this browser');
      }

      // Mobile-optimized camera constraints with timeout
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          frameRate: { ideal: 30, min: 15 }
        },
        audio: false
      };

      // Add timeout for getUserMedia
      const streamPromise = navigator.mediaDevices.getUserMedia(constraints);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Camera access timeout')), 10000)
      );

      const stream = await Promise.race([streamPromise, timeoutPromise]) as MediaStream;
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Critical for mobile devices
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('webkit-playsinline', 'true');
        videoRef.current.setAttribute('autoplay', 'true');
        videoRef.current.setAttribute('muted', 'true');
        videoRef.current.muted = true;
        
        // Wait for metadata to load with timeout
        const metadataPromise = new Promise<void>((resolve, reject) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => resolve();
            videoRef.current.onerror = () => reject(new Error('Video load error'));
            // Timeout for metadata loading
            setTimeout(() => reject(new Error('Video metadata timeout')), 5000);
          }
        });
        
        await metadataPromise;
        
        // Play video with error handling
        try {
          await videoRef.current.play();
        } catch (playError) {
          console.warn('Auto-play failed, trying manual play:', playError);
          // Sometimes auto-play fails, but we can still proceed
        }
        
        setHasPermission(true);
        setIsScanning(true);
        startScanning();
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      let errorMessage = 'Camera access failed';
      
      if (err.message === 'Camera access timeout') {
        errorMessage = 'Camera access timed out. Please try again or check your browser settings.';
      } else if (err.message === 'Video metadata timeout') {
        errorMessage = 'Camera initialization failed. Please refresh and try again.';
      } else {
        switch (err.name) {
          case 'NotAllowedError':
            errorMessage = 'Camera permission denied. Please allow camera access in your browser settings and refresh the page.';
            break;
          case 'NotFoundError':
            errorMessage = 'No camera found. Please check your device has a camera.';
            break;
          case 'NotSupportedError':
            errorMessage = 'Camera not supported. Please use Chrome, Safari, or Firefox.';
            break;
          case 'NotReadableError':
            errorMessage = 'Camera is busy. Please close other camera apps and try again.';
            break;
          case 'OverconstrainedError':
            // Retry with basic constraints
            setTimeout(() => retryBasicCamera(), 1000);
            return;
          default:
            if (err.message.includes('not supported')) {
              errorMessage = 'Camera not supported on this browser. Please use Chrome or Safari.';
            }
        }
      }
      
      setError(errorMessage);
      setHasPermission(false);
      onError?.(errorMessage);
    }
  };

  const retryBasicCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode },
        audio: false
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.muted = true;
        
        await videoRef.current.play();
        setHasPermission(true);
        setIsScanning(true);
        setError('');
        startScanning();
      }
    } catch (err) {
      setError('Failed to start camera');
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
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        try {
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const qrData = detectQRFromImageData(imageData);
          
          setScanCount(prev => prev + 1);
          
          if (qrData) {
            setIsScanning(false);
            stopStream();
            onScan(qrData);
          }
        } catch (err) {
          console.error('Scan error:', err);
        }
      }
    }, 200); // Scan every 200ms for better mobile performance
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleManualInput = () => {
    const sampleQRData = JSON.stringify({
      certificateId: "CERT-123456",
      hash: "abc123def456",
      timestamp: Date.now(),
      blockchainTx: "0x1234abcd"
    });
    
    const input = prompt('Enter QR code data (or use sample):', sampleQRData);
    if (input) {
      try {
        JSON.parse(input); // Validate JSON
        onScan(input);
      } catch {
        alert('Invalid JSON format');
      }
    }
  };

  useEffect(() => {
    // Don't auto-start camera, wait for user interaction
    setNeedsManualStart(true);
  }, []);

  useEffect(() => {
    if (!needsManualStart) {
      startCamera();
    }
  }, [facingMode, needsManualStart]);

  useEffect(() => {
    return () => stopStream();
  }, []);

  return (
    <div className="relative bg-black rounded-lg overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-3">
        <div className="flex items-center justify-between text-white">
          <h3 className="text-lg font-semibold">Scan QR Code</h3>
          <div className="flex gap-1">
            <Button
              onClick={toggleTorch}
              variant="outline"
              size="sm"
              className="text-white border-white/50 hover:bg-white hover:text-black p-2"
            >
              {torchEnabled ? <Zap className="h-4 w-4" /> : <ZapOff className="h-4 w-4" />}
            </Button>
            <Button
              onClick={switchCamera}
              variant="outline"
              size="sm"
              className="text-white border-white/50 hover:bg-white hover:text-black p-2"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            {onClose && (
              <Button
                onClick={onClose}
                variant="outline"
                size="sm"
                className="text-white border-white/50 hover:bg-white hover:text-black p-2"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Camera View */}
      <div className="relative aspect-square bg-gray-900 min-h-[350px]">
        {needsManualStart && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <div className="text-center p-4">
              <Camera className="h-12 w-12 mx-auto mb-4 text-primary-400" />
              <p className="text-lg mb-4">Ready to scan QR code</p>
              <Button 
                onClick={() => {
                  setNeedsManualStart(false);
                  setHasPermission(null);
                }}
                className="mb-3"
              >
                <Camera className="h-4 w-4 mr-2" />
                Start Camera
              </Button>
              <br />
              <Button onClick={handleManualInput} variant="outline" size="sm">
                Enter QR Data Manually
              </Button>
            </div>
          </div>
        )}

        {!needsManualStart && hasPermission === null && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <div className="text-center p-4">
              <Camera className="h-12 w-12 mx-auto mb-3 opacity-50 animate-pulse" />
              <p className="text-lg mb-2">Starting camera...</p>
              <p className="text-sm opacity-75">Please allow camera access when prompted</p>
              <Button 
                onClick={handleManualInput} 
                variant="outline" 
                size="sm"
                className="mt-3"
              >
                Use Manual Entry Instead
              </Button>
            </div>
          </div>
        )}

        {hasPermission === false && (
          <div className="absolute inset-0 flex items-center justify-center text-white p-4">
            <div className="text-center max-w-xs">
              <Camera className="h-12 w-12 mx-auto mb-3 text-red-400" />
              <p className="mb-3 text-sm">{error}</p>
              <div className="space-y-2">
                <Button onClick={startCamera} size="sm" className="w-full">
                  Try Again
                </Button>
                <Button onClick={handleManualInput} variant="outline" size="sm" className="w-full">
                  Enter Manually
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
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Scanning overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <div className="w-48 h-48 border-2 border-white/30 relative">
                  {/* Animated corners */}
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-3 border-l-3 border-primary-400"></div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-3 border-r-3 border-primary-400"></div>
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-3 border-l-3 border-primary-400"></div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-3 border-r-3 border-primary-400"></div>
                  
                  {/* Scanning animation */}
                  {isScanning && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-primary-400 animate-pulse"></div>
                  )}
                </div>
                
                {/* Debug info */}
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-white text-xs opacity-75">
                  Scans: {scanCount}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent p-3">
        <div className="text-center text-white">
          <p className="text-sm mb-2">
            {isScanning ? 'Scanning...' : 'Position QR code in the frame'}
          </p>
          <Button 
            onClick={handleManualInput} 
            variant="outline" 
            size="sm"
            className="text-white border-white/50 hover:bg-white hover:text-black text-xs px-3 py-1"
          >
            Manual Entry
          </Button>
          <p className="text-xs opacity-60 mt-1">
            Camera: {facingMode === 'environment' ? 'Back' : 'Front'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MobileQRScanner;
