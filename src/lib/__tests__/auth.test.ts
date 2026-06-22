// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";
import { SignJWT, decodeJwt } from "jose";

vi.mock("server-only", () => ({}));

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

import { createSession, getSession, deleteSession, verifySession } from "@/lib/auth";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const JWT_SECRET = new TextEncoder().encode("development-secret-key");
const COOKIE_NAME = "auth-token";

async function signToken(
  payload: object,
  expiresIn: string = "7d"
): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

beforeEach(() => {
  vi.clearAllMocks();
  (cookies as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockCookieStore);
});

// --- createSession ---

test("createSession sets an httpOnly cookie", async () => {
  await createSession("user-1", "user@example.com");

  expect(mockCookieStore.set).toHaveBeenCalledOnce();
  const [name, , options] = mockCookieStore.set.mock.calls[0];
  expect(name).toBe(COOKIE_NAME);
  expect(options.httpOnly).toBe(true);
});

test("createSession sets sameSite lax and path /", async () => {
  await createSession("user-1", "user@example.com");

  const [, , options] = mockCookieStore.set.mock.calls[0];
  expect(options.sameSite).toBe("lax");
  expect(options.path).toBe("/");
});

test("createSession cookie expires approximately 7 days from now", async () => {
  const before = Date.now();
  await createSession("user-1", "user@example.com");
  const after = Date.now();

  const [, , options] = mockCookieStore.set.mock.calls[0];
  const expiresMs = options.expires.getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  expect(expiresMs).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
  expect(expiresMs).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
});

test("createSession sets secure=false outside production", async () => {
  const original = process.env.NODE_ENV;
  // @ts-ignore
  process.env.NODE_ENV = "development";

  await createSession("user-1", "user@example.com");

  const [, , options] = mockCookieStore.set.mock.calls[0];
  expect(options.secure).toBe(false);

  // @ts-ignore
  process.env.NODE_ENV = original;
});

test("createSession sets a valid JWT as the cookie value", async () => {
  await createSession("user-42", "hello@example.com");

  const [, token] = mockCookieStore.set.mock.calls[0];
  expect(typeof token).toBe("string");
  expect(token.split(".")).toHaveLength(3); // Header.Payload.Signature
});

test("createSession sets secure=true in production", async () => {
  const original = process.env.NODE_ENV;
  // @ts-ignore
  process.env.NODE_ENV = "production";

  await createSession("user-1", "user@example.com");

  const [, , options] = mockCookieStore.set.mock.calls[0];
  expect(options.secure).toBe(true);

  // @ts-ignore
  process.env.NODE_ENV = original;
});

test("createSession JWT payload contains userId and email", async () => {
  await createSession("user-42", "alice@example.com");

  const [, token] = mockCookieStore.set.mock.calls[0];
  const payload = decodeJwt(token);

  expect(payload.userId).toBe("user-42");
  expect(payload.email).toBe("alice@example.com");
});

test("createSession JWT exp claim is approximately 7 days from now", async () => {
  const before = Math.floor(Date.now() / 1000);
  await createSession("user-1", "user@example.com");
  const after = Math.floor(Date.now() / 1000);

  const [, token] = mockCookieStore.set.mock.calls[0];
  const { exp } = decodeJwt(token);
  const sevenDays = 7 * 24 * 60 * 60;

  expect(exp).toBeGreaterThanOrEqual(before + sevenDays - 5);
  expect(exp).toBeLessThanOrEqual(after + sevenDays + 5);
});

// --- getSession ---

test("getSession returns null when no cookie exists", async () => {
  mockCookieStore.get.mockReturnValue(undefined);

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession returns the session payload for a valid token", async () => {
  const payload = {
    userId: "user-1",
    email: "user@example.com",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };
  const token = await signToken(payload);
  mockCookieStore.get.mockReturnValue({ value: token });

  const session = await getSession();

  expect(session).not.toBeNull();
  expect(session!.userId).toBe("user-1");
  expect(session!.email).toBe("user@example.com");
});

test("getSession returns null for an expired token", async () => {
  const token = await signToken(
    { userId: "user-1", email: "user@example.com" },
    "-1s"
  );
  mockCookieStore.get.mockReturnValue({ value: token });

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession returns null for a malformed token", async () => {
  mockCookieStore.get.mockReturnValue({ value: "not.a.jwt" });

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession looks up the correct cookie name", async () => {
  mockCookieStore.get.mockReturnValue(undefined);

  await getSession();

  expect(mockCookieStore.get).toHaveBeenCalledWith(COOKIE_NAME);
});

test("getSession returns null for a token signed with the wrong secret", async () => {
  const wrongSecret = new TextEncoder().encode("wrong-secret");
  const token = await new SignJWT({ userId: "user-1", email: "user@example.com" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(wrongSecret);
  mockCookieStore.get.mockReturnValue({ value: token });

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession returns null for an empty cookie value", async () => {
  mockCookieStore.get.mockReturnValue({ value: "" });

  const session = await getSession();

  expect(session).toBeNull();
});

// --- deleteSession ---

test("deleteSession removes the auth-token cookie", async () => {
  await deleteSession();

  expect(mockCookieStore.delete).toHaveBeenCalledOnce();
  expect(mockCookieStore.delete).toHaveBeenCalledWith(COOKIE_NAME);
});

// --- verifySession ---

test("verifySession returns null when request has no cookie", async () => {
  const req = new NextRequest("http://localhost/");

  const session = await verifySession(req);

  expect(session).toBeNull();
});

test("verifySession returns the session payload for a valid token in request", async () => {
  const payload = {
    userId: "user-99",
    email: "req@example.com",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };
  const token = await signToken(payload);
  const req = new NextRequest("http://localhost/", {
    headers: { Cookie: `${COOKIE_NAME}=${token}` },
  });

  const session = await verifySession(req);

  expect(session).not.toBeNull();
  expect(session!.userId).toBe("user-99");
  expect(session!.email).toBe("req@example.com");
});

test("verifySession returns null for an expired token in request", async () => {
  const token = await signToken(
    { userId: "user-1", email: "user@example.com" },
    "-1s"
  );
  const req = new NextRequest("http://localhost/", {
    headers: { Cookie: `${COOKIE_NAME}=${token}` },
  });

  const session = await verifySession(req);

  expect(session).toBeNull();
});

test("verifySession returns null for a malformed token in request", async () => {
  const req = new NextRequest("http://localhost/", {
    headers: { Cookie: `${COOKIE_NAME}=bad.token.here` },
  });

  const session = await verifySession(req);

  expect(session).toBeNull();
});

test("verifySession returns null for a token signed with the wrong secret", async () => {
  const wrongSecret = new TextEncoder().encode("wrong-secret");
  const token = await new SignJWT({ userId: "user-1", email: "user@example.com" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(wrongSecret);
  const req = new NextRequest("http://localhost/", {
    headers: { Cookie: `${COOKIE_NAME}=${token}` },
  });

  const session = await verifySession(req);

  expect(session).toBeNull();
});

test("verifySession returns null for an empty cookie value", async () => {
  const req = new NextRequest("http://localhost/", {
    headers: { Cookie: `${COOKIE_NAME}=` },
  });

  const session = await verifySession(req);

  expect(session).toBeNull();
});
