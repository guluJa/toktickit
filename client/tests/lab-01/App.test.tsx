import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";

const requester = {
  id: 1,
  name: "Development Requester 1",
  email: "requester1@toktickit.test",
  role: "REQUESTER" as const,
  isActive: true,
  mustChangePassword: false,
};

vi.mock("../../src/api.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/api.js")>()),
  getCurrentUser: vi.fn(),
  checkSystem: vi.fn(),
}));

import { checkSystem, getCurrentUser } from "../../src/api.js";

beforeEach(() => {
  vi.mocked(getCurrentUser).mockResolvedValue(requester);
});

async function enterWorkspace() {
  render(<App />);
  await screen.findByText(/Authenticated session/i);
  return userEvent.setup();
}

describe("App", () => {
  it("renders the TokTickIT heading", async () => {
    await enterWorkspace();
    expect(screen.getByText("TokTickIT")).toBeInTheDocument();
  });

  it("shows Online and the seeded categories on success", async () => {
    vi.mocked(checkSystem).mockResolvedValueOnce({ online: true, categories: [
      { id: 1, name: "Account and Access" }, { id: 2, name: "Hardware" },
      { id: 3, name: "Software" }, { id: 4, name: "Network" },
    ] });
    const user = await enterWorkspace();
    await user.click(screen.getByRole("button", { name: /check system/i }));
    expect(await screen.findByText(/System Status: Online/i)).toBeInTheDocument();
    expect(screen.getByText("Account and Access")).toBeInTheDocument();
    expect(screen.getByText("Hardware")).toBeInTheDocument();
    expect(screen.getByText("Software")).toBeInTheDocument();
    expect(screen.getByText("Network")).toBeInTheDocument();
  });

  it("shows an Offline error message when the API is unavailable", async () => {
    vi.mocked(checkSystem).mockRejectedValueOnce(new Error("Unable to connect"));
    const user = await enterWorkspace();
    await user.click(screen.getByRole("button", { name: /check system/i }));
    expect(await screen.findByText(/System Status: Offline/i)).toBeInTheDocument();
    expect(screen.getByText(/Unable to connect to TokTickIT API/i)).toBeInTheDocument();
  });
});
