import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { checkSystem } from "../../src/api.js";
import App from "../../src/App.js";

vi.mock("../../src/api.js", () => ({
  checkSystem: vi.fn(),
}));

const mockedCheckSystem = vi.mocked(checkSystem);

afterEach(() => {
  vi.clearAllMocks();
});

describe("App", () => {
  it("renders the TokTickIT heading", () => {
    render(<App />);

    expect(
      screen.getByText(/TokTickIT/i),
    ).toBeInTheDocument();
  });

  it("shows Online and the seeded categories on success", async () => {
    mockedCheckSystem.mockResolvedValueOnce({
      online: true,
      categories: [
        { id: 1, name: "Account and Access" },
        { id: 2, name: "Hardware" },
        { id: 3, name: "Software" },
        { id: 4, name: "Network" },
      ],
    });

    const user = userEvent.setup();

    render(<App />);

    await user.click(
      screen.getByRole("button", { name: /check system/i }),
    );

    expect(
      await screen.findByText(/System Status: Online/i),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Account and Access"),
    ).toBeInTheDocument();

    expect(screen.getByText("Hardware")).toBeInTheDocument();
    expect(screen.getByText("Software")).toBeInTheDocument();
    expect(screen.getByText("Network")).toBeInTheDocument();
  });

  it("shows an Offline error message when the API is unavailable", async () => {
    mockedCheckSystem.mockRejectedValueOnce(
      new Error("Unable to connect"),
    );

    const user = userEvent.setup();

    render(<App />);

    await user.click(
      screen.getByRole("button", { name: /check system/i }),
    );

    expect(
      await screen.findByText(/System Status: Offline/i),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Unable to connect to TokTickIT API/i),
    ).toBeInTheDocument();
  });
});
