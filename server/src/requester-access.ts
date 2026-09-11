import type { NextFunction, Request, Response } from "express";
import { requireAuthenticated, requireNormalApplicationAccess } from "./auth.js";
import { requireDevelopmentRequester } from "./requester-context.js";

/** Require an active, normal-session Requester and derive ownership from it. */
export async function requireRequesterAccess(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // Lab 2 regression tests retain their header fixture in the isolated test
  // process only. No non-session fallback is available in development or
  // production application traffic.
  if (
    process.env.NODE_ENV === "test" &&
    process.env.ALLOW_LEGACY_REQUESTER_CONTEXT_TESTS === "true" &&
    !req.header("Cookie")
  ) {
    await requireDevelopmentRequester(req, res, next);
    return;
  }
  await requireAuthenticated(req, res, () => {
    if (req.authUser?.role !== "REQUESTER") {
      res.status(403).json({
        error: { code: "ROLE_FORBIDDEN", message: "This operation is not available for the current role." },
      });
      return;
    }
    requireNormalApplicationAccess(req, res, () => {
      if (!req.authUser) return;
      req.developmentRequester = {
        id: req.authUser.id,
        name: req.authUser.name,
        email: req.authUser.email,
      };
      next();
    });
  });
}
