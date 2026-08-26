import {
  NextFunction,
  Request,
  Response,
} from "express";
import { getPrisma } from "./prisma.js";

export interface DevelopmentRequesterContext {
  id: number;
  name: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      developmentRequester?: DevelopmentRequesterContext;
    }
  }
}

export function parsePositiveInteger(
  value: string | undefined,
): number | null {
  if (!value || !/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed)) {
    return null;
  }

  return parsed;
}

export async function requireDevelopmentRequester(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const requesterId = parsePositiveInteger(
    req.header("X-Development-Requester-Id"),
  );

  if (requesterId === null) {
    res.status(400).json({
      error: {
        code: "INVALID_REQUESTER_CONTEXT",
        message:
          "A valid X-Development-Requester-Id header is required.",
      },
    });
    return;
  }

  try {
    const requester = await getPrisma().requesterUser.findUnique({
      where: {
        id: requesterId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
      },
    });

    if (!requester || !requester.isActive) {
      res.status(403).json({
        error: {
          code: "REQUESTER_CONTEXT_FORBIDDEN",
          message:
            "The development requester is unavailable.",
        },
      });
      return;
    }

    req.developmentRequester = {
      id: requester.id,
      name: requester.name,
      email: requester.email,
    };

    next();
  } catch (error) {
    console.error(
      "Unable to validate development requester:",
      error,
    );

    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message:
          "Unable to validate the development requester.",
      },
    });
  }
}