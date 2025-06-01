import React, { useEffect, useRef, useState, useCallback } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Minus, Plus, Pencil } from 'lucide-react';
import type { DrawingData, Line, Point } from '../types';

interface DrawingCanvasProps {
  width: number;
  height: number;
  className?: string;
  onDrawingChange?: (drawingData: DrawingData | null) => void;
  initialDrawing?: DrawingData | null;
  autoEnableDrawing?: boolean;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  width,
  height,
  className = '',
  onDrawingChange,
  initialDrawing = null,
  autoEnableDrawing = false
}) => {
  console.log('[DrawingCanvas] mounted', { width, height, initialDrawing, autoEnableDrawing });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(autoEnableDrawing);
  const [lines, setLines] = useState<Line[]>(initialDrawing?.lines || []);
  const [currentLine, setCurrentLine] = useState<Point[]>([]);
  const [strokeColor, setStrokeColor] = useState(initialDrawing?.strokeColor || '#FF3B30');
  const [strokeWidth, setStrokeWidth] = useState(initialDrawing?.strokeWidth || 4);
  const [showColorPicker, setShowColorPicker] = useState(false);

  console.log('[DrawingCanvas] initial state', { isDrawingMode, lines });

  useEffect(() => {
    if (autoEnableDrawing) {
      console.log('[DrawingCanvas] auto-enabling drawing mode');
      setIsDrawingMode(true);
    }
  }, [autoEnableDrawing]);

  const drawLine = useCallback((ctx: CanvasRenderingContext2D, line: Line) => {
    if (line.points.length < 2) return;
    console.log('[DrawingCanvas] drawing line', line);

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
  }, []);

  const redrawCanvas = useCallback(() => {
    console.log('[DrawingCanvas] redrawing canvas', { lines });
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    lines.forEach(line => drawLine(ctx, line));
  }, [lines, drawLine]);

  useEffect(() => {
    console.log('[DrawingCanvas] resize effect', { width, height });
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || height <= 0) {
      console.warn('[DrawingCanvas] invalid dimensions or no canvas', { width, height });
      return;
    }

    canvas.width = width;
    canvas.height = height;
    redrawCanvas();
  }, [width, height, redrawCanvas]);

  useEffect(() => {
    console.log('[DrawingCanvas] applying initialDrawing', initialDrawing);
    if (!initialDrawing) return;
    
    setLines(initialDrawing.lines);
    setStrokeColor(initialDrawing.strokeColor);
    setStrokeWidth(initialDrawing.strokeWidth);
  }, [initialDrawing]);

  const getCanvasCoordinates = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const point = 'touches' in e ? e.touches[0] : e;
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (point.clientX - rect.left) * scaleX,
      y: (point.clientY - rect.top) * scaleY
    };
  };

  const handleDrawStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingMode) return;
    
    e.preventDefault();
    console.log('[DrawingCanvas] draw start');
    const point = getCanvasCoordinates(e);
    setCurrentLine([point]);
    setIsDrawing(true);
  };

  const handleDrawMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !isDrawingMode) return;
    
    e.preventDefault();
    console.log('[DrawingCanvas] draw move');
    const point = getCanvasCoordinates(e);
    setCurrentLine(prev => [...prev, point]);
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    drawLine(ctx, {
      points: [...currentLine, point],
      strokeColor,
      strokeWidth
    });
  };

  const handleDrawEnd = () => {
    if (!isDrawing) return;
    console.log('[DrawingCanvas] draw end', { currentLine });
    
    if (currentLine.length > 1) {
      const newLine = {
        points: currentLine,
        strokeColor,
        strokeWidth
      };
      setLines(prev => [...prev, newLine]);
      onDrawingChange?.({
        lines: [...lines, newLine],
        strokeColor,
        strokeWidth
      });
    }
    
    setCurrentLine([]);
    setIsDrawing(false);
  };

  const handleClear = () => {
    console.log('[DrawingCanvas] clearing canvas');
    setLines([]);
    onDrawingChange?.(null);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  console.log('[DrawingCanvas] render', { width, height, lines });

  if (width <= 0 || height <= 0) {
    console.warn('[DrawingCanvas] skipping render - invalid dimensions', { width, height });
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={`absolute top-0 left-0 z-50 ${isDrawingMode ? 'cursor-crosshair' : ''}`}
        style={{ 
          pointerEvents: isDrawingMode ? 'auto' : 'none',
          touchAction: 'none'
        }}
        onMouseDown={handleDrawStart}
        onMouseMove={handleDrawMove}
        onMouseUp={handleDrawEnd}
        onMouseLeave={handleDrawEnd}
        onTouchStart={handleDrawStart}
        onTouchMove={handleDrawMove}
        onTouchEnd={handleDrawEnd}
      />
      
      <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
        <div className="bg-slate-800 bg-opacity-90 rounded-lg shadow-lg p-2 flex items-center gap-2">
          <button
            onClick={() => setIsDrawingMode(!isDrawingMode)}
            className={`p-2 rounded-md ${
              isDrawingMode ? 'bg-primary-600 text-white' : 'bg-slate-700 text-slate-300'
            }`}
            title={isDrawingMode ? 'Disable drawing' : 'Enable drawing'}
          >
            <Pencil size={16} />
          </button>
          
          {isDrawingMode && (
            <>
              <div className="relative">
                <button
                  className="w-8 h-8 rounded-full border-2 border-white"
                  style={{ backgroundColor: strokeColor }}
                  onClick={() => setShowColorPicker(!showColorPicker)}
                />
                {showColorPicker && (
                  <div className="absolute top-full right-0 mt-2">
                    <HexColorPicker color={strokeColor} onChange={setStrokeColor} />
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setStrokeWidth(w => Math.max(1, w - 1))}
                  className="p-1 bg-slate-700 rounded-md text-white"
                >
                  <Minus size={14} />
                </button>
                <span className="w-8 text-center text-white">{strokeWidth}</span>
                <button
                  onClick={() => setStrokeWidth(w => Math.min(20, w + 1))}
                  className="p-1 bg-slate-700 rounded-md text-white"
                >
                  <Plus size={14} />
                </button>
              </div>
              
              <button
                onClick={handleClear}
                className="px-3 py-1 bg-error-500 text-white text-sm rounded-md"
              >
                Clear
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DrawingCanvas;