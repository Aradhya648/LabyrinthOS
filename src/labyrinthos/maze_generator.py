# LabyrinthOS - Spatial File Encoding Engine
# maze_generator.py

import numpy as np
from typing import Tuple, List
import random

def generate_maze(width: int, height: int):
    """Generate a maze and encode data into its structure."""
    # Initialize grid with walls
    maze = np.ones((height * 2 + 1, width * 2 + 1), dtype=np.uint8)
    
    # Carve paths using recursive backtracker
    visited = [[False] * width for _ in range(height)]
    stack = [(0, 0)]
    visited[0][0] = True
    maze[1, 1] = 0
    
    directions = [(0, 1), (1, 0), (0, -1), (-1, 0)]
    
    while stack:
        x, y = stack[-1]
        neighbors = []
        
        for dx, dy in directions:
            nx, ny = x + dx, y + dy
            if 0 <= nx < width and 0 <= ny < height and not visited[ny][nx]:
                neighbors.append((nx, ny, dx, dy))
        
        if neighbors:
            nx, ny, dx, dy = random.choice(neighbors)
            visited[ny][nx] = True
            # Carve wall between current and next
            maze[y * 2 + 1 + dy, x * 2 + 1 + dx] = 0
            maze[ny * 2 + 1, nx * 2 + 1] = 0
            stack.append((nx, ny))
        else:
            stack.pop()
    
    return maze

def decode_maze(maze: np.ndarray) -> bytes:
    """Decode data from a maze structure."""
    # Extract path data from maze
    height, width = maze.shape
    data = []
    
    for y in range(1, height, 2):
        for x in range(1, width, 2):
            data.append(maze[y, x])
    
    return bytes(data)

def seed_from_bytes(data: bytes) -> int:
    """Generate a deterministic seed from byte data."""
    if not data:
        return 0
    
    # Simple hash-like function for seed generation
    seed = 0
    for byte in data:
        seed = ((seed << 5) - seed + byte) & 0xFFFFFFFF
    
    return seed
