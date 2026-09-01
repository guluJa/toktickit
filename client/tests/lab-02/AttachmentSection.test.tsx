import {
  act,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import AttachmentSection from "../../src/AttachmentSection.js";
import {
  downloadAttachment,
  removeAttachment,
  TicketApiError,
  uploadAttachment,
} from "../../src/api.js";

vi.mock(
  "../../src/api.js",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("../../src/api.js")
    >()),
    downloadAttachment: vi.fn(),
    removeAttachment: vi.fn(),
    uploadAttachment: vi.fn(),
  }),
);

const mockedUploadAttachment =
  vi.mocked(uploadAttachment);
const mockedDownloadAttachment =
  vi.mocked(downloadAttachment);
const mockedRemoveAttachment =
  vi.mocked(removeAttachment);

const activeAttachment = {
  id: 51,
  ticketId: 20,
  originalName: "evidence.pdf",
  mimeType: "application/pdf",
  sizeBytes: 2048,
  state: "ACTIVE" as const,
  uploadedAt: "2026-08-31T10:00:00.000Z",
  removedAt: null,
  removalReason: null,
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn(
      () => "blob:attachment-test",
    ),
    revokeObjectURL: vi.fn(),
  });
  vi.spyOn(
    HTMLAnchorElement.prototype,
    "click",
  ).mockImplementation(() => undefined);
});

describe("Attachment Section", () => {
  it("keeps a valid file selected until the Ticket is saved and then uploads it", async () => {
    const user = userEvent.setup();
    let resolveUpload!: (
      value: typeof activeAttachment,
    ) => void;

    mockedUploadAttachment.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveUpload = resolve;
      }),
    );

    const { rerender } = render(
      <AttachmentSection
        requesterId={1}
        ticketId={null}
      />,
    );
    const file = new File(
      ["pdf-content"],
      "evidence.pdf",
      { type: "application/pdf" },
    );

    await user.upload(
      screen.getByLabelText(
        "Select supporting files",
      ),
      file,
    );

    expect(
      screen.getByText(/selected/i),
    ).toBeInTheDocument();
    expect(mockedUploadAttachment).not.toHaveBeenCalled();

    rerender(
      <AttachmentSection
        requesterId={1}
        ticketId={20}
      />,
    );

    expect(
      await screen.findByRole("status"),
    ).toHaveTextContent(
      "Uploading Attachment...",
    );
    expect(mockedUploadAttachment).toHaveBeenCalledWith(
      1,
      20,
      file,
    );

    await act(async () => {
      resolveUpload(activeAttachment);
    });

    expect(
      await screen.findByText(/· ACTIVE/),
    ).toBeInTheDocument();
  });

  it("shows nearby validation for unsupported and oversized files without uploading", async () => {
    const user = userEvent.setup({
      applyAccept: false,
    });

    render(
      <AttachmentSection
        requesterId={1}
        ticketId={20}
      />,
    );

    await user.upload(
      screen.getByLabelText(
        "Select supporting files",
      ),
      [
        new File(["bad"], "script.exe", {
          type: "application/octet-stream",
        }),
        new File(
          [new Uint8Array(5 * 1024 * 1024 + 1)],
          "large.pdf",
          { type: "application/pdf" },
        ),
      ],
    );

    expect(
      screen.getByText(
        /use jpg, jpeg, png, webp, or pdf/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/must not exceed 5 mb/i),
    ).toBeInTheDocument();
    expect(mockedUploadAttachment).not.toHaveBeenCalled();
  });

  it("keeps an invalid file error while uploading a valid file selected at the same time", async () => {
    const user = userEvent.setup({
      applyAccept: false,
    });
    const validFile = new File(
      ["pdf-content"],
      "evidence.pdf",
      { type: "application/pdf" },
    );
    const invalidFile = new File(
      ["unsafe-content"],
      "script.exe",
      { type: "application/octet-stream" },
    );

    mockedUploadAttachment.mockResolvedValueOnce(
      activeAttachment,
    );

    render(
      <AttachmentSection
        requesterId={1}
        ticketId={20}
      />,
    );

    await user.upload(
      screen.getByLabelText(
        "Select supporting files",
      ),
      [invalidFile, validFile],
    );

    expect(
      screen.getByText(
        /use jpg, jpeg, png, webp, or pdf/i,
      ),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/· ACTIVE/),
    ).toBeInTheDocument();
    expect(mockedUploadAttachment).toHaveBeenCalledTimes(1);
    expect(mockedUploadAttachment).toHaveBeenCalledWith(
      1,
      20,
      validFile,
    );
  });

  it("shows a safe upload failure and retries only that file", async () => {
    const user = userEvent.setup();
    mockedUploadAttachment
      .mockRejectedValueOnce(
        new TicketApiError(
          "Unable to upload.",
          500,
          "INTERNAL_ERROR",
        ),
      )
      .mockResolvedValueOnce(activeAttachment);

    render(
      <AttachmentSection
        requesterId={1}
        ticketId={20}
      />,
    );

    await user.upload(
      screen.getByLabelText(
        "Select supporting files",
      ),
      new File(["pdf"], "evidence.pdf", {
        type: "application/pdf",
      }),
    );

    expect(
      await screen.findByText(
        "Unable to upload.",
      ),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Retry",
      }),
    );

    await waitFor(() => {
      expect(mockedUploadAttachment).toHaveBeenCalledTimes(2);
    });
    expect(
      await screen.findByText(/· ACTIVE/),
    ).toBeInTheDocument();
  });

  it("downloads an active Attachment and soft-removes it only with a valid reason", async () => {
    const user = userEvent.setup();
    const createElementSpy = vi.spyOn(
      document,
      "createElement",
    );
    mockedDownloadAttachment.mockResolvedValueOnce({
      blob: new Blob(["pdf"]),
      filename: "evidence.pdf",
    });
    mockedRemoveAttachment.mockResolvedValueOnce({
      ...activeAttachment,
      state: "REMOVED",
      removedAt:
        "2026-08-31T11:00:00.000Z",
      removalReason:
        "Wrong screenshot attached.",
    });

    render(
      <AttachmentSection
        requesterId={1}
        ticketId={20}
        initialAttachments={[
          activeAttachment,
        ]}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Download",
      }),
    );
    expect(mockedDownloadAttachment).toHaveBeenCalledWith(
      1,
      51,
    );
    expect(URL.createObjectURL).toHaveBeenCalledWith(
      expect.any(Blob),
    );
    const downloadAnchor =
      createElementSpy.mock.results
        .map(({ value }) => value)
        .find(
          (value) =>
            value instanceof HTMLAnchorElement,
        ) as HTMLAnchorElement | undefined;
    expect(downloadAnchor).toBeDefined();
    expect(downloadAnchor?.href).toBe(
      "blob:attachment-test",
    );
    expect(downloadAnchor?.download).toBe(
      "evidence.pdf",
    );
    expect(
      HTMLAnchorElement.prototype.click,
    ).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(
      "blob:attachment-test",
    );
    createElementSpy.mockRestore();

    await user.click(
      screen.getByRole("button", {
        name: "Remove",
      }),
    );
    await user.type(
      screen.getByLabelText(/Removal Reason/),
      "bad",
    );
    await user.click(
      screen.getByRole("button", {
        name: "Confirm Removal",
      }),
    );
    expect(
      screen.getByText(/between 5 and 250/i),
    ).toBeInTheDocument();
    expect(mockedRemoveAttachment).not.toHaveBeenCalled();

    await user.clear(
      screen.getByLabelText(/Removal Reason/),
    );
    await user.type(
      screen.getByLabelText(/Removal Reason/),
      "Wrong screenshot attached.",
    );
    await user.click(
      screen.getByRole("button", {
        name: "Confirm Removal",
      }),
    );

    expect(mockedRemoveAttachment).toHaveBeenCalledWith(
      1,
      51,
      "Wrong screenshot attached.",
    );
    expect(
      await screen.findByText(/· REMOVED/),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) =>
        Boolean(
          element?.classList.contains("small") &&
            element.textContent?.includes(
              "Reason: Wrong screenshot attached.",
            ),
        ),
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Download",
      }),
    ).not.toBeInTheDocument();
  });

  it("shows removed metadata without download or remove actions", () => {
    render(
      <AttachmentSection
        requesterId={1}
        ticketId={20}
        initialAttachments={[
          {
            ...activeAttachment,
            state: "REMOVED",
            removedAt:
              "2026-08-31T11:00:00.000Z",
            removalReason:
              "Duplicate evidence file.",
          },
        ]}
      />,
    );

    expect(
      screen.getByText(/· REMOVED/),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) =>
        Boolean(
          element?.classList.contains("small") &&
            element.textContent?.includes(
              "Reason: Duplicate evidence file.",
            ),
        ),
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Download",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Remove",
      }),
    ).not.toBeInTheDocument();
  });
});
