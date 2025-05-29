import React, { useEffect, useRef, useState } from 'react';
import type { DrawingData, Line, Point } from '../types';
import { HexColorPicker } from 'react-colorful';
import { Minus, Plus, Circle } from 'lucide-react';
import { captureFrame } from '../services/captureFrame';
import LoadingSpinner from './ui/LoadingSpinner';

interface DrawingCanvasProps {
  containerWidth: number;
  containerHeight: number;
  isVisible: boolean;
  initialDrawing?: DrawingData | null;
  onDrawingChange: (drawingData: DrawingData | null) => void;
  videoInfo?: { videoUrl: string; currentTime: number } | null;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  containerWidth,
  containerHeight,
  isVisible,
  initialDrawing,
  onDrawingChange,
  videoInfo,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentLine, setCurrentLine] = useState<Point[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [strokeColor, setStrokeColor] = useState('#FF3B30');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Set up canvas and load initial drawing if provided
  useEffect(() => {
    if (initialDrawing) {
      setLines(initialDrawing.lines);
      setStrokeWidth(initialDrawing.strokeWidth);
      setStrokeColor(initialDrawing.strokeColor);
    }
  }, []); // Only run once on mount

  // Auto-capture frame when canvas becomes visible
  useEffect(() => {
    const captureFrameOnVisible = async () => {
      if (isVisible && videoInfo && !capturedImage) {
        setIsCapturing(true);
        try {
          const imageUrl = await captureFrame(videoInfo.videoUrl, videoInfo.currentTime);
          setCapturedImage(imageUrl);
        } catch (error) {
          console.error('Error capturing frame:', error);
          alert('Failed to capture frame');
        } finally {
          setIsCapturing(false);
        }
      }
    };

    captureFrameOnVisible();
  }, [isVisible, videoInfo]);

  // Clear canvas and redraw all lines
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (!ctx || !canvas) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw all saved lines
    lines.forEach((line) => {
      if (line.points.length < 2) return;
      
      ctx.beginPath();
      ctx.moveTo(line.points[0].x, line.points[0].y);
      
      for (let i = 1; i < line.points.length; i++) {
        ctx.lineTo(line.points[i].x, line.points[i].y);
      }
      
      ctx.strokeStyle = line.strokeColor;
      ctx.lineWidth = line.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    });
  };

  // Notify parent component of drawing changes
  useEffect(() => {
    if (lines.length > 0) {
      onDrawingChange({
        lines,
        strokeWidth,
        strokeColor,
      });
    } else if (initialDrawing && lines.length === 0) {
      onDrawingChange(null);
    }
  }, [lines, strokeWidth, strokeColor, onDrawingChange, initialDrawing]);

  // Draw current line in progress
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (!ctx || !canvas || !isDrawing || currentLine.length < 2) return;
    
    // Redraw all existing lines
    redrawCanvas();
    
    // Draw current line
    ctx.beginPath();
    ctx.moveTo(currentLine[0].x, currentLine[0].y);
    
    for (let i = 1; i < currentLine.length; i++) {
      ctx.lineTo(currentLine[i].x, currentLine[i].y);
    }
    
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }, [currentLine, isDrawing, strokeColor, strokeWidth, lines]);

  // Resize canvas when container size changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.width = containerWidth;
    canvas.height = containerHeight;
    
    redrawCanvas();
  }, [containerWidth, containerHeight]);

  // Redraw canvas when visibility changes
  useEffect(() => {
    if (isVisible) {
      redrawCanvas();
    }
  }, [isVisible]);

  const getCanvasCoordinates = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isVisible) return;
    
    const point = getCanvasCoordinates(e);
    setCurrentLine([point]);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !isVisible) return;
    
    const point = getCanvasCoordinates(e);
    setCurrentLine((prev) => [...prev, point]);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    
    if (currentLine.length > 1) {
      setLines((prev) => [
        ...prev,
        {
          points: currentLine,
          strokeWidth,
          strokeColor,
        },
      ]);
    }
    
    setCurrentLine([]);
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    setLines([]);
    setCurrentLine([]);
    setCapturedImage(null);
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const increaseStrokeWidth = () => {
    setStrokeWidth((prev) => Math.min(prev + 2, 20));
  };

  const decreaseStrokeWidth = () => {
    setStrokeWidth((prev) => Math.max(prev - 2, 2));
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-10">
      {capturedImage ? (
        <div className="relative w-full h-full">
          <img
            src={capturedImage}
            alt="Captured frame with drawings"
            className="w-full h-full object-contain"
          />
          <canvas
            ref={canvasRef}
            width={containerWidth}
            height={containerHeight}
            className="absolute top-0 left-0 cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-slate-800 bg-opacity-90 rounded-lg shadow-lg p-2 flex items-center space-x-4">
            {/* Color picker */}
            <div className="relative">
              <button
                className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center"
                style={{ backgroundColor: strokeColor }}
                onClick={() => setShowColorPicker(!showColorPicker)}
              ></button>
              
              {showColorPicker && (
                <div className="absolute bottom-full mb-2 left-0">
                  <HexColorPicker color={strokeColor} onChange={setStrokeColor} />
                </div>
              )}
            </div>
            
            {/* Stroke width controls */}
            <div className="flex items-center space-x-2">
              <button
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 text-white"
                onClick={decreaseStrokeWidth}
              >
                <Minus size={16} />
              </button>
              
              <div className="relative">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ padding: `${(20 - strokeWidth) / 2}px` }}
                >
                  <div
                    className="rounded-full"
                    style={{
                      backgroundColor: strokeColor,
                      width: `${strokeWidth}px`,
                      height: `${strokeWidth}px`,
                    }}
                  ></div>
                </div>
              </div>
              
              <button
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 text-white"
                onClick={increaseStrokeWidth}
              >
                <Plus size={16} />
              </button>
            </div>
            
            {/* Clear button */}
            <button
              className="px-3 py-1 bg-error-500 text-white text-sm rounded-md"
              onClick={clearCanvas}
            >
              Clear
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-black bg-opacity-50">
          <LoadingSpinner size="large" />
        </div>
      )}
    </div>
  );
};

export default DrawingCanvas;