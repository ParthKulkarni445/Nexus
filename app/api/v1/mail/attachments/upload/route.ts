import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";
import { getCurrentUser, hasRoleOrCoordinatorType } from "@/lib/api/auth";
import { badRequest, forbidden, serverError, success, unauthorized } from "@/lib/api/response";
import { db } from "@/lib/db";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
  "image/png",
  "image/jpeg",
]);

function sanitizeFileName(fileName: string) {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 140);
}

function getExtension(fileName: string) {
  const parsed = path.parse(fileName);
  return parsed.ext || "";
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  const prisma = db as any;

  if (!user) {
    return unauthorized();
  }

  if (
    !hasRoleOrCoordinatorType(user, ["tpo_admin"], [
      "mailing_team",
      "student_representative",
      "general",
    ])
  ) {
    return forbidden("Insufficient permissions to upload attachments");
  }

  try {
    const formData = await request.formData();
    const fileValue = formData.get("file");

    if (!(fileValue instanceof File)) {
      return badRequest("Attachment file is required");
    }

    const file = fileValue;

    if (file.size <= 0) {
      return badRequest("Uploaded file is empty");
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return badRequest("Attachment must be smaller than 10 MB");
    }

    if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
      return badRequest("Unsupported file type for attachment upload");
    }

    const originalFileName = file.name || "attachment";
    const safeName = sanitizeFileName(path.parse(originalFileName).name || "attachment");
    const extension = getExtension(originalFileName);
    const storedFileName = `${Date.now()}-${randomUUID()}-${safeName}${extension}`;

    const relativeStoragePath = `/uploads/mail-attachments/${storedFileName}`;
    const absoluteUploadDir = path.join(process.cwd(), "public", "uploads", "mail-attachments");
    const absoluteFilePath = path.join(absoluteUploadDir, storedFileName);

    await mkdir(absoluteUploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(absoluteFilePath, buffer);

    const mailAsset = await prisma.mailAsset.create({
      data: {
        fileName: originalFileName,
        mimeType: file.type || null,
        sizeBytes: file.size,
        storagePath: relativeStoragePath,
        publicUrl: relativeStoragePath,
        uploadedBy: user.id,
      },
    });

    return success({
      id: mailAsset.id,
      fileName: originalFileName,
      mimeType: file.type || null,
      sizeBytes: file.size,
      storagePath: relativeStoragePath,
      publicUrl: relativeStoragePath,
    });
  } catch (error) {
    console.error("Error uploading mail attachment:", error);
    return serverError("Unable to upload attachment");
  }
}
