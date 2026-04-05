import pytest
from labyrinthos.compression import compute_ratio

def test_compute_ratio():
    ratio = compute_ratio(100, [[0]*102 for _ in range(3)])  # 100 bytes => 800 bits, maze 3*102=306 bits -> ratio >1? Actually 800/306 ≈ 2.6
    assert ratio["original_bytes"] == 100
    assert ratio["maze_cells"] == 306
    assert ratio["ratio"] == pytest.approx(800/306)