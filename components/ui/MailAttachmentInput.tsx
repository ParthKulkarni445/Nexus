"use client";

import { useRef, useState } from "react";
import { Paperclip, Upload, X } from "lucide-react";
import Badge from "@/components/ui/Badge";

export type MailAttachmentMeta = {
  fileName: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  storagePath: string;
  publicUrl: string;
};

type ApiResponse<T> = {
  data?: T;
  error?: { message?: string };
};

function formatBytes(size?: number | null) {
  if (!size || size <= 0) return "-";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MailAttachmentInput({
  value,
  onChange,
  disabled,
  maxFiles = 5,
}: {
  value: MailAttachmentMeta[];
  onChange: (attachments: MailAttachmentMeta[]) => void;
  disabled?: boolean;
  maxFiles?: number;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function uploadFile(file: File): Promise<MailAttachmentMeta> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/v1/mail/attachments/upload", {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const text = await response.text();
    let body: ApiResponse<MailAttachmentMeta> = {};

    if (text) {
      try {
        body = JSON.parse(text) as ApiResponse<MailAttachmentMeta>;
      } catch {
        body = {};
      }
    }

    if (!response.ok || !body.data) {
      throw new Error(body.error?.message ?? "Upload failed");
    }

    return body.data;
  }

  async function handleSelectFiles(fileList: FileList | null) {
    if (!fileList || disabled) return;

    const files = Array.from(fileList);
    if (!files.length) return;

    setErrorMessage("");

    const remainingSlots = Math.max(maxFiles - value.length, 0);
    if (remainingSlots <= 0) {
      setErrorMessage(`You can upload up to ${maxFiles} files.`);
      return;
    }

    const filesToUpload = files.slice(0, remainingSlots);

    setIsUploading(true);
    try {
      const uploaded = await Promise.all(
        filesToUpload.map((file) => uploadFile(file)),
      );
      const merged = [...value, ...uploaded];
      const deduped = merged.filter(
        (item, index, current) =>
          current.findIndex(
            (candidate) => candidate.storagePath === item.storagePath,
          ) === index,
      );
      onChange(deduped);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to upload file",
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function removeAttachment(storagePath: string) {
    onChange(value.filter((item) => item.storagePath !== storagePath));
  }

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-slate-800">Attachments</p>
          <p className="text-xs text-slate-500">
            Upload invite PDFs/docs to include with this mail flow.
          </p>
        </div>
        <Badge variant="gray" size="sm">
          {value.length}/{maxFiles}
        </Badge>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(event) => void handleSelectFiles(event.target.files)}
        disabled={disabled || isUploading || value.length >= maxFiles}
        multiple
        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg"
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-secondary btn-sm gap-1"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading || value.length >= maxFiles}
        >
          {isUploading ? (
            <Upload size={13} className="animate-pulse" />
          ) : (
            <Paperclip size={13} />
          )}
          {isUploading ? "Uploading..." : "Upload files"}
        </button>
        <span className="text-xs text-slate-500">Max 10 MB per file</span>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700">
          {errorMessage}
        </div>
      )}

      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((attachment) => (
            <div
              key={attachment.storagePath}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-700">
                  {attachment.fileName}
                </p>
                <p className="text-xs text-slate-500">
                  {attachment.mimeType ?? "Unknown type"} •{" "}
                  {formatBytes(attachment.sizeBytes)}
                </p>
              </div>
              <button
                type="button"
                className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-rose-600"
                onClick={() => removeAttachment(attachment.storagePath)}
                disabled={disabled || isUploading}
                aria-label={`Remove ${attachment.fileName}`}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
