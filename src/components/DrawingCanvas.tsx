import React, { useEffect, useRef, useState, useCallback } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Minus, Plus, Pencil, GripHorizontal } from 'lucide-react';
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
  const [strokeColor, setStrokeColor] = useState(initialDrawing?.strokeColor || '#FF3B30');  const [strokeWidth, setStrokeWidth] = useState(initialDrawing?.strokeWidth || 4);
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  // Add state for toolbox position
  const [isDraggingToolbox, setIsDraggingToolbox] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const toolboxRef = useRef<HTMLDivElement>(null);

  // Add state for tooltip visibility
  const [showTooltip, setShowTooltip] = useState(true);

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

  // Add helper function to check if touch is on canvas vs. toolbox
  const isTouchOnCanvas = useCallback((e: React.TouchEvent): boolean => {
    if (!canvasRef.current || !toolboxRef.current) return true;
    
    const touch = e.touches[0];
    const toolboxRect = toolboxRef.current.getBoundingClientRect();
    
    // Check if touch is within toolbox area
    if (
      touch.clientX >= toolboxRect.left &&
      touch.clientX <= toolboxRect.right &&
      touch.clientY >= toolboxRect.top &&
      touch.clientY <= toolboxRect.bottom
    ) {
      return false;
    }
    
    return true;
  }, []);

  const handleDrawStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingMode) return;
    
    // For touch events, check if touch is on canvas or toolbox
    if ('touches' in e && !isTouchOnCanvas(e)) {
      return;
    }
    
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
  // Add drag handlers for toolbox
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (toolboxRef.current) {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingToolbox(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, []);
  const handleDragMove = useCallback((e: React.MouseEvent) => {
    if (isDraggingToolbox && toolboxRef.current) {
      e.preventDefault();
      e.stopPropagation();
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      
      const rect = toolboxRef.current.getBoundingClientRect();
      const newX = rect.left + dx;
      const newY = rect.top + dy;
      
      // Update position in pixels instead of classes
      toolboxRef.current.style.left = `${newX}px`;
      toolboxRef.current.style.top = `${newY}px`;
      toolboxRef.current.style.right = 'auto'; // Clear right position when dragging
      
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [isDraggingToolbox, dragStart]);

  const handleDragEnd = useCallback(() => {
    setIsDraggingToolbox(false);
  }, []);  // Add touch event handlers for mobile devices
  const handleTouchDragStart = useCallback((e: React.TouchEvent) => {
    if (toolboxRef.current && e.touches.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingToolbox(true);
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  }, []);

  const handleTouchDragMove = useCallback((e: React.TouchEvent) => {
    if (isDraggingToolbox && toolboxRef.current && e.touches.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      const dx = e.touches[0].clientX - dragStart.x;
      const dy = e.touches[0].clientY - dragStart.y;
      
      const rect = toolboxRef.current.getBoundingClientRect();
      const newX = rect.left + dx;
      const newY = rect.top + dy;
      
      toolboxRef.current.style.left = `${newX}px`;
      toolboxRef.current.style.top = `${newY}px`;
      toolboxRef.current.style.right = 'auto'; // Clear right position when dragging
      
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  }, [isDraggingToolbox, dragStart]);
  
  const handleTouchDragEnd = useCallback(() => {
    setIsDraggingToolbox(false);
  }, []);  // Update useEffect to setup initial toolbox position
  useEffect(() => {
    if (toolboxRef.current) {
      // Position the toolbox for optimal usability
      // For mobile screens, position at the bottom
      if (window.innerWidth < 768) {
        toolboxRef.current.style.top = 'auto';
        toolboxRef.current.style.bottom = '1rem';
        toolboxRef.current.style.right = '1rem';
      } else {
        // For desktop, position at the top right
        toolboxRef.current.style.right = '1rem';
        toolboxRef.current.style.top = '1rem';
      }
      
      toolboxRef.current.style.position = 'absolute';
      toolboxRef.current.style.zIndex = '100'; // Ensure toolbox is above canvas
      
      // Add transition for smoother repositioning when dragged
      toolboxRef.current.style.transition = isDraggingToolbox ? 'none' : 'opacity 0.2s ease-in-out';
    }
  }, [isDraggingToolbox]);

  // Hide tooltip after a few seconds
  useEffect(() => {
    if (showTooltip) {
      const timer = setTimeout(() => {
        setShowTooltip(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [showTooltip]);

  // Add keyboard shortcut handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isDrawingMode) return;
      
      // Clear canvas with 'Delete' or 'Backspace' key
      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleClear();
      }
      
      // Toggle drawing mode with 'D' key
      if (e.key === 'd' || e.key === 'D') {
        setIsDrawingMode(prev => !prev);
      }
      
      // Increase/decrease stroke width with +/- keys
      if (e.key === '+' || e.key === '=') {
        setStrokeWidth(w => Math.min(20, w + 1));
      }
      if (e.key === '-' || e.key === '_') {
        setStrokeWidth(w => Math.max(1, w - 1));
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawingMode, handleClear]);

  console.log('[DrawingCanvas] render', { width, height, lines });

  if (width <= 0 || height <= 0) {
    console.warn('[DrawingCanvas] skipping render - invalid dimensions', { width, height });
    return null;
  }

  return (    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={`absolute top-0 left-0 z-50 ${isDrawingMode ? 'cursor-crosshair' : ''}`}
        style={{ 
          pointerEvents: isDrawingMode ? 'auto' : 'none',
          touchAction: 'none',
          border: isDrawingMode ? '2px solid rgba(255, 255, 255, 0.3)' : 'none'
        }}
        onMouseDown={handleDrawStart}
        onMouseMove={handleDrawMove}
        onMouseUp={handleDrawEnd}
        onMouseLeave={handleDrawEnd}
        onTouchStart={handleDrawStart}
        onTouchMove={handleDrawMove}
        onTouchEnd={handleDrawEnd}
      /><div
        ref={toolboxRef}
        className="flex flex-col items-end gap-2"
        style={{ 
          position: 'absolute',
          pointerEvents: 'auto', // Make sure the toolbox always receives pointer events
          cursor: isDraggingToolbox ? 'grabbing' : 'default',
          zIndex: 100,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
        }}
      >        {/* Drag handle */}
        <div 
          className="bg-slate-800 bg-opacity-90 rounded-t-lg shadow-lg p-2 flex items-center gap-2"
          style={{ 
            cursor: isDraggingToolbox ? 'grabbing' : 'grab',
            touchAction: 'none',
            userSelect: 'none'
          }}
          onMouseDown={handleDragStart}
          onMouseMove={isDraggingToolbox ? handleDragMove : undefined}
          onMouseUp={handleDragEnd}          onMouseLeave={handleDragEnd}
          onTouchStart={handleTouchDragStart}
          onTouchMove={isDraggingToolbox ? handleTouchDragMove : undefined}
          onTouchEnd={handleTouchDragEnd}
          onTouchCancel={handleTouchDragEnd}
        >
          <GripHorizontal size={16} className="text-slate-400" />
          <span className="text-sm text-slate-300">Drawing Tools</span>
        </div>
        
        {/* Tool buttons */}
        <div className="bg-slate-800 bg-opacity-90 rounded-b-lg shadow-lg p-2 flex items-center gap-2">
          <button            onClick={() => setIsDrawingMode(!isDrawingMode)}
            className={`p-2 rounded-md ${
              isDrawingMode ? 'bg-primary-600 text-white' : 'bg-slate-700 text-slate-300'
            }`}
            title={isDrawingMode ? 'Disable drawing' : 'Enable drawing'}
            style={{ pointerEvents: 'auto' }}
          >
            <Pencil size={16} />
          </button>
          
          {isDrawingMode && (
            <>              <div className="relative">
                <button
                  className="w-8 h-8 rounded-full border-2 border-white"
                  style={{ 
                    backgroundColor: strokeColor,
                    pointerEvents: 'auto'
                  }}
                  onClick={() => setShowColorPicker(!showColorPicker)}
                />                {showColorPicker && (
                  <div 
                    className="absolute top-full right-0 mt-2 z-50 p-2 bg-slate-900 rounded-lg"
                    style={{ 
                      pointerEvents: 'auto',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                      maxWidth: '200px',
                      width: '200px'
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                  >
                    <div className="pb-2 text-slate-300 text-xs font-medium">Pick a color:</div>
                    <HexColorPicker color={strokeColor} onChange={setStrokeColor} />
                    <div className="flex gap-2 mt-2">
                      {['#FF3B30', '#FF9500', '#FFCC00', '#4CD964', '#5AC8FA', '#007AFF', '#FFFFFF', '#8E8E93'].map(color => (
                        <button
                          key={color}
                          className="w-6 h-6 rounded-full border border-white"
                          style={{ backgroundColor: color }}
                          onClick={() => {
                            setStrokeColor(color);
                            setShowColorPicker(false);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
                <div className="flex items-center gap-1">
                <button
                  onClick={() => setStrokeWidth(w => Math.max(1, w - 1))}
                  className="p-1 bg-slate-700 rounded-md text-white"
                  style={{ pointerEvents: 'auto' }}
                >
                  <Minus size={14} />
                </button>
                <span className="w-8 text-center text-white">{strokeWidth}</span>
                <button
                  onClick={() => setStrokeWidth(w => Math.min(20, w + 1))}
                  className="p-1 bg-slate-700 rounded-md text-white"
                  style={{ pointerEvents: 'auto' }}
                >
                  <Plus size={14} />
                </button>
              </div>
              
              <button
                onClick={handleClear}
                className="px-3 py-1 bg-error-500 text-white text-sm rounded-md"
                style={{ pointerEvents: 'auto' }}
              >
                Clear
              </button>
            </>
          )}        </div>
        
        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-black bg-opacity-80 text-white text-xs rounded-md shadow-lg">
            <div className="font-semibold mb-1">Usage Instructions:</div>
            <div className="flex flex-col gap-1">
              <div>
                • Draw with mouse or touch
              </div>
              <div>
                • Click the color box to change color
              </div>
              <div>
                • Use +/- to adjust stroke width
              </div>
              <div className="mt-1">
                <button 
                  onClick={() => setShowTooltip(false)} 
                  className="text-primary-400 hover:text-primary-300"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DrawingCanvas;