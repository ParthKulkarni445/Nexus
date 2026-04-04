import path from "node:path";
import nodemailer from "nodemailer";
import { findGmailThreadIdByRfc822MessageId } from "@/lib/mailing/gmailInbox";

type SendMailInput = {
  to: string[];
  cc?: string[];
  subject: string;
  html?: string | null;
  text?: string | null;
  inReplyTo?: string | null;
  references?: string[];
  attachments?: Array<{
    fileName: string;
    mimeType?: string | null;
    storagePath?: string | null;
    publicUrl?: string | null;
  }>;
};

let cachedTransporter: nodemailer.Transporter | null = null;

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required mail configuration: ${name}`);
  }
  return value;
}

function getTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: getRequiredEnv("GOOGLE_GMAIL_USER"),
      clientId: getRequiredEnv("GOOGLE_CLIENT_ID"),
      clientSecret: getRequiredEnv("GOOGLE_CLIENT_SECRET"),
      refreshToken: getRequiredEnv("GOOGLE_GMAIL_REFRESH_TOKEN"),
    },
  });

  return cachedTransporter;
}

export function getConfiguredSenderEmail() {
  return getRequiredEnv("GOOGLE_GMAIL_USER");
}

export async function sendMail(input: SendMailInput) {
  const transporter = getTransporter();
  const fromEmail = getConfiguredSenderEmail();
  const references = input.references
    ?.map((value) => value.trim())
    .filter(Boolean);

  const info = await transporter.sendMail({
    from: fromEmail,
    to: input.to,
    cc: input.cc?.length ? input.cc : undefined,
    subject: input.subject,
    html: input.html ?? undefined,
    text: input.text ?? undefined,
    inReplyTo: input.inReplyTo?.trim() || undefined,
    references: references?.length ? references : undefined,
    attachments:
      input.attachments
        ?.map((attachment) => {
          const normalizedStoragePath = attachment.storagePath?.trim() ?? "";
          const normalizedPublicUrl = attachment.publicUrl?.trim() ?? "";

          if (normalizedStoragePath.startsWith("/")) {
            return {
              filename: attachment.fileName,
              contentType: attachment.mimeType ?? undefined,
              path: path.join(
                process.cwd(),
                "public",
                normalizedStoragePath.replace(/^\/+/, ""),
              ),
            };
          }

          if (normalizedPublicUrl.startsWith("http://") || normalizedPublicUrl.startsWith("https://")) {
            return {
              filename: attachment.fileName,
              contentType: attachment.mimeType ?? undefined,
              href: normalizedPublicUrl,
            };
          }

          return null;
        })
        .filter((attachment): attachment is NonNullable<typeof attachment> => Boolean(attachment)) ?? [],
  });

  let threadId: string | null = null;

  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      threadId = await findGmailThreadIdByRfc822MessageId(info.messageId);
      if (threadId) {
        break;
      }

      await new Promise((resolve) => {
        setTimeout(resolve, 500 * (attempt + 1));
      });
    }
  } catch (error) {
    console.warn("Unable to resolve Gmail thread id for sent mail:", error);
  }

  return {
    messageId: info.messageId,
    fromEmail,
    threadId,
  };
}
