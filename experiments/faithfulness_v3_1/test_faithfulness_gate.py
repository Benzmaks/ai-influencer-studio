"""Self-contained synthetic pixel test (no character images or credentials)."""
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image
from faithfulness_gate import evaluate


def test_composite_protects_outside():
    with tempfile.TemporaryDirectory() as tmp:
        p = Path(tmp)
        source = np.full((32, 32, 3), 100, dtype=np.uint8)
        candidate = source.copy()
        candidate[2, 2] = [250, 10, 10]     # forbidden
        candidate[15, 15] = [170, 10, 10] # permitted
        mask = np.zeros((32, 32), np.uint8)
        mask[11:22, 11:22] = 255
        for name, array in [("source", source), ("candidate", candidate), ("mask", mask)]:
            Image.fromarray(array).save(p / f"{name}.png")
        report = evaluate(p / "source.png", p / "candidate.png", p / "mask.png", p / "out")
        assert report["raw_changed_outside"] == 1
        assert report["changed_inside"] == 1
        safe = np.array(Image.open(p / "out/composited_UNAPPROVED.png"))
        assert np.array_equal(safe[2, 2], source[2, 2])
        assert np.array_equal(safe[15, 15], candidate[15, 15])
        assert report["publication_status"] == "NOT_APPROVED"


if __name__ == "__main__":
    test_composite_protects_outside()
    print("PASS")
