import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { error, success } from "@/lib/api/response";
import { hashPassword } from "@/lib/api/session";
import { isEmailAllowed, domainErrorMessage } from "@/lib/api/domain";

const resetSchema = z.object({
    email: z.string().email(),
    otp: z.string().length(6, "OTP must be 6 digits"),
    newPassword: z.string().min(8, "Password must be at least 8 characters").max(128),
});

/**
 * POST /api/v1/auth/forgot-password/reset
 * Verifies OTP, updates the user's password, and creates a new session.
 */
export async function POST(request: NextRequest) {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return error("Invalid request body", "BAD_REQUEST", 400);
    }

    const parsed = resetSchema.safeParse(body);
    if (!parsed.success) {
        return error(parsed.error.issues[0]?.message ?? "Validation failed", "VALIDATION_ERROR", 400);
    }

    const { email: rawEmail, otp, newPassword } = parsed.data;
    const email = rawEmail.toLowerCase().trim();

    if (!isEmailAllowed(email)) {
        return error(domainErrorMessage(), "DOMAIN_RESTRICTED", 403);
    }

    const token = await db.otpToken.findFirst({
        where: { email, purpose: "reset_password" },
        orderBy: { createdAt: "desc" },
    });

    if (!token || token.code !== otp) {
        return error("Invalid OTP. Please check and try again.", "INVALID_OTP", 400);
    }

    if (token.expiresAt < new Date()) {
        await db.otpToken.delete({ where: { id: token.id } });
        return error("OTP has expired. Please request a new one.", "OTP_EXPIRED", 400);
    }

    await db.otpToken.delete({ where: { id: token.id } });

    const user = await db.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
        return error("User not found", "NOT_FOUND", 404);
    }

    const passwordHash = hashPassword(newPassword);

    await db.user.update({
        where: { id: user.id },
        data: {
            profileMeta: {
                ...((user.profileMeta as Prisma.JsonObject) ?? {}),
                passwordHash,
            },
        },
    });

    return success({
        message: "Password reset successfully. Please sign in with your new password.",
    });
}
