import { requireUser } from '@/lib/session';
import { errorResponse } from '@/lib/errors';
import { readAsset } from '@/features/generation/service';
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string; id: string }> },
) {
  try {
    const u = await requireUser();
    const { projectId, id } = await params;
    const { asset, bytes } = await readAsset(u.id, projectId, id);
    return new Response(new Uint8Array(bytes), {
      headers: {
        'Content-Type': asset.mimeType!,
        'Content-Length': String(bytes.length),
        'Content-Disposition': `${new URL(request.url).searchParams.has('download') ? 'attachment' : 'inline'}; filename="mock-image-${asset.index + 1}.png"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
