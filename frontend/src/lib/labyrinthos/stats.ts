export function computeRatio(originalBytes: number, maze: number[][]): {
  originalBytes: number;
  originalBits: number;
  mazeCells: number;
  bitsPerCell: number;
  ratio: number;
} {
  const originalBits = originalBytes * 8;
  const height = maze.length;
  const width = maze[0]?.length ?? 0;
  const mazeCells = height * width;
  const bitsPerCell = mazeCells > 0 ? originalBits / mazeCells : 0;
  return { originalBytes, originalBits, mazeCells, bitsPerCell, ratio: bitsPerCell };
}
