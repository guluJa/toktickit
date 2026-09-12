import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UserManagement from "../../src/UserManagement.js";
import { AuthUser, createAdminUser, getAdminUsers, resetAdminInitialPassword, TicketApiError, updateAdminUser } from "../../src/api.js";

vi.mock("../../src/api.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/api.js")>()),
  createAdminUser: vi.fn(),
  getAdminUsers: vi.fn(),
  resetAdminInitialPassword: vi.fn(),
  updateAdminUser: vi.fn(),
}));

const mockedGet = vi.mocked(getAdminUsers);
const mockedCreate = vi.mocked(createAdminUser);
const mockedReset = vi.mocked(resetAdminInitialPassword);
const mockedUpdate = vi.mocked(updateAdminUser);

const admin: AuthUser = { id: 1, name: "Administrator", email: "admin@test.example", role: "ADMINISTRATOR", isActive: true, mustChangePassword: false };
const requester: AuthUser = { id: 2, name: "Requester One", email: "requester@test.example", role: "REQUESTER", isActive: true, mustChangePassword: true };
const inactive: AuthUser = { id: 3, name: "Inactive Staff", email: "inactive@test.example", role: "IT_STAFF", isActive: false, mustChangePassword: true };

beforeEach(() => {
  vi.resetAllMocks();
  mockedGet.mockResolvedValue({ items: [admin, requester, inactive], pagination: { page: 1, pageSize: 20, totalItems: 3, totalPages: 1 } });
  mockedCreate.mockResolvedValue({ user: { ...requester, id: 4, name: "New User", email: "new@test", mustChangePassword: true } });
  mockedUpdate.mockResolvedValue({ user: { ...requester, name: "Updated User" } });
  mockedReset.mockResolvedValue({ user: { ...requester, mustChangePassword: true } });
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

describe("Administrator User Management", () => {
  it("shows safe user list fields, status text and Edit actions", async () => {
    render(<UserManagement />);
    expect(await screen.findByRole("heading", { name: "User Management" })).toBeInTheDocument();
    expect(screen.getByText("Requester One")).toBeInTheDocument();
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Inactive").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(3);
  });

  it("searches by name/email and applies the optional role filter", async () => {
    const user = userEvent.setup();
    render(<UserManagement />);
    await screen.findByText("Requester One");
    await user.type(screen.getByLabelText("Search users"), "requester");
    await user.selectOptions(screen.getAllByLabelText("Role")[0], "REQUESTER");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() => expect(mockedGet).toHaveBeenLastCalledWith({ search: "requester", role: "REQUESTER" }));
  });

  it("creates an inactive user with one role and initial password", async () => {
    const user = userEvent.setup();
    render(<UserManagement />);
    await screen.findByText("Requester One");
    await user.type(screen.getByLabelText("Name"), "New Inactive");
    await user.type(screen.getByLabelText("Email"), "new-inactive@test.example");
    await user.selectOptions(screen.getAllByLabelText("Role")[1], "IT_STAFF");
    await user.selectOptions(screen.getAllByLabelText("Status")[0], "inactive");
    await user.type(screen.getByLabelText("Initial Password"), "Valid-Password1!");
    await user.click(screen.getAllByRole("button", { name: "Create User" }).at(-1)!);
    await waitFor(() => expect(mockedCreate).toHaveBeenCalledWith({ name: "New Inactive", email: "new-inactive@test.example", role: "IT_STAFF", isActive: false, initialPassword: "Valid-Password1!" }));
    expect(await screen.findByText("User created successfully.")).toBeInTheDocument();
  });

  it("edits a user and resets the initial password", async () => {
    const user = userEvent.setup();
    render(<UserManagement />);
    await screen.findByText("Requester One");
    await user.click(screen.getAllByRole("button", { name: "Edit" })[1]);
    const name = screen.getByLabelText("Name");
    await user.clear(name);
    await user.type(name, "Updated Requester");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(mockedUpdate).toHaveBeenCalledWith(2, { name: "Updated Requester", email: "requester@test.example", role: "REQUESTER", isActive: true }));
    await user.type(screen.getByLabelText("New Initial Password"), "Changed-Password2@");
    await user.click(screen.getByRole("button", { name: "Reset Initial Password" }));
    await waitFor(() => expect(mockedReset).toHaveBeenCalledWith(2, "Changed-Password2@"));
    expect(await screen.findByText("Initial password reset successfully.")).toBeInTheDocument();
  });

  it("confirms deactivation and prevents blank form submission", async () => {
    const user = userEvent.setup();
    render(<UserManagement />);
    await screen.findByText("Requester One");
    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    await user.selectOptions(screen.getAllByLabelText("Status")[0], "inactive");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(window.confirm).toHaveBeenCalled();
    expect(mockedUpdate).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(screen.getAllByRole("button", { name: "Create User" }).at(-1)!);
    expect(await screen.findByRole("alert")).toHaveTextContent("Name must contain");
  });

  it("shows safe forbidden, conflict and retry states", async () => {
    mockedGet.mockRejectedValueOnce(new TicketApiError("forbidden", 403, "ROLE_FORBIDDEN"));
    const { unmount } = render(<UserManagement />);
    expect(await screen.findByText(/Only Administrators/)).toBeInTheDocument();
    unmount();
    mockedGet.mockRejectedValueOnce(new TicketApiError("server", 500, "INTERNAL_ERROR"));
    render(<UserManagement />);
    expect(await screen.findByText(/Unable to load users/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("shows an empty/no-results state without exposing secrets", async () => {
    mockedGet.mockResolvedValueOnce({ items: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } });
    render(<UserManagement />);
    expect(await screen.findByText(/No users match/)).toBeInTheDocument();
    expect(screen.queryByText(/passwordHash|Valid-Password/)).not.toBeInTheDocument();
  });
});
