import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MazeCanvas from '@/components/MazeCanvas';
import { encode, decode, sha256 } from '@/lib/labyrinthos';
import type { EncodeResult } from '@/lib/labyrinthos';

interface Result extends EncodeResult {
  originalHash: string;
  recoveredHash: string;
  valid: boolean;
}

const MAX_FILE_SIZE = 512 * 1024; // 512 KB

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const f = e.target.files[0];
      if (f.size > MAX_FILE_SIZE) {
        setError(`File too large (${(f.size / 1024).toFixed(0)} KB). Max ${MAX_FILE_SIZE / 1024} KB.`);
        return;
      }
      setError(null);
      setFile(f);
    }
  };

  const run = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    // Yield to renderer so loading state shows
    await new Promise(r => setTimeout(r, 16));

    try {
      const buf = await file.arrayBuffer();
      const encResult = encode(buf, password || undefined);
      const recovered = decode(encResult.maze, password || undefined);

      const [origHash, recHash] = await Promise.all([
        sha256(buf),
        sha256(recovered),
      ]);

      setResult({
        ...encResult,
        originalHash: origHash,
        recoveredHash: recHash,
        valid: origHash === recHash,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [file, password]);

  const handleDownload = useCallback(() => {
    if (!result) return;
    try {
      const recovered = decode(result.maze, password || undefined);
      const blob = new Blob([recovered]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file?.name ? `recovered_${file.name}` : 'recovered_file';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Download failed — decode error');
    }
  }, [result, password, file]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <header className="px-6 pt-12 pb-8 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
          LABYRINTHOS
        </h1>
        <p className="mt-3 text-base sm:text-lg text-zinc-400 max-w-xl mx-auto">
          Files become mazes. Paths become reversible storage.
        </p>
        <p className="mt-1 text-sm text-zinc-600 max-w-md mx-auto">
          Upload a file. Watch it become a deterministic maze. Recover it exactly.
        </p>
      </header>

      {/* Main three-panel layout */}
      <main className="flex-1 px-4 sm:px-6 pb-8">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-[260px_1fr_260px] gap-5">
          {/* Left: Controls */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#0f0f0f] border border-[#1a1a1a]">
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-3">
                Input
              </h3>

              <label className="block mb-3">
                <span className="text-sm text-zinc-400 mb-1 block">File</span>
                <input
                  type="file"
                  onChange={handleFile}
                  className="block w-full text-sm text-zinc-500
                    file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0
                    file:text-sm file:font-medium file:bg-[#161616] file:text-zinc-300
                    hover:file:bg-[#1f1f1f] file:cursor-pointer file:transition"
                />
                {file && (
                  <p className="mt-1 text-[11px] text-zinc-600 truncate">
                    {file.name} &mdash; {file.size.toLocaleString()} bytes
                  </p>
                )}
              </label>

              <label className="block mb-4">
                <span className="text-sm text-zinc-400 mb-1 block">
                  Encryption password
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] px-3 py-2 text-sm
                    text-zinc-300 placeholder:text-zinc-700
                    focus:outline-none focus:ring-1 focus:ring-cyan-800 focus:border-cyan-800 transition"
                />
              </label>

              <button
                onClick={run}
                disabled={!file || loading}
                className="w-full py-2.5 rounded-lg font-medium text-sm transition
                  bg-gradient-to-r from-cyan-600 to-emerald-600
                  hover:from-cyan-500 hover:to-emerald-500
                  disabled:opacity-40 disabled:cursor-not-allowed
                  text-white shadow-lg shadow-cyan-900/20"
              >
                {loading ? 'Processing\u2026' : 'Generate Maze'}
              </button>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-3 rounded-lg border border-red-900/50 bg-red-950/30 text-red-400 text-sm"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Center: Maze */}
          <div className="min-h-[420px] lg:min-h-[520px]">
            {result ? (
              <MazeCanvas maze={result.maze} path={result.path} />
            ) : (
              <div className="h-full min-h-[420px] rounded-xl border border-dashed border-[#1a1a1a] bg-[#070707] flex items-center justify-center">
                <p className="text-zinc-700 text-sm">Generate a maze to visualize</p>
              </div>
            )}
          </div>

          {/* Right: Metrics */}
          <div className="space-y-3">
            <AnimatePresence>
              {result ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-3"
                >
                  <Metric label="File Size" value={`${result.originalSize.toLocaleString()} bytes`} />
                  <Metric
                    label="Compressed"
                    value={`${result.compressedSize.toLocaleString()} bytes`}
                    sub={`${(result.compressionRatio * 100).toFixed(1)}% of original`}
                  />
                  <Metric
                    label="Maze"
                    value={`${result.mazeWidth} \u00d7 ${result.mazeHeight}`}
                    sub={`${(result.mazeWidth * result.mazeHeight).toLocaleString()} cells`}
                  />
                  <Metric
                    label="Path Length"
                    value={`${result.pathLength.toLocaleString()} steps`}
                  />
                  <Metric
                    label="Solve Time"
                    value={`${result.solveTimeMs.toFixed(1)} ms`}
                    sub={`${result.totalTimeMs.toFixed(0)} ms total`}
                  />
                  <Metric
                    label="Validation"
                    value={result.valid ? 'SHA-256 PASS' : 'FAIL'}
                    accent={result.valid ? 'success' : 'error'}
                    sub={result.valid ? result.originalHash.slice(0, 20) + '\u2026' : undefined}
                  />

                  {result.valid && (
                    <button
                      onClick={handleDownload}
                      className="w-full mt-1 py-2 rounded-lg text-sm font-medium
                        border border-emerald-900/50 text-emerald-400
                        hover:bg-emerald-950/30 transition"
                    >
                      Download Recovered File
                    </button>
                  )}
                </motion.div>
              ) : (
                <div className="p-4 rounded-xl bg-[#0f0f0f] border border-[#1a1a1a]">
                  <p className="text-zinc-700 text-sm text-center">
                    Metrics appear after generation
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Step explainer */}
      <section className="px-6 py-8 border-t border-[#111]">
        <div className="max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3">
          <Step num={1} text="File becomes binary" />
          <Step num={2} text="Binary shapes maze" />
          <Step num={3} text="Shortest path encodes storage" />
          <Step num={4} text="Path reconstructs original file" />
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-6 text-center text-xs text-zinc-700 border-t border-[#111]">
        LabyrinthOS &mdash; experimental spatial file encoding engine
      </footer>
    </div>
  );
}

// --- Helper components ---

function Metric({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: 'success' | 'error';
}) {
  const color =
    accent === 'success'
      ? 'text-emerald-400'
      : accent === 'error'
      ? 'text-red-400'
      : 'text-zinc-200';
  return (
    <div className="p-3 rounded-lg bg-[#0f0f0f] border border-[#1a1a1a]">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-1">
        {label}
      </p>
      <p className={`text-sm font-medium ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-zinc-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function Step({ num, text }: { num: number; text: string }) {
  return (
    <div className="p-3 rounded-lg bg-[#0a0a0a] border border-[#141414] text-center">
      <div className="w-6 h-6 rounded-full bg-[#161616] border border-[#1e1e1e] mx-auto mb-2 flex items-center justify-center text-[10px] text-zinc-500 font-mono">
        {num}
      </div>
      <p className="text-xs text-zinc-500">{text}</p>
    </div>
  );
}
