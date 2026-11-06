# Faithfulness v3.1 — pixel-preserving proof

**Experimental, not a real provider masked-image repair.** The files here contain no actual character image or API credential.

Install `pillow numpy`, then run `python test_faithfulness_gate.py` from this directory.

The gate accepts original image, edited candidate and a same-sized grayscale allowed-region mask (white editable; black frozen). It writes a proposed composite using candidate pixels only where permitted, plus an audit JSON. Unmasked pixels are copied exactly from source.

A successful synthetic test confirms *pixel-level preservation outside the edit mask only.* It does not certify that foundation, blush, skin texture, eye corners or identity are correct inside the edit mask.

A separate local demonstration changed cheek-area colour saturation in a 1254×1254 portrait: 165,805 changed pixels inside mask, zero outside. The image and mask stay out of this public repository. No candidate has been approved.

Before production: connect a real masked editing provider, test source identity stability, inspect native-resolution skin and makeup independently, require human QA, and never overwrite original image masters.
