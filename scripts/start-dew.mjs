import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { request } from "node:http";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";

const isCheckOnly = process.argv.includes("--check");
const shouldOpenLibrary = process.argv.includes("--open");
const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const receiverDist = join(repoRoot, "apps", "receiver", "dist", "index.js");
const config = createLauncherConfig(process.env);
const libraryUrl = `http://${config.host}:${config.port}/library`;

printHeader();
printConfig();

const buildResult = spawnSync("npm", ["--prefix", "apps/receiver", "run", "build"], {
  cwd: repoRoot,
  stdio: "inherit"
});

if (buildResult.status !== 0) {
  console.error("\nDew could not build the local receiver.");
  process.exit(buildResult.status ?? 1);
}

if (!existsSync(receiverDist)) {
  console.error(`\nDew could not find the built receiver at ${receiverDist}.`);
  process.exit(1);
}

const ytDlpCheck = spawnSync(config.ytDlpPath, ["--version"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"]
});

if (ytDlpCheck.status !== 0) {
  console.error("\nDew needs yt-dlp before it can save media.");
  console.error("Install it with: brew install yt-dlp");
  console.error(`Checked command: ${config.ytDlpPath}`);
  process.exit(1);
}

console.log(`yt-dlp: ${ytDlpCheck.stdout.trim()}`);

const portState = await getPortState(config.host, config.port);

if (portState === "dew-running") {
  console.log(`Dew receiver is already running: ${libraryUrl}`);
  if (shouldOpenLibrary) {
    openLibrary(libraryUrl);
  }
  process.exit(0);
}

if (portState === "busy") {
  console.error(
    `Port ${config.port} is already in use by something that is not Dew.`
  );
  console.error("Set DEW_RECEIVER_PORT to another port and try again.");
  process.exit(1);
}

if (isCheckOnly) {
  console.log("Dew launcher check passed. Receiver is ready to start.");
  process.exit(0);
}

console.log(`Starting Dew receiver: ${libraryUrl}`);

const receiverProcess = spawn(process.execPath, [receiverDist], {
  cwd: repoRoot,
  env: process.env,
  stdio: "inherit"
});

if (shouldOpenLibrary) {
  await waitForDewReceiver(config.host, config.port);
  openLibrary(libraryUrl);
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    receiverProcess.kill(signal);
  });
}

async function waitForDewReceiver(host, port) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (await isDewReceiverRunning(host, port)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  console.warn("Dew receiver started, but the library was not ready to open yet.");
}

function openLibrary(url) {
  console.log(`Opening library: ${url}`);

  const openResult = openUrl(url);

  if (!openResult.ok) {
    console.warn("Dew could not open the browser automatically.");
    if (openResult.error) {
      console.warn(openResult.error);
    }
    console.warn(`Open this URL manually: ${url}`);
  }
}

function openUrl(url) {
  if (process.platform === "darwin") {
    const preferredBrowser = process.env.DEW_BROWSER_APP?.trim();
    const attempts = preferredBrowser
      ? [["open", ["-a", preferredBrowser, url]]]
      : [
          ["open", ["-a", "Google Chrome", url]],
          ["open", [url]]
        ];

    return runFirstSuccessfulOpenCommand(attempts);
  }

  if (process.platform === "win32") {
    return runFirstSuccessfulOpenCommand([
      ["cmd", ["/c", "start", "", url]]
    ]);
  }

  return runFirstSuccessfulOpenCommand([
    ["xdg-open", [url]]
  ]);
}

function runFirstSuccessfulOpenCommand(attempts) {
  let lastError = "";

  for (const [command, args] of attempts) {
    const result = spawnSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "ignore", "pipe"]
    });

    if (result.status === 0) {
      return { ok: true };
    }

    lastError = result.stderr?.trim() ?? "";
  }

  return { ok: false, error: lastError };
}

receiverProcess.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

function printHeader() {
  console.log("Dew MediArchive");
  console.log("Local receiver launcher");
  console.log("");
}

function printConfig() {
  console.log(`Library: ${libraryUrl}`);
  console.log(`Downloads: ${config.downloadDir}`);
  console.log(`Jobs: ${config.jobsPath}`);
  console.log(`Archive: ${config.archivePath}`);
}

function createLauncherConfig(env) {
  const downloadDir =
    env.DEW_DOWNLOAD_DIR ?? join(homedir(), "Movies", "Dew MediArchive");

  return {
    host: env.DEW_RECEIVER_HOST ?? "127.0.0.1",
    port: parsePort(env.DEW_RECEIVER_PORT),
    downloadDir,
    jobsPath: env.DEW_JOBS_PATH ?? join(downloadDir, ".dew", "jobs.jsonl"),
    archivePath: env.DEW_ARCHIVE_PATH ?? join(downloadDir, ".dew", "archive.jsonl"),
    ytDlpPath: env.DEW_YT_DLP_PATH ?? "yt-dlp"
  };
}

function parsePort(rawPort) {
  if (!rawPort) {
    return 47321;
  }

  const port = Number(rawPort);
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : 47321;
}

async function getPortState(host, port) {
  const canListen = await canBind(host, port);

  if (canListen) {
    return "available";
  }

  return (await isDewReceiverRunning(host, port)) ? "dew-running" : "busy";
}

function canBind(host, port) {
  return new Promise((resolve) => {
    const server = createServer();

    server.once("error", () => {
      resolve(false);
    });
    server.once("listening", () => {
      server.close(() => {
        resolve(true);
      });
    });
    server.listen(port, host);
  });
}

function isDewReceiverRunning(host, port) {
  return new Promise((resolve) => {
    const healthRequest = request(
      {
        host,
        method: "GET",
        path: "/health",
        port,
        timeout: 1000
      },
      (response) => {
        const chunks = [];

        response.on("data", (chunk) => {
          chunks.push(chunk);
        });
        response.on("end", () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
            resolve(body?.name === "dew-mediarchive-receiver");
          } catch {
            resolve(false);
          }
        });
      }
    );

    healthRequest.on("error", () => {
      resolve(false);
    });
    healthRequest.on("timeout", () => {
      healthRequest.destroy();
      resolve(false);
    });
    healthRequest.end();
  });
}
