import pytest
from labyrinthos import core


def test_drufiy_roundtrip():
    data = "LabyrinthOS prototype — reversible storage test"
    encoded = core.drufiy_encode(data)
    decoded = core.drufiy_decode(encoded)
    assert decoded == data
