#!/usr/bin/env node

import { readFileSync } from "fs";
import { execSync } from "child_process";

const stage = process.argv[2] || "ih";
const envFile = ".env";

try {
  const envContent = readFileSync(envFile, "utf-8");
  const lines = envContent.split("\n");

  let successCount = 0;
  let errorCount = 0;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    // Parse KEY=VALUE
    const match = trimmedLine.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!match) {
      continue;
    }

    const [, key, value] = match;

    // Skip if value is empty or placeholder
    if (
      !value ||
      value === "..." ||
      value.startsWith("sk-...") ||
      value === "your-secret-token"
    ) {
      console.log(`⏭️  Skipping ${key} (placeholder or empty)`);
      continue;
    }

    try {
      console.log(`📤 Setting ${key}...`);
      execSync(`pnpm dlx sst secret set ${key} "${value}" --stage ${stage}`, {
        stdio: "inherit",
      });
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to set ${key}`);
      errorCount++;
    }
  }

  console.log(`\n✅ Done! ${successCount} secrets set, ${errorCount} errors`);
} catch (error) {
  console.error(
    "Error reading .env file:",
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
}
