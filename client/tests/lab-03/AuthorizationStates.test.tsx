import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App.js";

const users = {
  ADMINISTRATOR: { id: 1, name: "Administrator", email: "admin@test.example", role: "ADMINISTRATOR", isActive: true, mustChangePassword: false },
  IT_STAFF: { id: 2, name: "IT Staff", email: "staff@test.example", role: "IT_STAFF", isActive: true, mustChangePassword: false },
  REQUESTER: { id: 3, name: "Requester", email: "requester@test.example", role: "REQUESTER", isActive: true, mustChangePassword: false },
} as const;

function installApi(role: keyof typeof users) {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    if (url.includes("/api/auth/me")) return new Response(JSON.stringify({ data: { user: users[role] } }), { status: 200 });
    if (url.includes("/api/admin/users")) {
      if (url.includes("/api/admin/users/") && init?.method === "PATCH") {
        const updatedUser = url.endsWith("/2") ? { ...users.IT_STAFF, role: "REQUESTER" } : { ...users.ADMINISTRATOR, role: "REQUESTER" };
        return new Response(JSON.stringify({ data: { user: updatedUser } }), { status: 200 });
      }
      const items = role === "ADMINISTRATOR" ? [users.ADMINISTRATOR, users.IT_STAFF] : [];
      return new Response(JSON.stringify({ data: { items, pagination: { page: 1, pageSize: 20, totalItems: items.length, totalPages: items.length ? 1 : 0 } } }), { status: 200 });
    }
    if (url.includes("/api/staff/tickets")) return new Response(JSON.stringify({ data: { items: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } } }), { status: 200 });
    if (url.endsWith("/api/categories") || url.endsWith("/api/related-systems")) return new Response("[]", { status: 200 });
    if (url.includes("/api/tickets?")) return new Response(JSON.stringify({ items: [], page: 1, pageSize: 10, totalOwnedItems: 0, totalItems: 0, totalPages: 0 }), { status: 200 });
    return new Response(JSON.stringify({}), { status: 200 });
  });
}

afterEach(() => vi.restoreAllMocks());

describe("Lab 3 role navigation and authorization states", () => {
  it("shows and opens User Management for an Administrator", async () => {
    installApi("ADMINISTRATOR");
    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByRole("heading", { name: "User Management" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "User Management" }));
    expect(screen.getByRole("heading", { name: "User Management" })).toBeInTheDocument();
  });

  it("refreshes the authenticated navigation after an Administrator changes their own role", async () => {
    installApi("ADMINISTRATOR");
    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByRole("heading", { name: "User Management" })).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    await user.selectOptions(screen.getAllByLabelText("Role")[1], "REQUESTER");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(await screen.findAllByRole("button", { name: "Create Ticket" })).not.toHaveLength(0);
    expect(screen.queryByRole("button", { name: "User Management" })).not.toBeInTheDocument();
  });

  it("keeps the Administrator shell when editing another user's role", async () => {
    installApi("ADMINISTRATOR");
    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByRole("heading", { name: "User Management" })).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Edit" })[1]);
    await user.selectOptions(screen.getAllByLabelText("Role")[1], "REQUESTER");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(await screen.findByText("User updated successfully.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "User Management" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "User Management" })).toBeInTheDocument();
  });

  it("keeps Staff Queue visible for IT Staff but hides User Management", async () => {
    installApi("IT_STAFF");
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Staff Ticket Queue" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "User Management" })).not.toBeInTheDocument();
  });

  it("keeps Requester flow available and hides staff/admin destinations", async () => {
    installApi("REQUESTER");
    render(<App />);
    expect((await screen.findAllByRole("button", { name: "Create Ticket" })).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "My Tickets" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "User Management" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Staff Ticket Queue" })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Current Requester:")).toBeInTheDocument());
  });
});
