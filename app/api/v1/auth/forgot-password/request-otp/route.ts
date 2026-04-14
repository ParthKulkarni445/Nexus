import { NextRequest } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { db } from "@/lib/db";
import { error, success } from "@/lib/api/response";
import { sendOtpEmail } from "@/lib/mailing/smtpMail";
import { isEmailAllowed, domainErrorMessage } from "@/lib/api/domain";

const OTP_TTL_MINUTES = 10;

const schema = z.object({
    email: z.string().email("Please enter a valid email address"),
});

/**
 * POST /api/v1/auth/forgot-password/request-otp
 * Sends a password-reset OTP to the given @iitrpr.ac.in email.
 */
export async function POST(request: NextRequest) {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return error("Invalid request body", "BAD_REQUEST", 400);
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        return error(parsed.error.issues[0]?.message ?? "Validation failed", "VALIDATION_ERROR", 400);
    }

    const email = parsed.data.email.toLowerCase().trim();

    if (!isEmailAllowed(email)) {
        return error(domainErrorMessage(), "DOMAIN_RESTRICTED", 403);
    }

    const user = await db.user.findUnique({ where: { email } });
    // Always return success to avoid email enumeration
    if (!user || !user.isActive) {
        return success({ message: "If that email exists, an OTP has been sent" });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await db.otpToken.deleteMany({ where: { email, purpose: "reset_password" } });
    await db.otpToken.create({ data: { email, code: otp, purpose: "reset_password", expiresAt } });

    try {
        await sendOtpEmail(email, otp, "reset_password");
    } catch (err) {
        console.error("Failed to send password reset OTP:", err);
        return error("Failed to send OTP email. Please try again.", "MAIL_ERROR", 500);
    }

    return success({ message: "If that email exists, an OTP has been sent" });
}
