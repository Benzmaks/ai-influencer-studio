import { db } from '@/lib/db';
import type { Database } from '@/lib/access';
import { AppError } from '@/lib/errors';
export type GraphNode = { id: string; sourceAssetId: string | null; status: string };
export async function loadGraph(projectId: string, client: Database = db) {
  return client.imageAsset.findMany({
    where: { projectId },
    select: { id: true, sourceAssetId: true, status: true },
  });
}
export function rootOf(nodes: GraphNode[], id: string) {
  const lookup = new Map(nodes.map((n) => [n.id, n])),
    seen = new Set<string>();
  let current = lookup.get(id);
  if (!current) throw new AppError(404, 'Image not found in this project.');
  while (current.sourceAssetId) {
    if (seen.has(current.id)) throw new AppError(409, 'Invalid cyclic image lineage.');
    seen.add(current.id);
    const parent = lookup.get(current.sourceAssetId);
    if (!parent) throw new AppError(409, 'Source image is missing or belongs to another project.');
    current = parent;
  }
  return current.id;
}
