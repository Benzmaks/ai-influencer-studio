import { requireUser } from '@/lib/session';
import { errorResponse } from '@/lib/errors';
import { health } from '@/lib/health';
export async function GET() {
  try {
    await requireUser();
    const result = await health();
    return Response.json(result, { status: result.ready ? 200 : 503 });
  } catch (e) {
    return errorResponse(e);
  }
}
