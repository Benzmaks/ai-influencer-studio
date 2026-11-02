PHASE 5 PRIVATE MONTEREY PREVIEW

Save unsaved Studio work first. Extract this ZIP into Downloads, then paste into Terminal:
/bin/bash "$HOME/Downloads/Phase 5 Preview/Preview Phase 5.command"

The updater backs up your existing private database/source/environment, installs a pinned Phase 5 snapshot, preserves login/characters/scenes/images/assets, applies the additive history migration and restarts the private app, Redis and worker. It retains the launcher-root fix from Phase 4. No database reset or public deployment occurs. Keep Postgres.app installed. Existing Redis is reused; if missing, official checksum-verified Redis source is built locally (Apple Command Line Tools may be required). No Docker or Homebrew is needed.

Use your existing login at http://localhost:3000. The starter copies the private password to your clipboard; type the email, then press Command-V in the browser password field.

Test:
1. Create/select a Character and photography Scene; generate mock images in Images.
2. On an image choose Edit & history.
3. Choose a preset or enter a natural-language edit; Request mock edit.
4. Wait for completed child versions in Image version tree.
5. Compare with source, zoom either image, then Select preferred final and Download.
6. Open Assets to search/filter by character, scene, version type, favourites, rejected or final selection.
7. Select 2–4 images and Compare selected. Duplicate image preserves identical bytes in a new child record.

These are SIMULATED MOCK edits of geometric test patterns, not real photo retouching or AI influencer photography. No paid or real providers are connected. Canonical DNA/signature changes are blocked or directed to explicit permanent character-version creation. Image-only instructions never overwrite saved character/scene versions. Original files stay intact.

Use the existing Start Studio.command/Stop Studio.command for later sessions. Never share source/.env, private passwords or .local/backups. Physical Mac execution and backup restoration remain unverified in the cloud. Native hosted CI verifies migrations; the cloud's separately labeled local SQL fixture is not a supported Prisma migration deployment. Phase 6 has not started.
