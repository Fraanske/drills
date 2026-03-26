import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const packageJsonPath = resolve(process.cwd(), "package.json");
const packageLockPath = resolve(process.cwd(), "package-lock.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

const version = String(packageJson.version ?? "0.1.0");
const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);

if (!match) {
  console.error(`Unsupported version format: ${version}`);
  process.exit(1);
}

const major = Number(match[1]);
const minor = Number(match[2]);

if (major !== 0) {
  console.log(`Version is ${version}; automatic 0.x minor bump skipped.`);
  process.exit(0);
}

packageJson.version = `0.${minor + 1}.0`;
writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

try {
  const packageLock = JSON.parse(readFileSync(packageLockPath, "utf8"));
  packageLock.version = packageJson.version;

  if (packageLock.packages?.[""]) {
    packageLock.packages[""].version = packageJson.version;
  }

  writeFileSync(packageLockPath, `${JSON.stringify(packageLock, null, 2)}\n`);
} catch {
  // package-lock.json is optional for the hook flow
}

console.log(`Version bumped: ${version} -> ${packageJson.version}`);
