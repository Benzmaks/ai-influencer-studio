BEGIN;
CREATE TABLE "CharacterDraft" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "projectId" TEXT NOT NULL,
 "createdBy" TEXT NOT NULL,
 "characterId" TEXT,
 "baseRevision" INTEGER,
 "answers" JSONB NOT NULL,
 "step" INTEGER NOT NULL DEFAULT 0,
 "revision" INTEGER NOT NULL DEFAULT 1,
 "completedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "CharacterDraft_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "CharacterDraft_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "CharacterDraft_projectId_characterId_fkey" FOREIGN KEY ("projectId","characterId") REFERENCES "Character"("projectId","id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "CharacterDraft_step_check" CHECK ("step" BETWEEN 0 AND 9),
 CONSTRAINT "CharacterDraft_revision_check" CHECK ("revision" > 0),
 CONSTRAINT "CharacterDraft_target_check" CHECK (("characterId" IS NULL AND "baseRevision" IS NULL) OR ("characterId" IS NOT NULL AND "baseRevision" > 0))
);
CREATE INDEX "CharacterDraft_projectId_createdBy_completedAt_updatedAt_idx" ON "CharacterDraft"("projectId","createdBy","completedAt","updatedAt");
COMMIT;
