import type { NextConfig } from "next";
import { execSync } from "child_process";

let appVersion = "1.0.0";
try {
  const commitCount = execSync("git rev-list --count HEAD").toString().trim();
  const commitHash = execSync("git rev-parse --short HEAD").toString().trim();
  appVersion = `1.0.${commitCount}-${commitHash}`;
} catch (e) {
  console.log("Could not get git version, using default", e);
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
};

export default nextConfig;
