import type { NextFunction, Request, Response } from "express";
import { requireAuthenticated, requireNormalApplicationAccess } from "./auth.js";

/** Protect Staff Queue routes with authentication, password gate and role checks. */
export async function requireStaffQueueAccess(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  await requireAuthenticated(req, res, () => {
    const role = req.authUser?.role;
    if (role !== "IT_STAFF" && role !== "ADMINISTRATOR") {
      res.status(403).json({
        error: { code: "ROLE_FORBIDDEN", message: "This operation is not available for the current role." },
      });
      return;
    }
    requireNormalApplicationAccess(req, res, next);
  });
}
