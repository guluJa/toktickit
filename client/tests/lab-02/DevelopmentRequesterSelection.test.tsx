import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import {
  checkSystem,
  getDevelopmentRequester,
  getDevelopmentRequesters,
} from "../../src/api.js";

vi.mock("../../src/api.js", () => ({
  checkSystem: vi.fn(),
  getDevelopmentRequester: vi.fn(),
  getDevelopmentRequesters: vi.fn(),
}));

const mockedCheckSystem =
  vi.mocked(checkSystem);

const mockedGetDevelopmentRequester =
  vi.mocked(getDevelopmentRequester);

const mockedGetDevelopmentRequesters =
  vi.mocked(getDevelopmentRequesters);

const activeRequesters = [
  {
    id: 1,
    name: "Development Requester 1",
    email: "requester1@toktickit.test",
  },
  {
    id: 2,
    name: "Development Requester 2",
    email: "requester2@toktickit.test",
  },
];

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();

  mockedGetDevelopmentRequesters.mockResolvedValue(
    activeRequesters,
  );

  mockedGetDevelopmentRequester.mockImplementation(
    async (requesterId) => {
      const requester = activeRequesters.find(
        (item) => item.id === requesterId,
      );

      if (!requester) {
        throw new Error(
          "Development requester unavailable",
        );
      }

      return requester;
    },
  );

  mockedCheckSystem.mockResolvedValue({
    online: true,
    categories: [],
  });
});

describe(
  "Development Requester Selection",
  () => {
    it(
      "loads and displays active requester options",
      async () => {
        render(<App />);

        const select =
          await screen.findByRole(
            "combobox",
            {
              name: /development requester/i,
            },
          );

        expect(select).toBeInTheDocument();

        expect(
          screen.getByRole("option", {
            name: /Development Requester 1/i,
          }),
        ).toBeInTheDocument();

        expect(
          screen.getByRole("option", {
            name: /Development Requester 2/i,
          }),
        ).toBeInTheDocument();

        expect(
          screen.getByRole("button", {
            name: "Continue",
          }),
        ).toBeDisabled();
      },
    );

    it(
      "continues with the selected requester and stores its ID",
      async () => {
        const user = userEvent.setup();

        render(<App />);

        const select =
          await screen.findByRole(
            "combobox",
            {
              name: /development requester/i,
            },
          );

        await user.selectOptions(select, "1");

        await user.click(
          screen.getByRole("button", {
            name: "Continue",
          }),
        );

        expect(
          await screen.findByText(
            /Current Requester:/i,
          ),
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            "Development Requester 1",
          ),
        ).toBeInTheDocument();

        expect(
          localStorage.getItem(
            "toktickit.developmentRequesterId",
          ),
        ).toBe("1");
      },
    );

    it(
      "restores and validates a stored requester",
      async () => {
        localStorage.setItem(
          "toktickit.developmentRequesterId",
          "2",
        );

        render(<App />);

        expect(
          await screen.findByText(
            "Development Requester 2",
          ),
        ).toBeInTheDocument();

        expect(
          mockedGetDevelopmentRequester,
        ).toHaveBeenCalledWith(2);
      },
    );

    it(
      "clears an invalid stored requester and returns to selection",
      async () => {
        localStorage.setItem(
          "toktickit.developmentRequesterId",
          "999",
        );

        mockedGetDevelopmentRequester
          .mockRejectedValueOnce(
            new Error(
              "Development requester unavailable",
            ),
          );

        render(<App />);

        expect(
          await screen.findByRole(
            "combobox",
            {
              name: /development requester/i,
            },
          ),
        ).toBeInTheDocument();

        expect(
          localStorage.getItem(
            "toktickit.developmentRequesterId",
          ),
        ).toBeNull();
      },
    );

    it(
      "clears requester context when Change Requester is selected",
      async () => {
        const user = userEvent.setup();

        render(<App />);

        const select =
          await screen.findByRole(
            "combobox",
            {
              name: /development requester/i,
            },
          );

        await user.selectOptions(select, "1");

        await user.click(
          screen.getByRole("button", {
            name: "Continue",
          }),
        );

        const changeButton =
          await screen.findByRole(
            "button",
            {
              name: /change requester/i,
            },
          );

        await user.click(changeButton);

        expect(
          await screen.findByRole(
            "combobox",
            {
              name: /development requester/i,
            },
          ),
        ).toBeInTheDocument();

        expect(
          localStorage.getItem(
            "toktickit.developmentRequesterId",
          ),
        ).toBeNull();
      },
    );

    it(
      "shows an empty state when no active requesters are available",
      async () => {
        mockedGetDevelopmentRequesters
          .mockResolvedValueOnce([]);

        render(<App />);

        expect(
          await screen.findByText(
            /No active Development Requesters/i,
          ),
        ).toBeInTheDocument();
      },
    );

    it(
      "shows a safe error and retries requester loading",
      async () => {
        mockedGetDevelopmentRequesters
          .mockRejectedValueOnce(
            new Error("API unavailable"),
          );

        const user = userEvent.setup();

        render(<App />);

        expect(
          await screen.findByText(
            /Unable to load Development Requesters/i,
          ),
        ).toBeInTheDocument();

        await user.click(
          screen.getByRole("button", {
            name: "Retry",
          }),
        );

        await waitFor(() => {
          expect(
            screen.getByRole(
              "combobox",
              {
                name:
                  /development requester/i,
              },
            ),
          ).toBeInTheDocument();
        });

        expect(
          mockedGetDevelopmentRequesters,
        ).toHaveBeenCalledTimes(2);
      },
    );
  },
);