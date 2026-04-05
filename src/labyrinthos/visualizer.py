def ascii_visualize(maze: list, max_width: int = 80) -> str:
    """Render maze as ASCII with optional width truncation."""
    lines = []
    for row in maze:
        line = ''.join('█' if cell else ' ' for cell in row[:max_width])
        lines.append(line)
    if len(maze[0]) > max_width:
        lines[0] += '...'
    return '\n'.join(lines)