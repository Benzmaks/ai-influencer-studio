PHASE 3 PREVIEW — YOUR EXISTING MONTEREY STUDIO

Save any unsaved Studio work first. Keep Postgres.app installed.

Open Terminal and paste this exact command (including its first slash):
/bin/bash "$HOME/Downloads/Phase 3 Preview/Preview Phase 3.command"

The updater finds your existing AI Influencer Studio Monterey folder in Downloads, or asks you to select it. It stops the Studio, backs up your private database/source/environment locally, installs a pinned Phase 3 source snapshot, and uses the existing starter to migrate and reopen the browser. Your projects, characters, private password and assets are preserved. No reset or public deployment occurs.

Use the same login. The starter copies the password to your clipboard; type the email first, then press Command-V in the password field.

To test:
1. Choose or create a project in Projects.
2. Have a complete saved Character DNA profile (basic identity alone cannot prepare prompts).
3. Scenes → Create scene. Choose your influencer and saved version.
4. Explore mock concepts, customize the setting, style and camera choices.
5. Save draft, reopen it from Scenes, and continue to Continuity & review.
6. Try an appearance change. Facial structure, body proportions and signature imperfections are protected. Keep canonical appearance to resolve protected changes; permitted hair/makeup/fashion overrides may be scene-only. Permanent changes are made in Character DNA as new versions.
7. Check continuity & prepare prompts, inspect/copy them and Save ready scene.
8. Duplicate the scene and inspect immutable scene history.

This phase prepares labeled deterministic mock prompts only; no images or videos are generated and no paid AI keys are needed. Images/Videos and later modules remain Planned. This preview does not merge any pull request or begin Phase 4.

Backups are in your Studio's .local/backups folder and contain private information. Never upload or share that folder, source/.env or .local/database-password. Automatic restore/reset is intentionally absent. A physical Mac test of this updater was not available; bash syntax and archive packaging are checked in the development environment. It preserves your existing Monterey Node 22 compatibility setup; standard CI uses Node 24.
