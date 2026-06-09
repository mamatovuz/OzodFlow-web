import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";
const apiPort = process.env.API_PORT || "4000";

const children = [
  spawn("node", ["server/index.js"], {
    env: {
      ...process.env,
      API_PORT: apiPort,
      NODE_ENV: "development",
    },
    shell: isWindows,
    stdio: "inherit",
  }),
  spawn("npx", ["vite", "dev"], {
    env: {
      ...process.env,
      API_PORT: apiPort,
    },
    shell: isWindows,
    stdio: "inherit",
  }),
];

let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill(isWindows ? undefined : "SIGTERM");
    }
  }

  process.exit(code);
}

for (const child of children) {
  child.on("exit", (code) => {
    if (!shuttingDown && code !== 0) {
      shutdown(code || 1);
    }
  });
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
