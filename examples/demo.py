#!/usr/bin/env python3
"""
LabyrinthOS demo: encode file into maze and decode back.
Optional encryption via password.
"""
import sys
from pathlib import Path
from labyrinthos.file_ingestion import read_bytes
from labyrinthos.maze_generator import generate_maze
from labyrinthos.path_solver import solve_maze
from labyrinthos.decoder import decode_bits_from_maze, validate
from labyrinthos.visualizer import ascii_visualize
from labyrinthos.compression import compute_ratio
from labyrinthos.maze_io import save_maze, load_maze

def main():
    if len(sys.argv) < 2:
        print("Usage: python demo.py <file> [--password PASS] [--save maze.txt] [--load maze.txt]")
        sys.exit(1)
    filepath = sys.argv[1]
    pwd = None
    save_path = None
    load_path = None
    args = sys.argv[2:]
    i = 0
    while i < len(args):
        if args[i] == '--password' and i+1 < len(args):
            pwd = args[i+1]; i += 2
        elif args[i] == '--save' and i+1 < len(args):
            save_path = args[i+1]; i += 2
        elif args[i] == '--load' and i+1 < len(args):
            load_path = args[i+1]; i += 2
        else:
            i += 1

    if load_path:
        maze = load_maze(load_path)
        print(f"Loaded maze from {load_path}, size: {len(maze[0])}x{len(maze)}")
    else:
        data = read_bytes(filepath)
        print(f"Loaded {len(data)} bytes")
        maze = generate_maze(data, password=pwd)
        h, w = len(maze), len(maze[0])
        print(f"Maze size: {w}x{h}")
        if save_path:
            save_maze(maze, save_path)
            print(f"Saved maze to {save_path}")

    path = solve_maze(maze)
    print(f"Shortest path length: {len(path)}")

    recovered = decode_bits_from_maze(maze, password=pwd)
    ok = validate(maze, read_bytes(filepath) if not load_path else b"", password=pwd)  # if loaded, we need original data for validation; skip
    print(f"Validation: {'PASS' if ok else 'FAIL (requires original data)'}")
    print(f"Recovered {len(recovered)} bytes")
    print("Recovered data (truncated):", recovered[:80])

    if not load_path:
        stats = compute_ratio(len(read_bytes(filepath)), maze)
        print("\nCompression analysis:")
        print(f" Original bits: {stats['original_bits']}")
        print(f" Maze bits: {stats['maze_bits']}")
        print(f" Ratio: {stats['ratio']:.3f}")

    print("\n--- Maze Preview (first 80 columns) ---")
    print(ascii_visualize(maze, max_width=80))

if __name__ == "__main__":
    main()