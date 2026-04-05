import { useState, useCallback } from 'react';
import MazeCanvas from '@/components/MazeCanvas';
import {
  arrayBufferToBits,
  generateMaze,
  solveMaze,
  bitsToBytes,
  sha256,
  computeRatio,
  xorBits,
} from '@/lib/labyrinthos';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    maze: number[][];
    path: [number, number][];
    originalHash: string;
    recoveredHash: string;
    valid: boolean;
    stats: ReturnType<typeof computeRatio>;
    recoveredBytes: number;
    timeMs: number;
  } | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const run = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const t0 = performance.now();

      const bits = arrayBufferToBits(arrayBuffer);
      const maze = generateMaze(bits, password || undefined);
      const path = solveMaze(maze);

      const extractedBits: number[] = [];
      for (let x = 1; x < maze[0].length - 1; x++) {
        extractedBits.push(maze[0][x]);
      }

      const decryptedBits = password ? xorBits(extractedBits, password) : extractedBits;
      const recoveredBytes = bitsToBytes(decryptedBits);

      const [originalHash, recoveredHash] = await Promise.all([
        sha256(arrayBuffer),
        sha256(recoveredBytes.buffer as ArrayBuffer),
      ]);
      const valid = originalHash === recoveredHash;

      const stats = computeRatio(new Uint8Array(arrayBuffer).length, maze);
      const t1 = performance.now();

      setResult({
        maze,
        path,
        originalHash,
        recoveredHash,
        valid,
        stats,
        recoveredBytes: recoveredBytes.length,
        timeMs: t1 - t0,
      });
    } catch (e: any) {
      setError(e.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [file, password]);

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-8">
      <header className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-primary">
          LabyrinthOS
        </h1>
        <p className="text-muted">
          Spatial File Encoding Engine — files become deterministic mazes; shortest paths become reversible storage.
        </p>
      </header>

      <section className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Upload file</label>
            <input
              type="file"
              onChange={handleFile}
              className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-surface file:text-primary hover:file:bg-gray-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Encryption password (optional)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave empty for none"
              className="w-full rounded border border-gray-700 bg-black px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            onClick={run}
            disabled={!file || loading}
            className="px-4 py-2 bg-primary text-white font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition"
          >
            {loading ? 'Processing…' : 'Generate Maze'}
          </button>

          {error && (
            <div className="p-3 border border-red-800 bg-red-900/30 text-red-200 rounded text-sm">
              {error}
            </div>
          )}

          {result && (
            <div className="space-y-4 pt-4 border-t border-gray-800">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted">File size</span>
                  <p>{result.stats.originalBytes} bytes</p>
                </div>
                <div>
                  <span className="text-muted">Maze size</span>
                  <p>
                    {result.maze[0].length} × {result.maze.length} cells
                  </p>
                </div>
                <div>
                  <span className="text-muted">Path length</span>
                  <p>{result.path.length} steps</p>
                </div>
                <div>
                  <span className="text-muted">Solve time</span>
                  <p>{result.timeMs.toFixed(1)} ms</p>
                </div>
                <div>
                  <span className="text-muted">Compression ratio</span>
                  <p>{result.stats.ratio.toFixed(3)}</p>
                </div>
                <div>
                  <span className="text-muted">Validation</span>
                  <p className={result.valid ? 'text-success' : 'text-red-400'}>
                    {result.valid ? 'PASS (SHA256 match)' : 'FAIL'}
                  </p>
                  {result.valid && (
                    <p className="text-xs text-muted mt-1">
                      Original: {result.originalHash}
                    </p>
                  )}
                </div>
              </div>
              {result.recoveredBytes > 0 && (
                <div className="text-sm">
                  <span className="text-muted">Recovered file size: </span>
                  {result.recoveredBytes} bytes
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Maze Visualization</h2>
          {result ? (
            <MazeCanvas maze={result.maze} path={result.path} cellSize={4} />
          ) : (
            <div className="h-64 border border-dashed border-gray-700 rounded flex items-center justify-center text-muted">
              Generate a maze to visualize
            </div>
          )}
        </div>
      </section>

      <footer className="text-xs text-muted pt-8 border-t border-gray-800">
        <p>LabyrinthOS — experimental computational storage prototype.</p>
        <p>Core deterministic corridor engine with optional XOR encryption.</p>
      </footer>
    </div>
  );
}