import { Prisma, Role } from '@prisma/client';
import { db } from './db';
import { AppError } from './errors';
export type Database = Prisma.TransactionClient;
export async function requireMembership(
  userId: string,
  projectId: string,
  permission: 'read' | 'write' | 'owner' = 'read',
  client: Database = db,
) {
  const member = await client.projectMembership.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!member) throw new AppError(404, 'Project not found or access unavailable.');
  if (
    (permission === 'owner' && member.role !== Role.OWNER) ||
    (permission === 'write' && member.role === Role.VIEWER)
  )
    throw new AppError(403, 'Your project role does not permit this action.');
  return member;
}
