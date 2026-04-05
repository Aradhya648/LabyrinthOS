def save_maze(maze: list, path: str) -> None:
    """Save maze as plain text grid of 0/1 digits, one row per line."""
    with open(path, 'w') as f:
        for row in maze:
            f.write(''.join(str(c & 1) for c in row) + '\n')

def load_maze(path: str) -> list:
    """Load maze from text grid."""
    maze = []
    with open(path, 'r') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            row = [int(ch) for ch in line if ch in '01']
            if len(row) > 0:
                maze.append(row)
    return maze