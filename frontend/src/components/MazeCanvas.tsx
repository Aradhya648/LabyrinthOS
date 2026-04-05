import React, { useRef, useEffect } from 'react';

interface Props {
  maze: number[][];
  path: [number, number][];
  cellSize?: number;
}

export default function MazeCanvas({ maze, path, cellSize = 4 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    // Set canvas size
    const height = maze.length * cellSize;
    const width = maze[0].length * cellSize;
    canvas.width = width;
    canvas.height = height;

    // Draw maze (walls and paths)
    for (let y = 0; y < maze.length; y++) {
      for (let x = 0; x < maze[y].length; x++) {
        ctx.fillStyle = maze[y][x] === 1 ? '#262626' : '#0a0a0a';
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }

    // Draw entry/exit markers
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(0, cellSize, cellSize, cellSize); // entry (1,0)
    ctx.fillRect((width - cellSize), (maze.length - 2) * cellSize, cellSize, cellSize); // exit

    // Animate path
    let i = 0;
    function animate() {
      if (i < path.length) {
        const [py, px] = path[i];
        ctx.fillStyle = '#10b981';
        ctx.fillRect(px * cellSize, py * cellSize, cellSize, cellSize);
        i++;
        requestAnimationFrame(animate);
      }
    }
    // Delay start
    const timer = setTimeout(() => {
      i = 0;
      animate();
    }, 100);
    return () => clearTimeout(timer);
  }, [maze, path, cellSize]);

  return (
    <div className="overflow-auto border border-gray-800 rounded bg-black">
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}