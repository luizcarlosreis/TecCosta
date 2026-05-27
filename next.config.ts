import type { NextConfig } from "next";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

let systemVersion = "1.0.10";
try {
  const versionPath = path.join(process.cwd(), "src/app/lib/version.ts");
  if (fs.existsSync(versionPath)) {
    const content = fs.readFileSync(versionPath, "utf-8");
    const match = content.match(/export const SYSTEM_VERSION\s*=\s*['"]([^'"]+)['"]/);
    if (match && match[1]) {
      systemVersion = match[1];
    }
  }
} catch (error) {
  console.log("Could not read version from version.ts, using default", error);
}

let commitHash = "";
try {
  // Use Vercel's env variable if available, else local git command
  commitHash = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || "";
  if (!commitHash) {
    commitHash = execSync("git rev-parse --short HEAD").toString().trim();
  }
} catch (e) {
  console.log("Could not get git version, using default", e);
}

const appVersion = commitHash ? `${systemVersion}-${commitHash}` : systemVersion;

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
};

export default nextConfig;

