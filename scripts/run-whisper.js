import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    bin: process.env.WHISPER_BIN || "",
    model: process.env.WHISPER_MODEL || "",
    threads: Number.parseInt(process.env.WHISPER_THREADS || String(Math.max(1, os.cpus().length - 1)), 10),
    step: Number.parseInt(process.env.WHISPER_STEP || "500", 10),
    length: Number.parseInt(process.env.WHISPER_LENGTH || "5000", 10),
    extra: [],
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--bin") {
      config.bin = args[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg === "--model") {
      config.model = args[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg === "--threads") {
      config.threads = Number.parseInt(args[index + 1] || String(config.threads), 10);
      index += 1;
      continue;
    }
    if (arg === "--step") {
      config.step = Number.parseInt(args[index + 1] || String(config.step), 10);
      index += 1;
      continue;
    }
    if (arg === "--length") {
      config.length = Number.parseInt(args[index + 1] || String(config.length), 10);
      index += 1;
      continue;
    }
    if (arg === "--") {
      config.extra = args.slice(index + 1);
      break;
    }
    if (arg === "-h" || arg === "--help") {
      console.log(`Usage: node scripts/run-whisper.js [--bin <path>] [--model <path>] [--threads N] [--step ms] [--length ms] [-- <extra flags>]

Environment variables:
  WHISPER_BIN, WHISPER_MODEL, WHISPER_THREADS, WHISPER_STEP, WHISPER_LENGTH
`);
      process.exit(0);
    }
    config.extra.push(arg);
  }

  return config;
}

function resolveBin(bin) {
  const candidates = [
    bin,
    path.resolve(process.cwd(), "whisper.cpp/build/bin/whisper-stream"),
    path.resolve(process.cwd(), "build/bin/whisper-stream"),
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) || "";
}

function resolveModel(model) {
  const candidates = [
    model,
    path.resolve(process.cwd(), "whisper.cpp/models/ggml-base.en.bin"),
    path.resolve(process.cwd(), "models/ggml-base.en.bin"),
    path.resolve(os.homedir(), "models/ggml-base.en.bin"),
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) || "";
}

function ensureOutputPath() {
  const output = path.resolve(process.cwd(), "whisper-demo/transcript.json");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  return output;
}

function debounce(fn, wait) {
  let timerId = null;
  return (...args) => {
    if (timerId) clearTimeout(timerId);
    timerId = setTimeout(() => fn(...args), wait);
  };
}

const config = parseArgs();
const bin = resolveBin(config.bin);
const model = resolveModel(config.model);
const outputFile = ensureOutputPath();

if (!bin) {
  console.error("Could not find whisper-stream binary. Set --bin or WHISPER_BIN.");
  process.exit(1);
}

if (!model) {
  console.error("Could not find model file. Set --model or WHISPER_MODEL.");
  process.exit(1);
}

const args = ["-m", model, "-t", String(config.threads), "--step", String(config.step), "--length", String(config.length), ...config.extra];
const child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
let transcript = "";

const writeTranscript = debounce(() => {
  fs.writeFileSync(
    outputFile,
    JSON.stringify({ active: true, generated: new Date().toISOString(), text: transcript.trim() }, null, 2),
  );
}, 200);

console.log(`[run-whisper] Launching: ${bin} ${args.join(" ")}`);
console.log(`[run-whisper] Writing transcript to: ${outputFile}`);

child.stdout.setEncoding("utf8");
child.stdout.on("data", (chunk) => {
  const lines = String(chunk).split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^(\[\d{2}:\d{2}:\d{2}\]|\d+ms|system\:|sampling\:|processing\:)/i.test(trimmed)) continue;
    transcript += (transcript.endsWith(" ") ? "" : " ") + trimmed;
  }
  writeTranscript();
});

child.stderr.setEncoding("utf8");
child.stderr.on("data", () => {
  // Keep stderr quiet unless debugging whisper-stream behavior.
});

function writeFinal(active) {
  fs.writeFileSync(
    outputFile,
    JSON.stringify({ active, generated: new Date().toISOString(), text: transcript.trim() }, null, 2),
  );
}

function shutdown() {
  try {
    child.kill("SIGINT");
  } catch {}
  writeFinal(false);
  setTimeout(() => process.exit(0), 250);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

child.on("exit", (code) => {
  writeFinal(false);
  console.log(`\n[run-whisper] whisper-stream exited with code ${code}`);
  process.exit(code || 0);
});
