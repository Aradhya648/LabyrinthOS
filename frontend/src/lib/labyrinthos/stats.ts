export function computeRatio(originalBytes: number, maze: number[][]): {
  originalBytes: number;
  originalBits: number;
  mazeCells: number;
  mazeBits: number;
  ratio: number;
} {
  const originalBits = originalBytes * 8;
  const height = maze.length;
  const width = maze[0]?.length ?? 0;
  const mazeCells = height * width;
  return { originalBytes, originalBits, mazeCells, mazeBits: mazeCells, ratio: originalBits / mazeCells };
}
