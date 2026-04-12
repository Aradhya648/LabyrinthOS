import React, { useRef, useEffect, useState } from 'react';

interface Props {
  maze: number[][];
  path: [number, number][];
  blockRows?: number;
  blockCols?: number;
}

const WALL_COLOR     = '#1e293b';
const PASSAGE_COLOR  = '#08080a';
const CENTER_COLOR   = '#0d2030';

// Read the 8-cell byte value for a block (clockwise from top-left)
function blockByte(maze: number[][], br: number, bc: number): number {
  const r = 4 * br + 1, c = 4 * bc + 1;
  const cells: [number, number][] = [
    [r, c], [r, c+1], [r, c+2], [r+1, c+2],
    [r+2, c+2], [r+2, c+1], [r+2, c], [r+1, c],
  ];
  let byte = 0;
  for (let i = 0; i < 8; i++) byte = (byte << 1) | (maze[cells[i][0]][cells[i][1]] & 1);
  return byte;
}

// Color a block by its byte value
// Hue sweeps 0→240° (red→blue) by byte value
// Lightness peaks at 4 bits set (most "mixed"), dims at 0 or 8 bits
function byteToColor(byte: number): string {
  const popcount = byte.toString(2).split('1').length - 1;
  const hue = Math.round((byte / 255) * 240);
  const lightness = 18 + popcount * 5; // 18% (all 0) → 58% (all 8 set)
  const sat = 60 + Math.round((4 - Math.abs(popcount - 4)) * 8); // 60→92%
  return `hsl(${hue},${sat}%,${lightness}%)`;
}

export default function MazeCanvas({ maze, path, blockRows, blockCols }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'path' | 'heatmap'>('path');
  // Track whether build phase is done (to enable toggle)
  const buildDoneRef = useRef(false);
  const [buildDone, setBuildDone] = useState(false);

  // Draw heatmap imperatively whenever mode switches to heatmap
  useEffect(() => {
    if (mode !== 'heatmap' || !buildDone) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const mazeH = maze.length, mazeW = maze[0].length;
    const cellSize = Math.max(1, Math.floor(canvas.width / mazeW));

    // Clear to wall color
    ctx.fillStyle = WALL_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (blockRows && blockCols) {
      for (let br = 0; br < blockRows; br++) {
        for (let bc = 0; bc < blockCols; bc++) {
          const byte = blockByte(maze, br, bc);
          ctx.fillStyle = byteToColor(byte);
          const startR = 4 * br + 1, startC = 4 * bc + 1;
          ctx.fillRect(startC * cellSize, startR * cellSize, 3 * cellSize, 3 * cellSize);
        }
      }
    }

    // Draw grid lines between blocks (subtle)
    if (blockRows && blockCols && cellSize >= 2) {
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 0.5;
      for (let br = 0; br <= blockRows; br++) {
        const y = (4 * br + 1) * cellSize;
        ctx.beginPath(); ctx.moveTo(cellSize, y); ctx.lineTo((mazeW - 1) * cellSize, y); ctx.stroke();
      }
      for (let bc = 0; bc <= blockCols; bc++) {
        const x = (4 * bc + 1) * cellSize;
        ctx.beginPath(); ctx.moveTo(x, cellSize); ctx.lineTo(x, (mazeH - 1) * cellSize); ctx.stroke();
      }
    }
  }, [mode, buildDone, maze, blockRows, blockCols]);

  // Main build + path animation effect
  useEffect(() => {
    buildDoneRef.current = false;
    setBuildDone(false);
    setMode('path');

    const canvas    = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx    = canvas.getContext('2d')!;
    const mazeH  = maze.length, mazeW = maze[0].length;
    const maxDim  = Math.min(container.clientWidth, container.clientHeight || 600);
    const cellSize = Math.max(1, Math.min(10, Math.floor(maxDim / Math.max(mazeW, mazeH))));

    canvas.width  = mazeW * cellSize;
    canvas.height = mazeH * cellSize;

    ctx.fillStyle = PASSAGE_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Pre-compute center + corridor index sets for visual distinction
    const centerSet   = new Set<number>();
    const corridorSet = new Set<number>();
    if (blockRows && blockCols) {
      for (let br = 0; br < blockRows; br++) {
        for (let bc = 0; bc < blockCols; bc++) {
          centerSet.add((4*br+2) * mazeW + (4*bc+2));
          if (bc+1 < blockCols) corridorSet.add((4*br+2) * mazeW + (4*bc+4));
          if (br+1 < blockRows) corridorSet.add((4*br+4) * mazeW + (4*bc+2));
        }
      }
    }

    let rowsDone = 0;
    const rowsPerFrame = Math.max(1, Math.ceil(mazeH / 60));
    let pathDone = 0;
    const pathPerFrame = Math.max(1, Math.ceil(path.length / 120));
    let phase: 'build' | 'path' | 'done' = 'build';
    let animId: number;

    function drawRows(start: number, end: number) {
      for (let y = start; y < end && y < mazeH; y++) {
        for (let x = 0; x < mazeW; x++) {
          const idx = y * mazeW + x;
          let color: string;
          if (maze[y][x] === 1)       color = WALL_COLOR;
          else if (centerSet.has(idx)) color = CENTER_COLOR;
          else if (corridorSet.has(idx)) color = '#0a1520';
          else                          color = PASSAGE_COLOR;
          ctx.fillStyle = color;
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }

    function drawPath(start: number, end: number) {
      for (let i = start; i < end && i < path.length; i++) {
        const [py, px] = path[i];
        const t = path.length > 1 ? i / (path.length - 1) : 0;
        ctx.fillStyle = `hsl(${187 - t * 27},80%,55%)`;
        ctx.fillRect(px * cellSize, py * cellSize, cellSize, cellSize);
      }
    }

    function animate() {
      if (phase === 'build') {
        const end = Math.min(rowsDone + rowsPerFrame, mazeH);
        drawRows(rowsDone, end);
        rowsDone = end;
        if (rowsDone >= mazeH) {
          ctx.fillStyle = '#3b82f6';
          ctx.fillRect(0, 2 * cellSize, cellSize, cellSize);
          ctx.fillRect((mazeW-1) * cellSize, (mazeH-3) * cellSize, cellSize, cellSize);
          phase = 'path';
        }
        animId = requestAnimationFrame(animate);
      } else if (phase === 'path') {
        const end = Math.min(pathDone + pathPerFrame, path.length);
        drawPath(pathDone, end);
        pathDone = end;
        if (pathDone >= path.length) {
          phase = 'done';
          buildDoneRef.current = true;
          setBuildDone(true);
        } else {
          animId = requestAnimationFrame(animate);
        }
      }
    }

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [maze, path, blockRows, blockCols]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[400px] flex items-center justify-center overflow-auto rounded-xl border border-[#1a1a1a] bg-[#050505] p-2"
    >
      <canvas ref={canvasRef} className="block" />

      {/* Toggle button — appears after animation completes */}
      {buildDone && (
        <div className="absolute top-3 right-3 flex rounded-lg overflow-hidden border border-[#1e293b] text-[11px] font-medium">
          <button
            onClick={() => setMode('path')}
            className={`px-3 py-1.5 transition ${
              mode === 'path'
                ? 'bg-cyan-900/60 text-cyan-300'
                : 'bg-[#0f0f0f] text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Path
          </button>
          <button
            onClick={() => setMode('heatmap')}
            className={`px-3 py-1.5 transition ${
              mode === 'heatmap'
                ? 'bg-cyan-900/60 text-cyan-300'
                : 'bg-[#0f0f0f] text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Heatmap
          </button>
        </div>
      )}
    </div>
  );
}
