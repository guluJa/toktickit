import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import { AuthApiError, changePassword, getCurrentUser } from "../../src/api.js";

vi.mock("../../src/api.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/api.js")>()),
  getCurrentUser: vi.fn(),
  changePassword: vi.fn(),
}));

const gatedUser = { id: 10, name: "Initial User", email: "initial@example.test", role: "REQUESTER" as const, isActive: true, mustChangePassword: true };
const readyUser = { ...gatedUser, role: "IT_STAFF" as const, mustChangePassword: false };
const mockedGetCurrentUser = vi.mocked(getCurrentUser);
const mockedChangePassword = vi.mocked(changePassword);

beforeEach(() => { vi.resetAllMocks(); mockedGetCurrentUser.mockResolvedValue(gatedUser); });
afterEach(() => vi.restoreAllMocks());

describe("Lab 3 Change Password component", () => {
  it("shows the mandatory gate, labels, and continues after success", async () => {
    mockedChangePassword.mockResolvedValue(readyUser);
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Change password required" });
    expect(screen.getByLabelText("New password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm password")).toBeInTheDocument();
    await user.type(screen.getByLabelText("New password"), "New-Password1!");
    await user.type(screen.getByLabelText("Confirm password"), "New-Password1!");
    await user.click(screen.getByRole("button", { name: "Change password" }));
    expect(mockedChangePassword).toHaveBeenCalledWith("New-Password1!", "New-Password1!");
    expect(await screen.findByText(/Authenticated User:/i)).toBeInTheDocument();
  });

  it("keeps the gate and reports a safe validation failure", async () => {
    mockedChangePassword.mockRejectedValue(new Error("Password does not satisfy the policy."));
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Change password required" });
    await user.type(screen.getByLabelText("New password"), "weak");
    await user.type(screen.getByLabelText("Confirm password"), "weak");
    await user.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Password does not satisfy the policy.");
    expect(screen.getByRole("heading", { name: "Change password required" })).toBeInTheDocument();
    expect(screen.queryByText(/hash|stack|sql|secret/i)).not.toBeInTheDocument();
  });
});
