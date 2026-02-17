import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

export interface AuditLogEntry {
  actorId?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  meta?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create an audit log entry for sensitive actions
 */
export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      actorId: entry.actorId,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      meta: entry.meta,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // Don't throw - audit log failure shouldn't break the main operation
  }
}

/**
 * Extract client info from request headers
 */
export function getClientInfo(headersList: Headers) {
  return {
    ipAddress:
      headersList.get("x-forwarded-for")?.split(",")[0] ||
      headersList.get("x-real-ip") ||
      undefined,
    userAgent: headersList.get("user-agent") || undefined,
  };
}
