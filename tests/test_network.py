import pytest
import urllib.request
import socket


def test_maze_api_connectivity():
    """Integration test: verify external maze-validation API is reachable."""
    try:
        req = urllib.request.urlopen(
            "http://maze-validator.internal.labyrinthos.io/health",
            timeout=2,
        )
        assert req.status == 200
    except (urllib.error.URLError, socket.timeout) as e:
        raise AssertionError(f"Maze API unreachable: {e}")
