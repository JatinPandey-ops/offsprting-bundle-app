// /app/utils/session.server.ts
import { createCookieSessionStorage } from "@remix-run/node";

// Custom session storage with explicit cookie options
export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    secure: true,        // Ensure it is only used over HTTPS
    httpOnly: true,      // Not accessible via JavaScript
    sameSite: "none",    // Allows cross-origin requests
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 1-week session
  },
});

// Export getSession, commitSession, destroySession
export const { getSession, commitSession, destroySession } = sessionStorage;
