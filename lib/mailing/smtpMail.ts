import nodemailer from "nodemailer";

const PLACEHOLDER = "your-smtp-user@gmail.com";

function isSmtpConfigured(): boolean {
  const user = process.env.SMTP_USER?.trim();
  return !!user && user !== PLACEHOLDER;
}

let cachedSmtpTransporter: nodemailer.Transporter | null = null;

function getSmtpTransporter() {
  if (cachedSmtpTransporter) return cachedSmtpTransporter;

  cachedSmtpTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT ?? "587", 10),
    secure: (process.env.SMTP_PORT ?? "587") === "465",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return cachedSmtpTransporter;
}

export async function sendOtpEmail(
  to: string,
  otp: string,
  purpose: "signup" | "reset_password"
) {
  // ── Dev fallback ──────────────────────────────────────────────────────────
  // If SMTP is not configured, print the OTP to the server console instead.
  if (!isSmtpConfigured()) {
    console.log(`\n${"─".repeat(50)}`);
    console.log(`📧  OTP Email (DEV MODE — SMTP not configured)`);
    console.log(`   To      : ${to}`);
    console.log(`   Purpose : ${purpose}`);
    console.log(`   OTP     : ${otp}`);
    console.log(`${"─".repeat(50)}\n`);
    return;
  }
  // ─────────────────────────────────────────────────────────────────────────

  const transporter = getSmtpTransporter();
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "noreply@nexus.iitrpr.ac.in";

  const subjectMap: Record<typeof purpose, string> = {
    signup: "Your Nexus Signup OTP",
    reset_password: "Your Nexus Password Reset OTP",
  };

  const bodyMap: Record<typeof purpose, string> = {
    signup: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#2563EB">Verify your email</h2>
        <p>Use the OTP below to complete your Nexus account signup. It expires in <strong>10 minutes</strong>.</p>
        <div style="font-size:2rem;font-weight:bold;letter-spacing:0.3em;padding:20px 0;color:#0F172A">${otp}</div>
        <p style="color:#64748B;font-size:0.85rem">If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
    reset_password: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#2563EB">Reset your password</h2>
        <p>Use the OTP below to reset your Nexus password. It expires in <strong>10 minutes</strong>.</p>
        <div style="font-size:2rem;font-weight:bold;letter-spacing:0.3em;padding:20px 0;color:#0F172A">${otp}</div>
        <p style="color:#64748B;font-size:0.85rem">If you did not request this, please ignore this email.</p>
      </div>
    `,
  };

  await transporter.sendMail({
    from,
    to,
    subject: subjectMap[purpose],
    html: bodyMap[purpose],
  });
}
