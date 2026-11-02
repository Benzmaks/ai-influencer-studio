PHASE 4 PRIVATE MONTEREY PREVIEW

Save your work first. Download/extract this folder into Downloads, then paste this in Terminal:
/bin/bash "$HOME/Downloads/Phase 4 Preview/Preview Phase 4.command"

The updater backs up your private database/source/environment, installs a fixed Phase 4 source commit, and preserves existing login, characters, scenes and assets. No database reset, public deployment or paid AI requests occur.

This phase needs Redis and an image worker. Docker/Homebrew are not required. The updater builds a checksum-verified official Redis 7.4.6 source snapshot in a temporary folder, copies the executables into the Studio's .local folder, configures a random private Redis password on loopback port 56379, and installs Start/Stop Studio wrappers that handle Redis and the background worker. If Apple Command Line Tools are missing, Apple's installer opens: complete it, then run the updater again. The first build may take a few minutes. Keep Postgres.app installed.

After startup, use your existing email/password. The starter copies your private password to the clipboard; type the email, then paste the password with Command-V.

Test:
1. Choose/create a project.
2. Create or select a complete Character DNA profile.
3. Create a photography scene, resolve continuity and save.
4. Images: choose exact character/scene versions, 1/2/4/8 results, aspect ratio and seed.
5. Generate mock images, wait for the gallery, then Favourite or Reject.
6. Download a result; inspect Generation details.
7. Create variations from a result; originals remain saved.
8. Assets provides filters and downloads. Cancel queued/processing jobs if desired.

Outputs are labeled geometric MOCK test patterns, not AI influencer photographs. No paid keys are required. Collections and image editing are not implemented. This does not merge the PR or begin Phase 5.

Use Start Studio.command and Stop Studio.command in your existing Studio folder for later sessions. Backups and credentials are private: never share .local/backups, source/.env, .local/database-password or .local/redis-password. Actual physical Mac Redis compilation and backup restoration could not be tested in the cloud; shell syntax, source checksum and packaging were verified. Existing Monterey Node 22 is retained; normal CI uses Node 24.
