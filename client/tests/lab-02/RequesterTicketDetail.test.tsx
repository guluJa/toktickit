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
import RequesterTicketDetail from "../../src/RequesterTicketDetail.js";
import {
  getTicketDetail,
  TicketApiError,
  TicketDetail,
} from "../../src/api.js";

vi.mock(
  "../../src/api.js",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("../../src/api.js")
    >()),
    getTicketDetail: vi.fn(),
  }),
);

const mockedGetTicketDetail =
  vi.mocked(getTicketDetail);

const ticket: TicketDetail = {
  id: 101,
  ticketNumber: "TKT-20990201-D00001",
  requester: {
    id: 1,
    name: "Development Requester 1",
    email: "requester1@toktickit.test",
  },
  category: {
    id: 2,
    name: "Hardware",
  },
  relatedSystem: {
    id: 3,
    name: "Campus Wi-Fi",
  },
  summary:
    "Laptop cannot connect to campus Wi-Fi",
  requestedPriority: "HIGH",
  description:
    "The requester cannot connect to the campus wireless network.",
  currentStatus: "NEW",
  createdAt: "2099-02-01T08:00:00.000Z",
  updatedAt: "2099-02-01T09:00:00.000Z",
  attachments: [
    {
      id: 11,
      ticketId: 101,
      originalName: "wifi-error.png",
      mimeType: "image/png",
      sizeBytes: 245760,
      state: "ACTIVE",
      uploadedAt:
        "2099-02-01T08:10:00.000Z",
      removedAt: null,
      removalReason: null,
    },
    {
      id: 12,
      ticketId: 101,
      originalName: "old-log.pdf",
      mimeType: "application/pdf",
      sizeBytes: 102400,
      state: "REMOVED",
      uploadedAt:
        "2099-02-01T08:20:00.000Z",
      removedAt:
        "2099-02-01T08:30:00.000Z",
      removalReason:
        "The attachment is no longer relevant.",
    },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
  mockedGetTicketDetail.mockResolvedValue(
    ticket,
  );
});

describe("Requester Ticket Detail", () => {
  it(
    "shows Loading and then renders the complete owned Ticket as read-only information",
    async () => {
      let resolveTicket!: (
        value: TicketDetail,
      ) => void;

      mockedGetTicketDetail.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveTicket = resolve;
        }),
      );

      render(
        <RequesterTicketDetail
          requesterId={1}
          ticketId={101}
          onBack={vi.fn()}
        />,
      );

      expect(
        screen.getByRole("status"),
      ).toHaveTextContent(
        /loading ticket detail/i,
      );

      await act(async () => {
        resolveTicket(ticket);
      });

      expect(
        await screen.findByRole("heading", {
          name: ticket.ticketNumber,
        }),
      ).toBeInTheDocument();

      expect(
        screen.getAllByText(ticket.summary),
      ).toHaveLength(2);
      expect(
        screen.getByText(ticket.description),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          ticket.requester.name,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(ticket.category.name),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          ticket.relatedSystem.name,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText("HIGH"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("NEW"),
      ).toBeInTheDocument();

      expect(
        screen.getAllByText("Read-only"),
      ).not.toHaveLength(0);
    },
  );

  it(
    "presents Active Attachment actions and keeps Removed metadata without actions",
    async () => {
      render(
        <RequesterTicketDetail
          requesterId={1}
          ticketId={101}
          onBack={vi.fn()}
        />,
      );

      expect(
        await screen.findByRole("heading", {
          name: /attachments/i,
        }),
      ).toBeInTheDocument();

      expect(
        screen.getByText("wifi-error.png"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("old-log.pdf"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/· ACTIVE/),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/· REMOVED/),
      ).toBeInTheDocument();
      expect(
        screen.getByText((_, element) =>
          Boolean(
            element?.classList.contains("small") &&
              element.textContent?.includes(
                "Reason: The attachment is no longer relevant.",
              ),
          ),
        ),
      ).toBeInTheDocument();

      expect(
        screen.getAllByRole("button", {
          name: "Download",
        }),
      ).toHaveLength(1);
      expect(
        screen.getAllByRole("button", {
          name: "Remove",
        }),
      ).toHaveLength(1);
    },
  );

  it(
    "shows the same safe Not-found state for an unavailable Ticket and provides Back to My Tickets",
    async () => {
      const onBack = vi.fn();
      const user = userEvent.setup();

      mockedGetTicketDetail.mockRejectedValueOnce(
        new TicketApiError(
          "Ticket not found.",
          404,
          "TICKET_NOT_FOUND",
        ),
      );

      render(
        <RequesterTicketDetail
          requesterId={1}
          ticketId={999}
          onBack={onBack}
        />,
      );

      expect(
        await screen.findByRole("alert"),
      ).toHaveTextContent(
        /ticket is unavailable/i,
      );
      expect(
        screen.queryByText(
          /owner|another requester/i,
        ),
      ).not.toBeInTheDocument();

      await user.click(
        screen.getByRole("button", {
          name: /back to my tickets/i,
        }),
      );

      expect(onBack).toHaveBeenCalledTimes(1);
    },
  );

  it(
    "shows a safe Failure state and retries the same Ticket",
    async () => {
      const user = userEvent.setup();

      mockedGetTicketDetail
        .mockRejectedValueOnce(
          new Error(
            "Private database and password details",
          ),
        )
        .mockResolvedValueOnce(ticket);

      render(
        <RequesterTicketDetail
          requesterId={1}
          ticketId={101}
          onBack={vi.fn()}
        />,
      );

      expect(
        await screen.findByRole("alert"),
      ).toHaveTextContent(
        /unable to load ticket detail/i,
      );
      expect(
        screen.queryByText(/password/i),
      ).not.toBeInTheDocument();

      await user.click(
        screen.getByRole("button", {
          name: /retry/i,
        }),
      );

      expect(
        await screen.findByRole("heading", {
          name: ticket.ticketNumber,
        }),
      ).toBeInTheDocument();
      expect(
        mockedGetTicketDetail,
      ).toHaveBeenCalledTimes(2);
    },
  );

  it(
    "clears the previous Ticket before loading Detail for a different requester",
    async () => {
      let resolveSecondLoad!: (
        value: TicketDetail,
      ) => void;

      mockedGetTicketDetail
        .mockResolvedValueOnce(ticket)
        .mockReturnValueOnce(
          new Promise((resolve) => {
            resolveSecondLoad = resolve;
          }),
        );

      const { rerender } = render(
        <RequesterTicketDetail
          requesterId={1}
          ticketId={101}
          onBack={vi.fn()}
        />,
      );

      expect(
        await screen.findAllByText(
          ticket.summary,
        ),
      ).toHaveLength(2);

      rerender(
        <RequesterTicketDetail
          requesterId={2}
          ticketId={202}
          onBack={vi.fn()}
        />,
      );

      expect(
        screen.queryAllByText(ticket.summary),
      ).toHaveLength(0);
      expect(
        screen.getByRole("status"),
      ).toHaveTextContent(
        /loading ticket detail/i,
      );

      await act(async () => {
        resolveSecondLoad({
          ...ticket,
          id: 202,
          ticketNumber:
            "TKT-20990202-D00002",
          requester: {
            id: 2,
            name: "Development Requester 2",
            email:
              "requester2@toktickit.test",
          },
          summary:
            "Ticket owned by requester 2",
          attachments: [],
        });
      });

      expect(
        await screen.findAllByText(
          "Ticket owned by requester 2",
        ),
      ).toHaveLength(2);
    },
  );

  it(
    "uses the selected requester context when loading Ticket Detail",
    async () => {
      render(
        <RequesterTicketDetail
          requesterId={7}
          ticketId={301}
          onBack={vi.fn()}
        />,
      );

      await waitFor(() => {
        expect(
          mockedGetTicketDetail,
        ).toHaveBeenCalledWith(7, 301);
      });
    },
  );
});
