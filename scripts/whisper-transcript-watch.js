import fs from "node:fs";
import path from "node:path";

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    src: "",
    dst: path.resolve(process.cwd(), "whisper-demo/transcript.json"),
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--src") {
      config.src = args[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg === "--dst") {
      config.dst = path.resolve(process.cwd(), args[index + 1] || config.dst);
      index += 1;
      continue;
    }
    if (arg === "-h" || arg === "--help") {
      console.log("Usage: node scripts/whisper-transcript-watch.js --src <source.txt|json> [--dst <output.json>]");
      process.exit(0);
    }
  }

  if (!config.src) {
    console.error("You must provide --src <source.txt|json>");
    process.exit(1);
  }

  config.src = path.resolve(process.cwd(), config.src);
  return config;
}

function readPayload(sourceFile) {
  const contents = fs.readFileSync(sourceFile, "utf8");
  if (sourceFile.endsWith(".json")) {
    const parsed = JSON.parse(contents);
    return {
      active: parsed.active !== false,
      generated: parsed.generated || new Date().toISOString(),
      text: typeof parsed.text === "string" ? parsed.text : JSON.stringify(parsed),
    };
  }

  return {
    active: true,
    generated: new Date().toISOString(),
    text: contents.trim(),
  };
}

const config = parseArgs();
fs.mkdirSync(path.dirname(config.dst), { recursive: true });

function syncFile() {
  const payload = readPayload(config.src);
  fs.writeFileSync(config.dst, JSON.stringify(payload, null, 2));
}

syncFile();
console.log(`[whisper-transcript-watch] Watching ${config.src}`);
console.log(`[whisper-transcript-watch] Writing ${config.dst}`);

fs.watchFile(config.src, { interval: 500 }, () => {
  syncFile();
});
