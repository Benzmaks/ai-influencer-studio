export type AssetView = {
  id: string;
  sourceAssetId: string | null;
  status: string;
  review: string;
  checksum: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
  generation: {
    id: string;
    characterId: string;
    sceneId: string;
    characterVersionId: string;
    sceneVersionId: string;
    input: Record<string, unknown>;
    status: string;
    progress: number;
  };
};
export type SelectionView = { assetId: string; revision: number } | null;
export type AssetDetail = {
  asset: AssetView;
  rootAssetId: string;
  history: AssetView[];
  selection: SelectionView;
};
export type LibraryView = {
  assets: (AssetView & { rootAssetId: string; selection: SelectionView })[];
  total: number;
  page: number;
  characters: { id: string; name: string }[];
  scenes: { id: string; name: string }[];
};
export function versionLabel(a: AssetView) {
  return !a.sourceAssetId
    ? 'Original'
    : a.metadata.operation === 'edit'
      ? 'Mock edit'
      : a.metadata.operation === 'duplicate'
        ? 'Duplicate'
        : 'Variation';
}
