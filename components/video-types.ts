import type { ShotInput } from '@/features/videos/schema';
export type BoardRevision = {
  id: string;
  versionNumber: number;
  title: string;
  characterId: string;
  characterVersionId: string;
  sceneId: string;
  sceneVersionId: string;
  shots: (ShotInput & { id: string; shotNumber: number })[];
};
export type BoardView = {
  id: string;
  title: string;
  revision: number;
  status: string;
  versions: BoardRevision[];
};
export type ApprovedImage = {
  id: string;
  checksum: string | null;
  metadata: Record<string, unknown>;
  generation: { characterVersionId: string; sceneVersionId: string };
};
export type VideoJob = {
  id: string;
  status: string;
  progress: number;
  retryCount: number;
  createdAt: string;
  error: string | null;
  characterId: string;
  sceneId: string;
  storyboardId: string | null;
  storyboardRevisionId: string | null;
  input: Record<string, unknown>;
  videoAssets: {
    id: string;
    index: number;
    status: string;
    error: string | null;
    checksum: string | null;
    metadata: Record<string, unknown>;
  }[];
};
