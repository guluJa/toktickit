import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";

describe("Lab 3 Requester regression", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/auth/me")) return new Response(JSON.stringify({ data: { user: { id: 1, name: "Requester One", email: "requester1@test", role: "REQUESTER", isActive: true, mustChangePassword: false } } }), { status: 200, headers: { "Content-Type": "application/json" } });
      if (url.includes("/api/categories")) return new Response(JSON.stringify([]), { status: 200 });
      if (url.includes("/api/related-systems")) return new Response(JSON.stringify([]), { status: 200 });
      if (url.includes("/api/tickets")) return new Response(JSON.stringify({ items: [], page: 1, pageSize: 10, totalOwnedItems: 0, totalItems: 0, totalPages: 0 }), { status: 200 });
      return new Response(JSON.stringify({}), { status: 200 });
    });
  });

  it("uses the authenticated requester and removes the development selector", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getAllByText("Requester One").length).toBeGreaterThan(0));
    expect(screen.queryByText(/Select a Development Requester/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Change Requester/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Logout" })).toBeInTheDocument();
  });
});
