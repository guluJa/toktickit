import {
  describe,
  expect,
  it,
} from "vitest";
import {
  AttachmentValidationError,
  MAX_ATTACHMENT_SIZE_BYTES,
  sanitizeAttachmentFilename,
  validateAttachment,
  validateRemovalReason,
} from "../../src/attachment-validation.js";

describe("Attachment validation", () => {
  it.each([
    ["evidence.jpg", "image/jpeg"],
    ["evidence.jpeg", "image/jpeg"],
    ["evidence.png", "image/png"],
    ["evidence.webp", "image/webp"],
    ["evidence.pdf", "application/pdf"],
  ])(
    "accepts permitted file %s with matching MIME %s",
    (originalname, mimetype) => {
      expect(
        validateAttachment(
          {
            originalname,
            mimetype,
            size: MAX_ATTACHMENT_SIZE_BYTES,
          },
          4,
        ),
      ).toEqual(
        expect.objectContaining({
          originalName: originalname,
          mimeType: mimetype,
          sizeBytes:
            MAX_ATTACHMENT_SIZE_BYTES,
        }),
      );
    },
  );

  it("rejects a missing file", () => {
    expect(() =>
      validateAttachment(undefined, 0),
    ).toThrowError(
      expect.objectContaining({
        status: 400,
        code: "ATTACHMENT_REQUIRED",
      }),
    );
  });

  it("rejects a file larger than 5 MB", () => {
    expect(() =>
      validateAttachment(
        {
          originalname: "evidence.pdf",
          mimetype: "application/pdf",
          size:
            MAX_ATTACHMENT_SIZE_BYTES + 1,
        },
        0,
      ),
    ).toThrowError(
      expect.objectContaining({
        status: 413,
        code: "ATTACHMENT_TOO_LARGE",
      }),
    );
  });

  it.each([
    ["script.exe", "application/octet-stream"],
    ["renamed.png", "application/pdf"],
  ])(
    "rejects unsupported or mismatched file %s",
    (originalname, mimetype) => {
      expect(() =>
        validateAttachment(
          {
            originalname,
            mimetype,
            size: 100,
          },
          0,
        ),
      ).toThrowError(
        expect.objectContaining({
          status: 415,
          code:
            "UNSUPPORTED_ATTACHMENT_TYPE",
        }),
      );
    },
  );

  it("rejects a sixth active Attachment", () => {
    expect(() =>
      validateAttachment(
        {
          originalname: "evidence.png",
          mimetype: "image/png",
          size: 100,
        },
        5,
      ),
    ).toThrowError(
      expect.objectContaining({
        status: 409,
        code: "ATTACHMENT_LIMIT_REACHED",
      }),
    );
  });

  it("sanitizes path and unsafe filename characters", () => {
    expect(
      sanitizeAttachmentFilename(
        "../../private:<evidence>.pdf",
      ),
    ).toBe("private__evidence_.pdf");
  });

  it("trims a valid removal reason", () => {
    expect(
      validateRemovalReason(
        "  Wrong screenshot attached.  ",
      ),
    ).toBe("Wrong screenshot attached.");
  });

  it.each([undefined, "", "bad", "x".repeat(251)])(
    "rejects invalid removal reason %s",
    (reason) => {
      try {
        validateRemovalReason(reason);
        throw new Error("Expected validation error");
      } catch (error) {
        expect(error).toBeInstanceOf(
          AttachmentValidationError,
        );
        expect(error).toEqual(
          expect.objectContaining({
            status: 400,
            code: "INVALID_REMOVAL_REASON",
          }),
        );
      }
    },
  );
});
