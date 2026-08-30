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
import CreateTicket from "../../src/CreateTicket.js";
import {
  createTicket,
  CreateTicketResponse,
  getCategories,
  getRelatedSystems,
} from "../../src/api.js";

vi.mock("../../src/api.js", () => ({
  createTicket: vi.fn(),
  getCategories: vi.fn(),
  getRelatedSystems: vi.fn(),
}));

const mockedCreateTicket =
  vi.mocked(createTicket);

const mockedGetCategories =
  vi.mocked(getCategories);

const mockedGetRelatedSystems =
  vi.mocked(getRelatedSystems);

beforeEach(() => {
  vi.resetAllMocks();
});

describe("Create Ticket", () => {
  it(
    "disables the form while loading reference data and enables it when ready",
    async () => {
      let resolveCategories!: (
        categories: Array<{
          id: number;
          name: string;
        }>,
      ) => void;

      let resolveRelatedSystems!: (
        systems: Array<{
          id: number;
          name: string;
          description: string | null;
        }>,
      ) => void;

      mockedGetCategories.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveCategories = resolve;
        }),
      );

      mockedGetRelatedSystems.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveRelatedSystems = resolve;
        }),
      );

      render(
        <CreateTicket requesterId={1} />,
      );

      expect(
        screen.getByRole("heading", {
          name: /create ticket/i,
        }),
      ).toBeInTheDocument();

      expect(
        screen.getByRole("status"),
      ).toHaveTextContent(
        /loading reference data/i,
      );

      expect(
        screen.getByRole("button", {
          name: /create ticket/i,
        }),
      ).toBeDisabled();

      await act(async () => {
        resolveCategories([
          {
            id: 1,
            name: "Hardware",
          },
        ]);

        resolveRelatedSystems([
          {
            id: 2,
            name: "Campus Wi-Fi",
            description:
              "Wireless network services on campus",
          },
        ]);
      });

      expect(
        await screen.findByRole(
          "combobox",
          {
            name: "Category",
          },
        ),
      ).toBeEnabled();

      expect(
        screen.getByRole("combobox", {
          name: "Related System",
        }),
      ).toBeEnabled();

      expect(
        screen.getByRole("option", {
          name: "Hardware",
        }),
      ).toBeInTheDocument();

      expect(
        screen.getByRole("option", {
          name: "Campus Wi-Fi",
        }),
      ).toBeInTheDocument();

      expect(
        screen.getByRole("button", {
          name: /create ticket/i,
        }),
      ).toBeEnabled();

      expect(
        mockedCreateTicket,
      ).not.toHaveBeenCalled();
    },
  );
  it(
    "shows field-level validation and does not call the API for invalid input",
    async () => {
      const user = userEvent.setup();

      mockedGetCategories.mockResolvedValueOnce([
        {
          id: 1,
          name: "Hardware",
        },
      ]);

      mockedGetRelatedSystems
        .mockResolvedValueOnce([
          {
            id: 2,
            name: "Campus Wi-Fi",
            description:
              "Wireless network services on campus",
          },
        ]);

      render(
        <CreateTicket requesterId={1} />,
      );

      await screen.findByRole(
        "combobox",
        {
          name: "Category",
        },
      );

      await user.click(
        screen.getByRole("button", {
          name: /create ticket/i,
        }),
      );

      expect(
        screen.getByText(
          "Category is required.",
        ),
      ).toBeInTheDocument();

      expect(
        screen.getByText(
          "Related System is required.",
        ),
      ).toBeInTheDocument();

      expect(
        screen.getByText(
          "Summary must contain between 5 and 150 characters.",
        ),
      ).toBeInTheDocument();

      expect(
        screen.getByText(
          "Description must contain between 10 and 5000 characters.",
        ),
      ).toBeInTheDocument();

      expect(
        screen.getByLabelText("Category"),
      ).toHaveAttribute(
        "aria-invalid",
        "true",
      );

      expect(
        screen.getByLabelText(
          "Related System",
        ),
      ).toHaveAttribute(
        "aria-invalid",
        "true",
      );

      expect(
        screen.getByLabelText("Summary"),
      ).toHaveAttribute(
        "aria-invalid",
        "true",
      );

      expect(
        screen.getByLabelText(
          "Description",
        ),
      ).toHaveAttribute(
        "aria-invalid",
        "true",
      );

      expect(
        mockedCreateTicket,
      ).not.toHaveBeenCalled();
    },
  );

  it(
    "submits once, disables the form while busy, and displays the created Ticket",
    async () => {
      const user = userEvent.setup();

      mockedGetCategories.mockResolvedValueOnce([
        {
          id: 1,
          name: "Hardware",
        },
      ]);

      mockedGetRelatedSystems.mockResolvedValueOnce([
        {
          id: 2,
          name: "Campus Wi-Fi",
          description:
            "Wireless network services on campus",
        },
      ]);

      let resolveCreateTicket!: (
        response: CreateTicketResponse,
      ) => void;

      mockedCreateTicket.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveCreateTicket = resolve;
        }),
      );

      render(
        <CreateTicket requesterId={1} />,
      );

      await user.selectOptions(
        await screen.findByRole(
          "combobox",
          { name: "Category" },
        ),
        "1",
      );

      await user.selectOptions(
        screen.getByRole("combobox", {
          name: "Related System",
        }),
        "2",
      );

      await user.type(
        screen.getByLabelText("Summary"),
        "Laptop cannot connect to Wi-Fi",
      );

      await user.selectOptions(
        screen.getByRole("combobox", {
          name: "Requested Priority",
        }),
        "HIGH",
      );

      await user.type(
        screen.getByLabelText(
          "Description",
        ),
        "The connection disconnects after a few minutes.",
      );

      await user.click(
        screen.getByRole("button", {
          name: "Create Ticket",
        }),
      );

      await waitFor(() => {
        expect(
          mockedCreateTicket,
        ).toHaveBeenCalledTimes(1);
      });

      expect(
        mockedCreateTicket,
      ).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          submissionKey:
            expect.stringMatching(
              /^[0-9a-f-]{36}$/i,
            ),
          categoryId: 1,
          relatedSystemId: 2,
          summary:
            "Laptop cannot connect to Wi-Fi",
          requestedPriority: "HIGH",
          description:
            "The connection disconnects after a few minutes.",
        }),
      );

      const busyButton =
        screen.getByRole("button", {
          name: "Creating Ticket...",
        });

      expect(busyButton).toBeDisabled();

      await user.click(busyButton);

      expect(
        mockedCreateTicket,
      ).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveCreateTicket({
          ticket: {
            id: 15,
            ticketNumber:
              "TKT-20260830-A1B2C3",
            requester: {
              id: 1,
              name:
                "Development Requester 1",
              email:
                "requester1@toktickit.test",
            },
            category: {
              id: 1,
              name: "Hardware",
            },
            relatedSystem: {
              id: 2,
              name: "Campus Wi-Fi",
            },
            summary:
              "Laptop cannot connect to Wi-Fi",
            requestedPriority: "HIGH",
            description:
              "The connection disconnects after a few minutes.",
            currentStatus: "NEW",
            createdAt:
              "2026-08-30T14:00:00.000Z",
            updatedAt:
              "2026-08-30T14:00:00.000Z",
            attachments: [],
          },
          replayed: false,
        });
      });

      expect(
        await screen.findByRole(
          "heading",
          { name: "Ticket Created" },
        ),
      ).toBeInTheDocument();

      expect(
        screen.getByText(
          "TKT-20260830-A1B2C3",
        ),
      ).toBeInTheDocument();

      expect(
        screen.getByText(
          "Laptop cannot connect to Wi-Fi",
        ),
      ).toBeInTheDocument();

      expect(
        screen.getByText("NEW"),
      ).toBeInTheDocument();
    },
  );

  it(
    "preserves the form and reuses the submission key after a safe failure",
    async () => {
      const user = userEvent.setup();

      mockedGetCategories.mockResolvedValueOnce([
        {
          id: 1,
          name: "Hardware",
        },
      ]);

      mockedGetRelatedSystems.mockResolvedValueOnce([
        {
          id: 2,
          name: "Campus Wi-Fi",
          description:
            "Wireless network services on campus",
        },
      ]);

      mockedCreateTicket
        .mockRejectedValueOnce(
          new Error(
            "Private database details must not be displayed",
          ),
        )
        .mockResolvedValueOnce({
          ticket: {
            id: 16,
            ticketNumber:
              "TKT-20260830-D4E5F6",
            requester: {
              id: 1,
              name:
                "Development Requester 1",
              email:
                "requester1@toktickit.test",
            },
            category: {
              id: 1,
              name: "Hardware",
            },
            relatedSystem: {
              id: 2,
              name: "Campus Wi-Fi",
            },
            summary:
              "Laptop cannot connect to Wi-Fi",
            requestedPriority: "HIGH",
            description:
              "The connection disconnects after a few minutes.",
            currentStatus: "NEW",
            createdAt:
              "2026-08-30T14:10:00.000Z",
            updatedAt:
              "2026-08-30T14:10:00.000Z",
            attachments: [],
          },
          replayed: false,
        });

      render(
        <CreateTicket requesterId={1} />,
      );

      const categorySelect =
        await screen.findByRole(
          "combobox",
          { name: "Category" },
        );

      const relatedSystemSelect =
        screen.getByRole("combobox", {
          name: "Related System",
        });

      const summaryInput =
        screen.getByLabelText("Summary");

      const prioritySelect =
        screen.getByRole("combobox", {
          name: "Requested Priority",
        });

      const descriptionInput =
        screen.getByLabelText(
          "Description",
        );

      await user.selectOptions(
        categorySelect,
        "1",
      );
      await user.selectOptions(
        relatedSystemSelect,
        "2",
      );
      await user.type(
        summaryInput,
        "Laptop cannot connect to Wi-Fi",
      );
      await user.selectOptions(
        prioritySelect,
        "HIGH",
      );
      await user.type(
        descriptionInput,
        "The connection disconnects after a few minutes.",
      );

      await user.click(
        screen.getByRole("button", {
          name: "Create Ticket",
        }),
      );

      expect(
        await screen.findByRole("alert"),
      ).toHaveTextContent(
        "Unable to create the Ticket. Your form values have been preserved. Please try again.",
      );

      expect(screen.queryByText(
        /private database details/i,
      )).not.toBeInTheDocument();

      expect(categorySelect).toHaveValue(
        "1",
      );
      expect(
        relatedSystemSelect,
      ).toHaveValue("2");
      expect(summaryInput).toHaveValue(
        "Laptop cannot connect to Wi-Fi",
      );
      expect(prioritySelect).toHaveValue(
        "HIGH",
      );
      expect(
        descriptionInput,
      ).toHaveValue(
        "The connection disconnects after a few minutes.",
      );

      const firstSubmissionKey =
        mockedCreateTicket.mock.calls[0][1]
          .submissionKey;

      await user.click(
        screen.getByRole("button", {
          name: "Create Ticket",
        }),
      );

      await waitFor(() => {
        expect(
          mockedCreateTicket,
        ).toHaveBeenCalledTimes(2);
      });

      expect(
        mockedCreateTicket.mock.calls[1][1]
          .submissionKey,
      ).toBe(firstSubmissionKey);

      expect(
        await screen.findByText(
          "TKT-20260830-D4E5F6",
        ),
      ).toBeInTheDocument();
    },
  );
});
