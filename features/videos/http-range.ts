export function videoResponse(request: Request, bytes: Uint8Array, index: number) {
  const headers = new Headers({
    'Content-Type': 'video/mp4',
    'Content-Length': String(bytes.length),
    'Content-Disposition': `${new URL(request.url).searchParams.has('download') ? 'attachment' : 'inline'}; filename="mock-shot-${index + 1}.mp4"`,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    'Accept-Ranges': 'bytes',
  });
  const range = request.headers.get('range');
  if (!range) return new Response(bytes as BodyInit, { headers });
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  const start = match?.[1] ? Number(match[1]) : Math.max(0, bytes.length - Number(match?.[2]));
  const end =
    match?.[1] && match?.[2] ? Math.min(Number(match[2]), bytes.length - 1) : bytes.length - 1;
  if (
    !match ||
    (!match[1] && !match[2]) ||
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    start >= bytes.length ||
    end < start
  ) {
    headers.set('Content-Range', `bytes */${bytes.length}`);
    headers.delete('Content-Length');
    return new Response(null, { status: 416, headers });
  }
  headers.set('Content-Range', `bytes ${start}-${end}/${bytes.length}`);
  headers.set('Content-Length', String(end - start + 1));
  return new Response(bytes.slice(start, end + 1) as BodyInit, { status: 206, headers });
}
