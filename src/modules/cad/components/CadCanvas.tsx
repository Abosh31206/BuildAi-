import React, { useRef, useEffect, useState } from 'react';
import { CadFloorPlan, CadViewMode } from '../types';
import { ZoomIn, ZoomOut, Maximize2, Move } from 'lucide-react';

interface CadCanvasProps {
  plan: CadFloorPlan;
  viewMode: CadViewMode;
  language: 'ru' | 'kk';
}

export const CadCanvas: React.FC<CadCanvasProps> = ({ plan, viewMode, language }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Handle fit to screen
  const handleFit = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Retina resolution
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear background (architectural drafting paper)
    ctx.fillStyle = '#fcfdfe';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    // Center origin
    ctx.translate(width / 2 + pan.x, height / 2 + pan.y);
    ctx.scale(zoom, zoom);

    // Scale conversion: 1 meter = 40 pixels at zoom 1.0
    const PPM = 38; // Pixels per meter

    const totalWidthPx = plan.totalWidth * PPM;
    const totalLengthPx = plan.totalLength * PPM;
    const originX = -totalWidthPx / 2;
    const originY = -totalLengthPx / 2;

    // 1. Draw Architectural Grid
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;
    const gridSpan = 800;
    const gridStep = 1 * PPM; // 1 meter grid
    for (let gx = -gridSpan; gx <= gridSpan; gx += gridStep) {
      ctx.beginPath();
      ctx.moveTo(gx, -gridSpan);
      ctx.lineTo(gx, gridSpan);
      ctx.stroke();
    }
    for (let gy = -gridSpan; gy <= gridSpan; gy += gridStep) {
      ctx.beginPath();
      ctx.moveTo(-gridSpan, gy);
      ctx.lineTo(gridSpan, gy);
      ctx.stroke();
    }

    if (viewMode === 'plan') {
      // 2. Draw Rooms Background Fill
      plan.rooms.forEach((room) => {
        const rx = originX + room.x * PPM;
        const ry = originY + room.y * PPM;
        const rw = room.width * PPM;
        const rh = room.height * PPM;

        ctx.fillStyle = room.color || 'rgba(241, 245, 249, 0.45)';
        ctx.fillRect(rx, ry, rw, rh);
      });

      // 3. Draw Interior Walls
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 3.5;
      plan.rooms.forEach((room) => {
        const rx = originX + room.x * PPM;
        const ry = originY + room.y * PPM;
        const rw = room.width * PPM;
        const rh = room.height * PPM;
        ctx.strokeRect(rx, ry, rw, rh);
      });

      // 4. Draw Heavy Exterior Boundary Walls
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 7.0; // Heavy outer load-bearing wall
      ctx.strokeRect(originX, originY, totalWidthPx, totalLengthPx);

      // 5. Draw Openings (Windows and Doors)
      plan.openings.forEach((op) => {
        const ox = originX + op.x * PPM;
        const oy = originY + op.y * PPM;
        const ow = op.width * PPM;

        if (op.type === 'window') {
          // Clear wall segment
          ctx.fillStyle = '#ffffff';
          if (op.orientation === 'horizontal') {
            ctx.fillRect(ox, oy - 4, ow, 8);
            // Window double glass line
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(ox, oy - 2);
            ctx.lineTo(ox + ow, oy - 2);
            ctx.moveTo(ox, oy + 2);
            ctx.lineTo(ox + ow, oy + 2);
            ctx.stroke();
          } else {
            ctx.fillRect(ox - 4, oy, 8, ow);
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(ox - 2, oy);
            ctx.lineTo(ox - 2, oy + ow);
            ctx.moveTo(ox + 2, oy);
            ctx.lineTo(ox + 2, oy + ow);
            ctx.stroke();
          }
        } else if (op.type === 'door') {
          // Clear wall
          ctx.fillStyle = '#ffffff';
          if (op.orientation === 'horizontal') {
            ctx.fillRect(ox, oy - 5, ow, 10);
            // Swing arc
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(ox, oy, ow, 0, Math.PI / 2);
            ctx.stroke();
            // Door leaf line
            ctx.beginPath();
            ctx.moveTo(ox, oy);
            ctx.lineTo(ox + ow, oy);
            ctx.stroke();
          } else {
            ctx.fillRect(ox - 5, oy, 10, ow);
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(ox, oy, ow, 0, Math.PI / 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(ox, oy);
            ctx.lineTo(ox, oy + ow);
            ctx.stroke();
          }
        }
      });

      // 6. Draw Room Annotations & Areas
      plan.rooms.forEach((room) => {
        const rx = originX + (room.x + room.width / 2) * PPM;
        const ry = originY + (room.y + room.height / 2) * PPM;

        ctx.fillStyle = '#0f172a';
        ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(room.name, rx, ry - 7);

        // Area badge
        ctx.fillStyle = '#1e3a8a';
        ctx.font = '700 11px "JetBrains Mono", monospace';
        ctx.fillText(`${room.area} м²`, rx, ry + 10);
      });

      // 7. Draw Grid Axes (1, 2, 3 and А, Б, В)
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.8;
      ctx.setLineDash([6, 4]);

      // X-Axes
      plan.axesX.forEach((axis) => {
        const ax = originX + axis.position * PPM;
        ctx.beginPath();
        ctx.moveTo(ax, originY - 35);
        ctx.lineTo(ax, originY + totalLengthPx + 15);
        ctx.stroke();

        // Circle marker
        ctx.setLineDash([]);
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(ax, originY - 45, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(axis.label, ax, originY - 45);
        ctx.setLineDash([6, 4]);
      });

      // Y-Axes
      plan.axesY.forEach((axis) => {
        const ay = originY + axis.position * PPM;
        ctx.beginPath();
        ctx.moveTo(originX - 35, ay);
        ctx.lineTo(originX + totalWidthPx + 15, ay);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(originX - 45, ay, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(axis.label, originX - 45, ay);
        ctx.setLineDash([6, 4]);
      });
      ctx.setLineDash([]);

      // 8. Dimension Lines
      plan.dimensions.forEach((dim) => {
        const dx1 = originX + dim.x1 * PPM;
        const dy1 = originY + dim.y1 * PPM;
        const dx2 = originX + dim.x2 * PPM;
        const dy2 = originY + dim.y2 * PPM;

        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(dx1, dy1);
        ctx.lineTo(dx2, dy2);
        ctx.stroke();

        // 45° Architectural slash ticks
        const drawTick = (tx: number, ty: number) => {
          ctx.beginPath();
          ctx.moveTo(tx - 4, ty + 4);
          ctx.lineTo(tx + 4, ty - 4);
          ctx.stroke();
        };
        drawTick(dx1, dy1);
        drawTick(dx2, dy2);

        // Value text
        ctx.fillStyle = '#0f172a';
        ctx.font = '600 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const midX = (dx1 + dx2) / 2;
        const midY = (dy1 + dy2) / 2 - 2;
        ctx.fillText(`${(dim.value * 1000).toFixed(0)}`, midX, midY);
      });
    } else if (viewMode === 'facade') {
      // Architectural Elevation / Facade View
      const groundY = originY + totalLengthPx / 2 + 100;

      // Ground Line
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 4.0;
      ctx.beginPath();
      ctx.moveTo(originX - 80, groundY);
      ctx.lineTo(originX + totalWidthPx + 80, groundY);
      ctx.stroke();

      // Building Box (2 storeys)
      const wallH = 6 * PPM; // 6 meters = 2 storeys
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(originX, groundY - wallH, totalWidthPx, wallH);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3.0;
      ctx.strokeRect(originX, groundY - wallH, totalWidthPx, wallH);

      // Floor dividing line
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(originX, groundY - wallH / 2);
      ctx.lineTo(originX + totalWidthPx, groundY - wallH / 2);
      ctx.stroke();

      // Windows
      const winW = 1.5 * PPM;
      const winH = 1.4 * PPM;
      const floors = [groundY - 1.2 * PPM - winH, groundY - 4.2 * PPM - winH];
      floors.forEach((fy) => {
        for (let i = 0; i < 3; i++) {
          const wx = originX + (i + 1) * (totalWidthPx / 4) - winW / 2;
          ctx.fillStyle = '#e0f2fe';
          ctx.fillRect(wx, fy, winW, winH);
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(wx, fy, winW, winH);
        }
      });

      // Gable Roof
      const roofH = 2.5 * PPM;
      ctx.beginPath();
      ctx.moveTo(originX - 15, groundY - wallH);
      ctx.lineTo(originX + totalWidthPx / 2, groundY - wallH - roofH);
      ctx.lineTo(originX + totalWidthPx + 15, groundY - wallH);
      ctx.closePath();
      ctx.fillStyle = '#94a3b8';
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3.0;
      ctx.stroke();

      // Height Elevation Tags
      const drawHeightTag = (hy: number, label: string) => {
        const tx = originX + totalWidthPx + 40;
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(tx - 20, hy);
        ctx.lineTo(tx + 40, hy);
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(label, tx - 10, hy - 2);
      };

      drawHeightTag(groundY, '▼ 0.000 (Ур. земли)');
      drawHeightTag(groundY - wallH / 2, '▲ +3.000 (2-й этаж)');
      drawHeightTag(groundY - wallH, '▲ +6.000 (Карниз)');
      drawHeightTag(groundY - wallH - roofH, '▲ +8.500 (Конёк)');
    } else {
      // Longitudinal Section 1-1
      const groundY = originY + totalLengthPx / 2 + 100;
      const wallH = 6 * PPM;

      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(originX, groundY - wallH, totalWidthPx, wallH);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 4.0;
      ctx.strokeRect(originX, groundY - wallH, totalWidthPx, wallH);

      // Slabs
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(originX, groundY - 10, totalWidthPx, 10);
      ctx.fillRect(originX, groundY - wallH / 2 - 8, totalWidthPx, 16);
      ctx.fillRect(originX, groundY - wallH - 8, totalWidthPx, 16);

      ctx.fillStyle = '#0f172a';
      ctx.font = '600 11px "Plus Jakarta Sans"';
      ctx.textAlign = 'center';
      ctx.fillText('1-й этаж (H = 3.00 м)', originX + totalWidthPx / 2, groundY - wallH / 4);
      ctx.fillText('2-й этаж (H = 3.00 м)', originX + totalWidthPx / 2, groundY - (3 * wallH) / 4);
    }

    ctx.restore();
  }, [plan, viewMode, zoom, pan]);

  return (
    <div className="relative w-full h-[540px] bg-white border border-slate-300 rounded-lg overflow-hidden shadow-xs select-none">
      {/* Zoom / Pan Controls HUD */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-white/90 backdrop-blur-xs p-1.5 rounded-md border border-slate-200 shadow-sm">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(3.0, z + 0.2))}
          className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition-colors"
          title="Приблизить"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}
          className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition-colors"
          title="Отдалить"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleFit}
          className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition-colors"
          title="По размеру экрана"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <div className="px-2 font-mono text-[11px] font-semibold text-slate-600">
          {(zoom * 100).toFixed(0)}%
        </div>
      </div>

      {/* Scale & Norm badge bottom-left */}
      <div className="absolute bottom-3 left-3 z-10 bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded border border-slate-200 text-xs font-mono text-slate-700 shadow-xs flex items-center gap-3">
        <span>Масштаб {plan.scale}</span>
        <span className="text-slate-300">|</span>
        <span>ГОСТ 21.101-2020 (СПДС)</span>
        <span className="text-slate-300">|</span>
        <span className="text-emerald-700 font-semibold">1 клетка = 1.0 м</span>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={(e) => {
          setIsDragging(true);
          setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }}
        onMouseMove={(e) => {
          if (!isDragging) return;
          setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
        }}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
      />
    </div>
  );
};
