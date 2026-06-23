import prisma from "./db";

interface AuditParams {
  organizationId: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
}

export async function logAudit(params: AuditParams) {
  return prisma.auditLog.create({
    data: {
      organizationId: params.organizationId,
      userId: params.userId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      oldValue: params.oldValue ? JSON.stringify(params.oldValue) : null,
      newValue: params.newValue ? JSON.stringify(params.newValue) : null,
      ipAddress: params.ipAddress,
    },
  });
}
