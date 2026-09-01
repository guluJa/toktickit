import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App.js";
import { ZEN_GREEN_TOKENS } from "../../src/theme.js";
import {
  getDevelopmentRequesters,
} from "../../src/api.js";

vi.mock("../../src/api.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/api.js")>()),
  getDevelopmentRequesters: vi.fn(),
}));

const mockedGetDevelopmentRequesters = vi.mocked(
  getDevelopmentRequesters,
);

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  mockedGetDevelopmentRequesters.mockResolvedValue([
    {
      id: 1,
      name: "Development Requester 1",
      email: "requester1@toktickit.test",
    },
  ]);
});

describe("Zen Green visual rules", () => {
  it("defines every approved Zen Green design token and component override", () => {
    expect(ZEN_GREEN_TOKENS).toEqual({
      primary: "#006B3C",
      secondary: "#0B7A46",
      paleGreen: "#EAF6EF",
      page: "#F5F7F6",
      surface: "#FFFFFF",
      text: "#18372B",
      muted: "#5F6F67",
      border: "#CAD8D1",
      readonly: "#F0F4F1",
      error: "#8B1E2D",
      warning: "#9A6700",
      success: "#176B3A",
    });
  });

  it("uses the approved green hierarchy and restrained card treatment", async () => {
    render(<App />);

    const brand = await screen.findByRole("heading", {
      name: "TokTickIT",
    });
    const requesterCard = brand.closest("section");
    const continueButton = screen.getByRole("button", {
      name: "Continue",
    });

    expect(brand).toHaveClass("text-success");
    expect(requesterCard).toHaveClass("card", "border-success", "shadow-sm");
    expect(continueButton).toHaveClass("btn", "btn-success");
    expect(continueButton).not.toHaveClass("btn-danger");
  });
});
