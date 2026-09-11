import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "../../src/App.js";

const authenticatedRequester = {
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
  checkSystem: vi.fn().mockResolvedValue({ online: true, categories: [] }),
}));

import { getCurrentUser } from "../../src/api.js";

beforeEach(() => {
  vi.mocked(getCurrentUser).mockResolvedValue(authenticatedRequester);
});

describe("Authenticated requester identity", () => {
  it("does not render the retired Development Requester selector", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getAllByText(authenticatedRequester.name).length).toBeGreaterThan(0));
    expect(screen.queryByRole("combobox", { name: /development requester/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /change requester/i })).not.toBeInTheDocument();
  });

  it("uses the authenticated user as the only requester identity", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText(/Authenticated session/i)).toBeInTheDocument());
    expect(screen.getAllByText(authenticatedRequester.name).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Development Requester 2/i)).not.toBeInTheDocument();
  });
});
