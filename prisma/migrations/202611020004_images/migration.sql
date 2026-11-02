BEGIN;
CREATE UNIQUE INDEX "SceneVersion_projectId_sceneId_id_key" ON "SceneVersion"("projectId","sceneId","id");
CREATE TABLE "Generation" (
 "id" TEXT PRIMARY KEY,"projectId" TEXT NOT NULL,"createdBy" TEXT NOT NULL,
 "characterId" TEXT NOT NULL,"characterVersionId" TEXT NOT NULL,"sceneId" TEXT NOT NULL,"sceneVersionId" TEXT NOT NULL,
 "input" JSONB NOT NULL,"requestHash" TEXT NOT NULL,"idempotencyKey" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'queued' CHECK("status" IN ('queued','processing','completed','partial','failed','cancelled')),
 "progress" INTEGER NOT NULL DEFAULT 0 CHECK("progress" BETWEEN 0 AND 100),
 "cancelRequested" BOOLEAN NOT NULL DEFAULT false,"leaseToken" TEXT,"leaseUntil" TIMESTAMP(3),
 "retryCount" INTEGER NOT NULL DEFAULT 0 CHECK("retryCount" BETWEEN 0 AND 3),"error" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
 UNIQUE("projectId","id"),UNIQUE("projectId","idempotencyKey"),
 FOREIGN KEY("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT,
 FOREIGN KEY("projectId","characterId","characterVersionId") REFERENCES "CharacterVersion"("projectId","characterId","id") ON DELETE RESTRICT,
 FOREIGN KEY("projectId","sceneId","sceneVersionId") REFERENCES "SceneVersion"("projectId","sceneId","id") ON DELETE RESTRICT
);
CREATE TABLE "GenerationOutbox" (
 "id" TEXT PRIMARY KEY,"generationId" TEXT NOT NULL UNIQUE,"deliveredAt" TIMESTAMP(3),
 FOREIGN KEY("generationId") REFERENCES "Generation"("id") ON DELETE CASCADE
);
CREATE TABLE "ImageAsset" (
 "id" TEXT PRIMARY KEY,"projectId" TEXT NOT NULL,"generationId" TEXT NOT NULL,"index" INTEGER NOT NULL CHECK("index" BETWEEN 0 AND 7),
 "status" TEXT NOT NULL DEFAULT 'pending' CHECK("status" IN ('pending','completed','failed','cancelled')),
 "attempts" INTEGER NOT NULL DEFAULT 0 CHECK("attempts" BETWEEN 0 AND 3),
 "key" TEXT,"checksum" TEXT,"mimeType" TEXT,"size" INTEGER,"metadata" JSONB NOT NULL,
 "review" TEXT NOT NULL DEFAULT 'unreviewed' CHECK("review" IN ('unreviewed','favourite','rejected')),
 "sourceAssetId" TEXT,"error" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
 UNIQUE("generationId","index"),UNIQUE("projectId","id"),
 FOREIGN KEY("projectId","generationId") REFERENCES "Generation"("projectId","id") ON DELETE RESTRICT,
 FOREIGN KEY("projectId","sourceAssetId") REFERENCES "ImageAsset"("projectId","id") ON DELETE RESTRICT,
 CHECK (("status"='completed' AND "key" IS NOT NULL AND "checksum" IS NOT NULL AND "size">0 AND "mimeType"='image/png') OR "status"<>'completed')
);
CREATE INDEX "Generation_status_leaseUntil_idx" ON "Generation"("status","leaseUntil");
CREATE INDEX "ImageAsset_projectId_createdAt_idx" ON "ImageAsset"("projectId","createdAt");
COMMIT;
