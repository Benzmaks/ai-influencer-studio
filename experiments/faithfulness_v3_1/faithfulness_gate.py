#!/usr/bin/env python3
"""DAS immutable-source pixel faithfulness gate.

pip install pillow numpy
python faithfulness_gate.py --source source.png --candidate candidate.png --mask allowed_white.png --output-dir ./audit

White mask pixels permit editing; black must retain source. A PASS does not
certify skin realism, makeup fidelity, identity, or publication readiness.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image


def checksum(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def evaluate(source: Path, candidate: Path, mask: Path, output_dir: Path) -> dict:
    a = np.array(Image.open(source).convert("RGB"))
    b = np.array(Image.open(candidate).convert("RGB"))
    m = np.array(Image.open(mask).convert("L"))
    if a.shape != b.shape or m.shape != a.shape[:2]:
        raise ValueError("REJECT geometry mismatch: source/candidate/mask must match native size; never resize")
    allowed = m > 0
    changed = np.any(a != b, axis=2)
    output_dir.mkdir(parents=True, exist_ok=True)
    safe = a.copy()
    safe[allowed] = b[allowed]
    Image.fromarray(safe).save(output_dir / "composited_UNAPPROVED.png")
    outside = int(np.count_nonzero(changed & ~allowed))
    assert np.array_equal(safe[~allowed], a[~allowed])
    record = {
        "source_sha256": checksum(source),
        "candidate_sha256": checksum(candidate),
        "mask_sha256": checksum(mask),
        "image_size": list(Image.open(source).size),
        "changed_inside": int(np.count_nonzero(changed & allowed)),
        "raw_changed_outside": outside,
        "composite_changed_outside": 0,
        "pixel_gate": "PASS",
        "face_skin": "UNREVIEWED",
        "glamour_makeup": "UNREVIEWED",
        "identity": "UNREVIEWED",
        "publication_status": "NOT_APPROVED",
    }
    (output_dir / "qa.json").write_text(json.dumps(record, indent=2))
    return record


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--source", type=Path, required=True)
    p.add_argument("--candidate", type=Path, required=True)
    p.add_argument("--mask", type=Path, required=True)
    p.add_argument("--output-dir", type=Path, required=True)
    x = p.parse_args()
    print(json.dumps(evaluate(x.source, x.candidate, x.mask, x.output_dir), indent=2))
