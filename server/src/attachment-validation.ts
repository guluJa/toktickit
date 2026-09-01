import crypto from "node:crypto";
import path from "node:path";

export const MAX_ATTACHMENT_SIZE_BYTES =
  5 * 1024 * 1024;

export const MAX_ACTIVE_ATTACHMENTS = 5;

const MIME_BY_EXTENSION: Record<
  string,
  string
> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

interface AttachmentFileInput {
  originalname: string;
  mimetype: string;
  size: number;
}

export interface ValidatedAttachmentInput {
  originalName: string;
  extension: string;
  mimeType: string;
  sizeBytes: number;
}

export class AttachmentValidationError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields?: Record<
      string,
      string
    >,
  ) {
    super(message);
    this.name = "AttachmentValidationError";
  }
}

export function sanitizeAttachmentFilename(
  originalName: string,
): string {
  const basename = path.basename(
    originalName.replaceAll("\\", "/"),
  );

  const sanitized = basename
    .replace(
      /[<>:"/\\|?*\u0000-\u001f]/g,
      "_",
    )
    .replace(/\s+/g, " ")
    .replace(/^[. ]+|[. ]+$/g, "")
    .slice(0, 180);

  return sanitized || "attachment";
}

export function generateAttachmentStorageKey(
  extension: string,
): string {
  return `${crypto.randomUUID()}${extension}`;
}

export function validateAttachment(
  file: AttachmentFileInput | undefined,
  activeAttachmentCount: number,
): ValidatedAttachmentInput {
  if (!file) {
    throw new AttachmentValidationError(
      400,
      "ATTACHMENT_REQUIRED",
      "A file is required.",
      { file: "Select a file to upload." },
    );
  }

  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    throw new AttachmentValidationError(
      413,
      "ATTACHMENT_TOO_LARGE",
      "The Attachment exceeds the 5 MB limit.",
      {
        file: "The file must not exceed 5 MB.",
      },
    );
  }

  const extension = path
    .extname(file.originalname)
    .toLowerCase();
  const expectedMimeType =
    MIME_BY_EXTENSION[extension];

  if (
    !expectedMimeType ||
    file.mimetype !== expectedMimeType
  ) {
    throw new AttachmentValidationError(
      415,
      "UNSUPPORTED_ATTACHMENT_TYPE",
      "The Attachment type is not permitted.",
      {
        file:
          "Use JPG, JPEG, PNG, WEBP, or PDF with a matching file type.",
      },
    );
  }

  if (
    activeAttachmentCount >=
    MAX_ACTIVE_ATTACHMENTS
  ) {
    throw new AttachmentValidationError(
      409,
      "ATTACHMENT_LIMIT_REACHED",
      "The Ticket already has five active Attachments.",
      {
        file:
          "Remove an active Attachment before uploading another file.",
      },
    );
  }

  return {
    originalName: sanitizeAttachmentFilename(
      file.originalname,
    ),
    extension,
    mimeType: file.mimetype,
    sizeBytes: file.size,
  };
}

export function validateRemovalReason(
  value: unknown,
): string {
  if (typeof value !== "string") {
    throw new AttachmentValidationError(
      400,
      "INVALID_REMOVAL_REASON",
      "A valid removal reason is required.",
      {
        removalReason:
          "Removal reason must contain between 5 and 250 characters.",
      },
    );
  }

  const normalized = value.trim();

  if (
    normalized.length < 5 ||
    normalized.length > 250
  ) {
    throw new AttachmentValidationError(
      400,
      "INVALID_REMOVAL_REASON",
      "A valid removal reason is required.",
      {
        removalReason:
          "Removal reason must contain between 5 and 250 characters.",
      },
    );
  }

  return normalized;
}
