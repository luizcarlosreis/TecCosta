import type { NextConfig } from "next";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// 1. Detect and automatically unshallow the repository on Vercel to get accurate commit count
try {
  const gitDir = path.join(process.cwd(), ".git");
  const shallowPath = path.join(gitDir, "shallow");
  if (fs.existsSync(shallowPath)) {
    console.log("Detectado clone raso (shallow clone) na Vercel. Desfazendo limitação de histórico...");
    execSync("git fetch --unshallow", { stdio: "inherit" });
    console.log("Histórico do git restaurado com sucesso!");
  }
} catch (error) {
  console.log("Não foi possível restaurar o histórico completo do git:", error);
}

// 2. Read the base version from version.ts
let systemVersion = "1.0.0";
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

// 3. Get actual commit count and commit hash
let commitCount = "0";
let commitHash = "";
try {
  commitCount = execSync("git rev-list --count HEAD").toString().trim();
  commitHash = execSync("git rev-parse --short HEAD").toString().trim();
} catch (e) {
  console.log("Could not get git details:", e);
  commitHash = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || "";
}

// 4. Construct sequential version (e.g. 1.0.29-hash)
// Se conseguimos contar os commits do git, usamos o formato sequencial: 1.0.[commitCount]
// Caso contrário, usamos a versão base estática de version.ts
const appVersion = commitCount !== "0"
  ? `1.0.${commitCount}${commitHash ? `-${commitHash}` : ""}`
  : (commitHash ? `${systemVersion}-${commitHash}` : systemVersion);

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
};

export default nextConfig;


