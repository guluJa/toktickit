import {
  ChangeEvent,
  useEffect,
  useState,
} from "react";
import {
  AttachmentMetadata,
  downloadAttachment,
  removeAttachment,
  TicketApiError,
  uploadAttachment,
} from "./api.js";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_ACTIVE_ATTACHMENTS = 5;

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

type AttachmentEntryStatus =
  | "selected"
  | "uploading"
  | "active"
  | "invalid"
  | "failed"
  | "removed";

interface AttachmentEntry {
  key: string;
  status: AttachmentEntryStatus;
  file?: File;
  metadata?: AttachmentMetadata;
  error?: string;
}

interface AttachmentSectionProps {
  requesterId: number;
  ticketId: number | null;
  initialAttachments?: AttachmentMetadata[];
  disabled?: boolean;
  resetToken?: number;
}

function metadataEntry(
  metadata: AttachmentMetadata,
): AttachmentEntry {
  return {
    key: `metadata-${metadata.id}`,
    status:
      metadata.state === "REMOVED"
        ? "removed"
        : "active",
    metadata,
  };
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(
    sizeBytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

function validateSelectedFile(
  file: File,
): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return "The file must not exceed 5 MB.";
  }

  const dotIndex = file.name.lastIndexOf(".");
  const extension =
    dotIndex >= 0
      ? file.name.slice(dotIndex).toLowerCase()
      : "";

  if (
    !MIME_BY_EXTENSION[extension] ||
    MIME_BY_EXTENSION[extension] !== file.type
  ) {
    return "Use JPG, JPEG, PNG, WEBP, or PDF with a matching file type.";
  }

  return null;
}

export default function AttachmentSection({
  requesterId,
  ticketId,
  initialAttachments = [],
  disabled = false,
  resetToken = 0,
}: AttachmentSectionProps) {
  const [entries, setEntries] = useState<
    AttachmentEntry[]
  >(() => initialAttachments.map(metadataEntry));
  const [removingKey, setRemovingKey] =
    useState<string | null>(null);
  const [removalReason, setRemovalReason] =
    useState("");
  const [removalError, setRemovalError] =
    useState("");

  useEffect(() => {
    setEntries(
      initialAttachments.map(metadataEntry),
    );
    setRemovingKey(null);
    setRemovalReason("");
    setRemovalError("");
  }, [resetToken]);

  useEffect(() => {
    if (!ticketId) {
      return;
    }

    const selectedEntry = entries.find(
      (entry) => entry.status === "selected",
    );

    if (!selectedEntry?.file) {
      return;
    }

    setEntries((current) =>
      current.map((entry) =>
        entry.key === selectedEntry.key
          ? { ...entry, status: "uploading" }
          : entry,
      ),
    );

    void uploadAttachment(
      requesterId,
      ticketId,
      selectedEntry.file,
    )
      .then((metadata) => {
        setEntries((current) =>
          current.map((entry) =>
            entry.key === selectedEntry.key
              ? {
                  key: `metadata-${metadata.id}`,
                  status: "active",
                  metadata,
                }
              : entry,
          ),
        );
      })
      .catch((error) => {
        const message =
          error instanceof TicketApiError
            ? error.fields.file ?? error.message
            : "Unable to upload this Attachment. Please retry.";

        setEntries((current) =>
          current.map((entry) =>
            entry.key === selectedEntry.key
              ? {
                  ...entry,
                  status: "failed",
                  error: message,
                }
              : entry,
          ),
        );
      });
  }, [entries, requesterId, ticketId]);

  function handleFileSelection(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFiles = Array.from(
      event.target.files ?? [],
    );
    event.target.value = "";

    setEntries((current) => {
      let potentialActiveCount = current.filter(
        (entry) =>
          entry.status === "active" ||
          entry.status === "selected" ||
          entry.status === "uploading" ||
          entry.status === "failed",
      ).length;

      const additions = selectedFiles.map(
        (file): AttachmentEntry => {
          const validationError =
            validateSelectedFile(file);

          if (validationError) {
            return {
              key: globalThis.crypto.randomUUID(),
              file,
              status: "invalid",
              error: validationError,
            };
          }

          if (
            potentialActiveCount >=
            MAX_ACTIVE_ATTACHMENTS
          ) {
            return {
              key: globalThis.crypto.randomUUID(),
              file,
              status: "invalid",
              error:
                "A Ticket can contain at most five active Attachments.",
            };
          }

          potentialActiveCount += 1;
          return {
            key: globalThis.crypto.randomUUID(),
            file,
            status: "selected",
          };
        },
      );

      return [...current, ...additions];
    });
  }

  function discardEntry(key: string) {
    setEntries((current) =>
      current.filter((entry) => entry.key !== key),
    );
  }

  async function handleDownload(
    entry: AttachmentEntry,
  ) {
    if (!entry.metadata) {
      return;
    }

    try {
      const download = await downloadAttachment(
        requesterId,
        entry.metadata.id,
      );
      const objectUrl = URL.createObjectURL(
        download.blob,
      );
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = download.filename;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      setEntries((current) =>
        current.map((currentEntry) =>
          currentEntry.key === entry.key
            ? {
                ...currentEntry,
                error:
                  "Unable to download this Attachment.",
              }
            : currentEntry,
        ),
      );
    }
  }

  async function confirmRemoval(
    entry: AttachmentEntry,
  ) {
    const normalizedReason = removalReason.trim();

    if (
      normalizedReason.length < 5 ||
      normalizedReason.length > 250
    ) {
      setRemovalError(
        "Removal reason must contain between 5 and 250 characters.",
      );
      return;
    }

    if (!entry.metadata) {
      return;
    }

    setRemovalError("");

    try {
      const metadata = await removeAttachment(
        requesterId,
        entry.metadata.id,
        normalizedReason,
      );
      setEntries((current) =>
        current.map((currentEntry) =>
          currentEntry.key === entry.key
            ? metadataEntry(metadata)
            : currentEntry,
        ),
      );
      setRemovingKey(null);
      setRemovalReason("");
    } catch (error) {
      setRemovalError(
        error instanceof TicketApiError
          ? error.fields.removalReason ??
              error.message
          : "Unable to remove this Attachment.",
      );
    }
  }

  return (
    <section
      className="border rounded p-3 mb-3"
      aria-labelledby="attachment-section-title"
    >
      <div className="d-flex flex-column flex-sm-row justify-content-between gap-2 mb-3">
        <div>
          <h3
            id="attachment-section-title"
            className="h5 mb-1"
          >
            Attachments
          </h3>
          <p className="small text-body-secondary mb-0">
            JPG, JPEG, PNG, WEBP, or PDF; maximum
            5 MB each and five active files.
          </p>
        </div>
        {!ticketId && (
          <span className="badge text-bg-light border align-self-start">
            Uploads after Ticket is saved
          </span>
        )}
      </div>

      <label
        className="form-label"
        htmlFor="attachment-files"
      >
        Select supporting files
      </label>
      <input
        id="attachment-files"
        className="form-control"
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
        disabled={disabled}
        onChange={handleFileSelection}
      />

      {entries.length === 0 ? (
        <p className="text-body-secondary mt-3 mb-0">
          No Attachments selected or uploaded.
        </p>
      ) : (
        <ul
          className="list-group mt-3"
          aria-label="Attachment list"
        >
          {entries.map((entry) => {
            const name =
              entry.metadata?.originalName ??
              entry.file?.name ??
              "Attachment";
            const size =
              entry.metadata?.sizeBytes ??
              entry.file?.size ??
              0;

            return (
              <li
                key={entry.key}
                className="list-group-item"
              >
                <div className="d-flex flex-column flex-md-row justify-content-between gap-3">
                  <div className="text-break">
                    <strong>{name}</strong>
                    <div className="small text-body-secondary">
                      {formatFileSize(size)} · {entry.status.toUpperCase()}
                    </div>
                    {entry.metadata && (
                      <div className="small">
                        {entry.metadata.mimeType}
                      </div>
                    )}
                    {entry.status === "uploading" && (
                      <div role="status">
                        Uploading Attachment...
                      </div>
                    )}
                    {entry.error && (
                      <div
                        className="text-danger small"
                        role="alert"
                      >
                        {entry.error}
                      </div>
                    )}
                    {entry.metadata?.removedAt && (
                      <div className="small mt-2">
                        Removed: {new Date(
                          entry.metadata.removedAt,
                        ).toLocaleString()}
                        <br />
                        Reason: {entry.metadata.removalReason}
                      </div>
                    )}
                  </div>

                  <div className="d-flex flex-wrap gap-2 align-self-md-start">
                    {entry.status === "active" && (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-success"
                          onClick={() =>
                            void handleDownload(entry)
                          }
                        >
                          Download
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => {
                            setRemovingKey(entry.key);
                            setRemovalReason("");
                            setRemovalError("");
                          }}
                        >
                          Remove
                        </button>
                      </>
                    )}
                    {entry.status === "failed" && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-success"
                        onClick={() =>
                          setEntries((current) =>
                            current.map((item) =>
                              item.key === entry.key
                                ? {
                                    ...item,
                                    status: "selected",
                                    error: undefined,
                                  }
                                : item,
                            ),
                          )
                        }
                      >
                        Retry
                      </button>
                    )}
                    {[
                      "selected",
                      "invalid",
                      "failed",
                    ].includes(entry.status) && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() =>
                          discardEntry(entry.key)
                        }
                      >
                        Remove from selection
                      </button>
                    )}
                  </div>
                </div>

                {removingKey === entry.key && (
                  <div className="border-top mt-3 pt-3">
                    <p className="mb-2">
                      Remove <strong>{name}</strong>?
                      Metadata will remain visible.
                    </p>
                    <label
                      className="form-label"
                      htmlFor={`removal-reason-${entry.key}`}
                    >
                      Removal Reason
                      <span
                        className="text-danger"
                        aria-hidden="true"
                      >
                        {" "}*
                      </span>
                    </label>
                    <textarea
                      id={`removal-reason-${entry.key}`}
                      className={`form-control${
                        removalError
                          ? " is-invalid"
                          : ""
                      }`}
                      value={removalReason}
                      maxLength={250}
                      aria-required="true"
                      aria-invalid={Boolean(
                        removalError,
                      )}
                      onChange={(event) => {
                        setRemovalReason(
                          event.target.value,
                        );
                        setRemovalError("");
                      }}
                    />
                    {removalError && (
                      <div className="invalid-feedback">
                        {removalError}
                      </div>
                    )}
                    <div className="d-flex flex-wrap gap-2 mt-2">
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() =>
                          void confirmRemoval(entry)
                        }
                      >
                        Confirm Removal
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => {
                          setRemovingKey(null);
                          setRemovalReason("");
                          setRemovalError("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
