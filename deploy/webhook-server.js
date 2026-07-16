#!/usr/bin/env node
/**
 * GitHub push webhook → auto-deploy for daysrajasthan sites.
 * Listens on 127.0.0.1:9100 only (nginx terminates TLS).
 */
const http = require("http");
const crypto = require("crypto");
const { spawn } = require("child_process");
const fs = require("fs");

const HOST = "127.0.0.1";
const PORT = 9100;
const SECRET_FILE = "/opt/daysrajasthan/env/webhook-secret";
const LOG_DIR = "/opt/daysrajasthan/logs";
const LOCK_DIR = "/opt/daysrajasthan/locks";

const REPOS = {
  "meitswami/admin-daysrajasthan": {
    script: "/opt/daysrajasthan/scripts/deploy-admin.sh",
    branches: ["master", "main"],
    name: "admin",
  },
  "dimenfox70/travel-days-rajasthan": {
    script: "/opt/daysrajasthan/scripts/deploy-web.sh",
    branches: ["main", "master"],
    name: "web",
  },
};

fs.mkdirSync(LOG_DIR, { recursive: true });
fs.mkdirSync(LOCK_DIR, { recursive: true });

function readSecret() {
  return fs.readFileSync(SECRET_FILE, "utf8").trim();
}

function verifySignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  const received = signatureHeader.slice("sha256=".length);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "utf8"),
      Buffer.from(received, "utf8")
    );
  } catch {
    return false;
  }
}

function logLine(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  fs.appendFileSync(`${LOG_DIR}/webhook.log`, line);
}

const deploying = new Set();

function runDeploy(repoKey, branch, deliveryId) {
  const cfg = REPOS[repoKey];
  if (!cfg) return;
  if (deploying.has(cfg.name)) {
    logLine(`SKIP ${cfg.name}: deploy already running`);
    return;
  }
  deploying.add(cfg.name);
  const logFile = `${LOG_DIR}/deploy-${cfg.name}-${Date.now()}.log`;
  logLine(`START ${cfg.name} branch=${branch} delivery=${deliveryId} log=${logFile}`);

  const out = fs.openSync(logFile, "a");
  const child = spawn("bash", [cfg.script, branch], {
    cwd: "/opt/daysrajasthan",
    env: { ...process.env, PATH: "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" },
    stdio: ["ignore", out, out],
  });

  child.on("close", (code) => {
    deploying.delete(cfg.name);
    logLine(`DONE ${cfg.name} exit=${code} log=${logFile}`);
    try {
      fs.closeSync(out);
    } catch {
      /* ignore */
    }
  });
}

const server = http.createServer((req, res) => {
  if (req.method === "GET" && (req.url === "/health" || req.url === "/hooks/github/health")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, deploying: [...deploying] }));
    return;
  }

  if (req.method !== "POST" || !req.url.startsWith("/hooks/github")) {
    res.writeHead(404);
    res.end("not found");
    return;
  }

  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const rawBody = Buffer.concat(chunks);
    let secret;
    try {
      secret = readSecret();
    } catch {
      res.writeHead(500);
      res.end("secret missing");
      return;
    }

    const sig = req.headers["x-hub-signature-256"];
    if (!verifySignature(rawBody, sig, secret)) {
      logLine("REJECT invalid signature");
      res.writeHead(401);
      res.end("invalid signature");
      return;
    }

    const event = req.headers["x-github-event"];
    const delivery = req.headers["x-github-delivery"] || "unknown";

    if (event === "ping") {
      logLine(`PING delivery=${delivery}`);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, pong: true }));
      return;
    }

    if (event !== "push") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, ignored: event }));
      return;
    }

    let payload;
    try {
      payload = JSON.parse(rawBody.toString("utf8"));
    } catch {
      res.writeHead(400);
      res.end("bad json");
      return;
    }

    const fullName = payload.repository?.full_name;
    const ref = payload.ref || "";
    const branch = ref.replace(/^refs\/heads\//, "");
    const cfg = REPOS[fullName];

    if (!cfg) {
      logLine(`IGNORE unknown repo ${fullName}`);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, ignored: "unknown_repo" }));
      return;
    }

    if (!cfg.branches.includes(branch)) {
      logLine(`IGNORE ${fullName} branch=${branch}`);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, ignored: "branch" }));
      return;
    }

    // Acknowledge immediately; deploy async
    res.writeHead(202, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, queued: cfg.name, branch }));
    runDeploy(fullName, branch, delivery);
  });
});

server.listen(PORT, HOST, () => {
  logLine(`webhook listening on ${HOST}:${PORT}`);
});
