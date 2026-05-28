export const SYSTEM_VERSION = "1.0.63";

export const APP_VERSION = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
  ? `${SYSTEM_VERSION}-${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.substring(0, 7)}`
  : `${SYSTEM_VERSION}`;
