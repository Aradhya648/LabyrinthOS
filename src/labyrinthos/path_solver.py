from collections import deque
from typing import List, Tuple

def solve_maze(maze: List[List[int]]) -> List[Tuple[int, int]]:
    """
    BFS shortest path from entry (1,0) to exit (h-2, w-1).
    Returns list of coordinates from entry to exit inclusive.
    """
    height = len(maze)
    width = len(maze[0]) if height > 0 else 0
    start = (1, 0)
    goal = (height-2, width-1)

    # BFS
    queue = deque([start])
    visited = {start: None}  # parent map

    while queue:
        y, x = queue.popleft()
        if (y, x) == goal:
            break
        for dy, dx in [(1,0),(-1,0),(0,1),(0,-1)]:
            ny, nx = y+dy, x+dx
            if 0 <= ny < height and 0 <= nx < width and maze[ny][nx] == 0 and (ny,nx) not in visited:
                visited[(ny,nx)] = (y,x)
                queue.append((ny,nx))

    if goal not in visited:
        raise RuntimeError("No path found")

    # Reconstruct path
    path = []
    cur = goal
    while cur is not None:
        path.append(cur)
        cur = visited[cur]
    path.reverse()
    return path