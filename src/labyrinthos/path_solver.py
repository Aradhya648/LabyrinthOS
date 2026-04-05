from collections import deque
from typing import List, Tuple

def solve_maze(maze: List[List[int]]) -> List[Tuple[int, int]]:
    """BFS shortest path from entry (1,0) to exit (H-2, W-1)."""
    H = len(maze)
    W = len(maze[0]) if H > 0 else 0
    start = (1, 0)
    goal = (H - 2, W - 1)

    visited = {start: None}
    queue = deque([start])

    while queue:
        y, x = queue.popleft()
        if (y, x) == goal:
            break
        for dy, dx in [(0, 1), (1, 0), (0, -1), (-1, 0)]:
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and maze[ny][nx] == 0 and (ny, nx) not in visited:
                visited[(ny, nx)] = (y, x)
                queue.append((ny, nx))

    if goal not in visited:
        raise RuntimeError("No path found from entry to exit")

    path = []
    cur = goal
    while cur is not None:
        path.append(cur)
        cur = visited[cur]
    path.reverse()
    return path
