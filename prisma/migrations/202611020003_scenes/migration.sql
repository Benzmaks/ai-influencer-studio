BEGIN;
CREATE TABLE "Scene" (
 "id" TEXT PRIMARY KEY, "projectId" TEXT NOT NULL, "title" TEXT NOT NULL,
 "revision" INTEGER NOT NULL DEFAULT 1 CHECK ("revision">0),
 "status" TEXT NOT NULL DEFAULT 'draft' CHECK ("status" IN ('draft','ready')),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
 UNIQUE("projectId","id"), FOREIGN KEY("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT
);
CREATE TABLE "SceneVersion" (
 "id" TEXT PRIMARY KEY,"projectId" TEXT NOT NULL,"sceneId" TEXT NOT NULL,
 "versionNumber" INTEGER NOT NULL CHECK ("versionNumber">0),
 "characterId" TEXT NOT NULL,"characterVersionId" TEXT NOT NULL,
 "choices" JSONB NOT NULL,"prompt" JSONB NOT NULL,"createdBy" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE("sceneId","versionNumber"),
 FOREIGN KEY("projectId","sceneId") REFERENCES "Scene"("projectId","id") ON DELETE RESTRICT,
 FOREIGN KEY("projectId","characterId","characterVersionId") REFERENCES "CharacterVersion"("projectId","characterId","id") ON DELETE RESTRICT
);
CREATE INDEX "Scene_projectId_updatedAt_idx" ON "Scene"("projectId","updatedAt");
CREATE INDEX "SceneVersion_projectId_characterId_characterVersionId_idx" ON "SceneVersion"("projectId","characterId","characterVersionId");
CREATE RULE "SceneVersion_immutable" AS ON UPDATE TO "SceneVersion" DO INSTEAD NOTHING;
COMMIT;
