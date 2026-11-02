import { requireUser } from '@/lib/session';
import { errorResponse } from '@/lib/errors';
import { readVideoAsset } from '@/features/videos/service';
import { videoResponse } from '@/features/videos/http-range';
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string; id: string }> },
) {
  try {
    const u = await requireUser(),
      p = await params;
    const { asset, bytes } = await readVideoAsset(u.id, p.projectId, p.id);
    return videoResponse(request, new Uint8Array(bytes), asset.index);
  } catch (e) {
    return errorResponse(e);
  }
}
