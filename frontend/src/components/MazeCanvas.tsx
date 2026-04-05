import React, { useRef, useEffect } from 'react';

interface Props {
  maze: number[][];
  path: [number, number][];
}

const WALL_COLOR = '#1e293b';
const PASSAGE_COLOR = '#08080a';
const ENTRY_COLOR = '#3b82f6';
const EXIT_COLOR = '#3b82f6';

export default function MazeCanvas({ maze, path }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d')!;
    const mazeH = maze.length;
    const mazeW = maze[0].length;

    const maxDim = Math.min(container.clientWidth, container.clientHeight || 600);
    const cellSize = Math.max(1, Math.min(10, Math.floor(maxDim / Math.max(mazeW, mazeH))));

    canvas.width = mazeW * cellSize;
    canvas.height = mazeH * cellSize;

    // Clear
    ctx.fillStyle = PASSAGE_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Animation state
    let rowsDone = 0;
    const rowsPerFrame = Math.max(1, Math.ceil(mazeH / 60));
    let pathDone = 0;
    const pathPerFrame = Math.max(1, Math.ceil(path.length / 120));
    let phase: 'build' | 'path' | 'done' = 'build';
    let animId: number;

    function drawRows(start: number, end: number) {
      for (let y = start; y < end && y < mazeH; y++) {
        for (let x = 0; x < mazeW; x++) {
          if (maze[y][x] === 1) {
            ctx.fillStyle = WALL_COLOR;
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
          }
        }
      }
    }

    function drawPath(start: number, end: number) {
      for (let i = start; i < end && i < path.length; i++) {
        const [py, px] = path[i];
        const t = path.length > 1 ? i / (path.length - 1) : 0;
        const hue = 187 - t * 27;
        ctx.fillStyle = `hsl(${hue}, 80%, 55%)`;
        ctx.fillRect(px * cellSize, py * cellSize, cellSize, cellSize);
      }
    }

    function animate() {
      if (phase === 'build') {
        const end = Math.min(rowsDone + rowsPerFrame, mazeH);
        drawRows(rowsDone, end);
        rowsDone = end;
        if (rowsDone >= mazeH) {
          // Entry / exit markers
          ctx.fillStyle = ENTRY_COLOR;
          ctx.fillRect(0, cellSize, cellSize, cellSize);
          ctx.fillStyle = EXIT_COLOR;
          ctx.fillRect((mazeW - 1) * cellSize, (mazeH - 2) * cellSize, cellSize, cellSize);
          phase = 'path';
        }
        animId = requestAnimationFrame(animate);
      } else if (phase === 'path') {
        const end = Math.min(pathDone + pathPerFrame, path.length);
        drawPath(pathDone, end);
        pathDone = end;
        if (pathDone >= path.length) {
          phase = 'done';
        } else {
          animId = requestAnimationFrame(animate);
        }
      }
    }

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [maze, path]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[400px] flex items-center justify-center overflow-auto rounded-xl border border-[#1a1a1a] bg-[#050505] p-2"
    >
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}
