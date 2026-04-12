import React, { useRef, useEffect } from 'react';

interface Props {
  maze: number[][];
  path: [number, number][];
  blockRows?: number;
  blockCols?: number;
}

// Colors
const WALL_COLOR     = '#1e293b';
const PASSAGE_COLOR  = '#08080a';
const CENTER_COLOR   = '#0d1f2d'; // block centers — subtle teal tint
const CORRIDOR_COLOR = '#0a1520'; // inter-block corridors — slightly visible
const ENTRY_COLOR    = '#3b82f6';
const EXIT_COLOR     = '#3b82f6';

export default function MazeCanvas({ maze, path, blockRows, blockCols }: Props) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas    = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx    = canvas.getContext('2d')!;
    const mazeH  = maze.length;
    const mazeW  = maze[0].length;

    const maxDim  = Math.min(container.clientWidth, container.clientHeight || 600);
    const cellSize = Math.max(1, Math.min(10, Math.floor(maxDim / Math.max(mazeW, mazeH))));

    canvas.width  = mazeW * cellSize;
    canvas.height = mazeH * cellSize;

    // Fill background
    ctx.fillStyle = PASSAGE_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Build lookup sets for block centers and corridor cells (for v3 coloring)
    const centerSet   = new Set<number>();
    const corridorSet = new Set<number>();

    if (blockRows && blockCols) {
      for (let br = 0; br < blockRows; br++) {
        for (let bc = 0; bc < blockCols; bc++) {
          // Center
          const cr = 4 * br + 2;
          const cc = 4 * bc + 2;
          centerSet.add(cr * mazeW + cc);
          // Horizontal corridor to right
          if (bc + 1 < blockCols) {
            const [hor, hoc] = [4 * br + 2, 4 * bc + 4];
            corridorSet.add(hor * mazeW + hoc);
          }
          // Vertical corridor below
          if (br + 1 < blockRows) {
            const [vor, voc] = [4 * br + 4, 4 * bc + 2];
            corridorSet.add(vor * mazeW + voc);
          }
        }
      }
    }

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
          const cell = maze[y][x];
          const idx  = y * mazeW + x;

          let color: string;
          if (cell === 1) {
            color = WALL_COLOR;
          } else if (centerSet.has(idx)) {
            color = CENTER_COLOR;
          } else if (corridorSet.has(idx)) {
            color = CORRIDOR_COLOR;
          } else {
            color = PASSAGE_COLOR;
          }

          ctx.fillStyle = color;
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }

    function drawPath(start: number, end: number) {
      for (let i = start; i < end && i < path.length; i++) {
        const [py, px] = path[i];
        const t = path.length > 1 ? i / (path.length - 1) : 0;
        ctx.fillStyle = `hsl(${187 - t * 27}, 80%, 55%)`;
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
          ctx.fillRect(0, 2 * cellSize, cellSize, cellSize);
          ctx.fillStyle = EXIT_COLOR;
          ctx.fillRect((mazeW - 1) * cellSize, (mazeH - 3) * cellSize, cellSize, cellSize);
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
  }, [maze, path, blockRows, blockCols]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[400px] flex items-center justify-center overflow-auto rounded-xl border border-[#1a1a1a] bg-[#050505] p-2"
    >
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}
