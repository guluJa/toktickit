import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import App from "../../src/App.js";
import { requesterData, staffData } from "./dashboard-fixtures.js";
afterEach(() => vi.restoreAllMocks());
it.each(["REQUESTER", "IT_STAFF", "ADMINISTRATOR"])("AUTH-01: %s keeps only permitted navigation and refuses forbidden Dashboard data", async role => {
  const calls: string[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async input => {
    const url = String(input); calls.push(url);
    if (url.includes("/auth/me")) return new Response(JSON.stringify({ data: { user: { id: 7, name: "Authorization user", email: "auth@test", role, isActive: true, mustChangePassword: false } } }));
    if (url.includes("/dashboard")) return new Response(JSON.stringify({ error: { code: "ROLE_FORBIDDEN" }, data: role === "REQUESTER" ? requesterData() : staffData() }), { status: 403 });
    if (url.includes("/staff/tickets") || url.includes("/admin/users")) return new Response(JSON.stringify({ data: { items: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } } }));
    return new Response("[]");
  }); render(<App />);
  const label = role === "REQUESTER" ? "Requester Dashboard" : "Staff Dashboard";
  await userEvent.click(await screen.findByRole("button", { name: label })); await screen.findByText(/Access denied/);
  expect(screen.queryByText("120")).not.toBeInTheDocument();
  if (role === "REQUESTER") expect(screen.queryByRole("button", { name: "Staff Dashboard" })).not.toBeInTheDocument();
  if (role !== "ADMINISTRATOR") expect(screen.queryByRole("button", { name: "User Management" })).not.toBeInTheDocument();
  expect(calls.some(url => url.includes("/api/admin/dashboard"))).toBe(false);
});
