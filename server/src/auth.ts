import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import type { NextFunction, Request, Response } from "express";
import type { RequesterUser, UserRole } from "@prisma/client";
import { getPrisma } from "./prisma.js";

const scrypt = promisify(scryptCallback);

export const SESSION_COOKIE = "toktickit_session";
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export const PASSWORD_POLICY_MESSAGE =
  "Password must be 12-128 characters and include lowercase, uppercase, digit, and symbol.";

export interface SafeUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: SafeUser;
  sessionId?: number;
}

declare global {
  namespace Express {
    interface Request {
      authUser?: SafeUser;
      authSessionId?: number;
    }
  }
}

export function toSafeUser(user: Pick<
  RequesterUser,
  "id" | "name" | "email" | "role" | "isActive" | "mustChangePassword"
>): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
  };
}

export function validatePassword(value: unknown): string | null {
  if (typeof value !== "string") return PASSWORD_POLICY_MESSAGE;
  if (
    value.length < 12 ||
    value.length > 128 ||
    !/[a-z]/.test(value) ||
    !/[A-Z]/.test(value) ||
    !/[0-9]/.test(value) ||
    !/[^A-Za-z0-9]/.test(value)
  ) {
    return PASSWORD_POLICY_MESSAGE;
  }
  return null;
}

export async function hashPassword(
  password: string,
  salt = randomBytes(16).toString("hex"),
): Promise<string> {
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  encoded: string,
): Promise<boolean> {
  const [algorithm, salt, hash] = encoded.split("$");
  if (algorithm !== "scrypt" || !salt || !hash || !/^[0-9a-f]+$/.test(hash)) {
    return false;
  }

  const expected = Buffer.from(hash, "hex");
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function parseCookieHeader(header: string | undefined): Map<string, string> {
  const cookies = new Map<string, string>();
  if (!header) return cookies;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index <= 0) continue;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (name) cookies.set(name, decodeURIComponent(value));
  }
  return cookies;
}

export function setSessionCookie(res: Response, token: string): void {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`,
  );
}

export function clearSessionCookie(res: Response): void {
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
}

async function loadAuthenticatedUser(req: Request): Promise<{
  user: SafeUser;
  sessionId: number;
} | null> {
  const token = parseCookieHeader(req.header("Cookie")).get(SESSION_COOKIE);
  if (!token) return null;

  const session = await getPrisma().session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: true },
  });
  if (!session) return null;

  if (session.expiresAt <= new Date() || !session.user.isActive) {
    await getPrisma().session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  return { user: toSafeUser(session.user), sessionId: session.id };
}

export async function requireAuthenticated(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = await loadAuthenticatedUser(req);
    if (!auth) {
      res.status(401).json({
        error: { code: "AUTHENTICATION_REQUIRED", message: "Authentication is required." },
      });
      return;
    }

    req.authUser = auth.user;
    req.authSessionId = auth.sessionId;
    next();
  } catch (error) {
    console.error("Unable to load authenticated user:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Unable to verify authentication." },
    });
  }
}

export function requireNormalApplicationAccess(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.authUser?.mustChangePassword) {
    res.status(403).json({
      error: {
        code: "PASSWORD_CHANGE_REQUIRED",
        message: "You must change your password before continuing.",
      },
    });
    return;
  }
  next();
}
