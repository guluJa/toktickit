import type { NextFunction, Request, Response } from "express";
import { requireAuthenticated, requireNormalApplicationAccess } from "./auth.js";

/** Protect Administrator-only account-management routes. */
export async function requireAdministratorAccess(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  await requireAuthenticated(req, res, () => {
    if (req.authUser?.role !== "ADMINISTRATOR") {
      res.status(403).json({
        error: {
          code: "ROLE_FORBIDDEN",
          message: "This operation is not available for the current role.",
        },
      });
      return;
    }

    requireNormalApplicationAccess(req, res, next);
  });
}
