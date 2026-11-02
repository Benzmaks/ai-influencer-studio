import { auth } from '@/auth';
import { AppError } from './errors';
import { redirect } from 'next/navigation';
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new AppError(401, 'Sign in to continue.');
  return { ...session.user, id: session.user.id };
}
export async function pageUser() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  return { ...session.user, id: session.user.id };
}
export function verifyOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const expected = process.env.AUTH_URL;
  if (!expected || origin !== new URL(expected).origin)
    throw new AppError(403, 'Request origin is not allowed.');
}
