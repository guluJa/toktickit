import {
  act,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import MyTickets from "../../src/MyTickets.js";
import {
  getCategories,
  getMyTickets,
  getRelatedSystems,
  MyTicketsResponse,
} from "../../src/api.js";

vi.mock(
  "../../src/api.js",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("../../src/api.js")
    >()),
    getCategories: vi.fn(),
    getMyTickets: vi.fn(),
    getRelatedSystems: vi.fn(),
  }),
);

const mockedGetCategories =
  vi.mocked(getCategories);
const mockedGetRelatedSystems =
  vi.mocked(getRelatedSystems);
const mockedGetMyTickets =
  vi.mocked(getMyTickets);

const firstTicket = {
  id: 101,
  ticketNumber: "TKT-20990101-A00001",
  summary: "Laptop cannot connect to Wi-Fi",
  category: { id: 1, name: "Hardware" },
  relatedSystem: {
    id: 10,
    name: "Campus Wi-Fi",
  },
  requestedPriority: "HIGH" as const,
  currentStatus: "NEW" as const,
  createdAt: "2099-01-01T08:00:00.000Z",
  updatedAt: "2099-01-03T08:00:00.000Z",
};

const secondTicket = {
  id: 102,
  ticketNumber: "TKT-20990102-A00002",
  summary: "Email access request",
  category: {
    id: 2,
    name: "Account and Access",
  },
  relatedSystem: {
    id: 11,
    name: "Email",
  },
  requestedPriority: "LOW" as const,
  currentStatus: "NEW" as const,
  createdAt: "2099-01-02T08:00:00.000Z",
  updatedAt: "2099-01-02T08:00:00.000Z",
};

function response(
  overrides: Partial<MyTicketsResponse> = {},
): MyTicketsResponse {
  return {
    items: [firstTicket, secondTicket],
    page: 1,
    pageSize: 10,
    totalOwnedItems: 2,
    totalItems: 2,
    totalPages: 1,
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();

  mockedGetCategories.mockResolvedValue([
    { id: 1, name: "Hardware" },
    { id: 2, name: "Account and Access" },
  ]);

  mockedGetRelatedSystems.mockResolvedValue([
    {
      id: 10,
      name: "Campus Wi-Fi",
      description: null,
    },
    {
      id: 11,
      name: "Email",
      description: null,
    },
  ]);

  mockedGetMyTickets.mockResolvedValue(
    response(),
  );
});

describe("My Tickets", () => {
  it(
    "shows loading and then renders requester-owned Tickets in desktop and mobile presentations",
    async () => {
      let resolveTickets!: (
        value: MyTicketsResponse,
      ) => void;

      mockedGetMyTickets.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveTickets = resolve;
        }),
      );

      render(
        <MyTickets
          requesterId={1}
          requesterName="Development Requester 1"
          onCreateTicket={vi.fn()}
          onViewTicket={vi.fn()}
        />,
      );

      expect(
        screen.getByRole("status"),
      ).toHaveTextContent(/loading tickets/i);

      await act(async () => {
        resolveTickets(response());
      });

      expect(
        await screen.findByRole("heading", {
          name: "My Tickets",
        }),
      ).toBeInTheDocument();

      const table = screen.getByRole("table", {
        name: "My Tickets table",
      });
      expect(
        within(table).getByText(
          firstTicket.ticketNumber,
        ),
      ).toBeInTheDocument();
      expect(
        within(table).getByText(
          firstTicket.summary,
        ),
      ).toBeInTheDocument();

      const cards = screen.getByRole("list", {
        name: "My Tickets cards",
      });
      expect(
        within(cards).getByText(
          firstTicket.ticketNumber,
        ),
      ).toBeInTheDocument();

      expect(
        screen.getByText(/2 matching tickets/i),
      ).toBeInTheDocument();
    },
  );

  it(
    "sends Search, Filter, Sort, and Page Size controls as the API query",
    async () => {
      const user = userEvent.setup();

      render(
        <MyTickets
          requesterId={1}
          requesterName="Development Requester 1"
          onCreateTicket={vi.fn()}
          onViewTicket={vi.fn()}
        />,
      );

      await screen.findByRole("table", {
        name: "My Tickets table",
      });

      await user.type(
        screen.getByRole("searchbox", {
          name: "Search Tickets",
        }),
        "wifi",
      );
      await user.selectOptions(
        screen.getByRole("combobox", {
          name: "Category Filter",
        }),
        "1",
      );
      await user.selectOptions(
        screen.getByRole("combobox", {
          name: "Related System Filter",
        }),
        "10",
      );
      await user.selectOptions(
        screen.getByRole("combobox", {
          name: "Priority Filter",
        }),
        "HIGH",
      );
      await user.selectOptions(
        screen.getByRole("combobox", {
          name: "Status Filter",
        }),
        "NEW",
      );
      await user.selectOptions(
        screen.getByRole("combobox", {
          name: "Sort By",
        }),
        "ticketNumber",
      );
      await user.selectOptions(
        screen.getByRole("combobox", {
          name: "Sort Direction",
        }),
        "asc",
      );
      await user.selectOptions(
        screen.getByRole("combobox", {
          name: "Page Size",
        }),
        "20",
      );
      await user.click(
        screen.getByRole("button", {
          name: "Apply",
        }),
      );

      await waitFor(() => {
        expect(mockedGetMyTickets).toHaveBeenLastCalledWith(
          1,
          expect.objectContaining({
            search: "wifi",
            categoryId: 1,
            relatedSystemId: 10,
            requestedPriority: "HIGH",
            currentStatus: "NEW",
            sortBy: "ticketNumber",
            sortDirection: "asc",
            page: 1,
            pageSize: 20,
          }),
        );
      });
    },
  );

  it(
    "uses API pagination metadata and changes page",
    async () => {
      const user = userEvent.setup();

      mockedGetMyTickets.mockResolvedValue(
        response({
          totalOwnedItems: 12,
          totalItems: 12,
          totalPages: 2,
        }),
      );

      render(
        <MyTickets
          requesterId={1}
          requesterName="Development Requester 1"
          onCreateTicket={vi.fn()}
          onViewTicket={vi.fn()}
        />,
      );

      expect(
        await screen.findByText("Page 1 of 2"),
      ).toBeInTheDocument();

      await user.click(
        screen.getByRole("button", {
          name: "Next Page",
        }),
      );

      await waitFor(() => {
        expect(mockedGetMyTickets).toHaveBeenLastCalledWith(
          1,
          expect.objectContaining({ page: 2 }),
        );
      });
    },
  );

  it(
    "distinguishes Empty and No-results states and clears active filters",
    async () => {
      const user = userEvent.setup();

      mockedGetMyTickets
        .mockResolvedValueOnce(
          response({
            items: [],
            totalOwnedItems: 0,
            totalItems: 0,
            totalPages: 0,
          }),
        )
        .mockResolvedValueOnce(
          response({
            items: [],
            totalOwnedItems: 2,
            totalItems: 0,
            totalPages: 0,
          }),
        )
        .mockResolvedValueOnce(response());

      const { rerender } = render(
        <MyTickets
          requesterId={1}
          requesterName="Development Requester 1"
          onCreateTicket={vi.fn()}
          onViewTicket={vi.fn()}
        />,
      );

      expect(
        await screen.findByText(
          /you have not created any tickets/i,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", {
          name: "Create Ticket",
        }),
      ).toBeInTheDocument();

      rerender(
        <MyTickets
          requesterId={2}
          requesterName="Development Requester 2"
          onCreateTicket={vi.fn()}
          onViewTicket={vi.fn()}
        />,
      );

      expect(
        await screen.findByText(
          /no tickets match the current search or filters/i,
        ),
      ).toBeInTheDocument();

      await user.click(
        screen.getByRole("button", {
          name: "Clear Filters",
        }),
      );

      await waitFor(() => {
        expect(mockedGetMyTickets).toHaveBeenLastCalledWith(
          2,
          expect.objectContaining({
            page: 1,
            sortBy: "updatedAt",
            sortDirection: "desc",
          }),
        );
      });
    },
  );

  it(
    "shows a safe failure with Retry",
    async () => {
      const user = userEvent.setup();

      mockedGetMyTickets
        .mockRejectedValueOnce(
          new Error("private database failure"),
        )
        .mockResolvedValueOnce(response());

      render(
        <MyTickets
          requesterId={1}
          requesterName="Development Requester 1"
          onCreateTicket={vi.fn()}
          onViewTicket={vi.fn()}
        />,
      );

      expect(
        await screen.findByRole("alert"),
      ).toHaveTextContent(
        /unable to load your tickets/i,
      );
      expect(
        screen.queryByText(
          /private database failure/i,
        ),
      ).not.toBeInTheDocument();

      await user.click(
        screen.getByRole("button", {
          name: "Retry",
        }),
      );

      expect(
        await screen.findByRole("table", {
          name: "My Tickets table",
        }),
      ).toBeInTheDocument();
      expect(mockedGetMyTickets).toHaveBeenCalledTimes(2);
    },
  );

  it(
    "clears the previous Requester's Tickets before loading a new requester",
    async () => {
      let resolveSecondRequester!: (
        value: MyTicketsResponse,
      ) => void;

      mockedGetMyTickets
        .mockResolvedValueOnce(response())
        .mockReturnValueOnce(
          new Promise((resolve) => {
            resolveSecondRequester = resolve;
          }),
        );

      const { rerender } = render(
        <MyTickets
          requesterId={1}
          requesterName="Development Requester 1"
          onCreateTicket={vi.fn()}
          onViewTicket={vi.fn()}
        />,
      );

      expect(
        await screen.findAllByText(
          firstTicket.ticketNumber,
        ),
      ).not.toHaveLength(0);

      rerender(
        <MyTickets
          requesterId={2}
          requesterName="Development Requester 2"
          onCreateTicket={vi.fn()}
          onViewTicket={vi.fn()}
        />,
      );

      expect(
        screen.queryByText(
          firstTicket.ticketNumber,
        ),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("status"),
      ).toHaveTextContent(/loading tickets/i);

      await act(async () => {
        resolveSecondRequester(
          response({
            items: [secondTicket],
            totalOwnedItems: 1,
            totalItems: 1,
            totalPages: 1,
          }),
        );
      });

      expect(
        await screen.findAllByText(
          secondTicket.ticketNumber,
        ),
      ).not.toHaveLength(0);
    },
  );
});
