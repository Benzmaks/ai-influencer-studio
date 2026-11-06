# Experimental masked skin-edit faithfulness gate (v3.1)

**Status: experimental / NOT integrated or approved.** No real provider edit has yet passed the skin/glamour quality gates.

## Goal
Use the frozen emerald lounge source with three independent cheek/forehead masks:
- A conservative single-cheek region
- B bilateral cheeks
- C cheeks + forehead

All tests begin from the same frozen original. Preserve locked facial identity, approved teeth, bronze glamour makeup and body lighting. Use only permitted edits, then composite **exact original pixels** outside the mask. Never overwrite the source or mark results approved automatically.

## Provider contract
- Supply original source as input 1, plus a PNG mask where **alpha 0 is editable**.
- If exact output dimensions are unsupported, use an unscaled native 1024 × 1024 facial tile (source bounds x=48..1072, y=64..1088). The original image is 1122 × 1402 and is never resized. Generate an edited 1024 × 1024 tile, paste it back at the original tile location, then composite only approved editable pixels onto the full frozen source. Reject any provider output of unexpected size.
- A masked-edit API can treat masks as guidance and may alter unmasked pixels. Always post-composite candidate with frozen source outside edit region.
- A provider edit is **not** a successful repair until a human reviews native-resolution skin and makeup.

## Independent approval gates
1. Pixel preservation outside allowed region: exact match.
2. Facial skin: non-repeating natural microtexture, no embossed fingerprint/maze structure.
3. Glamour makeup: eyeshadow, eyeliner, lashes, blush, contour and lip intensity preserved.
4. Identity, eyelid corners and tooth geometry unchanged.
5. Body skin not contaminated with artificial dots/lines, oil or unwanted freckles.

Failure in ANY gate rejects the candidate. Approved masters remain immutable.

## Execution
Use the versioned Python provider adapter and validator in the packaged v3.1 pilot. The adapter needs `OPENAI_API_KEY` only for `--execute`. Dry-run creates a manifest and correctly transparent masks without using an API. Never store credentials or licensed personal reference images in this public repository.

## Tested so far
- All three mask polarities, native dimensions (1122x1402), and provider padding dimensions (1136x1408) passed local tests.
- No live API call performed: no credentials in execution environment.
- No automated skin-artifact classifier or glamour intensity classifier validated.
