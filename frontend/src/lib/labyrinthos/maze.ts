import { xorBits } from './crypto';

export function generateMaze(bits: number[], password?: string): number[][] {
  const encodedBits = password ? xorBits(bits, password) : bits;
  const n = encodedBits.length;
  const width = n + 2;
  const height = 3;

  const grid: number[][] = Array.from({ length: height }, () => new Array(width).fill(1));

  for (let x = 0; x < width; x++) {
    grid[1][x] = 0;
  }

  for (let i = 0; i < n; i++) {
    grid[0][i + 1] = encodedBits[i];
  }

  return grid;
}

export function solveMaze(maze: number[][]): [number, number][] {
  const height = maze.length;
  const width = height > 0 ? maze[0].length : 0;
  const start: [number, number] = [1, 0];
  const goal: [number, number] = [1, width - 1];

  const queue: [number, number][] = [start];
  const visited = new Map<string, [number, number] | null>();
  visited.set(`${start[0]},${start[1]}`, null);

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  while (queue.length > 0) {
    const [y, x] = queue.shift()!;
    if (y === goal[0] && x === goal[1]) break;
    for (const [dy, dx] of dirs) {
      const ny = y + dy;
      const nx = x + dx;
      if (ny >= 0 && ny < height && nx >= 0 && nx < width && maze[ny][nx] === 0) {
        const key = `${ny},${nx}`;
        if (!visited.has(key)) {
          visited.set(key, [y, x]);
          queue.push([ny, nx]);
        }
      }
    }
  }

  const path: [number, number][] = [];
  let cur: [number, number] | null = goal;
  while (cur !== null) {
    path.push(cur);
    cur = visited.get(`${cur[0]},${cur[1]}`) ?? null;
  }
  path.reverse();
  return path;
}