import { Prisma, Role } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireMembership } from '@/lib/access';
import { AppError } from '@/lib/errors';
export const projectInput = z.object({
  name: z.string().trim().min(2, 'Project name needs at least 2 characters.').max(80),
});
export async function listProjects(userId: string) {
  return db.project.findMany({
    where: { memberships: { some: { userId } } },
    include: { memberships: { where: { userId }, select: { role: true } } },
    orderBy: { createdAt: 'asc' },
  });
}
export async function createProject(userId: string, input: unknown) {
  const data = projectInput.parse(input);
  return db.project.create({
    data: { ...data, memberships: { create: { userId, role: Role.OWNER } } },
  });
}
export async function setMemberRole(
  actorId: string,
  projectId: string,
  targetId: string,
  role: Role | null,
) {
  return db.$transaction(
    async (tx) => {
      await requireMembership(actorId, projectId, 'owner', tx);
      const target = await tx.projectMembership.findUnique({
        where: { projectId_userId: { projectId, userId: targetId } },
      });
      if (!target) throw new AppError(404, 'Member not found.');
      if (
        target.role === Role.OWNER &&
        role !== Role.OWNER &&
        (await tx.projectMembership.count({ where: { projectId, role: Role.OWNER } })) <= 1
      )
        throw new AppError(409, 'A project must retain at least one owner.');
      const result = role
        ? await tx.projectMembership.update({
            where: { projectId_userId: { projectId, userId: targetId } },
            data: { role },
          })
        : await tx.projectMembership.delete({
            where: { projectId_userId: { projectId, userId: targetId } },
          });
      await tx.auditEvent.create({
        data: {
          projectId,
          actorId,
          action: role ? 'membership.role_changed' : 'membership.removed',
          resourceId: targetId,
        },
      });
      return result;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
