import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser, hasRole } from "@/lib/api/auth";
import {
  success,
  unauthorized,
  forbidden,
  badRequest,
  serverError,
} from "@/lib/api/response";
import { db } from "@/lib/db";

const listLogsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).default(50),
  action: z.string().trim().optional(),
});

/**
 * GET /api/v1/admin/system/logs
 * Returns recent audit logs for monitoring.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin"])) {
    return forbidden("Only administrators can view system logs");
  }

  const parsed = listLogsQuerySchema.safeParse({
    limit: request.nextUrl.searchParams.get("limit") ?? "50",
    action: request.nextUrl.searchParams.get("action") ?? undefined,
  });

  if (!parsed.success) {
    return badRequest("Invalid query parameters", parsed.error.issues);
  }

  try {
    const logs = await db.auditLog.findMany({
      where: parsed.data.action
        ? {
            action: {
              contains: parsed.data.action,
              mode: "insensitive",
            },
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: parsed.data.limit,
      select: {
        id: true,
        action: true,
        targetType: true,
        targetId: true,
        meta: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return success(logs);
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return serverError();
  }
}
