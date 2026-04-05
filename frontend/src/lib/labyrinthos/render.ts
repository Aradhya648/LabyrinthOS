export function ascii(maze: number[][], maxWidth: number = 80): string {
  const lines = maze.map((row) => {
    const line = row
      .slice(0, maxWidth)
      .map((cell) => (cell ? '█' : ' '))
      .join('');
    return line;
  });
  if (maze[0].length > maxWidth) lines[0] += '...';
  return lines.join('\n');
}