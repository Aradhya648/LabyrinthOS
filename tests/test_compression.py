import pytest
from labyrinthos.compression import compute_ratio

def test_compute_ratio():
    maze = [[0] * 51 for _ in range(51)]  # 51x51 maze
    ratio = compute_ratio(100, maze)
    assert ratio["original_bytes"] == 100
    assert ratio["maze_cells"] == 51 * 51
    assert ratio["ratio"] == pytest.approx(800 / (51 * 51))
