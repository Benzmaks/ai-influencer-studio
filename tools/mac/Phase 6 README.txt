PHASE 6 PRIVATE MONTEREY PREVIEW — VIDEO STUDIO

Keep Postgres.app installed. Save unsaved Studio work first. Extract this ZIP into Downloads, then paste into Terminal:
/bin/bash "$HOME/Downloads/Phase 6 Preview/Preview Phase 6.command"

The updater backs up the private database, source and environment, installs a fixed reviewed Phase 6 source snapshot, preserves your login, projects, characters, scenes and image assets, applies the additive video migration and restarts the private app, Redis and shared image/video worker. Existing local asset files stay in place. It retains the launcher-root fix and dependency security fixes. No database reset, Docker, Homebrew, ffmpeg installation or paid keys are needed. Keep private backups on this Mac; never share them.

Open http://localhost:3000 and use your existing login. The starter copies the private password to your clipboard; paste it only into the browser password field using Command-V.

TEST THE COMPLETE WORKFLOW
1. Create/select a complete Character DNA profile and save a Scene.
2. In Images generate a mock image and Favourite it, or select it as final in Assets.
3. Open Videos. Select the same exact character and scene versions.
4. Name the storyboard. Edit framing, action, expression and camera movement. Expand facial performance planning for mouth movement, smile-to-laughter, eye-mouth coordination and onset/peak/release timing.
5. Add/reorder/duplicate shots. Keep each shot at 2 seconds for this mock provider. Save draft, reload to resume, then Save storyboard.
6. Generate mock video in Text-to-video mode. Wait for completion; play and download the per-shot clips.
7. Choose Image-to-video, select the matching approved image and generate again.
8. Save another storyboard revision. Earlier generation references stay unchanged. Inspect immutable storyboard history, generation metadata and Assets' video history.

MOCK LIMITS
Each shot returns a repeated fixed silent two-second MP4 test sample, not generated influencer footage. Inputs and facial/audio/timing plans are saved, but are not rendered as realistic movement or synthesized dialogue. Clips are not stitched into a film. Variations, video editing and extension are unsupported and have no pretend-working buttons. No real or paid providers are connected.

If jobs stay queued, use Stop Studio.command then Start Studio.command and check Settings. Both PostgreSQL and Redis plus the media worker are required. Source images must be completed, non-rejected and Favourite or final from the exact saved DNA/Scene versions.

The existing Node 24 engine notice (this private preview uses tested Node 22) and ESLint 9 maintenance notice are separate from security findings; the inherited dependency audit is clean. Do not run npm audit fix --force.

Use Start Studio.command and Stop Studio.command for later sessions. Never share source/.env, passwords or .local/backups. Physical Mac execution and backup restoration cannot be verified in the cloud. Supported native migration evidence is recorded in docs/phase-6-validation.md; local cloud SQL fixtures are not Prisma migration deployments. Phase 7 has not started.
