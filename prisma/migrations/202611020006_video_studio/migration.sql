BEGIN;
CREATE TABLE "Storyboard" (
 "id" TEXT PRIMARY KEY, "projectId" TEXT NOT NULL REFERENCES "Project"("id") ON DELETE RESTRICT,
 "title" TEXT NOT NULL, "revision" INTEGER NOT NULL DEFAULT 1 CHECK("revision">0), "status" TEXT NOT NULL DEFAULT 'draft' CHECK("status" IN ('draft','ready')),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 UNIQUE("projectId","id")
);
CREATE INDEX "Storyboard_projectId_updatedAt_idx" ON "Storyboard"("projectId","updatedAt");
CREATE TABLE "StoryboardRevision" (
 "id" TEXT PRIMARY KEY, "projectId" TEXT NOT NULL,"storyboardId" TEXT NOT NULL,"versionNumber" INTEGER NOT NULL CHECK("versionNumber">0),
 "title" TEXT NOT NULL,"characterId" TEXT NOT NULL,"characterVersionId" TEXT NOT NULL,"sceneId" TEXT NOT NULL,"sceneVersionId" TEXT NOT NULL,
 "createdBy" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE("projectId","storyboardId","id"), UNIQUE("storyboardId","versionNumber"),
 FOREIGN KEY("projectId","storyboardId") REFERENCES "Storyboard"("projectId","id") ON DELETE RESTRICT,
 FOREIGN KEY("projectId","characterId","characterVersionId") REFERENCES "CharacterVersion"("projectId","characterId","id") ON DELETE RESTRICT,
 FOREIGN KEY("projectId","sceneId","sceneVersionId") REFERENCES "SceneVersion"("projectId","sceneId","id") ON DELETE RESTRICT
);
CREATE TABLE "StoryboardShot" (
 "id" TEXT PRIMARY KEY,"revisionId" TEXT NOT NULL REFERENCES "StoryboardRevision"("id") ON DELETE RESTRICT,
 "shotNumber" INTEGER NOT NULL CHECK("shotNumber" BETWEEN 1 AND 8),"duration" DOUBLE PRECISION NOT NULL CHECK("duration">=0.5 AND "duration"<=30),
 "framing" TEXT NOT NULL,"camera" TEXT NOT NULL,"subject" TEXT NOT NULL,"action" TEXT NOT NULL,"expression" TEXT NOT NULL,"environment" TEXT NOT NULL,
 "cameraMovement" TEXT NOT NULL,"transition" TEXT NOT NULL,"audio" TEXT NOT NULL,"dialogue" TEXT NOT NULL,"performance" JSONB NOT NULL,
 UNIQUE("revisionId","shotNumber")
);
ALTER TABLE "Generation" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'image' CHECK("kind" IN ('image','video')),
 ADD COLUMN "storyboardId" TEXT, ADD COLUMN "storyboardRevisionId" TEXT,
 ADD CONSTRAINT "Generation_storyboard_fk" FOREIGN KEY("projectId","storyboardId","storyboardRevisionId") REFERENCES "StoryboardRevision"("projectId","storyboardId","id") ON DELETE RESTRICT,
 ADD CONSTRAINT "Generation_video_revision_check" CHECK (("kind"='image' AND "storyboardId" IS NULL AND "storyboardRevisionId" IS NULL) OR ("kind"='video' AND "storyboardId" IS NOT NULL AND "storyboardRevisionId" IS NOT NULL));
CREATE TABLE "VideoAsset" (
 "id" TEXT PRIMARY KEY,"projectId" TEXT NOT NULL,"generationId" TEXT NOT NULL,"index" INTEGER NOT NULL CHECK("index" BETWEEN 0 AND 7),
 "status" TEXT NOT NULL DEFAULT 'pending' CHECK("status" IN ('pending','completed','failed','cancelled')), "attempts" INTEGER NOT NULL DEFAULT 0,
 "key" TEXT,"checksum" TEXT,"mimeType" TEXT,"size" INTEGER,"metadata" JSONB NOT NULL,"sourceImageId" TEXT,"error" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
 UNIQUE("generationId","index"),UNIQUE("projectId","id"),
 FOREIGN KEY("projectId","generationId") REFERENCES "Generation"("projectId","id") ON DELETE RESTRICT,
 FOREIGN KEY("projectId","sourceImageId") REFERENCES "ImageAsset"("projectId","id") ON DELETE RESTRICT
);
CREATE INDEX "VideoAsset_projectId_createdAt_idx" ON "VideoAsset"("projectId","createdAt");
CREATE FUNCTION studio_storyboard_revision_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' THEN RAISE EXCEPTION 'Storyboard revisions are immutable' USING ERRCODE='23514'; END IF;
 IF NOT EXISTS(SELECT 1 FROM "SceneVersion" s WHERE s.id=NEW."sceneVersionId" AND s."projectId"=NEW."projectId" AND s."characterVersionId"=NEW."characterVersionId" AND s."characterId"=NEW."characterId") THEN
 RAISE EXCEPTION 'Storyboard character and scene versions must match' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER studio_storyboard_revision_guard BEFORE INSERT OR UPDATE ON "StoryboardRevision" FOR EACH ROW EXECUTE FUNCTION studio_storyboard_revision_guard();
CREATE FUNCTION studio_shot_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN
  IF EXISTS(SELECT 1 FROM "Generation" WHERE "storyboardRevisionId"=OLD."revisionId") THEN RAISE EXCEPTION 'Cannot delete shots from referenced storyboard revision' USING ERRCODE='23514'; END IF;
  RETURN OLD;
 END IF;
 IF TG_OP='UPDATE' THEN RAISE EXCEPTION 'Storyboard shots are immutable' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "Generation" WHERE "storyboardRevisionId"=NEW."revisionId") THEN RAISE EXCEPTION 'Cannot add shots to a referenced storyboard revision' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER studio_shot_guard BEFORE INSERT OR UPDATE OR DELETE ON "StoryboardShot" FOR EACH ROW EXECUTE FUNCTION studio_shot_guard();
CREATE FUNCTION studio_video_generation_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND (NEW.kind<>OLD.kind OR (OLD.kind='video' AND (NEW.input IS DISTINCT FROM OLD.input OR NEW."projectId"<>OLD."projectId" OR NEW."characterVersionId"<>OLD."characterVersionId" OR NEW."sceneVersionId"<>OLD."sceneVersionId" OR NEW."storyboardRevisionId" IS DISTINCT FROM OLD."storyboardRevisionId" OR NEW."storyboardId" IS DISTINCT FROM OLD."storyboardId" OR NEW."createdBy"<>OLD."createdBy" OR NEW."requestHash"<>OLD."requestHash" OR NEW."idempotencyKey"<>OLD."idempotencyKey"))) THEN
 RAISE EXCEPTION 'Video generation provenance is immutable' USING ERRCODE='23514'; END IF;
 IF NEW.kind='video' AND NOT EXISTS(SELECT 1 FROM "StoryboardRevision" s WHERE s.id=NEW."storyboardRevisionId" AND s."projectId"=NEW."projectId" AND s."storyboardId"=NEW."storyboardId" AND s."characterVersionId"=NEW."characterVersionId" AND s."sceneVersionId"=NEW."sceneVersionId") THEN
 RAISE EXCEPTION 'Video generation must match pinned storyboard references' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER studio_video_generation_guard BEFORE INSERT OR UPDATE ON "Generation" FOR EACH ROW EXECUTE FUNCTION studio_video_generation_guard();
CREATE FUNCTION studio_video_asset_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' THEN
  IF NEW."projectId"<>OLD."projectId" OR NEW."generationId"<>OLD."generationId" OR NEW."index"<>OLD."index" OR NEW."sourceImageId" IS DISTINCT FROM OLD."sourceImageId" OR NEW.metadata IS DISTINCT FROM OLD.metadata THEN RAISE EXCEPTION 'Video lineage and inputs are immutable' USING ERRCODE='23514'; END IF;
  IF OLD.status='completed' AND (NEW.status<>OLD.status OR NEW.key IS DISTINCT FROM OLD.key OR NEW.checksum IS DISTINCT FROM OLD.checksum OR NEW."mimeType" IS DISTINCT FROM OLD."mimeType" OR NEW.size IS DISTINCT FROM OLD.size) THEN RAISE EXCEPTION 'Completed video originals are immutable' USING ERRCODE='23514'; END IF;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM "Generation" WHERE id=NEW."generationId" AND "projectId"=NEW."projectId" AND kind='video') THEN RAISE EXCEPTION 'Video asset requires video generation' USING ERRCODE='23514'; END IF;
 IF NEW."sourceImageId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM "ImageAsset" a JOIN "Generation" g ON g.id=a."generationId" JOIN "Generation" v ON v.id=NEW."generationId" WHERE a.id=NEW."sourceImageId" AND a."projectId"=NEW."projectId" AND a.status='completed' AND g."characterVersionId"=v."characterVersionId" AND g."sceneVersionId"=v."sceneVersionId") THEN RAISE EXCEPTION 'Invalid pinned video image source' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER studio_video_asset_guard BEFORE INSERT OR UPDATE ON "VideoAsset" FOR EACH ROW EXECUTE FUNCTION studio_video_asset_guard();
COMMIT;
