def compute_ratio(original_bytes: int, maze: list) -> dict:
    """Compute storage efficiency metrics."""
    orig_bits = original_bytes * 8
    height = len(maze)
    width = len(maze[0])
    maze_bits = height * width
    return {
        "original_bytes": original_bytes,
        "original_bits": orig_bits,
        "maze_cells": height * width,
        "maze_bits": maze_bits,
        "ratio": orig_bits / maze_bits if maze_bits else 0,
    }