#!/usr/bin/env node
/**
 * Local HTTPS tunnel for testing the iOS Home Screen icon against `next dev`.
 * Keep this process running. Re-add the icon only if the printed URL changes.
 */
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { createInterface } from "node:readline";

const NEXT_PORT = process.env.PORT || "3000";
const children = [];

function spawnLogged(command, args, { onLine } = {}) {
  const child = spawn(command, args, {
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });
  children.push(child);

  const handle = (stream) => {
    const rl = createInterface({ input: stream });
    rl.on("line", (line) => {
      console.log(line);
      onLine?.(line);
    });
  };

  handle(child.stdout);
  handle(child.stderr);

  child.on("exit", (code, signal) => {
    if (signal !== "SIGTERM" && code && code !== 0) {
      console.error(`\n${command} exited (${code}).`);
    }
  });

  return child;
}

function shutdown() {
  for (const child of children) {
    try {
      child.kill("SIGTERM");
    } catch {
      // already gone
    }
  }
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log("\nStarting Next.js on 0.0.0.0:" + NEXT_PORT + " …\n");

spawnLogged("npx", ["next", "dev", "-H", "0.0.0.0", "-p", NEXT_PORT]);

let announced = false;

function announce(url) {
  if (announced) return;
  announced = true;
  writeFileSync(".pwa-dev-url", `${url}\n`);

  console.log(`
============================================================
  PWA live URL (use THIS for Add to Home Screen):

  ${url}/login

  1. Delete any old Praxis Home Screen icon
  2. Open that URL in Safari (not Chrome)
  3. Share → Add to Home Screen
  4. Leave this terminal running
  5. After code changes: swipe away Praxis, reopen the icon

  Firebase → Auth → Settings → Authorized domains
  add: ${new URL(url).hostname}
============================================================
`);
}

setTimeout(() => {
  console.log("\nOpening HTTPS tunnel (cloudflared) …\n");
  spawnLogged(
    "npx",
    ["-y", "cloudflared", "tunnel", "--url", `http://127.0.0.1:${NEXT_PORT}`],
    {
      onLine: (line) => {
        const match = line.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
        if (match) announce(match[0]);
      },
    },
  );
}, 2500);
