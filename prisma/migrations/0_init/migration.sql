CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT FALSE,
    "scope" TEXT,
    "expires" TIMESTAMP,
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT FALSE,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT FALSE,
    "emailVerified" BOOLEAN DEFAULT FALSE
);