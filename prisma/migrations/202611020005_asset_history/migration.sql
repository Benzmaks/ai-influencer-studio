BEGIN;
CREATE TABLE "AssetSelection" (
 "projectId" TEXT NOT NULL,"rootAssetId" TEXT NOT NULL,"assetId" TEXT NOT NULL,
 "revision" INTEGER NOT NULL DEFAULT 1 CHECK("revision">0),"updatedBy" TEXT NOT NULL,"updatedAt" TIMESTAMP(3) NOT NULL,
 PRIMARY KEY("projectId","rootAssetId"),
 FOREIGN KEY("projectId","rootAssetId") REFERENCES "ImageAsset"("projectId","id") ON DELETE RESTRICT,
 FOREIGN KEY("projectId","assetId") REFERENCES "ImageAsset"("projectId","id") ON DELETE RESTRICT
);
ALTER TABLE "ImageAsset" ADD CONSTRAINT "ImageAsset_not_self_parent" CHECK("sourceAssetId" IS NULL OR "sourceAssetId"<>"id");
CREATE FUNCTION studio_asset_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' THEN
  IF NEW."sourceAssetId" IS DISTINCT FROM OLD."sourceAssetId" OR NEW."projectId"<>OLD."projectId" OR NEW."generationId"<>OLD."generationId" OR NEW."index"<>OLD."index" THEN
   RAISE EXCEPTION 'Image lineage is immutable' USING ERRCODE='23514';
  END IF;
  IF OLD."status"='completed' AND (NEW."key" IS DISTINCT FROM OLD."key" OR NEW."checksum" IS DISTINCT FROM OLD."checksum" OR NEW."metadata" IS DISTINCT FROM OLD."metadata" OR NEW."status"<>OLD."status" OR NEW."mimeType" IS DISTINCT FROM OLD."mimeType" OR NEW."size" IS DISTINCT FROM OLD."size") THEN
   RAISE EXCEPTION 'Completed image originals are immutable' USING ERRCODE='23514';
  END IF;
 ELSIF NEW."sourceAssetId" IS NOT NULL THEN
  IF NEW."sourceAssetId"=NEW."id" OR NOT EXISTS (
   SELECT 1 FROM "ImageAsset" p JOIN "Generation" pg ON pg.id=p."generationId" JOIN "Generation" cg ON cg.id=NEW."generationId"
   WHERE p.id=NEW."sourceAssetId" AND p."projectId"=NEW."projectId" AND p.status='completed'
   AND pg."characterVersionId"=cg."characterVersionId" AND pg."sceneVersionId"=cg."sceneVersionId"
  ) THEN RAISE EXCEPTION 'Invalid completed same-project image parent' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER studio_asset_history_guard BEFORE INSERT OR UPDATE ON "ImageAsset" FOR EACH ROW EXECUTE FUNCTION studio_asset_history_guard();
CREATE FUNCTION studio_selection_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE root_id TEXT;
BEGIN
 PERFORM 1 FROM "ImageAsset" WHERE id=NEW."assetId" AND "projectId"=NEW."projectId" FOR UPDATE;
 WITH RECURSIVE ancestors AS (
  SELECT id,"sourceAssetId",ARRAY[id] visited,false cycle FROM "ImageAsset" WHERE id=NEW."assetId" AND "projectId"=NEW."projectId" AND status='completed' AND review<>'rejected'
  UNION ALL SELECT p.id,p."sourceAssetId",a.visited||p.id,p.id=ANY(a.visited) FROM "ImageAsset" p JOIN ancestors a ON p.id=a."sourceAssetId" WHERE p."projectId"=NEW."projectId" AND NOT a.cycle
 ) SELECT id INTO root_id FROM ancestors WHERE "sourceAssetId" IS NULL AND NOT cycle;
 IF root_id IS NULL OR root_id<>NEW."rootAssetId" THEN RAISE EXCEPTION 'Final image must belong to this completed image lineage' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER studio_selection_guard BEFORE INSERT OR UPDATE ON "AssetSelection" FOR EACH ROW EXECUTE FUNCTION studio_selection_guard();
COMMIT;
