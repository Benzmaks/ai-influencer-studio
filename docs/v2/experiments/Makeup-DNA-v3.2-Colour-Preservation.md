# DAS Makeup DNA v3.2 — Preserve colour and reduce cosmetic intensity

**Status: experimental. Not a real makeup-layer separation, not an approved new master.**

## Failure in v3.1
The first local pilot used LAB chroma reduction toward neutral gray, effectively reducing warm skin/rose blush saturation. User rejected the result as muddy, bruise-like colour loss.

## Wording
> Soften the apparent **pigment density and opacity** of selected blush and contour, while preserving the original peach/rose hue, undertone, warmth, luminance, specular highlights and the approved makeup aesthetic. Do not desaturate the skin or turn contour gray. Preserve all unchanged regions pixel-for-pixel. Apply no unrelated skin texture or identity changes.

Never interpret "30% softer makeup" as "30% less RGB saturation."

## Experimental algorithm tested locally
The image contains no separate foundation and blush layers, so real opacity reduction cannot be inferred directly. A conservative substitute was tested:

1. Keep original portrait and cheek mask.
2. Convert pixels to LAB.
3. Leave L and b unchanged.
4. For the a channel, attenuate only positive *excess redness* above a trial baseline `a=153`:
   `a_new = a_old - 0.30 * max(0, a_old - 153) * feathered_mask`.
5. Convert to RGB and composite only where mask is nonzero, preserving source pixels elsewhere.
6. Compare original, old rejected desaturation and new candidate side-by-side at native resolution.

In this particular local demonstration (1254 x 1254), 142,027 pixels changed inside the 165,805-pixel allowed region and 0 changed outside. The candidate is **UNAPPROVED** and user review pending.

This is an illustrative single-image method with a hand-selected skin baseline, **not** a general makeup segmentation system. LAB conversions can alter within-mask RGB texture and no automatic glamour scorer is calibrated.

## Release gate
Reject automatically for forbidden-region pixel edits; reject by human review if blush loses warmth, becomes muddy/bruised, eye/lip makeup changes, natural skin deteriorates or identity drifts. Never overwrite frozen masters. Next production step: obtain dedicated makeup masks or true cosmetic layers and test mask-conditioned edits against human judgment.
