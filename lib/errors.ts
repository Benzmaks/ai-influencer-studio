import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function errorResponse(error: unknown) {
  if (error instanceof AppError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError)
    return Response.json({ error: error.issues.map((i) => i.message).join(' ') }, { status: 400 });
  if (error instanceof SyntaxError)
    return Response.json({ error: 'Invalid JSON request.' }, { status: 400 });
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    ['P2034', 'P2002'].includes(error.code)
  )
    return Response.json({ error: 'This record changed. Refresh and try again.' }, { status: 409 });
  return Response.json(
    {
      error:
        'Database unavailable or request could not be completed. Check DATABASE_URL, start PostgreSQL and run npm run db:migrate.',
    },
    { status: 503 },
  );
}
