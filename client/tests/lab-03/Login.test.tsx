import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import { AuthApiError, getCurrentUser, login } from "../../src/api.js";

vi.mock("../../src/api.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/api.js")>()),
  getCurrentUser: vi.fn(),
  login: vi.fn(),
}));

const mockedGetCurrentUser = vi.mocked(getCurrentUser);
const mockedLogin = vi.mocked(login);

beforeEach(() => {
  vi.resetAllMocks();
  mockedGetCurrentUser.mockRejectedValue(new AuthApiError("Authentication required.", 401, "AUTHENTICATION_REQUIRED"));
});
afterEach(() => vi.restoreAllMocks());

describe("Lab 3 Login component", () => {
  it("associates labels with fields and reports a safe failed login", async () => {
    mockedLogin.mockRejectedValue(new Error("Email or password is incorrect."));
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Sign in" });
    expect(screen.getByLabelText("Email")).toHaveAttribute("id", "auth-email");
    expect(screen.getByLabelText("Password")).toHaveAttribute("id", "auth-password");
    await user.type(screen.getByLabelText("Email"), "admin@example.test");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Email or password is incorrect.");
    expect(screen.queryByText(/hash|stack|sql|secret|passwordHash/i)).not.toBeInTheDocument();
  });

  it("shows a busy submit state while login is pending", async () => {
    let resolveLogin: ((value: never) => void) | undefined;
    mockedLogin.mockReturnValue(new Promise((resolve) => { resolveLogin = resolve; }));
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Sign in" });
    await user.type(screen.getByLabelText("Email"), "staff@example.test");
    await user.type(screen.getByLabelText("Password"), "Valid-Password1!");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(mockedLogin).toHaveBeenCalledWith("staff@example.test", "Valid-Password1!");
    expect(screen.getByRole("button", { name: "Signing in..." })).toBeDisabled();
    resolveLogin?.(undefined as never);
    await waitFor(() => expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument());
  });

  it("shows the safe authentication failure for an inactive account", async () => {
    mockedLogin.mockRejectedValue(new Error("Email or password is incorrect."));
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Sign in" });
    await user.type(screen.getByLabelText("Email"), "inactive@example.test");
    await user.type(screen.getByLabelText("Password"), "Valid-Password1!");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Email or password is incorrect.");
    expect(screen.queryByRole("heading", { name: "Staff Ticket Queue" })).not.toBeInTheDocument();
    expect(screen.queryByText(/hash|stack|sql|secret|passwordHash/i)).not.toBeInTheDocument();
  });
});
